import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import type { ChatWithRelations, MessageWithSender } from "~/utils/types";

export const chatRouter = createTRPCRouter({
  // Get or create chat between two users
  getOrCreateChat: protectedProcedure
    .input(z.object({ friendId: z.string() }))
    .mutation(async ({ ctx, input }): Promise<ChatWithRelations> => {
      const userId = ctx.session.user.id;
      const friendId = input.friendId;

      // Check if users are friends
      const friendship = await ctx.db.friendship.findFirst({
        where: {
          OR: [
            { userId, friendId },
            { userId: friendId, friendId: userId },
          ],
        },
      });

      if (!friendship) {
        throw new Error("You can only chat with friends");
      }

      // Find existing chat with exactly these two members
      const existingChat = await ctx.db.chat.findFirst({
        where: {
          AND: [
            { members: { some: { userId } } },
            { members: { some: { userId: friendId } } },
          ],
        },
        include: {
          members: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  image: true,
                },
              },
            },
          },
          messages: {
            include: {
              sender: {
                select: {
                  id: true,
                  name: true,
                  image: true,
                },
              },
            },
            orderBy: {
              timestamp: "asc",
            },
            take: 50,
          },
        },
      });

      if (existingChat) {
        return existingChat as ChatWithRelations;
      }

      // Create new chat
      const newChat = await ctx.db.chat.create({
        data: {
          members: {
            create: [{ userId }, { userId: friendId }],
          },
        },
        include: {
          members: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  image: true,
                },
              },
            },
          },
          messages: {
            include: {
              sender: {
                select: {
                  id: true,
                  name: true,
                  image: true,
                },
              },
            },
            orderBy: {
              timestamp: "asc",
            },
          },
        },
      });

      return newChat as ChatWithRelations;
    }),

  // Send message
  sendMessage: protectedProcedure
    .input(
      z.object({
        chatId: z.string(),
        content: z.string().min(1).max(1000),
      }),
    )
    .mutation(async ({ ctx, input }): Promise<MessageWithSender> => {
      const userId = ctx.session.user.id;

      // Verify user is member of the chat
      const chatMember = await ctx.db.chatMember.findFirst({
        where: {
          chatId: input.chatId,
          userId,
        },
      });

      if (!chatMember) {
        throw new Error("You are not a member of this chat");
      }

      // Create message
      const message = await ctx.db.message.create({
        data: {
          content: input.content,
          chatId: input.chatId,
          senderId: userId,
        },
        include: {
          sender: {
            select: {
              id: true,
              name: true,
              image: true,
            },
          },
        },
      });

      // Update chat's updatedAt
      await ctx.db.chat.update({
        where: { id: input.chatId },
        data: { updatedAt: new Date() },
      });

      return message as MessageWithSender;
    }),

  // Get chat messages
  getMessages: protectedProcedure
    .input(
      z.object({
        chatId: z.string(),
        cursor: z.string().optional(),
        limit: z.number().min(1).max(50).default(50),
      }),
    )
    .query(
      async ({
        ctx,
        input,
      }): Promise<{ messages: MessageWithSender[]; nextCursor?: string }> => {
        const userId = ctx.session.user.id;

        // Verify user is member of the chat
        const chatMember = await ctx.db.chatMember.findFirst({
          where: {
            chatId: input.chatId,
            userId,
          },
        });

        if (!chatMember) {
          throw new Error("You are not a member of this chat");
        }

        const messages = await ctx.db.message.findMany({
          where: {
            chatId: input.chatId,
          },
          include: {
            sender: {
              select: {
                id: true,
                name: true,
                image: true,
              },
            },
          },
          orderBy: {
            timestamp: "desc",
          },
          take: input.limit + 1,
          cursor: input.cursor ? { id: input.cursor } : undefined,
        });

        let nextCursor: string | undefined = undefined;
        if (messages.length > input.limit) {
          const nextItem = messages.pop();
          nextCursor = nextItem!.id;
        }

        return {
          messages: messages.reverse() as MessageWithSender[],
          nextCursor,
        };
      },
    ),

  // Get user's chats
  getUserChats: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;

    const chats = await ctx.db.chat.findMany({
      where: {
        members: {
          some: { userId },
        },
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                image: true,
              },
            },
          },
        },
        messages: {
          orderBy: {
            timestamp: "desc",
          },
          take: 1,
          include: {
            sender: {
              select: {
                id: true,
                name: true,
                image: true,
              },
            },
          },
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
    });

    return chats as (ChatWithRelations & {
      messages: MessageWithSender[];
    })[];
  }),
});
