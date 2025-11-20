"use client";
import React, { useState } from "react";
import { api } from "~/trpc/react";
import { ChatWindow } from "./chat-window";

interface TFriend {
  name: string | null;
  id: string;
  email: string;
  image: string | null;
}

export function FriendsList() {
  // Fetch friends using tRPC
  const {
    data: friends,
    isLoading,
    isError,
  } = api.friend.getFriends.useQuery(undefined, {
    refetchOnWindowFocus: false,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-500"></div>
        <span className="ml-2">Loading friends...</span>
      </div>
    );
  }

  if (isError || !friends) {
    return (
      <div className="rounded-md border border-red-200 bg-red-50 p-4">
        <p className="text-red-800">Error loading friends</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl p-4">
      <h2 className="mb-6 text-2xl font-bold">Your Friends</h2>

      {friends.length === 0 ? (
        <div className="py-8 text-center">
          <p className="text-lg text-gray-500">No friends yet</p>
          <p className="text-gray-400">
            Start adding friends to see them here!
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
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

  const handleChatClick = () => {
    setIsChatOpen(true);
  };

  const handleCloseChat = () => {
    setIsChatOpen(false);
  };

  return (
    <>
      <div className="flex items-center space-x-4 rounded-lg bg-white p-4 shadow-md transition-shadow hover:shadow-lg">
        {/* Profile Image */}
        <div className="shrink-0">
          {friend.image ? (
            <img
              src={friend.image}
              alt={friend.name ?? "Friend"}
              className="h-12 w-12 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-300">
              <span className="font-medium text-gray-600">
                {(friend.name ?? "U").charAt(0).toUpperCase()}
              </span>
            </div>
          )}
        </div>

        {/* Friend Info */}
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900">
            {friend.name ?? "Unknown User"}
          </h3>
          {friend.email && (
            <p className="text-sm text-gray-600">{friend.email}</p>
          )}
        </div>

        {/* Actions */}
        <div className="flex shrink-0 items-center gap-2">
          {/* Status Badge */}
          <span className="inline-flex items-center rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-800">
            Friends
          </span>

          {/* Chat Icon */}
          <button
            onClick={handleChatClick}
            className="flex items-center justify-center rounded-full p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-blue-600"
            title="Start chat"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Chat Window */}
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
