import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

export const postRouter = createTRPCRouter({
  // Create Post
  create: protectedProcedure
    .input(
      z.object({
        content: z.string().optional(),
        image: z.string().optional(),
        video: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.post.create({
        data: {
          content: input.content,
          image: input.image,
          video: input.video,
          authorId: ctx.session.user.id,
        },
        include: {
          author: {
            select: {
              name: true,
              image: true,
              id: true,
            },
          },
        },
      });
    }),

  // Get All Posts
  getAll: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.post.findMany({
      include: {
        author: {
          select: {
            name: true,
            image: true,
            id: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }),

  // Update Post
  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        content: z.string().optional(),
        image: z.string().optional(),
        video: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Check if user owns the post
      const post = await ctx.db.post.findFirst({
        where: {
          id: input.id,
          authorId: ctx.session.user.id,
        },
      });

      if (!post) {
        throw new Error("Post not found or you don't have permission");
      }

      return ctx.db.post.update({
        where: { id: input.id },
        data: {
          content: input.content,
          image: input.image,
          video: input.video,
        },
        include: {
          author: {
            select: {
              name: true,
              image: true,
              id: true,
            },
          },
        },
      });
    }),

  // Delete Post
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Check if user owns the post
      const post = await ctx.db.post.findFirst({
        where: {
          id: input.id,
          authorId: ctx.session.user.id,
        },
      });

      if (!post) {
        throw new Error("Post not found or you don't have permission");
      }

      return ctx.db.post.delete({
        where: { id: input.id },
      });
    }),
});
