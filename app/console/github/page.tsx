import { auth } from "@/lib/auth";
import { RepositoryList } from "@/components/console/repository-list";
import { GitHubConnectButton } from "@/components/console/github-connect-button";

export default async function GitHubConsolePage() {
  const session = await auth();
  const hasGithubConnection = Boolean(session?.accessToken);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">GitHub</h1>
        <p className="mt-0.5 text-sm text-gray-500 dark:text-zinc-500">
          Connect GitHub once, then browse repositories and deploy directly from SecDev.
        </p>
      </div>

      {!hasGithubConnection ? (
        <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-sm text-gray-600 dark:text-zinc-400">
            GitHub is not connected yet. Use the button below to authorize GitHub for this account.
          </p>
          <GitHubConnectButton callbackUrl="/console/github" />
        </div>
      ) : null}

      <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl p-5">
        <RepositoryList showViewToggle={false} defaultView="table" compact={false} />
      </div>
    </div>
  );
}