import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({ cors: true })
export class RealtimeGateway {
  @WebSocketServer()
  server: Server;

  @SubscribeMessage('presence.join')
  joinPresence(
    @ConnectedSocket() socket: Socket,
    @MessageBody() payload: { companyId: string; userId: string },
  ) {
    void socket.join(`company:${payload.companyId}`);
    this.server.to(`company:${payload.companyId}`).emit('presence.updated', payload);
  }
}
