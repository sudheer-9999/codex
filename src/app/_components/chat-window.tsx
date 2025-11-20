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
    mutateAsync: getOrCreateChat,
  } = api.chat.getOrCreateChat.useMutation({
    onSuccess: (data) => {
      console.log("🚀 Chat created/retrieved:", data);
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

  // Initialize chat
  useEffect(() => {
    const initializeChat = async () => {
      if (session?.user?.id && friendId) {
        await getOrCreateChat({ friendId });
      }
    };

    void initializeChat();
  }, [session?.user?.id, friendId, getOrCreateChat]);

  useEffect(() => {
    if (queryError) {
      setError(queryError.message);
    }
  }, [queryError]);

  // Socket.io setup - FIXED TYPING EVENTS
  useEffect(() => {
    if (!session?.user?.id || !chatId) return;

    const SOCKET_URL = "http://localhost:5000";

    console.log("🔌 Connecting to socket server:", SOCKET_URL);

    const newSocket = io(SOCKET_URL, {
      withCredentials: true,
      transports: ["websocket", "polling"],
    });

    setSocket(newSocket);

    // Connection events
    newSocket.on("connect", () => {
      console.log("✅ Connected to socket server");

      // User goes online after connection is established
      newSocket.emit("user_online", {
        userId: session.user.id,
        userInfo: {
          name: session.user.name,
          email: session.user.email,
          image: session.user.image,
        },
      });

      // Join chat room
      newSocket.emit("join_chat", chatId);
    });

    // Listen for messages
    newSocket.on("receive_message", (newMessage: SocketMessage) => {
      console.log("📨 Received message:", newMessage);
      setMessages((prev) => [...prev, newMessage as MessageWithSender]);
    });

    // Listen for ANY user status changes
    newSocket.on(
      "user_status_changed",
      (data: { userId: string; isOnline: boolean }) => {
        console.log(
          `👤 User ${data.userId} is now ${data.isOnline ? "online" : "offline"}`,
        );

        // If the status change is for our friend, update their status
        if (data.userId === friendId) {
          setIsOnline(data.isOnline);
          console.log(
            `🎯 Friend ${friendId} status updated: ${data.isOnline ? "online" : "offline"}`,
          );
        }
      },
    );

    // Get initial list of online users when connecting
    newSocket.on(
      "online_users_list",
      (onlineUsers: Array<{ userId: string; isOnline: boolean }>) => {
        console.log("📋 Received online users list:", onlineUsers);

        // Check if our friend is in the online users list
        const friendStatus = onlineUsers.find(
          (user) => user.userId === friendId,
        );
        if (friendStatus) {
          setIsOnline(true);
          console.log(`🎯 Friend ${friendId} is online (from initial list)`);
        } else {
          setIsOnline(false);
          console.log(`🎯 Friend ${friendId} is offline (from initial list)`);
        }
      },
    );

    // FIXED: Listen for typing indicators - using correct event names
    newSocket.on(
      "user_typing",
      (data: { userId: string; chatId: string; isTyping: boolean }) => {
        console.log(
          `⌨️ User ${data.userId} typing status: ${data.isTyping} in chat ${data.chatId}`,
        );
        if (
          data.userId === friendId &&
          data.chatId === chatId &&
          data.isTyping
        ) {
          setIsTyping(true);
          console.log(`🎯 Friend ${friendId} is typing`);
        }
      },
    );

    newSocket.on(
      "user_stop_typing",
      (data: { userId: string; chatId: string; isTyping: boolean }) => {
        console.log(
          `💤 User ${data.userId} stopped typing in chat ${data.chatId}`,
        );
        if (data.userId === friendId && data.chatId === chatId) {
          setIsTyping(false);
          console.log(`🎯 Friend ${friendId} stopped typing`);
        }
      },
    );

    // Alternative typing events (for backward compatibility)
    newSocket.on(
      "user_typing_started",
      (data: { userId: string; chatId: string; typingUsers: string[] }) => {
        console.log(
          `⌨️ User ${data.userId} started typing in chat ${data.chatId}`,
        );
        if (data.userId === friendId && data.chatId === chatId) {
          setIsTyping(true);
        }
      },
    );

    newSocket.on(
      "user_typing_stopped",
      (data: { userId: string; chatId: string; typingUsers: string[] }) => {
        console.log(
          `💤 User ${data.userId} stopped typing in chat ${data.chatId}`,
        );
        if (data.userId === friendId && data.chatId === chatId) {
          setIsTyping(false);
        }
      },
    );

    newSocket.on("disconnect", () => {
      console.log("❌ Disconnected from socket server");
      setIsOnline(false);
      setIsTyping(false);
    });

    newSocket.on("connect_error", (error) => {
      console.error("💥 Socket connection error:", error);
      setError("Failed to connect to chat server");
    });

    return () => {
      console.log("🧹 Cleaning up socket connection");
      // Stop typing when component unmounts
      if (chatId && session?.user?.id) {
        newSocket.emit("typing_stop", { chatId, userId: session.user.id });
      }
      if (chatId) {
        newSocket.emit("leave_chat", chatId);
      }
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
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
    socket?.emit("typing_stop", { chatId, userId: session.user.id });
    socket?.emit("user_typing", {
      chatId,
      userId: session.user.id,
      isTyping: false,
    });

    try {
      // Save to database
      const result = await sendMessageMutation.mutateAsync(messageData);

      // Replace optimistic message with real message from database
      setMessages((prev) =>
        prev.filter((msg) => msg.id !== optimisticMessage.id),
      );

      // Add the real message
      if (result) {
        setMessages((prev) => [...prev, result]);

        // Emit socket event for real-time messaging
        socket?.emit("send_message", {
          chatId,
          message: {
            ...result,
            timestamp: new Date(result.timestamp),
          },
        });
      }

      // Refetch messages to ensure consistency
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

  // FIXED: Enhanced typing handler
  const handleTyping = () => {
    if (!chatId || !session?.user?.id || !socket) return;

    console.log("⌨️ User started typing...");

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Start typing indicator
    socket.emit("user_typing", {
      chatId,
      userId: session.user.id,
      isTyping: true,
    });
    socket.emit("typing_start", {
      chatId,
      userId: session.user.id,
    });

    // Stop typing after 2 seconds of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      console.log("💤 Auto-stop typing after inactivity");
      socket.emit("user_typing", {
        chatId,
        userId: session.user.id,
        isTyping: false,
      });
      socket.emit("typing_stop", {
        chatId,
        userId: session.user.id,
      });
      setIsTyping(false);
    }, 2000);
  };

  // Handle input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessage(e.target.value);
    if (e.target.value.trim()) {
      handleTyping();
    } else {
      // If input is empty, stop typing
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
      socket?.emit("user_typing", {
        chatId,
        userId: session?.user?.id,
        isTyping: false,
      });
      socket?.emit("typing_stop", {
        chatId,
        userId: session?.user?.id,
      });
    }
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
              {isTyping && " • Typing..."}
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
                  <p className="mt-1 text-xs text-gray-500">typing...</p>
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
            onChange={handleInputChange}
            onBlur={() => {
              // Stop typing when input loses focus
              if (typingTimeoutRef.current) {
                clearTimeout(typingTimeoutRef.current);
                typingTimeoutRef.current = null;
              }
              socket?.emit("user_typing", {
                chatId,
                userId: session?.user?.id,
                isTyping: false,
              });
              socket?.emit("typing_stop", {
                chatId,
                userId: session?.user?.id,
              });
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
