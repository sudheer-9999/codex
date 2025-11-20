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
  const [isMinimized, setIsMinimized] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const chatWindowRef = useRef<HTMLDivElement>(null);

  const utils = api.useUtils();

  // Check mobile screen
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

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

  const toggleMinimize = () => {
    setIsMinimized(!isMinimized);
  };

  // Minimized state - just show header
  if (isMinimized) {
    return (
      <div
        ref={chatWindowRef}
        className={`fixed ${
          isMobile ? "inset-x-0 top-0 rounded-b-lg" : "right-4 bottom-4"
        } z-50 w-full ${
          isMobile ? "max-w-full" : "max-w-xs"
        } rounded-lg border border-gray-200 bg-white shadow-xl transition-all duration-300`}
      >
        <div className="flex items-center justify-between rounded-t-lg border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50 p-4">
          <div className="flex items-center gap-3">
            <div className="relative">
              <img
                src={friendImage ?? "/default-avatar.png"}
                alt={friendName}
                className="h-8 w-8 rounded-full border-2 border-white shadow-sm"
              />
              <div
                className={`absolute -right-1 -bottom-1 h-3 w-3 rounded-full border-2 border-white ${
                  isOnline ? "bg-green-500" : "bg-gray-400"
                }`}
              />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-800">
                {friendName}
              </h3>
              <p className="text-xs text-gray-600">
                {isOnline ? "Online" : "Offline"}
                {isTyping && " • Typing..."}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={toggleMinimize}
              className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-white hover:text-gray-700"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>
            <button
              onClick={onClose}
              className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-red-50 hover:text-red-600"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div
        ref={chatWindowRef}
        className={`fixed ${
          isMobile ? "inset-0" : "right-4 bottom-4"
        } z-50 flex ${
          isMobile ? "h-full w-full" : "h-96 w-80"
        } flex-col rounded-lg border border-gray-200 bg-white shadow-xl`}
      >
        <div className="flex h-full items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent"></div>
            <div className="text-sm text-gray-500">Loading chat...</div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        ref={chatWindowRef}
        className={`fixed ${
          isMobile ? "inset-0" : "right-4 bottom-4"
        } z-50 flex ${
          isMobile ? "h-full w-full" : "h-96 w-80"
        } flex-col rounded-lg border border-gray-200 bg-white shadow-xl`}
      >
        <div className="flex items-center justify-between rounded-t-lg border-b border-gray-200 bg-gradient-to-r from-red-50 to-orange-50 p-4">
          <h3 className="text-sm font-semibold text-red-800">Chat Error</h3>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-red-600 transition-colors hover:bg-red-100"
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
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
        <div className="flex h-full flex-col items-center justify-center p-6">
          <div className="mb-4 rounded-full bg-red-100 p-3">
            <svg
              className="h-8 w-8 text-red-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <div className="text-center">
            <p className="mb-2 text-sm font-medium text-red-800">{error}</p>
            <p className="mb-4 text-xs text-red-600">Please try again later</p>
            <button
              onClick={() => setError(null)}
              className="rounded-lg bg-red-600 px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-red-700"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={chatWindowRef}
      className={`fixed ${
        isMobile ? "inset-0" : "right-4 bottom-4"
      } z-50 flex ${
        isMobile ? "h-full w-full" : "h-[600px] w-96"
      } flex-col rounded-lg border border-gray-200 bg-white shadow-xl transition-all duration-300`}
    >
      {/* Enhanced Chat Header */}
      <div className="flex items-center justify-between rounded-t-lg border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50 p-4">
        <div className="flex items-center gap-3">
          <div className="relative">
            <img
              src={friendImage ?? "/default-avatar.png"}
              alt={friendName}
              className="h-10 w-10 rounded-full border-2 border-white shadow-sm"
            />
            <div
              className={`absolute -right-1 -bottom-1 h-3 w-3 rounded-full border-2 border-white ${
                isOnline ? "bg-green-500" : "bg-gray-400"
              }`}
            />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-800">
              {friendName}
            </h3>
            <p className="text-xs text-gray-600">
              {isOnline ? "Online" : "Offline"}
              {isTyping && " • Typing..."}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={toggleMinimize}
            className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-white hover:text-gray-700"
            title="Minimize"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M20 12H4"
              />
            </svg>
          </button>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-red-50 hover:text-red-600"
            title="Close"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Enhanced Messages Area */}
      <div className="flex-1 overflow-y-auto bg-gradient-to-b from-white to-gray-50/50 p-4">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <div className="mb-4 rounded-full bg-blue-50 p-4">
              <svg
                className="h-8 w-8 text-blue-400"
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
            </div>
            <p className="text-sm font-medium text-gray-600">No messages yet</p>
            <p className="mt-1 text-xs text-gray-500">
              Start a conversation with {friendName}!
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${
                  msg.senderId === session?.user?.id
                    ? "justify-end"
                    : "justify-start"
                }`}
              >
                <div className="flex max-w-[85%] flex-col">
                  {msg.senderId !== session?.user?.id && (
                    <p className="mb-1 ml-1 text-xs font-medium text-gray-600">
                      {msg.sender.name}
                    </p>
                  )}
                  <div
                    className={`rounded-2xl px-4 py-3 ${
                      msg.senderId === session?.user?.id
                        ? "rounded-br-none bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-sm"
                        : "rounded-bl-none border border-gray-200 bg-white text-gray-800 shadow-sm"
                    }`}
                  >
                    <p className="text-sm leading-relaxed">{msg.content}</p>
                    <p
                      className={`mt-2 text-xs ${
                        msg.senderId === session?.user?.id
                          ? "text-blue-100"
                          : "text-gray-500"
                      }`}
                    >
                      {formatTime(msg.timestamp)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="flex justify-start">
                <div className="flex max-w-[85%] flex-col">
                  <p className="mb-1 ml-1 text-xs font-medium text-gray-600">
                    {friendName}
                  </p>
                  <div className="rounded-2xl rounded-bl-none border border-gray-200 bg-white px-4 py-3 shadow-sm">
                    <div className="flex items-center space-x-1">
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
                    <p className="mt-2 text-xs text-gray-500">typing...</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Enhanced Message Input */}
      <form
        onSubmit={handleSendMessage}
        className="border-t border-gray-200 bg-white p-4"
      >
        <div className="flex gap-3">
          <div className="flex-1">
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
              placeholder={`Message ${friendName}...`}
              className="w-full rounded-2xl border border-gray-300 bg-gray-50 px-4 py-3 text-sm transition-colors placeholder:text-gray-500 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-200 focus:outline-none"
              maxLength={1000}
            />
          </div>
          <button
            type="submit"
            disabled={!message.trim() || sendMessageMutation.isPending}
            className="flex items-center justify-center rounded-2xl bg-gradient-to-r from-blue-600 to-blue-500 px-5 py-3 text-sm font-medium text-white shadow-sm transition-all hover:from-blue-700 hover:to-blue-600 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:from-blue-600 disabled:hover:to-blue-500"
          >
            {sendMessageMutation.isPending ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
            ) : (
              <svg
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                />
              </svg>
            )}
          </button>
        </div>
        {message.length > 800 && (
          <p className="mt-2 text-center text-xs text-gray-500">
            {message.length}/1000
          </p>
        )}
      </form>
    </div>
  );
}
