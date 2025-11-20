import type { Session } from "next-auth";
import type { User, Chat, Message, ChatMember } from "@prisma/client";

export type Post = {
  id: string;
  content: string | null;
  image: string | null;
  video: string | null;
  authorId: string;
  createdAt: Date;
  author: {
    id: string;
    name: string | null;
    image: string | null;
  };
};
export type SessionType = Session | null;

export type MessageWithSender = Message & {
  sender: Pick<User, "id" | "name" | "image">;
};

export type ChatWithRelations = Chat & {
  members: (ChatMember & {
    user: Pick<User, "id" | "name" | "image">;
  })[];
  messages: MessageWithSender[];
};
