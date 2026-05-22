"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.listChatGroups = listChatGroups;
exports.createChatGroup = createChatGroup;
exports.getChatGroupMessages = getChatGroupMessages;
exports.sendChatGroupMessage = sendChatGroupMessage;
exports.manageChatGroupMembers = manageChatGroupMembers;
exports.updateChatGroupSettings = updateChatGroupSettings;
exports.getCompanyChatStats = getCompanyChatStats;
const db_1 = __importDefault(require("../services/db"));
const index_1 = require("./index");
/**
 * 1. List all chat groups and individual DMs available to the user
 */
async function listChatGroups(req, res) {
    try {
        const user = req.user;
        if (!user) {
            return res.status(401).json({ error: "Unauthorized access" });
        }
        // Fetch all groups inside this corporate tenant
        const groups = await db_1.default.chatGroup.findMany({
            where: { companyId: user.companyId },
            orderBy: { updatedAt: 'desc' }
        });
        // Fetch all group member connections in this company
        const allMemberships = await db_1.default.groupMember.findMany();
        // Fetch all users in the company to map names
        const companyUsers = await db_1.default.user.findMany({
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
            }
            else {
                // GENERAL or EXPENSE groups
                const parsedSettings = JSON.parse(group.settings || '{}');
                const isPrivate = parsedSettings.isPrivate || false;
                // If it's private, only show if the user is a member
                if (!isPrivate || isMember) {
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
    }
    catch (error) {
        console.error("❌ Error listing chat spaces:", error);
        res.status(500).json({ error: "Internal server error" });
    }
}
/**
 * 2. Create a new general/expense group or individual DM channel
 */
async function createChatGroup(req, res) {
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
            const existingGroups = await db_1.default.chatGroup.findMany({
                where: {
                    companyId: user.companyId,
                    type: 'DIRECT'
                }
            });
            for (const group of existingGroups) {
                const members = await db_1.default.groupMember.findMany({
                    where: { groupId: group.id }
                });
                const hasUser = members.some(m => m.userId === user.userId);
                const hasRecipient = members.some(m => m.userId === recipientId);
                if (hasUser && hasRecipient && members.length === 2) {
                    // DM already exists, return it
                    const companyUsers = await db_1.default.user.findMany({ where: { companyId: user.companyId } });
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
            const newGroup = await db_1.default.chatGroup.create({
                data: {
                    companyId: user.companyId,
                    name: `DM_${user.userId}_${recipientId}`,
                    type: 'DIRECT',
                    createdById: user.userId,
                    settings: '{}'
                }
            });
            // Register both users as members
            await db_1.default.groupMember.createMany({
                data: [
                    { groupId: newGroup.id, userId: user.userId, role: 'ADMIN' },
                    { groupId: newGroup.id, userId: recipientId, role: 'MEMBER' }
                ]
            });
            const updatedMembers = await db_1.default.groupMember.findMany({ where: { groupId: newGroup.id } });
            const companyUsers = await db_1.default.user.findMany({ where: { companyId: user.companyId } });
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
            if (index_1.ioInstance) {
                index_1.ioInstance.to(user.userId).emit('group_created', payload);
                index_1.ioInstance.to(recipientId).emit('group_created', payload);
            }
            return res.status(201).json(payload);
        }
        // 2. GENERAL or EXPENSE Group Setup (Verifies Role Permissions)
        if (!name || name.trim().length === 0) {
            return res.status(400).json({ error: "Group name is required" });
        }
        // Role verification (Unless Company Admin or Super Admin, require permissions)
        if (user.role !== 'Admin' && !user.isSuperAdmin) {
            const dbUser = await db_1.default.user.findUnique({
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
        const newGroup = await db_1.default.chatGroup.create({
            data: {
                companyId: user.companyId,
                name: name.trim(),
                type,
                createdById: user.userId,
                settings: groupSettingsString
            }
        });
        // Creator becomes Group Admin
        await db_1.default.groupMember.create({
            data: {
                groupId: newGroup.id,
                userId: user.userId,
                role: 'ADMIN'
            }
        });
        const members = await db_1.default.groupMember.findMany({ where: { groupId: newGroup.id } });
        const companyUsers = await db_1.default.user.findMany({ where: { companyId: user.companyId } });
        const userMap = new Map(companyUsers.map(u => [u.id, u]));
        const payload = {
            ...newGroup,
            members: members.map(m => ({
                ...m,
                username: userMap.get(m.userId)?.username || 'Unknown'
            }))
        };
        // Broadcast group creation to all sockets in the company
        if (index_1.ioInstance) {
            index_1.ioInstance.emit('group_created', payload);
        }
        return res.status(201).json(payload);
    }
    catch (error) {
        console.error("❌ Error spawning chat space:", error);
        res.status(500).json({ error: "Internal server error" });
    }
}
/**
 * 3. Fetch conversation logs for a specific room
 */
async function getChatGroupMessages(req, res) {
    try {
        const user = req.user;
        if (!user) {
            return res.status(401).json({ error: "Unauthorized access" });
        }
        const { groupId } = req.params;
        // Verify room exists in this company
        const group = await db_1.default.chatGroup.findFirst({
            where: { id: groupId, companyId: user.companyId }
        });
        if (!group) {
            return res.status(404).json({ error: "Chat group not found" });
        }
        // Verify private room membership
        const parsedSettings = JSON.parse(group.settings || '{}');
        const isPrivate = parsedSettings.isPrivate || false;
        if (group.type === 'DIRECT' || isPrivate) {
            const isMember = await db_1.default.groupMember.findFirst({
                where: { groupId, userId: user.userId }
            });
            if (!isMember) {
                return res.status(403).json({ error: "You are not authorized to access this private space" });
            }
        }
        // Query messages in ascending timeline
        const messages = await db_1.default.chatMessage.findMany({
            where: { groupId },
            orderBy: { createdAt: 'asc' }
        });
        res.json(messages);
    }
    catch (error) {
        console.error("❌ Error retrieving message history:", error);
        res.status(500).json({ error: "Internal server error" });
    }
}
/**
 * 4. Dispatch a new message (text, expense, or peer payment receipt)
 */
async function sendChatGroupMessage(req, res) {
    try {
        const user = req.user;
        if (!user) {
            return res.status(401).json({ error: "Unauthorized access" });
        }
        const { groupId } = req.params;
        const { message, type, expenseData } = req.body;
        const group = await db_1.default.chatGroup.findFirst({
            where: { id: groupId, companyId: user.companyId }
        });
        if (!group) {
            return res.status(404).json({ error: "Chat group not found" });
        }
        // Verify user is a member
        const membership = await db_1.default.groupMember.findFirst({
            where: { groupId, userId: user.userId }
        });
        if (!membership && (group.type === 'DIRECT' || JSON.parse(group.settings || '{}').isPrivate)) {
            return res.status(403).json({ error: "You must join this room before posting" });
        }
        // Construct schema record
        const newMessage = await db_1.default.chatMessage.create({
            data: {
                groupId,
                senderId: user.userId,
                senderName: user.username,
                message: message || '',
                type: type || 'TEXT',
                expenseData: expenseData ? JSON.stringify(expenseData) : null
            }
        });
        // Update group timestamp
        await db_1.default.chatGroup.update({
            where: { id: groupId },
            data: { updatedAt: new Date() }
        });
        // Broadcast dynamically to this WebSocket group room
        if (index_1.ioInstance) {
            index_1.ioInstance.to(`group_${groupId}`).emit('new_chat_message', newMessage);
            // Also notify peer if it's a DM and they are not currently in the room
            if (group.type === 'DIRECT') {
                const otherMember = await db_1.default.groupMember.findFirst({
                    where: { groupId, userId: { not: user.userId } }
                });
                if (otherMember) {
                    index_1.ioInstance.to(otherMember.userId).emit('dm_incoming_notification', {
                        groupId,
                        senderName: user.username,
                        message: type === 'TEXT' ? message : `Logged an ${type.toLowerCase()}`
                    });
                }
            }
        }
        res.status(201).json(newMessage);
    }
    catch (error) {
        console.error("❌ Error logging chat message:", error);
        res.status(500).json({ error: "Internal server error" });
    }
}
/**
 * 5. Manage group participants (Add/Remove members)
 */
async function manageChatGroupMembers(req, res) {
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
        const group = await db_1.default.chatGroup.findFirst({
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
            const callerMembership = await db_1.default.groupMember.findFirst({
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
            const exists = await db_1.default.groupMember.findFirst({
                where: { groupId, userId: targetUserId }
            });
            if (exists) {
                return res.status(400).json({ error: "User is already a member of this chat space" });
            }
            await db_1.default.groupMember.create({
                data: {
                    groupId,
                    userId: targetUserId,
                    role: 'MEMBER'
                }
            });
        }
        else {
            // CANNOT remove the group creator/admin if they are the only admin
            if (targetUserId === group.createdById) {
                return res.status(400).json({ error: "Cannot remove the group founder/creator" });
            }
            await db_1.default.groupMember.deleteMany({
                where: { groupId, userId: targetUserId }
            });
        }
        // Fetch updated members
        const updatedMembers = await db_1.default.groupMember.findMany({ where: { groupId } });
        const companyUsers = await db_1.default.user.findMany({ where: { companyId: user.companyId } });
        const userMap = new Map(companyUsers.map(u => [u.id, u]));
        const payload = {
            ...group,
            members: updatedMembers.map(m => ({
                ...m,
                username: userMap.get(m.userId)?.username || 'Unknown'
            }))
        };
        if (index_1.ioInstance) {
            index_1.ioInstance.emit('group_created', payload); // Broadcast refreshed metadata
        }
        res.json(payload);
    }
    catch (error) {
        console.error("❌ Error modifying group members:", error);
        res.status(500).json({ error: "Internal server error" });
    }
}
/**
 * 6. Update general room configuration settings
 */
async function updateChatGroupSettings(req, res) {
    try {
        const user = req.user;
        if (!user) {
            return res.status(401).json({ error: "Unauthorized" });
        }
        const { groupId } = req.params;
        const { isPrivate } = req.body;
        const group = await db_1.default.chatGroup.findFirst({
            where: { id: groupId, companyId: user.companyId }
        });
        if (!group) {
            return res.status(404).json({ error: "Group space not found" });
        }
        // Verify administrative status
        let isAuthorized = user.role === 'Admin' || user.isSuperAdmin;
        if (!isAuthorized) {
            const callerMembership = await db_1.default.groupMember.findFirst({
                where: { groupId, userId: user.userId }
            });
            if (callerMembership?.role === 'ADMIN') {
                isAuthorized = true;
            }
        }
        if (!isAuthorized) {
            return res.status(403).json({ error: "Only group admins can update configurations" });
        }
        const updatedSettings = { isPrivate: !!isPrivate };
        const updatedGroup = await db_1.default.chatGroup.update({
            where: { id: groupId },
            data: {
                settings: JSON.stringify(updatedSettings)
            }
        });
        const updatedMembers = await db_1.default.groupMember.findMany({ where: { groupId } });
        const companyUsers = await db_1.default.user.findMany({ where: { companyId: user.companyId } });
        const userMap = new Map(companyUsers.map(u => [u.id, u]));
        const payload = {
            ...updatedGroup,
            members: updatedMembers.map(m => ({
                ...m,
                username: userMap.get(m.userId)?.username || 'Unknown'
            }))
        };
        if (index_1.ioInstance) {
            index_1.ioInstance.emit('group_created', payload); // Dispatch update
        }
        res.json(payload);
    }
    catch (error) {
        console.error("❌ Error updating group configurations:", error);
        res.status(500).json({ error: "Internal server error" });
    }
}
/**
 * 7. Retrieve company-wide stats: Total Company Expense, Individual Net Sum, Individual Total Expense
 */
async function getCompanyChatStats(req, res) {
    try {
        const user = req.user;
        if (!user) {
            return res.status(401).json({ error: "Unauthorized access" });
        }
        // 1. Fetch all expense groups in the company
        const groups = await db_1.default.chatGroup.findMany({
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
        const members = await db_1.default.groupMember.findMany({
            where: {
                groupId: { in: groupIds }
            },
            select: {
                groupId: true,
                userId: true
            }
        });
        // 3. Fetch all expense/payment messages in these groups
        const messages = await db_1.default.chatMessage.findMany({
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
        // Group the messages and members by groupId for faster access
        const messagesByGroup = {};
        const membersByGroup = {};
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
        let individualNetSum = 0;
        // For each group, compute balances
        groupIds.forEach(gId => {
            const gMembers = membersByGroup[gId];
            const gMessages = messagesByGroup[gId];
            const netBalances = {};
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
                    }
                    catch (e) {
                        console.error("Error parsing expenseData in stats:", e);
                    }
                }
                else if (msg.type === 'PAYMENT') {
                    try {
                        const data = typeof msg.expenseData === 'string' ? JSON.parse(msg.expenseData) : msg.expenseData;
                        if (data) {
                            const amount = Number(data.amount || 0);
                            const from = data.from;
                            const to = data.to;
                            netBalances[from] = (netBalances[from] || 0) + amount;
                            netBalances[to] = (netBalances[to] || 0) - amount;
                        }
                    }
                    catch (e) {
                        console.error("Error parsing payment expenseData in stats:", e);
                    }
                }
            });
            // Add this group's user balance to individualNetSum
            if (netBalances[user.userId] !== undefined) {
                individualNetSum += netBalances[user.userId];
            }
        });
        res.json({
            totalCompanyExpense,
            individualNetSum,
            individualTotalExpense
        });
    }
    catch (error) {
        console.error("❌ Error computing company stats:", error);
        res.status(500).json({ error: "Internal server error" });
    }
}
//# sourceMappingURL=chat.js.map