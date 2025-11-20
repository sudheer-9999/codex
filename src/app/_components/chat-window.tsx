"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { api } from "~/trpc/react";
import { io, type Socket } from "socket.io-client";
import type { MessageWithSender } from "~/utils/types";

interface ChatWindowProps {
  friendId: string;
  friendName: string;
  friendImage: string | null;
  onClose: () => void;
}

interface SocketMessage {
  id: string;
  chatId: string;
  senderId: string;
  content: string;
  timestamp: Date;
  sender: {
    id: string;
    name: string | null;
    image: string | null;
  };
}

export function ChatWindow({
  friendId,
  friendName,
  friendImage,
  onClose,
}: ChatWindowProps) {
  const { data: session } = useSession();
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<MessageWithSender[]>([]);
  const [isOnline, setIsOnline] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [chatId, setChatId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const utils = api.useUtils();

  // Get or create chat
  const {
    data: chatData,
    isPending: isLoading,
    error: queryError,
  } = api.chat.getOrCreateChat.useMutation({
    onSuccess: (data) => {
      setChatId(data.id);
      setMessages(data.messages);
      setError(null);
    },
    onError: (error) => {
      setError(error.message);
    },
  });

  // Send message mutation
  const sendMessageMutation = api.chat.sendMessage.useMutation({
    onError: (error) => {
      setError(error.message);
    },
  });

  // Load messages when chatId changes
  const { data: messagesData } = api.chat.getMessages.useQuery(
    { chatId: chatId!, limit: 50 },
    {
      enabled: !!chatId,
      refetchOnWindowFocus: false,
    },
  );

  useEffect(() => {
    if (messagesData?.messages) {
      setMessages(messagesData.messages);
    }
  }, [messagesData]);

  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (queryError) {
      setError(queryError.message);
    }
  }, [queryError]);

  // Socket.io setup
  useEffect(() => {
    if (!session?.user?.id || !chatId) return;

    const newSocket = io(
      process.env.NEXT_PUBLIC_SOCKET_URL ?? "http://localhost:3001", // Different port for Socket.io
      {
        withCredentials: true,
        transports: ["websocket", "polling"],
      },
    );
    setSocket(newSocket);

    // User goes online
    newSocket.emit("user_online", session.user.id);

    // Join chat room
    newSocket.emit("join_chat", chatId);

    // Listen for messages
    newSocket.on("receive_message", (newMessage: SocketMessage) => {
      setMessages((prev) => [...prev, newMessage as MessageWithSender]);
    });

    // Listen for online status
    newSocket.on("friend_online", (userId: string) => {
      if (userId === friendId) {
        setIsOnline(true);
      }
    });

    newSocket.on("friend_offline", (userId: string) => {
      if (userId === friendId) {
        setIsOnline(false);
      }
    });

    // Listen for typing indicators
    newSocket.on("user_typing", (data: { userId: string; chatId: string }) => {
      if (data.userId === friendId && data.chatId === chatId) {
        setIsTyping(true);
      }
    });

    newSocket.on(
      "user_stop_typing",
      (data: { userId: string; chatId: string }) => {
        if (data.userId === friendId && data.chatId === chatId) {
          setIsTyping(false);
        }
      },
    );

    return () => {
      newSocket.disconnect();
    };
  }, [session?.user?.id, chatId, friendId]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !chatId || !session?.user?.id) return;

    const messageData = {
      chatId,
      content: message.trim(),
    };

    // Optimistically update UI
    const optimisticMessage: MessageWithSender = {
      id: `temp-${Date.now()}`,
      content: message.trim(),
      chatId,
      senderId: session.user.id,
      timestamp: new Date(),
      updatedAt: new Date(),
      sender: {
        id: session.user.id,
        name: session.user.name ?? null,
        image: session.user.image ?? null,
      },
    };

    setMessages((prev) => [...prev, optimisticMessage]);
    setMessage("");

    // Stop typing indicator
    socket?.emit("typing_stop", { chatId, userId: session.user.id });

    try {
      // Save to database
      await sendMessageMutation.mutateAsync(messageData);

      // Refetch messages to get the actual message from database
      await utils.chat.getMessages.invalidate({ chatId });
    } catch (error) {
      console.error("Failed to send message:", error);
      // Remove optimistic message on error
      setMessages((prev) =>
        prev.filter((msg) => msg.id !== optimisticMessage.id),
      );
      setError("Failed to send message");
    }
  };

  const handleTyping = () => {
    if (!chatId || !session?.user?.id) return;

    // Start typing indicator
    socket?.emit("typing_start", { chatId, userId: session.user.id });

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Stop typing after 2 seconds of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      socket?.emit("typing_stop", { chatId, userId: session.user.id });
    }, 2000);
  };

  const formatTime = (timestamp: string | Date) => {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (isLoading) {
    return (
      <div className="fixed right-4 bottom-4 z-50 flex h-96 w-80 flex-col rounded-lg border border-gray-200 bg-white shadow-xl">
        <div className="flex h-full items-center justify-center">
          <div className="text-gray-500">Loading chat...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed right-4 bottom-4 z-50 flex h-96 w-80 flex-col rounded-lg border border-gray-200 bg-white shadow-xl">
        <div className="flex items-center justify-between rounded-t-lg border-b border-gray-200 bg-gray-50 p-4">
          <h3 className="text-sm font-semibold">Chat Error</h3>
          <button
            onClick={onClose}
            className="text-lg text-gray-500 hover:text-gray-700"
          >
            ×
          </button>
        </div>
        <div className="flex h-full items-center justify-center p-4">
          <div className="text-center text-red-600">
            <p className="text-sm">{error}</p>
            <button
              onClick={() => setError(null)}
              className="mt-2 text-xs text-blue-600 hover:text-blue-800"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed right-4 bottom-4 z-50 flex h-96 w-80 flex-col rounded-lg border border-gray-200 bg-white shadow-xl">
      {/* Chat Header */}
      <div className="flex items-center justify-between rounded-t-lg border-b border-gray-200 bg-gray-50 p-4">
        <div className="flex items-center gap-3">
          <div className="relative">
            <img
              src={friendImage ?? "/default-avatar.png"}
              alt={friendName}
              className="h-8 w-8 rounded-full"
            />
            <div
              className={`absolute -right-1 -bottom-1 h-3 w-3 rounded-full border-2 border-white ${
                isOnline ? "bg-green-500" : "bg-gray-400"
              }`}
            />
          </div>
          <div>
            <h3 className="text-sm font-semibold">{friendName}</h3>
            <p className="text-xs text-gray-500">
              {isOnline ? "Online" : "Offline"}
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-lg text-gray-500 hover:text-gray-700"
        >
          ×
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto bg-gray-50 p-4">
        {messages.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <div className="text-center text-sm text-gray-500">
              No messages yet. Start a conversation!
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${
                  msg.senderId === session?.user?.id
                    ? "justify-end"
                    : "justify-start"
                }`}
              >
                <div
                  className={`max-w-xs rounded-2xl px-4 py-2 ${
                    msg.senderId === session?.user?.id
                      ? "rounded-br-none bg-blue-600 text-white"
                      : "rounded-bl-none border border-gray-200 bg-white text-gray-800"
                  }`}
                >
                  <p className="text-sm">{msg.content}</p>
                  <p
                    className={`mt-1 text-xs ${
                      msg.senderId === session?.user?.id
                        ? "text-blue-100"
                        : "text-gray-500"
                    }`}
                  >
                    {formatTime(msg.timestamp)}
                  </p>
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="flex justify-start">
                <div className="rounded-2xl rounded-bl-none border border-gray-200 bg-white px-4 py-2">
                  <div className="flex space-x-1">
                    <div className="h-2 w-2 animate-bounce rounded-full bg-gray-400"></div>
                    <div
                      className="h-2 w-2 animate-bounce rounded-full bg-gray-400"
                      style={{ animationDelay: "0.2s" }}
                    ></div>
                    <div
                      className="h-2 w-2 animate-bounce rounded-full bg-gray-400"
                      style={{ animationDelay: "0.4s" }}
                    ></div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <form
        onSubmit={handleSendMessage}
        className="border-t border-gray-200 p-4"
      >
        <div className="flex gap-2">
          <input
            type="text"
            value={message}
            onChange={(e) => {
              setMessage(e.target.value);
              handleTyping();
            }}
            placeholder="Type a message..."
            className="flex-1 rounded-full border border-gray-300 px-3 py-2 text-sm focus:border-transparent focus:ring-2 focus:ring-blue-500 focus:outline-none"
            maxLength={1000}
          />
          <button
            type="submit"
            disabled={!message.trim() || sendMessageMutation.isPending}
            className="rounded-full bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
}
