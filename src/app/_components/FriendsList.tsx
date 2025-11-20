"use client";
import React, { useState } from "react";
import { api } from "~/trpc/react";
import { ChatWindow } from "./chat-window";
import { MessageCircle } from "lucide-react";

interface TFriend {
  name: string | null;
  id: string;
  email: string;
  image: string | null;
}

export function FriendsList() {
  const {
    data: friends,
    isLoading,
    isError,
  } = api.friend.getFriends.useQuery(undefined, {
    refetchOnWindowFocus: false,
  });

  if (isLoading) {
    return (
      <div className="mx-auto max-w-4xl space-y-4 p-4 sm:p-6">
        {[1, 2, 3, 4, 1, 5, 8, 74].map((_, i) => (
          <div
            key={i}
            className="flex animate-pulse items-center justify-between rounded-2xl border bg-white p-4 shadow-sm sm:p-5"
          >
            <div className="flex items-center space-x-4">
              <div className="h-12 w-12 rounded-full bg-gray-200 sm:h-14 sm:w-14" />
              <div className="space-y-2">
                <div className="h-4 w-32 rounded bg-gray-200 sm:w-40" />
                <div className="h-3 w-24 rounded bg-gray-200 sm:w-28" />
              </div>
            </div>
            <div className="h-6 w-16 rounded-full bg-gray-200 sm:w-20" />
          </div>
        ))}
      </div>
    );
  }

  if (isError || !friends) {
    return (
      <div className="rounded-lg border border-red-300 bg-red-50 p-4 text-red-700 shadow-sm">
        Error loading friends
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl p-4 sm:p-6">
      <h2 className="mb-6 text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
        Your Friends
      </h2>

      {friends.length === 0 ? (
        <div className="rounded-xl bg-gray-50 py-10 text-center shadow-sm sm:py-12">
          <p className="text-lg text-gray-600 sm:text-xl">No friends yet</p>
          <p className="mt-1 text-gray-400">
            Start adding friends to see them here!
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:gap-5">
          {friends.map((friend) => (
            <FriendCard key={friend.id} friend={friend} />
          ))}
        </div>
      )}
    </div>
  );
}

interface Props {
  friend: TFriend;
}

const FriendCard: React.FC<Props> = ({ friend }) => {
  const [isChatOpen, setIsChatOpen] = useState(false);

  const handleChatClick = () => setIsChatOpen(true);
  const handleCloseChat = () => setIsChatOpen(false);

  return (
    <>
      <div className="rounded-2xl bg-white p-4 shadow-md transition-all hover:shadow-xl sm:p-5">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center sm:gap-6">
          <div className="flex items-center gap-4">
            {friend.image ? (
              <img
                src={friend.image}
                alt={friend.name ?? "Friend"}
                className="h-12 w-12 rounded-full object-cover ring-2 ring-gray-200 sm:h-14 sm:w-14"
              />
            ) : (
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-200 text-lg font-semibold text-gray-600 ring-2 ring-gray-300 sm:h-14 sm:w-14 sm:text-xl">
                {(friend.name ?? "U").charAt(0).toUpperCase()}
              </div>
            )}

            <div>
              <h3 className="text-lg font-semibold text-gray-900 sm:text-xl">
                {friend.name ?? "Unknown User"}
              </h3>
              {friend.email && (
                <p className="pt-1 text-sm text-gray-600">{friend.email}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700 shadow-sm sm:text-sm">
              Friends
            </span>

            <button
              onClick={handleChatClick}
              className="rounded-full p-2 transition hover:bg-blue-50 hover:text-blue-600"
            >
              <MessageCircle className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      {isChatOpen && (
        <ChatWindow
          friendId={friend.id}
          friendName={friend.name ?? "Friend"}
          friendImage={friend.image}
          onClose={handleCloseChat}
        />
      )}
    </>
  );
};
