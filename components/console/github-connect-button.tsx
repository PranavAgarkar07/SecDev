"use client";

import { signIn } from "next-auth/react";

export function GitHubConnectButton({ callbackUrl }: { callbackUrl: string }) {
  return (
    <button
      type="button"
      onClick={() => signIn("github", { callbackUrl })}
      className="mt-4 inline-flex items-center rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-700 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100"
    >
      Connect GitHub
    </button>
  );
}