"use client";

import { signIn } from "next-auth/react";

export default function SignInPage() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-white dark:bg-neutral-950">
      <div className="text-center space-y-6">
        <div>
          <h1 className="text-3xl font-bold">MAYA</h1>
          <p className="text-neutral-500 dark:text-neutral-400 mt-1 text-sm">
            Personal Operating System
          </p>
        </div>
        <button
          onClick={() => signIn("google", { callbackUrl: "/" })}
          className="px-6 py-3 bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 rounded-xl text-sm font-medium hover:opacity-90 transition-opacity"
        >
          Sign in with Google
        </button>
      </div>
    </div>
  );
}
