import { NextRequest, NextResponse } from "next/server";
import { Server as SocketIOServer } from "socket.io";
import { SocketServer } from "~/server/socket/socket";

export async function GET(req: NextRequest) {
  // This route is needed for Socket.io to work with Next.js
  return NextResponse.json({ message: "Socket.io endpoint" });
}

export async function POST(req: NextRequest) {
  // This route is needed for Socket.io to work with Next.js
  return NextResponse.json({ message: "Socket.io endpoint" });
}
