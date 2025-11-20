"use client";

import { useSession } from "next-auth/react";
import { useState } from "react";
import { api } from "~/trpc/react";
import type { Post } from "~/utils/types";
import PostCard from "./PostCard";
import PostsSkeleton from "./loaders/PostsSkeleton";

export default function PostsFeed() {
  const { data: session } = useSession();
  const utils = api.useUtils();

  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [editImage, setEditImage] = useState("");
  const [editVideo, setEditVideo] = useState("");

  const { data: posts, isLoading } = api.post.getAll.useQuery();

  // Friend requests
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

  // Update mutation
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

  // Friend button handler
  const handleFriendAction = (
    postAuthorId: string,
    currentStatus: string,
    requestId?: string,
  ) => {
    if (!session?.user?.id) return;
    if (postAuthorId === session.user.id) return;

    switch (currentStatus) {
      case "NOT_FRIENDS":
        sendFriendRequest.mutate({ toUserId: postAuthorId });
        break;
      case "REQUEST_RECEIVED":
        if (requestId) acceptRequest.mutate({ requestId });
        break;
      case "REQUEST_SENT":
        break;
      case "FRIENDS":
        alert("Already friends.");
        break;
    }
  };

  const handleCancelRequest = (requestId: string) => {
    if (window.confirm("Cancel this friend request?")) {
      cancelRequest.mutate({ requestId });
    }
  };

  if (isLoading) {
    return <PostsSkeleton />;
  }

  if (!posts?.length) {
    return <div className="py-4 text-center">No posts yet.</div>;
  }

  return (
    <div className="space-y-6">
      {posts.map((post) => (
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
          isUpdating={updatePost.isPending}
          isSendingRequest={sendFriendRequest.isPending}
          isAcceptingRequest={acceptRequest.isPending}
          isCancelingRequest={cancelRequest.isPending}
        />
      ))}
    </div>
  );
}
