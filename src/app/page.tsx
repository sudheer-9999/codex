"use client";

import { useSession } from "next-auth/react";
import { SignIn } from "./_components/sign-in";
import { SignOut } from "./_components/sign-out";
import { CreatePost } from "./_components/create-post";
import { PostsFeed } from "./_components/posts-feed";
import { FriendRequests } from "./_components/friend-requests";

export default function Home() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  if (!session) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-[#2e026d] to-[#15162c] text-white">
        <div className="container flex flex-col items-center justify-center gap-12 px-4 py-16">
          <h1 className="text-5xl font-extrabold tracking-tight sm:text-[5rem]">
            Social Media App
          </h1>
          <SignIn />
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-100">
      <header className="border-b bg-white shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
          <h1 className="text-2xl font-bold text-gray-900">Social Media</h1>
          <div className="flex items-center gap-4">
            <span className="text-gray-700">Welcome, {session.user?.name}</span>
            <img
              src={session.user?.image ?? "/default-avatar.png"}
              alt="Profile"
              className="h-8 w-8 rounded-full"
            />
            <SignOut />
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-2xl px-4 py-8">
        <FriendRequests />
        <CreatePost />
        <PostsFeed />
      </div>
    </main>
  );
}
