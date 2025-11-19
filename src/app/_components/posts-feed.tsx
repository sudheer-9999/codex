"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { api } from "~/trpc/react";
import type { Post, SessionType } from "~/utils/types";

export function PostsFeed() {
  const { data: session } = useSession();
  const utils = api.useUtils();
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [editImage, setEditImage] = useState("");
  const [editVideo, setEditVideo] = useState("");

  const { data: posts, isLoading } = api.post.getAll.useQuery();

  // Friend request mutations
  const sendFriendRequest = api.friend.sendRequest.useMutation({
    onSuccess: () => {
      void utils.friend.getFriendshipStatus.invalidate();
      void utils.friend.getPendingRequests.invalidate();
    },
  });

  const acceptRequest = api.friend.acceptRequest.useMutation({
    onSuccess: () => {
      void utils.friend.getFriendshipStatus.invalidate();
      void utils.friend.getFriends.invalidate();
      void utils.friend.getPendingRequests.invalidate();
    },
  });

  const cancelRequest = api.friend.cancelRequest.useMutation({
    onSuccess: () => {
      void utils.friend.getFriendshipStatus.invalidate();
      void utils.friend.getPendingRequests.invalidate();
    },
  });

  const deletePost = api.post.delete.useMutation({
    onSuccess: () => {
      void utils.post.getAll.invalidate();
    },
  });

  const updatePost = api.post.update.useMutation({
    onSuccess: () => {
      void utils.post.getAll.invalidate();
      setEditingPostId(null);
      setEditContent("");
      setEditImage("");
      setEditVideo("");
    },
  });

  const startEditing = (post: Post) => {
    setEditingPostId(post.id);
    setEditContent(post.content ?? "");
    setEditImage(post.image ?? "");
    setEditVideo(post.video ?? "");
  };

  const cancelEditing = () => {
    setEditingPostId(null);
    setEditContent("");
    setEditImage("");
    setEditVideo("");
  };

  const handleUpdate = (postId: string) => {
    updatePost.mutate({
      id: postId,
      content: editContent,
      image: editImage,
      video: editVideo,
    });
  };

  // Handle friend action based on status
  const handleFriendAction = (
    postAuthorId: string,
    currentStatus: string,
    requestId?: string,
  ) => {
    if (!session?.user?.id) return;

    if (postAuthorId === session.user.id) return; // Can't friend yourself

    switch (currentStatus) {
      case "NOT_FRIENDS":
        sendFriendRequest.mutate({ toUserId: postAuthorId });
        break;
      case "REQUEST_RECEIVED":
        if (requestId) {
          acceptRequest.mutate({ requestId });
        }
        break;
      case "FRIENDS":
        alert("You are already friends! Chat feature coming soon.");
        break;
      case "REQUEST_SENT":
        // Don't do anything here - we'll handle cancel separately
        break;
    }
  };

  // Handle cancel friend request
  const handleCancelRequest = (requestId: string) => {
    if (
      window.confirm("Are you sure you want to cancel this friend request?")
    ) {
      cancelRequest.mutate({ requestId });
    }
  };

  if (isLoading) {
    return <div className="py-4 text-center">Loading posts...</div>;
  }

  if (!posts?.length) {
    return (
      <div className="py-4 text-center">
        No posts yet. Be the first to post!
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {(posts as Post[]).map((post) => (
        <PostCard
          key={post.id}
          post={post}
          session={session}
          editingPostId={editingPostId}
          editContent={editContent}
          editImage={editImage}
          editVideo={editVideo}
          onEditChange={setEditContent}
          onImageChange={setEditImage}
          onVideoChange={setEditVideo}
          onStartEditing={startEditing}
          onCancelEditing={cancelEditing}
          onUpdate={handleUpdate}
          onFriendAction={handleFriendAction}
          onCancelRequest={handleCancelRequest}
          onDelete={() => deletePost.mutate({ id: post.id })}
          isUpdating={updatePost.isPending}
          isDeleting={deletePost.isPending}
          isSendingRequest={sendFriendRequest.isPending}
          isAcceptingRequest={acceptRequest.isPending}
          isCancelingRequest={cancelRequest.isPending}
        />
      ))}
    </div>
  );
}

// Props interface for PostCard
interface PostCardProps {
  post: Post;
  session: SessionType;
  editingPostId: string | null;
  editContent: string;
  editImage: string;
  editVideo: string;
  onEditChange: (value: string) => void;
  onImageChange: (value: string) => void;
  onVideoChange: (value: string) => void;
  onStartEditing: (post: Post) => void;
  onCancelEditing: () => void;
  onUpdate: (postId: string) => void;
  onFriendAction: (userId: string, status: string, requestId?: string) => void;
  onCancelRequest: (requestId: string) => void;
  onDelete: () => void;
  isUpdating: boolean;
  isDeleting: boolean;
  isSendingRequest: boolean;
  isAcceptingRequest: boolean;
  isCancelingRequest: boolean;
}

// Separate component for individual post card
function PostCard({
  post,
  session,
  editingPostId,
  editContent,
  editImage,
  editVideo,
  onEditChange,
  onImageChange,
  onVideoChange,
  onStartEditing,
  onCancelEditing,
  onUpdate,
  onFriendAction,
  onCancelRequest,
  onDelete,
  isUpdating,
  isDeleting,
  isSendingRequest,
  isAcceptingRequest,
  isCancelingRequest,
}: PostCardProps) {
  const { data: friendshipStatus } = api.friend.getFriendshipStatus.useQuery(
    { userId: post.author.id },
    { enabled: !!session?.user?.id && post.author.id !== session.user?.id },
  );

  const isOwnPost = session?.user?.id === post.author.id;
  const isEditing = editingPostId === post.id;

  const getFriendButton = () => {
    if (isOwnPost) return null;

    const status = friendshipStatus?.status;
    const requestId = friendshipStatus?.requestId;

    const buttonConfigs = {
      FRIENDS: {
        icon: "✅",
        text: "Friends",
        className: "text-green-600 bg-green-50",
        disabled: true,
        showCancel: false,
      },
      REQUEST_SENT: {
        icon: "⏳",
        text: isCancelingRequest ? "Canceling..." : "Request Sent",
        className: "text-yellow-600 bg-yellow-50 hover:bg-yellow-100",
        disabled: isCancelingRequest,
        showCancel: true,
      },
      REQUEST_RECEIVED: {
        icon: "👋",
        text: isAcceptingRequest ? "Accepting..." : "Accept Request",
        className: "text-blue-600 bg-blue-50 hover:bg-blue-100",
        disabled: isAcceptingRequest,
        showCancel: false,
      },
      NOT_FRIENDS: {
        icon: "👤",
        text: isSendingRequest ? "Sending..." : "Add Friend",
        className: "text-gray-600 bg-gray-50 hover:bg-gray-100",
        disabled: isSendingRequest,
        showCancel: false,
      },
      SELF: null,
    };

    const config = status
      ? buttonConfigs[status as keyof typeof buttonConfigs]
      : null;
    if (!config) return null;

    if (!status) {
      return (
        <button
          onClick={() => onFriendAction(post.author.id, "NOT_FRIENDS")}
          disabled={isSendingRequest}
          className={`flex items-center gap-2 rounded-full bg-gray-50 px-3 py-1 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 ${isSendingRequest ? "cursor-not-allowed opacity-50" : ""}`}
        >
          <span>👤</span>
          <span>{isSendingRequest ? "Sending..." : "Add Friend"}</span>
        </button>
      );
    }

    return (
      <div className="flex items-center gap-2">
        <button
          onClick={() => onFriendAction(post.author.id, status, requestId)}
          disabled={config.disabled}
          className={`flex items-center gap-2 rounded-full px-3 py-1 text-sm font-medium transition-colors ${config.className} ${config.disabled ? "cursor-not-allowed opacity-50" : ""}`}
        >
          <span>{config.icon}</span>
          <span>{config.text}</span>
        </button>

        {/* Cancel button for sent requests */}
        {config.showCancel && requestId && (
          <button
            onClick={() => onCancelRequest(requestId)}
            disabled={isCancelingRequest}
            className="flex items-center gap-1 rounded-full bg-red-50 px-2 py-1 text-sm text-red-600 hover:bg-red-100 disabled:opacity-50"
            title="Cancel friend request"
          >
            <span>✕</span>
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="rounded-lg bg-white p-6 shadow-md">
      {/* Post Header with Friend Button on Right */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img
            src={post.author.image ?? "/default-avatar.png"}
            alt={post.author.name ?? "User"}
            className="h-10 w-10 rounded-full"
          />
          <div>
            <h3 className="font-semibold">{post.author.name}</h3>
            <p className="text-sm text-gray-500">
              {post.createdAt.toLocaleDateString()}
            </p>
          </div>
        </div>

        {/* Friend Status Button */}
        {getFriendButton()}
      </div>

      {/* Edit Mode */}
      {isEditing ? (
        <div className="mb-4 space-y-4">
          <textarea
            value={editContent}
            onChange={(e) => onEditChange(e.target.value)}
            placeholder="What's on your mind?"
            className="w-full rounded-lg border border-gray-300 p-3 focus:border-transparent focus:ring-2 focus:ring-blue-500"
            rows={3}
          />
          <input
            type="text"
            value={editImage}
            onChange={(e) => onImageChange(e.target.value)}
            placeholder="Image URL (optional)"
            className="w-full rounded-lg border border-gray-300 p-3 focus:border-transparent focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="text"
            value={editVideo}
            onChange={(e) => onVideoChange(e.target.value)}
            placeholder="Video URL (optional)"
            className="w-full rounded-lg border border-gray-300 p-3 focus:border-transparent focus:ring-2 focus:ring-blue-500"
          />
          <div className="flex gap-2">
            <button
              onClick={() => onUpdate(post.id)}
              disabled={isUpdating}
              className="rounded-lg bg-green-600 px-4 py-2 text-white hover:bg-green-700 disabled:opacity-50"
            >
              {isUpdating ? "Saving..." : "Save"}
            </button>
            <button
              onClick={onCancelEditing}
              className="rounded-lg bg-gray-600 px-4 py-2 text-white hover:bg-gray-700"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        /* View Mode */
        <>
          {/* Post Content */}
          {post.content && <p className="mb-4 text-gray-800">{post.content}</p>}

          {/* Post Media */}
          {post.image && (
            <img
              src={post.image}
              alt="Post image"
              className="mb-4 max-h-96 w-full rounded-lg object-cover"
            />
          )}

          {post.video && (
            <video
              controls
              className="mb-4 w-full rounded-lg"
              poster={post.image ?? undefined}
            >
              <source src={post.video} type="video/mp4" />
              Your browser does not support the video tag.
            </video>
          )}
        </>
      )}

      {/* Post Actions */}
      <div className="flex items-center gap-4 border-t pt-4">
        {/* Chat button - only show for friends */}
        {friendshipStatus?.status === "FRIENDS" && (
          <button className="flex items-center gap-2 text-gray-600 hover:text-blue-600">
            <span>💬</span>
            Chat
          </button>
        )}

        {/* Edit/Delete buttons for post owner */}
        {isOwnPost && !isEditing && (
          <div className="flex gap-2">
            <button
              onClick={() => onStartEditing(post)}
              className="flex items-center gap-2 text-gray-600 hover:text-green-600"
            >
              <span>✏️</span>
              Edit
            </button>
            <button
              onClick={onDelete}
              disabled={isDeleting}
              className="flex items-center gap-2 text-gray-600 hover:text-red-600 disabled:opacity-50"
            >
              <span>🗑️</span>
              {isDeleting ? "Deleting..." : "Delete"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
