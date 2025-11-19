"use client";

import { useState } from "react";
import { api } from "~/trpc/react";

export function CreatePost() {
  const [content, setContent] = useState("");
  const [image, setImage] = useState("");
  const [video, setVideo] = useState("");
  const utils = api.useUtils();

  const createPost = api.post.create.useMutation({
    onSuccess: async () => {
      setContent("");
      setImage("");
      setVideo("");
      await utils.post.getAll.invalidate();
    },
  });

  return (
    <div className="mb-6 w-full max-w-2xl rounded-lg bg-white p-6 shadow-md">
      <h2 className="mb-4 text-xl font-semibold">Create Post</h2>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          createPost.mutate({ content, image, video });
        }}
        className="space-y-4"
      >
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="What's on your mind?"
          className="w-full rounded-lg border border-gray-300 p-3 focus:border-transparent focus:ring-2 focus:ring-blue-500"
          rows={3}
        />

        <input
          type="text"
          value={image}
          onChange={(e) => setImage(e.target.value)}
          placeholder="Image URL (optional)"
          className="w-full rounded-lg border border-gray-300 p-3 focus:border-transparent focus:ring-2 focus:ring-blue-500"
        />

        <input
          type="text"
          value={video}
          onChange={(e) => setVideo(e.target.value)}
          placeholder="Video URL (optional)"
          className="w-full rounded-lg border border-gray-300 p-3 focus:border-transparent focus:ring-2 focus:ring-blue-500"
        />

        <button
          type="submit"
          disabled={createPost.isPending}
          className="w-full rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {createPost.isPending ? "Posting..." : "Create Post"}
        </button>
      </form>
    </div>
  );
}
