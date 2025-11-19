"use client";

import { api } from "~/trpc/react";

export function FriendRequests() {
  const utils = api.useUtils();
  const { data: requests, isLoading } =
    api.friend.getPendingRequests.useQuery();

  const acceptRequest = api.friend.acceptRequest.useMutation({
    onSuccess: () => {
      void utils.friend.getPendingRequests.invalidate();
      void utils.friend.getFriends.invalidate();
    },
  });

  const rejectRequest = api.friend.rejectRequest.useMutation({
    onSuccess: () => {
      void utils.friend.getPendingRequests.invalidate();
    },
  });

  if (isLoading) return <div>Loading requests...</div>;
  if (!requests?.length) return null;

  return (
    <div className="mb-6 rounded-lg bg-white p-6 shadow-md">
      <h2 className="mb-4 text-xl font-semibold">Friend Requests</h2>
      <div className="space-y-3">
        {requests.map((request) => (
          <div
            key={request.id}
            className="flex items-center justify-between rounded-lg border p-3"
          >
            <div className="flex items-center gap-3">
              <img
                src={request.fromUser.image ?? "/default-avatar.png"}
                alt={request.fromUser.name ?? "User"}
                className="h-8 w-8 rounded-full"
              />
              <span className="font-medium">{request.fromUser.name}</span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => acceptRequest.mutate({ requestId: request.id })}
                disabled={acceptRequest.isPending}
                className="rounded bg-green-600 px-3 py-1 text-sm text-white hover:bg-green-700 disabled:opacity-50"
              >
                {acceptRequest.isPending ? "..." : "Accept"}
              </button>
              <button
                onClick={() => rejectRequest.mutate({ requestId: request.id })}
                disabled={rejectRequest.isPending}
                className="rounded bg-red-600 px-3 py-1 text-sm text-white hover:bg-red-700 disabled:opacity-50"
              >
                {rejectRequest.isPending ? "..." : "Reject"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
