"use client";

import { api } from "~/trpc/react";

interface FriendStatusProps {
  userId: string;
  userName: string | null;
}

export function FriendStatus({ userId, userName }: FriendStatusProps) {
  const utils = api.useUtils();

  const { data: friendshipStatus, isLoading } =
    api.friend.getFriendshipStatus.useQuery({ userId }, { enabled: !!userId });

  const sendFriendRequest = api.friend.sendRequest.useMutation({
    onSuccess: () => {
      void utils.friend.getFriendshipStatus.invalidate();
    },
  });

  const acceptRequest = api.friend.acceptRequest.useMutation({
    onSuccess: () => {
      void utils.friend.getFriendshipStatus.invalidate();
      void utils.friend.getFriends.invalidate();
      void utils.friend.getPendingRequests.invalidate();
    },
  });

  if (isLoading) return <div className="text-sm text-gray-500">Loading...</div>;

  const status = friendshipStatus?.status;

  switch (status) {
    case "FRIENDS":
      return <span className="text-sm text-green-600">✓ Friends</span>;

    case "REQUEST_SENT":
      return <span className="text-sm text-yellow-600">Request Sent</span>;

    case "REQUEST_RECEIVED":
      return (
        <div className="flex items-center gap-2">
          <span className="text-sm text-blue-600">Wants to connect</span>
          <button
            onClick={() =>
              friendshipStatus?.requestId &&
              acceptRequest.mutate({ requestId: friendshipStatus.requestId })
            }
            disabled={acceptRequest.isPending}
            className="rounded bg-green-600 px-2 py-1 text-xs text-white hover:bg-green-700 disabled:opacity-50"
          >
            {acceptRequest.isPending ? "..." : "Accept"}
          </button>
        </div>
      );

    case "SELF":
      return <span className="text-sm text-gray-500">You</span>;

    default:
      return (
        <button
          onClick={() => sendFriendRequest.mutate({ toUserId: userId })}
          disabled={sendFriendRequest.isPending}
          className="rounded bg-blue-600 px-3 py-1 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {sendFriendRequest.isPending ? "Sending..." : "Add Friend"}
        </button>
      );
  }
}
