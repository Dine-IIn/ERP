const SuperAdmin = require('./SuperAdmin');
const Company = require('./Company');
const User = require('./User');
const Role = require('./Role');
const OTP = require('./OTP');
const { ChatRoom, ChatRoomMember, ChatMessage, MessageReadReceipt, Expense } = require('./Chat');

// Define Associations

// Company <-> User (One-to-Many)
Company.hasMany(User, { foreignKey: 'company_id', as: 'users' });
User.belongsTo(Company, { foreignKey: 'company_id', as: 'company' });

// Company <-> Role (One-to-Many)
Company.hasMany(Role, { foreignKey: 'company_id', as: 'roles' });
Role.belongsTo(Company, { foreignKey: 'company_id', as: 'company' });

// User <-> Role (Many-to-One)
User.belongsTo(Role, { foreignKey: 'role_id', as: 'role' });
Role.hasMany(User, { foreignKey: 'role_id', as: 'users' });

// Company <-> ChatRoom (One-to-Many)
Company.hasMany(ChatRoom, { foreignKey: 'company_id', as: 'chat_rooms' });
ChatRoom.belongsTo(Company, { foreignKey: 'company_id', as: 'company' });

// User <-> ChatRoom (Creator relationship)
User.hasMany(ChatRoom, { foreignKey: 'created_by', as: 'created_rooms' });
ChatRoom.belongsTo(User, { foreignKey: 'created_by', as: 'creator' });

// ChatRoom <-> ChatRoomMember (One-to-Many)
ChatRoom.hasMany(ChatRoomMember, { foreignKey: 'room_id', as: 'members' });
ChatRoomMember.belongsTo(ChatRoom, { foreignKey: 'room_id', as: 'room' });

// User <-> ChatRoomMember (One-to-Many)
User.hasMany(ChatRoomMember, { foreignKey: 'user_id', as: 'room_memberships' });
ChatRoomMember.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// ChatRoom <-> ChatMessage (One-to-Many)
ChatRoom.hasMany(ChatMessage, { foreignKey: 'room_id', as: 'messages' });
ChatMessage.belongsTo(ChatRoom, { foreignKey: 'room_id', as: 'room' });

// User <-> ChatMessage (One-to-Many)
User.hasMany(ChatMessage, { foreignKey: 'sender_id', as: 'sent_messages' });
ChatMessage.belongsTo(User, { foreignKey: 'sender_id', as: 'sender' });

// ChatMessage <-> Expense (One-to-One)
ChatMessage.belongsTo(Expense, { foreignKey: 'expense_id', as: 'expense' });
Expense.hasMany(ChatMessage, { foreignKey: 'expense_id', as: 'messages' });

// ChatMessage <-> ChatMessage (Reply relationship)
ChatMessage.belongsTo(ChatMessage, { foreignKey: 'reply_to_id', as: 'reply_to' });
ChatMessage.hasMany(ChatMessage, { foreignKey: 'reply_to_id', as: 'replies' });

// ChatMessage <-> MessageReadReceipt (One-to-Many)
ChatMessage.hasMany(MessageReadReceipt, { foreignKey: 'message_id', as: 'read_receipts' });
MessageReadReceipt.belongsTo(ChatMessage, { foreignKey: 'message_id', as: 'message' });

// User <-> MessageReadReceipt (One-to-Many)
User.hasMany(MessageReadReceipt, { foreignKey: 'user_id', as: 'read_receipts' });
MessageReadReceipt.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// Company <-> Expense (One-to-Many)
Company.hasMany(Expense, { foreignKey: 'company_id', as: 'expenses' });
Expense.belongsTo(Company, { foreignKey: 'company_id', as: 'company' });

// User <-> Expense (One-to-Many)
User.hasMany(Expense, { foreignKey: 'user_id', as: 'expenses' });
Expense.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// User <-> Expense (Approver relationship)
User.hasMany(Expense, { foreignKey: 'approved_by', as: 'approved_expenses' });
Expense.belongsTo(User, { foreignKey: 'approved_by', as: 'approver' });

// ChatRoom <-> Expense (One-to-Many)
ChatRoom.hasMany(Expense, { foreignKey: 'room_id', as: 'expenses' });
Expense.belongsTo(ChatRoom, { foreignKey: 'room_id', as: 'room' });

module.exports = {
  SuperAdmin,
  Company,
  User,
  Role,
  OTP,
  ChatRoom,
  ChatRoomMember,
  ChatMessage,
  MessageReadReceipt,
  Expense
};
