import { createTRPCRouter } from "~/server/api/trpc";
import { postRouter } from "./routers/post";
import { friendRouter } from "./routers/friend";
import { chatRouter } from "./routers/chat";

export const appRouter = createTRPCRouter({
  post: postRouter,
  friend: friendRouter,
  chat: chatRouter,
});

export type AppRouter = typeof appRouter;
