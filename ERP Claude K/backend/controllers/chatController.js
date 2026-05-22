const { ChatRoom, ChatRoomMember, ChatMessage, MessageReadReceipt, Expense } = require('../models/Chat');
const User = require('../models/User');
const { Op } = require('sequelize');

// ==================== CHAT ROOMS ====================
exports.createChatRoom = async (req, res) => {
  try {
    const { name, type, description, member_ids, settings } = req.body;

    const room = await ChatRoom.create({
      company_id: req.user.company_id,
      name,
      type: type || 'general',
      description,
      created_by: req.user.id,
      settings: settings || {}
    });

    // Add creator as admin
    await ChatRoomMember.create({
      room_id: room.id,
      user_id: req.user.id,
      role: 'admin'
    });

    // Add other members
    if (member_ids && Array.isArray(member_ids)) {
      const members = member_ids
        .filter(id => id !== req.user.id)
        .map(user_id => ({
          room_id: room.id,
          user_id,
          role: 'member'
        }));
      
      if (members.length > 0) {
        await ChatRoomMember.bulkCreate(members);
      }
    }

    res.status(201).json({
      success: true,
      message: 'Chat room created successfully',
      room
    });

  } catch (error) {
    console.error('Create room error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create chat room',
      error: error.message
    });
  }
};

exports.getUserChatRooms = async (req, res) => {
  try {
    const rooms = await ChatRoom.findAll({
      include: [
        {
          model: ChatRoomMember,
          as: 'members',
          where: { user_id: req.user.id },
          required: true
        },
        {
          model: ChatMessage,
          as: 'messages',
          limit: 1,
          order: [['created_at', 'DESC']],
          required: false
        }
      ],
      where: {
        company_id: req.user.company_id,
        is_active: true
      },
      order: [['updated_at', 'DESC']]
    });

    res.status(200).json({
      success: true,
      rooms
    });

  } catch (error) {
    console.error('Get rooms error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch chat rooms',
      error: error.message
    });
  }
};

exports.getChatRoomMessages = async (req, res) => {
  try {
    const { roomId } = req.params;
    const { page = 1, limit = 50 } = req.query;

    // Verify user is member of the room
    const membership = await ChatRoomMember.findOne({
      where: {
        room_id: roomId,
        user_id: req.user.id
      }
    });

    if (!membership) {
      return res.status(403).json({
        success: false,
        message: 'You are not a member of this chat room'
      });
    }

    const offset = (page - 1) * limit;

    const { count, rows: messages } = await ChatMessage.findAndCountAll({
      where: {
        room_id: roomId,
        is_deleted: false
      },
      include: [
        {
          model: User,
          as: 'sender',
          attributes: ['id', 'username', 'full_name', 'profile_picture']
        },
        {
          model: Expense,
          as: 'expense',
          required: false
        }
      ],
      limit: parseInt(limit),
      offset,
      order: [['created_at', 'DESC']]
    });

    res.status(200).json({
      success: true,
      messages: messages.reverse(),
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(count / limit)
      }
    });

  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch messages',
      error: error.message
    });
  }
};

exports.sendMessage = async (req, res) => {
  try {
    const { room_id, content, message_type, attachments, expense_id, reply_to_id } = req.body;

    // Verify user is member
    const membership = await ChatRoomMember.findOne({
      where: {
        room_id,
        user_id: req.user.id
      }
    });

    if (!membership) {
      return res.status(403).json({
        success: false,
        message: 'You are not a member of this chat room'
      });
    }

    const message = await ChatMessage.create({
      room_id,
      sender_id: req.user.id,
      message_type: message_type || 'text',
      content,
      attachments: attachments || [],
      expense_id,
      reply_to_id
    });

    // Update room's updated_at
    await ChatRoom.update(
      { updated_at: new Date() },
      { where: { id: room_id } }
    );

    // Fetch complete message with relations
    const completeMessage = await ChatMessage.findByPk(message.id, {
      include: [
        {
          model: User,
          as: 'sender',
          attributes: ['id', 'username', 'full_name', 'profile_picture']
        },
        {
          model: Expense,
          as: 'expense',
          required: false
        }
      ]
    });

    // Emit via Socket.io (handled in socket service)
    if (global.io) {
      global.io.to(room_id).emit('new_message', completeMessage);
    }

    res.status(201).json({
      success: true,
      message: completeMessage
    });

  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send message',
      error: error.message
    });
  }
};

