const socketIO = require('socket.io');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { ChatRoomMember } = require('../models/Chat');

const initializeSocket = (server) => {
  const io = socketIO(server, {
    cors: {
      origin: process.env.CORS_ORIGIN.split(','),
      methods: ['GET', 'POST'],
      credentials: true
    },
    pingTimeout: 60000,
    pingInterval: 25000
  });

  // Authentication middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];
      
      if (!token) {
        return next(new Error('Authentication token required'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      const user = await User.findByPk(decoded.id);
      if (!user || !user.is_active) {
        return next(new Error('Invalid or inactive user'));
      }

      socket.userId = user.id;
      socket.companyId = user.company_id;
      socket.username = user.username;
      
      next();
    } catch (error) {
      next(new Error('Authentication failed'));
    }
  });

  // Connection handler
  io.on('connection', (socket) => {
    console.log(`✅ User connected: ${socket.username} (${socket.userId})`);

    // Join user's personal room
    socket.join(`user:${socket.userId}`);
    socket.join(`company:${socket.companyId}`);

    // Join chat rooms
    socket.on('join_rooms', async (roomIds) => {
      try {
        // Verify user is member of these rooms
        const memberships = await ChatRoomMember.findAll({
          where: {
            user_id: socket.userId,
            room_id: roomIds
          }
        });

        const validRoomIds = memberships.map(m => m.room_id);
        
        validRoomIds.forEach(roomId => {
          socket.join(roomId);
          console.log(`User ${socket.username} joined room ${roomId}`);
        });

        socket.emit('rooms_joined', { rooms: validRoomIds });
      } catch (error) {
        console.error('Join rooms error:', error);
        socket.emit('error', { message: 'Failed to join rooms' });
      }
    });

    // Leave chat room
    socket.on('leave_room', (roomId) => {
      socket.leave(roomId);
      console.log(`User ${socket.username} left room ${roomId}`);
    });

    // Typing indicator
    socket.on('typing', ({ roomId, isTyping }) => {
      socket.to(roomId).emit('user_typing', {
        userId: socket.userId,
        username: socket.username,
        roomId,
        isTyping
      });
    });

    // Mark message as read
    socket.on('mark_read', ({ messageId, roomId }) => {
      socket.to(roomId).emit('message_read', {
        messageId,
        userId: socket.userId,
        timestamp: new Date()
      });
    });

    // Online status
    socket.on('update_status', (status) => {
      io.to(`company:${socket.companyId}`).emit('user_status_changed', {
        userId: socket.userId,
        status,
        timestamp: new Date()
      });
    });

    // Video call signaling
    socket.on('call_user', ({ targetUserId, offer }) => {
      io.to(`user:${targetUserId}`).emit('incoming_call', {
        from: socket.userId,
        username: socket.username,
        offer
      });
    });

    socket.on('answer_call', ({ targetUserId, answer }) => {
      io.to(`user:${targetUserId}`).emit('call_answered', {
        from: socket.userId,
        answer
      });
    });

    socket.on('ice_candidate', ({ targetUserId, candidate }) => {
      io.to(`user:${targetUserId}`).emit('ice_candidate', {
        from: socket.userId,
        candidate
      });
    });

    socket.on('end_call', ({ targetUserId }) => {
      io.to(`user:${targetUserId}`).emit('call_ended', {
        from: socket.userId
      });
    });

    // Disconnect handler
    socket.on('disconnect', () => {
      console.log(`❌ User disconnected: ${socket.username}`);
      
      // Notify others in the company
      io.to(`company:${socket.companyId}`).emit('user_status_changed', {
        userId: socket.userId,
        status: 'offline',
        timestamp: new Date()
      });
    });

    // Error handler
    socket.on('error', (error) => {
      console.error(`Socket error for user ${socket.username}:`, error);
    });
  });

  // Store io instance globally for use in controllers
  global.io = io;

  return io;
};

module.exports = { initializeSocket };
