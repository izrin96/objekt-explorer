import IndexView from "@/components/index/index-view";
import { UserProvider } from "@/hooks/use-user";
import { cachedSession, toPublicUser } from "@/lib/server/auth";

export default async function Home() {
  const session = await cachedSession();

  return (
    <div className="flex flex-col pb-36 pt-2">
      <UserProvider user={toPublicUser(session)}>
        <IndexView />
      </UserProvider>
    </div>
  );
}