// ==================== EXPENSE CHAT ====================
exports.createExpense = async (req, res) => {
  try {
    const {
      room_id,
      title,
      description,
      amount,
      category,
      expense_date,
      payment_method,
      is_reimbursable,
      split_type,
      split_details
    } = req.body;

    if (!title || !amount) {
      return res.status(400).json({
        success: false,
        message: 'Title and amount are required'
      });
    }

    const expense = await Expense.create({
      company_id: req.user.company_id,
      user_id: req.user.id,
      room_id,
      title,
      description,
      amount,
      category,
      expense_date: expense_date || new Date(),
      payment_method,
      is_reimbursable: is_reimbursable || false,
      split_type: split_type || 'none',
      split_details: split_details || []
    });

    // Create message in chat room
    if (room_id) {
      const message = await ChatMessage.create({
        room_id,
        sender_id: req.user.id,
        message_type: 'expense',
        content: `Added expense: ${title} - ₹${amount}`,
        expense_id: expense.id
      });

      if (global.io) {
        global.io.to(room_id).emit('new_expense', { expense, message });
      }
    }

    res.status(201).json({
      success: true,
      message: 'Expense created successfully',
      expense
    });

  } catch (error) {
    console.error('Create expense error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create expense',
      error: error.message
    });
  }
};

exports.getExpenses = async (req, res) => {
  try {
    const { room_id, start_date, end_date, category } = req.query;

    const where = {
      company_id: req.user.company_id
    };

    // Check permissions based on room settings
    if (room_id) {
      const room = await ChatRoom.findByPk(room_id);
      const membership = await ChatRoomMember.findOne({
        where: { room_id, user_id: req.user.id }
      });

      if (!membership) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }

      const visibility = room.settings.expense_visibility || 'group';
      
      if (visibility === 'own') {
        where.user_id = req.user.id;
      } else if (visibility === 'group') {
        where.room_id = room_id;
      }
      // 'all' = no additional filter
    } else {
      // Default: show only user's expenses
      where.user_id = req.user.id;
    }

    if (start_date && end_date) {
      where.expense_date = {
        [Op.between]: [new Date(start_date), new Date(end_date)]
      };
    }

    if (category) {
      where.category = category;
    }

    const expenses = await Expense.findAll({
      where,
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'username', 'full_name']
        }
      ],
      order: [['expense_date', 'DESC']]
    });

    // Calculate statistics
    const totalAmount = expenses.reduce((sum, exp) => sum + parseFloat(exp.amount), 0);
    const approvedAmount = expenses
      .filter(exp => exp.is_approved)
      .reduce((sum, exp) => sum + parseFloat(exp.amount), 0);
    const pendingAmount = totalAmount - approvedAmount;

    const byCategory = expenses.reduce((acc, exp) => {
      const cat = exp.category || 'Uncategorized';
      acc[cat] = (acc[cat] || 0) + parseFloat(exp.amount);
      return acc;
    }, {});

    res.status(200).json({
      success: true,
      expenses,
      statistics: {
        total: totalAmount,
        approved: approvedAmount,
        pending: pendingAmount,
        count: expenses.length,
        by_category: byCategory
      }
    });

  } catch (error) {
    console.error('Get expenses error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch expenses',
      error: error.message
    });
  }
};

exports.updateExpense = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const expense = await Expense.findByPk(id);

    if (!expense) {
      return res.status(404).json({
        success: false,
        message: 'Expense not found'
      });
    }

    // Check if user owns the expense or is admin
    if (expense.user_id !== req.user.id && !req.user.is_admin) {
      return res.status(403).json({
        success: false,
        message: 'You cannot edit this expense'
      });
    }

    await expense.update(updates);

    res.status(200).json({
      success: true,
      message: 'Expense updated successfully',
      expense
    });

  } catch (error) {
    console.error('Update expense error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update expense',
      error: error.message
    });
  }
};

exports.approveExpense = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if user has approval permission
    if (!req.user.is_admin) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to approve expenses'
      });
    }

    const expense = await Expense.findByPk(id);

    if (!expense) {
      return res.status(404).json({
        success: false,
        message: 'Expense not found'
      });
    }

    expense.is_approved = true;
    expense.approved_by = req.user.id;
    expense.approved_at = new Date();
    await expense.save();

    res.status(200).json({
      success: true,
      message: 'Expense approved successfully',
      expense
    });

  } catch (error) {
    console.error('Approve expense error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to approve expense',
      error: error.message
    });
  }
};

module.exports = exports;
