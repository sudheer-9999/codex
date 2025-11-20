"use client";

import {
  Image as ImageIcon,
  Pencil,
  Save,
  Trash2,
  Video as VideoIcon,
  XCircle,
} from "lucide-react";
import { useEffect, useRef } from "react";
import { api } from "~/trpc/react";
import type { Post, SessionType } from "~/utils/types";

interface PostCardProps {
  post: Post;
  session: SessionType;
  editingPostId: string | null;
  editContent: string;
  editImage: string;
  editVideo: string;
  onEditChange: (v: string) => void;
  onImageChange: (v: string) => void;
  onVideoChange: (v: string) => void;
  onStartEditing: (post: Post) => void;
  onCancelEditing: () => void;
  onUpdate: (postId: string) => void;
  onFriendAction: (userId: string, status: string, requestId?: string) => void;
  onCancelRequest: (requestId: string) => void;
  isUpdating: boolean;
  isSendingRequest: boolean;
  isAcceptingRequest: boolean;
  isCancelingRequest: boolean;
}

export default function PostCard(props: PostCardProps) {
  const {
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
    isUpdating,
    isSendingRequest,
    isAcceptingRequest,
    isCancelingRequest,
  } = props;

  const utils = api.useUtils();

  // Each post now has its own delete mutation
  const deletePost = api.post.delete.useMutation({
    onSuccess: () => utils.post.getAll.invalidate(),
  });

  const { data: friendshipStatus } = api.friend.getFriendshipStatus.useQuery(
    { userId: post.author.id },
    {
      enabled: !!session?.user?.id && post.author.id !== session.user?.id,
    },
  );

  const isOwnPost = session?.user?.id === post.author.id;
  const isEditing = editingPostId === post.id;

  // Auto-pause out-of-view video
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) video.pause();
        });
      },
      { threshold: 0.2 },
    );

    observer.observe(video);
    return () => observer.disconnect();
  }, []);

  const renderFriendButton = () => {
    if (isOwnPost) return null;

    const status = friendshipStatus?.status;
    const requestId = friendshipStatus?.requestId;

    const configs = {
      FRIENDS: {
        label: "Friends",
        icon: "✅",
        disabled: true,
      },
      REQUEST_SENT: {
        label: isCancelingRequest ? "Canceling..." : "Request Sent",
        icon: "⏳",
        disabled: isCancelingRequest,
      },
      REQUEST_RECEIVED: {
        label: isAcceptingRequest ? "Accepting..." : "Accept Request",
        icon: "👋",
        disabled: isAcceptingRequest,
      },
      NOT_FRIENDS: {
        label: isSendingRequest ? "Sending..." : "Add Friend",
        icon: "👤",
        disabled: isSendingRequest,
      },
    };

    const config = status ? configs[status as keyof typeof configs] : null;

    if (!config) {
      return (
        <button
          onClick={() =>
            onFriendAction(post.author.id, "NOT_FRIENDS", requestId)
          }
          className="rounded-full bg-gray-50 px-3 py-1 text-sm hover:bg-gray-100"
        >
          👤 Add Friend
        </button>
      );
    }

    return (
      <div className="flex items-center gap-2">
        <button
          disabled={config.disabled}
          onClick={() => onFriendAction(post.author.id, status!, requestId)}
          className="rounded-full bg-gray-50 px-3 py-1 text-sm hover:bg-gray-100 disabled:opacity-50"
        >
          {config.icon} {config.label}
        </button>

        {status === "REQUEST_SENT" && requestId && (
          <button
            onClick={() => onCancelRequest(requestId)}
            className="rounded-full bg-red-50 px-2 py-1 text-red-600"
          >
            ✕
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="rounded-lg bg-white p-6 shadow-md">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img
            src={post.author.image ?? "/default-avatar.png"}
            className="h-10 w-10 rounded-full"
          />
          <div>
            <h3 className="font-semibold">{post.author.name}</h3>
            <p className="text-sm text-gray-500">
              {post.createdAt.toLocaleDateString()}
            </p>
          </div>
        </div>

        {renderFriendButton()}
      </div>

      {/* Edit Mode */}
      {isEditing ? (
        <div className="mb-4 space-y-4">
          <textarea
            value={editContent}
            onChange={(e) => onEditChange(e.target.value)}
            rows={3}
            className="w-full rounded-xl border p-3"
          />
          <div className="flex gap-2 rounded-xl border p-3">
            <ImageIcon className="h-5 w-5 text-gray-500" />
            <input
              value={editImage}
              onChange={(e) => onImageChange(e.target.value)}
              className="w-full"
              placeholder="Image URL"
            />
          </div>

          <div className="flex gap-2 rounded-xl border p-3">
            <VideoIcon className="h-5 w-5 text-gray-500" />
            <input
              value={editVideo}
              onChange={(e) => onVideoChange(e.target.value)}
              className="w-full"
              placeholder="Video URL"
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => onUpdate(post.id)}
              disabled={isUpdating}
              className="rounded-xl bg-green-600 px-4 py-2 text-white"
            >
              <Save className="mr-1 inline-block h-4 w-4" />
              {isUpdating ? "Saving..." : "Save"}
            </button>

            <button
              onClick={onCancelEditing}
              className="rounded-xl bg-gray-600 px-4 py-2 text-white"
            >
              <XCircle className="mr-1 inline-block h-4 w-4" />
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <>
          {post.content && <p className="mb-4 text-gray-800">{post.content}</p>}

          {post.image && (
            <img
              src={post.image}
              className="mb-4 max-h-[400px] rounded-xl object-cover"
            />
          )}

          {post.video && (
            <video
              ref={videoRef}
              controls
              className="mb-4 max-h-[420px] rounded-xl"
            >
              <source src={post.video} type="video/mp4" />
            </video>
          )}
        </>
      )}

      <div className="flex justify-end gap-2 border-t pt-4">
        {isOwnPost && !isEditing && (
          <>
            <button
              onClick={() => onStartEditing(post)}
              disabled={deletePost.isPending}
              className="flex items-center gap-1.5 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 transition-all duration-200 hover:border-gray-400 hover:bg-gray-50 hover:text-gray-900 focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Pencil className="h-4 w-4" />
              Edit
            </button>

            <button
              onClick={() => {
                if (
                  window.confirm(
                    "Are you sure you want to delete this post? This action cannot be undone.",
                  )
                ) {
                  deletePost.mutate({ id: post.id });
                }
              }}
              disabled={deletePost.isPending}
              className="flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-medium text-white transition-all duration-200 hover:bg-red-700 hover:shadow-sm focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
            >
              {deletePost.isPending ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4" />
                  Delete
                </>
              )}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
