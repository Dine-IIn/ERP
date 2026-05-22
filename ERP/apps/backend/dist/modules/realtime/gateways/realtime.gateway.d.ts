import { Server, Socket } from 'socket.io';
export declare class RealtimeGateway {
    server: Server;
    joinPresence(socket: Socket, payload: {
        companyId: string;
        userId: string;
    }): void;
}
