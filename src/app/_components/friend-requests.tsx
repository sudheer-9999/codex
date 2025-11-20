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

  if (isLoading)
    return (
      <div className="mb-6 animate-pulse rounded-xl bg-white p-6 shadow">
        <div className="mb-4 h-5 w-32 rounded bg-gray-200"></div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="flex items-center justify-between rounded-lg border p-3"
            >
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-gray-200" />
                <div className="h-4 w-24 rounded bg-gray-200" />
              </div>
              <div className="flex gap-2">
                <div className="h-8 w-16 rounded bg-gray-200" />
                <div className="h-8 w-16 rounded bg-gray-200" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );

  if (!requests?.length) return null;

  return (
    <div className="mb-6 rounded-xl bg-white p-6 shadow-md">
      <h2 className="mb-4 text-2xl font-bold text-gray-900">Friend Requests</h2>

      <div className="space-y-4">
        {requests.map((request) => (
          <div
            key={request.id}
            className="flex flex-col gap-4 rounded-xl border p-4 transition hover:shadow sm:flex-row sm:items-center sm:justify-between"
          >
            {/* User Info */}
            <div className="flex items-center gap-3">
              <img
                src={request.fromUser.image ?? "/default-avatar.png"}
                alt={request.fromUser.name ?? "User"}
                className="h-12 w-12 rounded-full object-cover ring-2 ring-gray-200"
              />
              <div className="flex flex-col">
                <span className="font-medium text-gray-900">
                  {request.fromUser.name}
                </span>
                <span className="mt-1 w-fit rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-700">
                  Incoming request
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => acceptRequest.mutate({ requestId: request.id })}
                disabled={acceptRequest.isPending}
                className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {acceptRequest.isPending ? "Accepting..." : "Accept"}
              </button>

              <button
                onClick={() => rejectRequest.mutate({ requestId: request.id })}
                disabled={rejectRequest.isPending}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {rejectRequest.isPending ? "Rejecting..." : "Reject"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
