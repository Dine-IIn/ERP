import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth';
import prisma from '../services/db';
import { ioInstance } from './index';

/**
 * 1. List all chat groups and individual DMs available to the user
 */
export async function listChatGroups(req: AuthenticatedRequest, res: Response) {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: "Unauthorized access" });
    }

    // Fetch all groups inside this corporate tenant
    const groups = await prisma.chatGroup.findMany({
      where: { companyId: user.companyId },
      orderBy: { updatedAt: 'desc' }
    });

    // Fetch all group member connections inside this corporate tenant using loaded groupIds
    const groupIds = groups.map(g => g.id);
    const allMemberships = await prisma.groupMember.findMany({
      where: {
        groupId: { in: groupIds }
      }
    });

    // Fetch all users in the company to map names
    const companyUsers = await prisma.user.findMany({
      where: { companyId: user.companyId },
      select: { id: true, username: true, role: { select: { name: true } }, status: true }
    });

    const userMap = new Map(companyUsers.map(u => [u.id, u]));

    // Filter groups based on visibility permissions
    // DMs are ONLY visible to their participants
    const filteredGroups = [];
    
    for (const group of groups) {
      const members = allMemberships.filter(m => m.groupId === group.id);
      const isMember = members.some(m => m.userId === user.userId);

      if (group.type === 'DIRECT') {
        if (isMember) {
          // Map participant usernames for DMs
          const peer = members.find(m => m.userId !== user.userId) || members[0];
          const peerUser = userMap.get(peer?.userId);
          const mappedName = peerUser ? peerUser.username : "Colleague";
          
          filteredGroups.push({
            ...group,
            name: mappedName, // Override name dynamically to display peer username
            members: members.map(m => ({
              ...m,
              username: userMap.get(m.userId)?.username || 'Unknown'
            }))
          });
        }
      } else {
        // GENERAL or EXPENSE groups
        const parsedSettings = JSON.parse(group.settings || '{}');
        const isPrivate = parsedSettings.isPrivate || false;

        // If it's private, only show if the user is a member or a Company Admin
        if (!isPrivate || isMember || user.role === 'Admin' || user.isSuperAdmin) {
          filteredGroups.push({
            ...group,
            members: members.map(m => ({
              ...m,
              username: userMap.get(m.userId)?.username || 'Unknown'
            }))
          });
        }
      }
    }

    res.json(filteredGroups);
  } catch (error: any) {
    console.error("❌ Error listing chat spaces:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

/**
 * 2. Create a new general/expense group or individual DM channel
 */
export async function createChatGroup(req: AuthenticatedRequest, res: Response) {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: "Unauthorized access" });
    }

    const { name, type, recipientId, settings } = req.body;

    if (!type || !['GENERAL', 'EXPENSE', 'DIRECT'].includes(type)) {
      return res.status(400).json({ error: "Invalid group type" });
    }

    // 1. Direct Individual Messaging (DM) Setup
    if (type === 'DIRECT') {
      if (!recipientId) {
        return res.status(400).json({ error: "Recipient ID is required for direct messaging" });
      }

      // Check if a DM between these two users already exists
      const existingGroups = await prisma.chatGroup.findMany({
        where: {
          companyId: user.companyId,
          type: 'DIRECT'
        }
      });

      for (const group of existingGroups) {
        const members = await prisma.groupMember.findMany({
          where: { groupId: group.id }
        });
        const hasUser = members.some(m => m.userId === user.userId);
        const hasRecipient = members.some(m => m.userId === recipientId);
        
        if (hasUser && hasRecipient && members.length === 2) {
          // DM already exists, return it
          const companyUsers = await prisma.user.findMany({ where: { companyId: user.companyId } });
          const userMap = new Map(companyUsers.map(u => [u.id, u]));

          return res.json({
            ...group,
            name: userMap.get(recipientId)?.username || 'Colleague',
            members: members.map(m => ({
              ...m,
              username: userMap.get(m.userId)?.username || 'Unknown'
            }))
          });
        }
      }

      // Spawn new DM channel
      const newGroup = await prisma.chatGroup.create({
        data: {
          companyId: user.companyId,
          name: `DM_${user.userId}_${recipientId}`,
          type: 'DIRECT',
          createdById: user.userId,
          settings: '{}'
        }
      });

      // Register both users as members
      await prisma.groupMember.createMany({
        data: [
          { groupId: newGroup.id, userId: user.userId, role: 'ADMIN' },
          { groupId: newGroup.id, userId: recipientId, role: 'MEMBER' }
        ]
      });

      const updatedMembers = await prisma.groupMember.findMany({ where: { groupId: newGroup.id } });
      const companyUsers = await prisma.user.findMany({ where: { companyId: user.companyId } });
      const userMap = new Map(companyUsers.map(u => [u.id, u]));

      const payload = {
        ...newGroup,
        name: userMap.get(recipientId)?.username || 'Colleague',
        members: updatedMembers.map(m => ({
          ...m,
          username: userMap.get(m.userId)?.username || 'Unknown'
        }))
      };

      // Broadcast room availability via WebSocket
      if (ioInstance) {
        ioInstance.to(user.userId).emit('group_created', payload);
        ioInstance.to(recipientId).emit('group_created', payload);
      }

      return res.status(201).json(payload);
    }

    // 2. GENERAL or EXPENSE Group Setup (Verifies Role Permissions)
    if (!name || name.trim().length === 0) {
      return res.status(400).json({ error: "Group name is required" });
    }

    // Role verification (Unless Company Admin or Super Admin, require permissions)
    if (user.role !== 'Admin' && !user.isSuperAdmin) {
      const dbUser = await prisma.user.findUnique({
        where: { id: user.userId },
        include: { role: true }
      });
      const permissions = JSON.parse(dbUser?.role?.permissions || '{}');
      const hasChatPermission = permissions.CHAT?.includes('create_group') || false;

      if (!hasChatPermission) {
        return res.status(403).json({ error: "You do not have administrative permission to create chat groups" });
      }
    }

    const groupSettingsString = JSON.stringify(settings || { isPrivate: false });

    // Spawns corporate room
    const newGroup = await prisma.chatGroup.create({
      data: {
        companyId: user.companyId,
        name: name.trim(),
        type,
        createdById: user.userId,
        settings: groupSettingsString
      }
    });

    // Creator becomes Group Admin
    await prisma.groupMember.create({
      data: {
        groupId: newGroup.id,
        userId: user.userId,
        role: 'ADMIN'
      }
    });

    const members = await prisma.groupMember.findMany({ where: { groupId: newGroup.id } });
    const companyUsers = await prisma.user.findMany({ where: { companyId: user.companyId } });
    const userMap = new Map(companyUsers.map(u => [u.id, u]));

    const payload = {
      ...newGroup,
      members: members.map(m => ({
        ...m,
        username: userMap.get(m.userId)?.username || 'Unknown'
      }))
    };

    // Broadcast group creation to all sockets in the company
    if (ioInstance) {
      ioInstance.emit('group_created', payload);
    }

    return res.status(201).json(payload);
  } catch (error: any) {
    console.error("❌ Error spawning chat space:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

/**
 * 3. Fetch conversation logs for a specific room
 */
export async function getChatGroupMessages(req: AuthenticatedRequest, res: Response) {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: "Unauthorized access" });
    }

    const { groupId } = req.params;
    const cursor = req.query.cursor as string;
    const limit = parseInt(req.query.limit as string) || 50;

    // Verify room exists in this company
    const group = await prisma.chatGroup.findFirst({
      where: { id: groupId, companyId: user.companyId }
    });

    if (!group) {
      return res.status(404).json({ error: "Chat group not found" });
    }

    const parsedSettings = JSON.parse(group.settings || '{}');
    const isPrivate = parsedSettings.isPrivate || false;

    if (group.type === 'DIRECT' || isPrivate) {
      let isAuthorized = user.role === 'Admin' || user.isSuperAdmin;
      if (!isAuthorized) {
        const isMember = await prisma.groupMember.findFirst({
          where: { groupId, userId: user.userId }
        });
        if (isMember) {
          isAuthorized = true;
        }
      }
      if (!isAuthorized) {
        return res.status(403).json({ error: "You are not authorized to access this private space" });
      }
    }

    let queryOptions: any = {
      where: { groupId },
      take: limit,
      orderBy: { createdAt: 'desc' }
    };

    if (cursor) {
      const cursorMessage = await prisma.chatMessage.findUnique({
        where: { id: cursor }
      });
      if (cursorMessage) {
        queryOptions.where.createdAt = {
          lt: cursorMessage.createdAt
        };
      }
    }

    // Query messages in descending order (latest first) for cursor slice
    const messages = await prisma.chatMessage.findMany(queryOptions);

    // Return in ascending chronological timeline for client layout rendering
    res.json(messages.reverse());
  } catch (error: any) {
    console.error("❌ Error retrieving message history:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

/**
 * 4. Dispatch a new message (text, expense, or peer payment receipt)
 */
export async function sendChatGroupMessage(req: AuthenticatedRequest, res: Response) {
  try {
    console.log("MESSAGE RECEIVED");
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: "Unauthorized access" });
    }

    const { groupId } = req.params;
    const { message, type, expenseData } = req.body;

    const group = await prisma.chatGroup.findFirst({
      where: { id: groupId, companyId: user.companyId }
    });

    if (!group) {
      return res.status(404).json({ error: "Chat group not found" });
    }

    // Verify user is a member
    const membership = await prisma.groupMember.findFirst({
      where: { groupId, userId: user.userId }
    });

    if (!membership && (group.type === 'DIRECT' || JSON.parse(group.settings || '{}').isPrivate)) {
      return res.status(403).json({ error: "You must join this room before posting" });
    }

    // Construct schema record
    const newMessage = await prisma.chatMessage.create({
      data: {
        groupId,
        senderId: user.userId,
        senderName: user.username,
        message: message || '',
        type: type || 'TEXT',
        expenseData: expenseData ? JSON.stringify(expenseData) : null
      }
    });
    console.log("MESSAGE SAVED");

    // --- FINANCIAL CASHBOOK & EXPENSE SYNC OPTION ---
    const parsedSettings = JSON.parse(group.settings || '{}');
    if (group.type === 'EXPENSE' && type === 'EXPENSE' && parsedSettings.connectToCashbook === true && expenseData) {
      try {
        const data = typeof expenseData === 'string' ? JSON.parse(expenseData) : expenseData;
        const amount = parseFloat(data.amount);
        const description = data.description || `Expense logged in chat group: ${group.name}`;
        const category = data.category || 'CHAT_EXPENSE';

        if (!isNaN(amount) && amount > 0) {
          // 1. Create central CompanyExpense record
          await prisma.companyExpense.create({
            data: {
              companyId: user.companyId,
              amount,
              description,
              category,
              paidById: user.userId,
              chatGroupId: groupId,
              referenceNo: `CHAT-${newMessage.id.slice(0, 8).toUpperCase()}`
            }
          });

          // 2. Create running CashbookVoucher record
          const lastVoucher = await prisma.cashbookVoucher.findFirst({
            where: { companyId: user.companyId },
            orderBy: { createdAt: 'desc' }
          });
          const previousBal = lastVoucher ? lastVoucher.currentBal : 0.0;
          const currentBal = previousBal - amount;

          const count = await prisma.cashbookVoucher.count({ where: { companyId: user.companyId } });
          const voucherNo = `VCH-${new Date().getFullYear()}-${(count + 1).toString().padStart(5, '0')}`;

          await prisma.cashbookVoucher.create({
            data: {
              companyId: user.companyId,
              voucherNo,
              entryType: 'OUTWARD_EXPENSE',
              amount,
              previousBal,
              currentBal,
              description: `Chat Sync - ${description}`,
              referenceNo: `CHAT-${newMessage.id.slice(0, 8).toUpperCase()}`
            }
          });
        }
      } catch (err) {
        console.error("⚠️ Failed to auto-sync chat expense to central cashbook ledger:", err);
      }
    }

    // Update group timestamp
    await prisma.chatGroup.update({
      where: { id: groupId },
      data: { updatedAt: new Date() }
    });

    // Broadcast dynamically to this WebSocket group room
    if (ioInstance) {
      ioInstance.to(`group_${groupId}`).emit('new_chat_message', newMessage);
      console.log("MESSAGE EMITTED");
      
      // Also notify peer if it's a DM and they are not currently in the room
      if (group.type === 'DIRECT') {
        const otherMember = await prisma.groupMember.findFirst({
          where: { groupId, userId: { not: user.userId } }
        });
        if (otherMember) {
          ioInstance.to(otherMember.userId).emit('dm_incoming_notification', {
            groupId,
            senderName: user.username,
            message: type === 'TEXT' ? message : `Logged an ${type.toLowerCase()}`
          });
        }
      }
    }

    res.status(201).json(newMessage);
  } catch (error: any) {
    console.error("❌ Error logging chat message:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

/**
 * 5. Manage group participants (Add/Remove members)
 */
export async function manageChatGroupMembers(req: AuthenticatedRequest, res: Response) {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: "Unauthorized access" });
    }

    const { groupId } = req.params;
    const { targetUserId, action } = req.body; // action: "ADD" | "REMOVE"

    if (!targetUserId || !['ADD', 'REMOVE'].includes(action)) {
      return res.status(400).json({ error: "Invalid action parameters" });
    }

    const group = await prisma.chatGroup.findFirst({
      where: { id: groupId, companyId: user.companyId }
    });

    if (!group) {
      return res.status(404).json({ error: "Group space not found" });
    }

    if (group.type === 'DIRECT') {
      return res.status(400).json({ error: "Individual DMs cannot have members modified" });
    }

    // Verify current user is Admin (Company Admin or Group Admin)
    let isAuthorized = user.role === 'Admin' || user.isSuperAdmin;
    if (!isAuthorized) {
      const callerMembership = await prisma.groupMember.findFirst({
        where: { groupId, userId: user.userId }
      });
      if (callerMembership?.role === 'ADMIN') {
        isAuthorized = true;
      }
    }

    if (!isAuthorized) {
      return res.status(403).json({ error: "Only group admins can manage member scopes" });
    }

    if (action === 'ADD') {
      // Check if user is already a member
      const exists = await prisma.groupMember.findFirst({
        where: { groupId, userId: targetUserId }
      });
      if (exists) {
        return res.status(400).json({ error: "User is already a member of this chat space" });
      }

      await prisma.groupMember.create({
        data: {
          groupId,
          userId: targetUserId,
          role: 'MEMBER'
        }
      });
    } else {
      // CANNOT remove the group creator/admin if they are the only admin
      if (targetUserId === group.createdById) {
        return res.status(400).json({ error: "Cannot remove the group founder/creator" });
      }

      await prisma.groupMember.deleteMany({
        where: { groupId, userId: targetUserId }
      });
    }

    // Fetch updated members
    const updatedMembers = await prisma.groupMember.findMany({ where: { groupId } });
    const companyUsers = await prisma.user.findMany({ where: { companyId: user.companyId } });
    const userMap = new Map(companyUsers.map(u => [u.id, u]));

    const payload = {
      ...group,
      members: updatedMembers.map(m => ({
        ...m,
        username: userMap.get(m.userId)?.username || 'Unknown'
      }))
    };

    if (ioInstance) {
      ioInstance.emit('group_created', payload); // Broadcast refreshed metadata
    }

    res.json(payload);
  } catch (error: any) {
    console.error("❌ Error modifying group members:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

/**
 * 6. Update general room configuration settings
 */
export async function updateChatGroupSettings(req: AuthenticatedRequest, res: Response) {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { groupId } = req.params;
    const { name, isPrivate, connectToCashbook } = req.body;

    const group = await prisma.chatGroup.findFirst({
      where: { id: groupId, companyId: user.companyId }
    });

    if (!group) {
      return res.status(404).json({ error: "Group space not found" });
    }

    // Verify administrative status
    let isAuthorized = user.role === 'Admin' || user.isSuperAdmin;
    if (!isAuthorized) {
      const callerMembership = await prisma.groupMember.findFirst({
        where: { groupId, userId: user.userId }
      });
      if (callerMembership?.role === 'ADMIN') {
        isAuthorized = true;
      }
    }

    if (!isAuthorized) {
      return res.status(403).json({ error: "Only group admins can update configurations" });
    }

    const prevSettings = JSON.parse(group.settings || '{}');
    const updatedSettings = {
      ...prevSettings,
      ...(isPrivate !== undefined && { isPrivate: !!isPrivate }),
      ...(connectToCashbook !== undefined && { connectToCashbook: !!connectToCashbook })
    };

    const updatedGroup = await prisma.chatGroup.update({
      where: { id: groupId },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        settings: JSON.stringify(updatedSettings)
      }
    });

    const updatedMembers = await prisma.groupMember.findMany({ where: { groupId } });
    const companyUsers = await prisma.user.findMany({ where: { companyId: user.companyId } });
    const userMap = new Map(companyUsers.map(u => [u.id, u]));

    const payload = {
      ...updatedGroup,
      members: updatedMembers.map(m => ({
        ...m,
        username: userMap.get(m.userId)?.username || 'Unknown'
      }))
    };

    if (ioInstance) {
      ioInstance.emit('group_created', payload); // Dispatch update
    }

    res.json(payload);
  } catch (error: any) {
    console.error("❌ Error updating group configurations:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

/**
 * 7. Retrieve company-wide stats: Total Company Expense, Individual Net Sum, Individual Total Expense
 */
export async function getCompanyChatStats(req: AuthenticatedRequest, res: Response) {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: "Unauthorized access" });
    }

    // 1. Fetch all expense groups in the company
    const groups = await prisma.chatGroup.findMany({
      where: {
        companyId: user.companyId,
        type: 'EXPENSE'
      },
      select: {
        id: true
      }
    });

    const groupIds = groups.map(g => g.id);

    // If there are no groups, return all zeros
    if (groupIds.length === 0) {
      return res.json({
        totalCompanyExpense: 0,
        individualNetSum: 0,
        individualTotalExpense: 0
      });
    }

    // 2. Fetch all members of these groups
    const members = await prisma.groupMember.findMany({
      where: {
        groupId: { in: groupIds }
      },
      select: {
        groupId: true,
        userId: true
      }
    });

    // 3. Fetch all expense/payment messages in these groups
    const messages = await prisma.chatMessage.findMany({
      where: {
        groupId: { in: groupIds },
        type: { in: ['EXPENSE', 'PAYMENT'] }
      },
      orderBy: {
        createdAt: 'asc'
      }
    });

    let totalCompanyExpense = 0;
    let individualTotalExpense = 0;
    let individualTotalReceived = 0;

    // Group the messages and members by groupId for faster access
    const messagesByGroup: Record<string, typeof messages> = {};
    const membersByGroup: Record<string, string[]> = {};

    groupIds.forEach(gId => {
      messagesByGroup[gId] = [];
      membersByGroup[gId] = [];
    });

    messages.forEach(msg => {
      if (messagesByGroup[msg.groupId]) {
        messagesByGroup[msg.groupId].push(msg);
      }
    });

    members.forEach(m => {
      if (membersByGroup[m.groupId]) {
        membersByGroup[m.groupId].push(m.userId);
      }
    });

    // For each group, compute balances
    groupIds.forEach(gId => {
      const gMembers = membersByGroup[gId];
      const gMessages = messagesByGroup[gId];

      const netBalances: Record<string, number> = {};
      gMembers.forEach(userId => {
        netBalances[userId] = 0;
      });

      gMessages.forEach(msg => {
        if (msg.type === 'EXPENSE') {
          try {
            const data = typeof msg.expenseData === 'string' ? JSON.parse(msg.expenseData) : msg.expenseData;
            if (data) {
              const amount = Number(data.amount || 0);
              const paidBy = data.paidBy || msg.senderId;
              const splits = data.splits || {};

              totalCompanyExpense += amount;

              if (paidBy === user.userId) {
                individualTotalExpense += amount;
              }

              netBalances[paidBy] = (netBalances[paidBy] || 0) + amount;
              Object.entries(splits).forEach(([uId, share]) => {
                netBalances[uId] = (netBalances[uId] || 0) - Number(share || 0);
              });
            }
          } catch (e) {
            console.error("Error parsing expenseData in stats:", e);
          }
        } else if (msg.type === 'PAYMENT') {
          try {
            const data = typeof msg.expenseData === 'string' ? JSON.parse(msg.expenseData) : msg.expenseData;
            if (data) {
              const amount = Number(data.amount || 0);
              const from = data.from;
              const to = data.to;

              netBalances[from] = (netBalances[from] || 0) - amount;
              netBalances[to] = (netBalances[to] || 0) + amount;

              if (from === user.userId) {
                individualTotalExpense += amount; // Transfer by me
              }
              if (to === user.userId) {
                individualTotalReceived += amount; // Received by me
              }
            }
          } catch (e) {
            console.error("Error parsing payment expenseData in stats:", e);
          }
        }
      });

      // Add this group's user balance to individualNetSum
    });

    // Compute Net balance globally using User's custom formula: Net = Expense - Received
    const individualNetSum = individualTotalExpense - individualTotalReceived;

    res.json({
      totalCompanyExpense,
      individualNetSum,
      individualTotalExpense
    });
  } catch (error: any) {
    console.error("❌ Error computing company stats:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

/**
 * 8. Delete a chat group (cascade deletes group members and chat messages)
 */
export async function deleteChatGroup(req: AuthenticatedRequest, res: Response) {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: "Unauthorized access" });
    }

    const { groupId } = req.params;

    const group = await prisma.chatGroup.findFirst({
      where: { id: groupId, companyId: user.companyId }
    });

    if (!group) {
      return res.status(404).json({ error: "Chat group not found" });
    }

    if (group.type === 'DIRECT') {
      return res.status(400).json({ error: "Individual direct messages cannot be deleted" });
    }

    // Verify authorized user: Company Admin, Super Admin, or Group Admin (creator/admin member)
    let isAuthorized = user.role === 'Admin' || user.isSuperAdmin;
    if (!isAuthorized) {
      const callerMembership = await prisma.groupMember.findFirst({
        where: { groupId, userId: user.userId }
      });
      if (callerMembership?.role === 'ADMIN') {
        isAuthorized = true;
      }
    }

    if (!isAuthorized) {
      return res.status(403).json({ error: "Only group admins or company admins can delete this group" });
    }

    // Perform cascade deletion manually inside transaction
    await prisma.$transaction([
      prisma.groupMember.deleteMany({ where: { groupId } }),
      prisma.chatMessage.deleteMany({ where: { groupId } }),
      prisma.chatGroup.delete({ where: { id: groupId } })
    ]);

    // Broadcast deletion to company
    if (ioInstance) {
      ioInstance.emit('group_deleted', { groupId });
    }

    res.json({ message: `Group "${group.name}" has been successfully deleted.` });
  } catch (error: any) {
    console.error("❌ Error deleting group:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

/**
 * 9. Download detailed group expense ledger as a formatted CSV attachment
 */
export async function downloadExpenseSheet(req: AuthenticatedRequest, res: Response) {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: "Unauthorized access" });
    }

    const { groupId } = req.params;

    const group = await prisma.chatGroup.findFirst({
      where: { id: groupId, companyId: user.companyId }
    });

    if (!group) {
      return res.status(404).json({ error: "Chat group not found" });
    }

    if (group.type !== 'EXPENSE') {
      return res.status(400).json({ error: "Only expense groups can generate an expense sheet" });
    }

    // Verify user is member OR Company Admin / Super Admin
    let isAuthorized = user.role === 'Admin' || user.isSuperAdmin;
    if (!isAuthorized) {
      const membership = await prisma.groupMember.findFirst({
        where: { groupId, userId: user.userId }
      });
      if (membership) {
        isAuthorized = true;
      }
    }

    if (!isAuthorized) {
      return res.status(403).json({ error: "You are not authorized to download this group's expense sheet" });
    }

    // Fetch members and messages
    const members = await prisma.groupMember.findMany({
      where: { groupId }
    });
    const companyUsers = await prisma.user.findMany({
      where: { companyId: user.companyId }
    });
    const userMap = new Map(companyUsers.map(u => [u.id, u]));

    const messages = await prisma.chatMessage.findMany({
      where: { groupId, type: { in: ['EXPENSE', 'PAYMENT'] } },
      orderBy: { createdAt: 'asc' }
    });

    // Compute balances
    let totalExpense = 0;
    const netBalances: Record<string, number> = {};
    const totalPaid: Record<string, number> = {};
    
    members.forEach(m => {
      netBalances[m.userId] = 0;
      totalPaid[m.userId] = 0;
    });

    messages.forEach(msg => {
      if (msg.type === 'EXPENSE') {
        try {
          const data = typeof msg.expenseData === 'string' ? JSON.parse(msg.expenseData) : msg.expenseData;
          if (data) {
            const amount = Number(data.amount || 0);
            const paidBy = data.paidBy || msg.senderId;
            const splits = data.splits || {};

            totalExpense += amount;
            totalPaid[paidBy] = (totalPaid[paidBy] || 0) + amount;
            netBalances[paidBy] = (netBalances[paidBy] || 0) + amount;
            Object.entries(splits).forEach(([uId, share]) => {
              netBalances[uId] = (netBalances[uId] || 0) - Number(share || 0);
            });
          }
        } catch (e) {}
      } else if (msg.type === 'PAYMENT') {
        try {
          const data = typeof msg.expenseData === 'string' ? JSON.parse(msg.expenseData) : msg.expenseData;
          if (data) {
            const amount = Number(data.amount || 0);
            const from = data.from;
            const to = data.to;

            netBalances[from] = (netBalances[from] || 0) - amount;
            netBalances[to] = (netBalances[to] || 0) + amount;
          }
        } catch (e) {}
      }
    });

    // Greedy debt settlement calculation
    const debtors: { userId: string; username: string; amount: number }[] = [];
    const creditors: { userId: string; username: string; amount: number }[] = [];

    Object.entries(netBalances).forEach(([uId, bal]) => {
      const name = userMap.get(uId)?.username || 'Unknown Colleague';
      if (bal < -0.01) {
        debtors.push({ userId: uId, username: name, amount: -bal });
      } else if (bal > 0.01) {
        creditors.push({ userId: uId, username: name, amount: bal });
      }
    });

    debtors.sort((a, b) => b.amount - a.amount);
    creditors.sort((a, b) => b.amount - a.amount);

    const settlements: string[] = [];
    let dIdx = 0;
    let cIdx = 0;

    const tempDebtors = debtors.map(d => ({ ...d }));
    const tempCreditors = creditors.map(c => ({ ...c }));

    while (dIdx < tempDebtors.length && cIdx < tempCreditors.length) {
      const debtor = tempDebtors[dIdx];
      const creditor = tempCreditors[cIdx];
      const settleAmount = Math.min(debtor.amount, creditor.amount);

      if (settleAmount > 0.01) {
        settlements.push(`"${debtor.username}" owes "${creditor.username}","$${settleAmount.toFixed(2)}"`);
      }

      debtor.amount -= settleAmount;
      creditor.amount -= settleAmount;

      if (debtor.amount < 0.01) dIdx++;
      if (creditor.amount < 0.01) cIdx++;
    }

    // Build CSV Content
    let csv = `Group Expense Sheet: "${group.name}"\n`;
    csv += `Generated Date,${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}\n\n`;
    csv += `--- GROUP SUMMARY ---\n`;
    csv += `Total Expenditure,$${totalExpense.toFixed(2)}\n`;
    csv += `Total Members,${members.length}\n\n`;

    csv += `--- MEMBER SUMMARY ---\n`;
    csv += `Member Name,Role,Total Paid,Net Balance\n`;
    members.forEach(m => {
      const username = userMap.get(m.userId)?.username || 'Unknown';
      const bal = netBalances[m.userId] || 0;
      const balText = bal > 0.01 ? `+$${bal.toFixed(2)}` : bal < -0.01 ? `-$${Math.abs(bal).toFixed(2)}` : '$0.00';
      csv += `"${username}","${m.role}","$${(totalPaid[m.userId] || 0).toFixed(2)}","${balText}"\n`;
    });
    csv += `\n`;

    csv += `--- RECOMMENDED SETTLEMENTS ---\n`;
    csv += `Debt Recommendation,Amount\n`;
    if (settlements.length === 0) {
      csv += `"All balances settled/cleared","$0.00"\n`;
    } else {
      settlements.forEach(s => {
        csv += `${s}\n`;
      });
    }
    csv += `\n`;

    csv += `--- DETAILED EXPENSES REGISTER ---\n`;
    csv += `Date,Type,Description,Amount,Logged By,Split Details\n`;
    messages.forEach(msg => {
      const dateText = new Date(msg.createdAt).toLocaleDateString() + ' ' + new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const sender = msg.senderName;
      let amountVal = 0;
      let desc = msg.message;
      let splitsText = "";

      try {
        const data = typeof msg.expenseData === 'string' ? JSON.parse(msg.expenseData) : msg.expenseData;
        if (data) {
          amountVal = data.amount || 0;
          if (msg.type === 'EXPENSE') {
            desc = data.description || msg.message;
            const splits = data.splits || {};
            splitsText = Object.entries(splits).map(([uId, val]) => {
              const name = userMap.get(uId)?.username || 'Unknown';
              return `${name}: $${Number(val).toFixed(2)}`;
            }).join('; ');
          } else if (msg.type === 'PAYMENT') {
            const fromName = userMap.get(data.from)?.username || 'Someone';
            const toName = userMap.get(data.to)?.username || 'Someone';
            desc = `Payment: ${fromName} -> ${toName}`;
          }
        }
      } catch (e) {}

      csv += `"${dateText}","${msg.type}","${desc}","$${amountVal.toFixed(2)}","${sender}","${splitsText}"\n`;
    });

    // Send CSV attachment
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="expense_sheet_${group.name.replace(/[^a-zA-Z0-9]/g, '_')}.csv"`);
    res.status(200).send(csv);
  } catch (error: any) {
    console.error("❌ Error generating CSV expense sheet:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

/**
 * 10. Undo/Delete a chat message (reverts associated expense splits and cashbook vouchers)
 */
export async function deleteChatMessage(req: AuthenticatedRequest, res: Response) {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: "Unauthorized access" });
    }

    const { messageId } = req.params;

    // Fetch the message
    const message = await prisma.chatMessage.findUnique({
      where: { id: messageId }
    });

    if (!message) {
      return res.status(404).json({ error: "Message not found" });
    }

    // Verify room exists in this company
    const group = await prisma.chatGroup.findFirst({
      where: { id: message.groupId, companyId: user.companyId }
    });

    if (!group) {
      return res.status(404).json({ error: "Chat group not found" });
    }

    // Verify authorization:
    // 1. Sender of the message
    // 2. Group founder/creator
    // 3. Company Admin or Super Admin
    let isAuthorized = message.senderId === user.userId || user.role === 'Admin' || user.isSuperAdmin;
    if (!isAuthorized) {
      const callerMembership = await prisma.groupMember.findFirst({
        where: { groupId: message.groupId, userId: user.userId }
      });
      if (callerMembership?.role === 'ADMIN') {
        isAuthorized = true;
      }
    }

    if (!isAuthorized) {
      return res.status(403).json({ error: "You are not authorized to undo this message" });
    }

    // Reference identifier for central cashbook records
    const referenceNo = `CHAT-${message.id.slice(0, 8).toUpperCase()}`;

    // Perform cascade deletion in database transaction
    await prisma.$transaction(async (tx) => {
      // 1. Delete associated cashbook vouchers (linked by referenceNo)
      await tx.cashbookVoucher.deleteMany({
        where: {
          companyId: user.companyId,
          referenceNo: referenceNo
        }
      });

      // 2. Delete associated company expenses (linked by referenceNo)
      await tx.companyExpense.deleteMany({
        where: {
          companyId: user.companyId,
          referenceNo: referenceNo
        }
      });

      // 3. Delete the message itself
      await tx.chatMessage.delete({
        where: { id: messageId }
      });
    });

    // Broadcast message deletion via Socket
    if (ioInstance) {
      ioInstance.to(`group_${message.groupId}`).emit('message_deleted', {
        groupId: message.groupId,
        messageId: messageId
      });
    }

    res.json({ message: "Message successfully undone/deleted." });
  } catch (error: any) {
    console.error("❌ Error undoing message:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}
