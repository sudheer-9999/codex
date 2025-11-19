import type { Session } from "next-auth";

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
