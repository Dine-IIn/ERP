const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

// Chat Room Model
const ChatRoom = sequelize.define('ChatRoom', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  company_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'companies',
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  name: {
    type: DataTypes.STRING(255)
  },
  type: {
    type: DataTypes.ENUM('general', 'expense', 'direct', 'group', 'department'),
    allowNull: false,
    defaultValue: 'general'
  },
  description: {
    type: DataTypes.TEXT
  },
  created_by: {
    type: DataTypes.UUID,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  settings: {
    type: DataTypes.JSONB,
    defaultValue: {
      allow_file_sharing: true,
      allow_member_add: true,
      expense_visibility: 'group', // 'own', 'group', 'all'
      notification_enabled: true
    }
  }
}, {
  tableName: 'chat_rooms',
  indexes: [
    { fields: ['company_id'] },
    { fields: ['type'] },
    { fields: ['created_by'] }
  ]
});

// Chat Room Members
const ChatRoomMember = sequelize.define('ChatRoomMember', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  room_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'chat_rooms',
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  user_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  role: {
    type: DataTypes.ENUM('admin', 'member'),
    defaultValue: 'member'
  },
  joined_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  last_read_at: {
    type: DataTypes.DATE
  },
  is_muted: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  is_pinned: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  }
}, {
  tableName: 'chat_room_members',
  indexes: [
    { fields: ['room_id'] },
    { fields: ['user_id'] },
    { 
      unique: true, 
      fields: ['room_id', 'user_id'],
      name: 'unique_room_member'
    }
  ]
});

// Chat Messages
const ChatMessage = sequelize.define('ChatMessage', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  room_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'chat_rooms',
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  sender_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  message_type: {
    type: DataTypes.ENUM('text', 'file', 'expense', 'image', 'video', 'audio', 'system'),
    defaultValue: 'text'
  },
  content: {
    type: DataTypes.TEXT
  },
  attachments: {
    type: DataTypes.JSONB,
    defaultValue: []
  },
  expense_id: {
    type: DataTypes.UUID,
    references: {
      model: 'expenses',
      key: 'id'
    }
  },
  reply_to_id: {
    type: DataTypes.UUID,
    references: {
      model: 'chat_messages',
      key: 'id'
    }
  },
  is_edited: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  edited_at: {
    type: DataTypes.DATE
  },
  is_deleted: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  deleted_at: {
    type: DataTypes.DATE
  },
  metadata: {
    type: DataTypes.JSONB,
    defaultValue: {}
  }
}, {
  tableName: 'chat_messages',
  indexes: [
    { fields: ['room_id'] },
    { fields: ['sender_id'] },
    { fields: ['message_type'] },
    { fields: ['expense_id'] },
    { fields: ['created_at'] }
  ]
});

// Message Read Receipts
const MessageReadReceipt = sequelize.define('MessageReadReceipt', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  message_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'chat_messages',
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  user_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  read_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'message_read_receipts',
  timestamps: false,
  indexes: [
    { fields: ['message_id'] },
    { fields: ['user_id'] },
    { 
      unique: true, 
      fields: ['message_id', 'user_id'],
      name: 'unique_message_read'
    }
  ]
});

// Expense Tracking (for Expense Chat)
const Expense = sequelize.define('Expense', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  company_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'companies',
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  user_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  room_id: {
    type: DataTypes.UUID,
    references: {
      model: 'chat_rooms',
      key: 'id'
    }
  },
  title: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT
  },
  amount: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false
  },
  currency: {
    type: DataTypes.STRING(10),
    defaultValue: 'INR'
  },
  category: {
    type: DataTypes.STRING(100)
  },
  expense_date: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  payment_method: {
    type: DataTypes.STRING(50)
  },
  receipt_url: {
    type: DataTypes.STRING(500)
  },
  is_reimbursable: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  is_approved: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  approved_by: {
    type: DataTypes.UUID,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  approved_at: {
    type: DataTypes.DATE
  },
  split_type: {
    type: DataTypes.ENUM('none', 'equal', 'custom'),
    defaultValue: 'none'
  },
  split_details: {
    type: DataTypes.JSONB,
    defaultValue: []
  },
  tags: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    defaultValue: []
  },
  metadata: {
    type: DataTypes.JSONB,
    defaultValue: {}
  }
}, {
  tableName: 'expenses',
  indexes: [
    { fields: ['company_id'] },
    { fields: ['user_id'] },
    { fields: ['room_id'] },
    { fields: ['expense_date'] },
    { fields: ['category'] },
    { fields: ['is_approved'] }
  ]
});

module.exports = {
  ChatRoom,
  ChatRoomMember,
  ChatMessage,
  MessageReadReceipt,
  Expense
};
