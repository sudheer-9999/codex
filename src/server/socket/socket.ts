import { Server as SocketIOServer } from "socket.io";
import { type Server as HTTPServer } from "http";

interface SocketMessageData {
  chatId: string;
  senderId: string;
  content: string;
}

interface TypingData {
  chatId: string;
  userId: string;
}

export class SocketServer {
  private static io: SocketIOServer;
  private static onlineUsers = new Map<string, string>(); // userId -> socketId

  static initializeServer(server: HTTPServer) {
    if (this.io) return this.io;

    this.io = new SocketIOServer(server, {
      cors: {
        origin: process.env.NEXTAUTH_URL ?? "http://localhost:3000",
        methods: ["GET", "POST"],
      },
    });

    this.io.on("connection", (socket) => {
      console.log("User connected:", socket.id);

      // User goes online
      socket.on("user_online", (userId: string) => {
        this.onlineUsers.set(userId, socket.id);
        socket.broadcast.emit("friend_online", userId);
        console.log(`User ${userId} is online`);
      });

      // User goes offline
      socket.on("disconnect", () => {
        for (const [userId, socketId] of this.onlineUsers.entries()) {
          if (socketId === socket.id) {
            this.onlineUsers.delete(userId);
            socket.broadcast.emit("friend_offline", userId);
            console.log(`User ${userId} is offline`);
            break;
          }
        }
      });

      // Join chat room
      socket.on("join_chat", async (chatId: string) => {
        await socket.join(chatId);
        console.log(`User joined chat: ${chatId}`);
      });

      // Send message
      socket.on("send_message", async (data: SocketMessageData) => {
        // Broadcast to all users in the chat room
        this.io?.to(data.chatId).emit("receive_message", {
          ...data,
          timestamp: new Date(),
        });
      });

      // Typing indicators
      socket.on("typing_start", (data: TypingData) => {
        socket.to(data.chatId).emit("user_typing", data.userId);
      });

      socket.on("typing_stop", (data: TypingData) => {
        socket.to(data.chatId).emit("user_stop_typing", data.userId);
      });
    });

    return this.io;
  }

  static getIO() {
    if (!this.io) {
      throw new Error("Socket.io not initialized");
    }
    return this.io;
  }

  static isUserOnline(userId: string): boolean {
    return this.onlineUsers.has(userId);
  }
}
