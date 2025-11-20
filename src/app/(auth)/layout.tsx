"use client";

import { useSession } from "next-auth/react";
import { SignIn } from "../_components/sign-in";
import { SignOut } from "../_components/sign-out";
import { useState } from "react";
import Link from "next/link";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100">
        <div className="animate-pulse text-xl text-gray-600">Loading...</div>
      </div>
    );
  }

  if (!session) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-indigo-700 via-purple-700 to-gray-900 text-white">
        <div className="flex flex-col items-center gap-8 rounded-3xl bg-white/10 p-12 shadow-2xl backdrop-blur-lg">
          <h1 className="text-6xl font-extrabold tracking-tight drop-shadow-lg">
            Code X
          </h1>

          <SignIn />
        </div>
      </main>
    );
  }

  return (
    <main className="font-inter min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-gray-200 bg-white/80 backdrop-blur-xl transition-all duration-300 hover:bg-white/90">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            {/* Logo & Navigation */}
            <div className="flex items-center gap-8">
              {/* Logo */}
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 shadow-lg">
                  <span className="text-lg font-bold text-white">CX</span>
                </div>
                <div className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-2xl font-bold text-transparent">
                  Code X
                </div>
              </div>

              {/* Desktop Navigation */}
              <nav className="hidden items-center gap-6 md:flex">
                <Link
                  href="/"
                  className="group relative rounded-lg px-3 py-2 font-medium text-gray-700 transition-all duration-200 hover:bg-indigo-50 hover:text-indigo-600"
                >
                  Home
                  <span className="absolute bottom-0 left-0 h-0.5 w-0 bg-indigo-600 transition-all duration-200 group-hover:w-full"></span>
                </Link>
                <Link
                  href="/friends"
                  className="group relative rounded-lg px-3 py-2 font-medium text-gray-700 transition-all duration-200 hover:bg-indigo-50 hover:text-indigo-600"
                >
                  Friends
                  <span className="absolute bottom-0 left-0 h-0.5 w-0 bg-indigo-600 transition-all duration-200 group-hover:w-full"></span>
                </Link>
              </nav>
            </div>

            {/* Mobile menu button */}
            <div className="md:hidden">
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="rounded-lg p-2 text-gray-600 transition-colors duration-200 hover:bg-gray-100"
              >
                <svg
                  className="h-6 w-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                </svg>
              </button>
            </div>

            {/* Right side user section */}
            <div className="hidden items-center gap-4 md:flex">
              <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-2 font-medium text-gray-600">
                Welcome,{" "}
                <span className="text-indigo-600">{session.user?.name}</span>
              </div>

              <div className="group relative">
                <img
                  src={session.user?.image ?? "/default-avatar.png"}
                  alt="Profile"
                  className="h-10 w-10 rounded-full shadow-md ring-2 ring-white transition-all duration-300 group-hover:scale-105 group-hover:ring-indigo-200"
                />
                <div className="absolute -right-1 -bottom-1 h-4 w-4 rounded-full border-2 border-white bg-green-500"></div>
              </div>

              <SignOut />
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMobileMenuOpen && (
          <div className="border-t border-gray-200 bg-white/95 backdrop-blur-lg md:hidden">
            <div className="space-y-2 px-4 py-4">
              <Link
                href="/"
                className="block rounded-lg px-4 py-3 font-medium text-gray-700 transition-colors duration-200 hover:bg-indigo-50 hover:text-indigo-600"
              >
                Home
              </Link>
              <Link
                href="/friends"
                className="block rounded-lg px-4 py-3 font-medium text-gray-700 transition-colors duration-200 hover:bg-indigo-50 hover:text-indigo-600"
              >
                Friends
              </Link>
              <div className="mt-2 border-t border-gray-100 px-4 py-3 pt-4 text-gray-600">
                Welcome,{" "}
                <span className="font-semibold text-indigo-600">
                  {session.user?.name}
                </span>
              </div>
              <div className="flex w-full justify-end">
                <div className="ml-auto">
                  <SignOut />
                </div>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Main content */}
      <div className="mx-auto max-w-7xl">{children}</div>
    </main>
  );
}
