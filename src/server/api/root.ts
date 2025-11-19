import { createTRPCRouter } from "~/server/api/trpc";
import { postRouter } from "./routers/post";
import { friendRouter } from "./routers/friend";

export const appRouter = createTRPCRouter({
  post: postRouter,
  friend: friendRouter,
});

export type AppRouter = typeof appRouter;
