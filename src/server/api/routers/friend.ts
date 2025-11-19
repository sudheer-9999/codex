import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

export const friendRouter = createTRPCRouter({
  // Send Friend Request
  sendRequest: protectedProcedure
    .input(z.object({ toUserId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Check if users are the same
      if (input.toUserId === ctx.session.user.id) {
        throw new Error("Cannot send friend request to yourself");
      }

      // Check if request already exists
      const existingRequest = await ctx.db.friendRequest.findFirst({
        where: {
          OR: [
            { fromUserId: ctx.session.user.id, toUserId: input.toUserId },
            { fromUserId: input.toUserId, toUserId: ctx.session.user.id },
          ],
        },
      });

      if (existingRequest) {
        throw new Error("Friend request already exists");
      }

      // Check if already friends
      const existingFriendship = await ctx.db.friendship.findFirst({
        where: {
          OR: [
            { userId: ctx.session.user.id, friendId: input.toUserId },
            { userId: input.toUserId, friendId: ctx.session.user.id },
          ],
        },
      });

      if (existingFriendship) {
        throw new Error("Already friends with this user");
      }

      // Create friend request
      return ctx.db.friendRequest.create({
        data: {
          fromUserId: ctx.session.user.id,
          toUserId: input.toUserId,
        },
        include: {
          fromUser: {
            select: {
              name: true,
              image: true,
              id: true,
            },
          },
          toUser: {
            select: {
              name: true,
              image: true,
              id: true,
            },
          },
        },
      });
    }),

  // Accept Friend Request
  acceptRequest: protectedProcedure
    .input(z.object({ requestId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Find the request
      const request = await ctx.db.friendRequest.findFirst({
        where: {
          id: input.requestId,
          toUserId: ctx.session.user.id, // Only the recipient can accept
          status: "PENDING",
        },
        include: {
          fromUser: true,
          toUser: true,
        },
      });

      if (!request) {
        throw new Error("Friend request not found");
      }

      // Create friendship in both directions
      await ctx.db.friendship.createMany({
        data: [
          {
            userId: request.fromUserId,
            friendId: request.toUserId,
          },
          {
            userId: request.toUserId,
            friendId: request.fromUserId,
          },
        ],
      });

      // Update request status
      await ctx.db.friendRequest.update({
        where: { id: input.requestId },
        data: { status: "ACCEPTED" },
      });

      return { success: true };
    }),

  // Reject Friend Request
  rejectRequest: protectedProcedure
    .input(z.object({ requestId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const request = await ctx.db.friendRequest.findFirst({
        where: {
          id: input.requestId,
          toUserId: ctx.session.user.id,
          status: "PENDING",
        },
      });

      if (!request) {
        throw new Error("Friend request not found");
      }

      await ctx.db.friendRequest.update({
        where: { id: input.requestId },
        data: { status: "REJECTED" },
      });

      return { success: true };
    }),

  // Get Pending Friend Requests
  getPendingRequests: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.friendRequest.findMany({
      where: {
        toUserId: ctx.session.user.id,
        status: "PENDING",
      },
      include: {
        fromUser: {
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

  // Get Friends List
  getFriends: protectedProcedure.query(async ({ ctx }) => {
    const friendships = await ctx.db.friendship.findMany({
      where: {
        userId: ctx.session.user.id,
      },
      include: {
        friend: {
          select: {
            id: true,
            name: true,
            image: true,
            email: true,
          },
        },
      },
    });

    return friendships.map((f) => f.friend);
  }),
  cancelRequest: protectedProcedure
    .input(z.object({ requestId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const request = await ctx.db.friendRequest.findFirst({
        where: {
          id: input.requestId,
          fromUserId: ctx.session.user.id, // Only the sender can cancel
          status: "PENDING",
        },
      });

      if (!request) {
        throw new Error(
          "Friend request not found or you don't have permission to cancel it",
        );
      }

      await ctx.db.friendRequest.delete({
        where: { id: input.requestId },
      });

      return { success: true };
    }),

  // Check Friendship Status
  getFriendshipStatus: protectedProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ ctx, input }) => {
      if (input.userId === ctx.session.user.id) {
        return { status: "SELF" };
      }

      // Check if friends
      const friendship = await ctx.db.friendship.findFirst({
        where: {
          userId: ctx.session.user.id,
          friendId: input.userId,
        },
      });

      if (friendship) {
        return { status: "FRIENDS" };
      }

      // Check for pending request
      const pendingRequest = await ctx.db.friendRequest.findFirst({
        where: {
          OR: [
            {
              fromUserId: ctx.session.user.id,
              toUserId: input.userId,
              status: "PENDING",
            },
            {
              fromUserId: input.userId,
              toUserId: ctx.session.user.id,
              status: "PENDING",
            },
          ],
        },
      });

      if (pendingRequest) {
        return {
          status:
            pendingRequest.fromUserId === ctx.session.user.id
              ? "REQUEST_SENT"
              : "REQUEST_RECEIVED",
          requestId: pendingRequest.id,
        };
      }

      return { status: "NOT_FRIENDS" };
    }),
});
