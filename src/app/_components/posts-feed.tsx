"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { api } from "~/trpc/react";
import type { Post } from "~/utils/types";

export function PostsFeed() {
  const { data: session } = useSession();
  const utils = api.useUtils();
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [editImage, setEditImage] = useState("");
  const [editVideo, setEditVideo] = useState("");

  const { data: posts, isLoading } = api.post.getAll.useQuery();
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
      {posts.map((post) => (
        <div key={post.id} className="rounded-lg bg-white p-6 shadow-md">
          {/* Post Header */}
          <div className="mb-4 flex items-center gap-3">
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

          {/* Edit Mode */}
          {editingPostId === post.id ? (
            <div className="mb-4 space-y-4">
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                placeholder="What's on your mind?"
                className="w-full rounded-lg border border-gray-300 p-3 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                rows={3}
              />
              <input
                type="text"
                value={editImage}
                onChange={(e) => setEditImage(e.target.value)}
                placeholder="Image URL (optional)"
                className="w-full rounded-lg border border-gray-300 p-3 focus:border-transparent focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="text"
                value={editVideo}
                onChange={(e) => setEditVideo(e.target.value)}
                placeholder="Video URL (optional)"
                className="w-full rounded-lg border border-gray-300 p-3 focus:border-transparent focus:ring-2 focus:ring-blue-500"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => handleUpdate(post.id)}
                  disabled={updatePost.isPending}
                  className="rounded-lg bg-green-600 px-4 py-2 text-white hover:bg-green-700 disabled:opacity-50"
                >
                  {updatePost.isPending ? "Saving..." : "Save"}
                </button>
                <button
                  onClick={cancelEditing}
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
              {post.content && (
                <p className="mb-4 text-gray-800">{post.content}</p>
              )}

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
            <button className="flex items-center gap-2 text-gray-600 hover:text-blue-600">
              <span>💬</span>
              Chat
            </button>

            {/* Edit/Delete buttons for post owner */}
            {session?.user?.id === post.authorId &&
              editingPostId !== post.id && (
                <div className="flex gap-2">
                  <button
                    onClick={() => startEditing(post)}
                    className="flex items-center gap-2 text-gray-600 hover:text-green-600"
                  >
                    <span>✏️</span>
                    Edit
                  </button>
                  <button
                    onClick={() => deletePost.mutate({ id: post.id })}
                    disabled={deletePost.isPending}
                    className="flex items-center gap-2 text-gray-600 hover:text-red-600 disabled:opacity-50"
                  >
                    <span>🗑️</span>
                    {deletePost.isPending ? "Deleting..." : "Delete"}
                  </button>
                </div>
              )}
          </div>
        </div>
      ))}
    </div>
  );
}
