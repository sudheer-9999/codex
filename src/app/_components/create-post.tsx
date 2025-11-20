"use client";

import { useState } from "react";
import { api } from "~/trpc/react";
import { Image, Video, Send } from "lucide-react";

export function CreatePost() {
  const [content, setContent] = useState("");
  const [showImageInput, setShowImageInput] = useState(false);
  const [showVideoInput, setShowVideoInput] = useState(false);

  const [image, setImage] = useState("");
  const [video, setVideo] = useState("");

  const utils = api.useUtils();

  const createPost = api.post.create.useMutation({
    onSuccess: async () => {
      setContent("");
      setImage("");
      setVideo("");
      setShowImageInput(false);
      setShowVideoInput(false);
      await utils.post.getAll.invalidate();
    },
  });

  return (
    <div className="mb-6 w-full max-w-2xl rounded-xl border border-gray-200 bg-white/70 p-6 shadow-lg backdrop-blur-xl">
      <h2 className="mb-4 text-xl font-semibold text-gray-800">Create Post</h2>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          createPost.mutate({ content, image, video });
        }}
        className="space-y-4"
      >
        {/* Textarea */}
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="What's happening?"
          className="w-full rounded-xl border border-gray-300 bg-white p-4 text-gray-800 shadow-sm transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400"
          rows={3}
        />

        {/* Expandable Image Input */}
        {showImageInput && (
          <input
            type="text"
            value={image}
            onChange={(e) => setImage(e.target.value)}
            placeholder="Paste an image URL"
            className="w-full rounded-lg border border-gray-300 p-3 shadow-sm transition focus:ring-2 focus:ring-indigo-400"
          />
        )}

        {/* Expandable Video Input */}
        {showVideoInput && (
          <input
            type="text"
            value={video}
            onChange={(e) => setVideo(e.target.value)}
            placeholder="Paste a video URL"
            className="w-full rounded-lg border border-gray-300 p-3 shadow-sm transition focus:ring-2 focus:ring-indigo-400"
          />
        )}

        {/* Toolbar */}
        <div className="flex items-center justify-between border-t border-gray-200 pt-2">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setShowImageInput((p) => !p)}
              className={`flex h-10 w-10 items-center justify-center rounded-full transition hover:bg-gray-100 ${
                showImageInput
                  ? "bg-indigo-100 text-indigo-600"
                  : "text-gray-500"
              }`}
            >
              <Image size={20} />
            </button>

            <button
              type="button"
              onClick={() => setShowVideoInput((p) => !p)}
              className={`flex h-10 w-10 items-center justify-center rounded-full transition hover:bg-gray-100 ${
                showVideoInput
                  ? "bg-indigo-100 text-indigo-600"
                  : "text-gray-500"
              }`}
            >
              <Video size={20} />
            </button>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={createPost.isPending}
            className="flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-2 font-medium text-white shadow-md transition hover:bg-indigo-700 disabled:opacity-50"
          >
            {createPost.isPending ? "Posting..." : "Post"}
            <Send size={18} />
          </button>
        </div>
      </form>
    </div>
  );
}
