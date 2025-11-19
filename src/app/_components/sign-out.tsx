"use client";

import { signOut } from "next-auth/react";

export function SignOut() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/" })}
      className="rounded-lg bg-red-600 px-6 py-2 font-medium text-white transition-colors hover:bg-red-700"
    >
      Sign Out
    </button>
  );
}
