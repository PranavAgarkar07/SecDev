import { auth } from "@/lib/auth";
import { getUserProfile, getUserProfileByEmail } from "@/lib/user-auth";
import { AccountPageClient } from "@/components/console/account-page-client";

export default async function AccountPage() {
  const session = await auth();
  const userById = session?.user?.id ? await getUserProfile(session.user.id) : null;
  const user = userById ?? (session?.user?.email ? await getUserProfileByEmail(session.user.email) : null);
  const hasGithubConnection = Boolean(session?.accessToken);

  return <AccountPageClient user={user} hasGithubConnection={hasGithubConnection} />;
}
