"use client";

import { LogOut } from "lucide-react";
import { signOut } from "next-auth/react";

export function SignOut() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/" })}
      className="rounded-lg bg-indigo-600 p-2 font-medium text-white transition-colors hover:bg-indigo-700"
    >
      <LogOut size={20} />
    </button>
  );
}
