import { IndexRenderDynamic } from "@/components/index/index-view";
import { UserProvider } from "@/hooks/use-user";
import { cachedSession, toPublicUser } from "@/lib/server/auth";

export default async function Home() {
  const session = await cachedSession();

  return (
    <div className="flex flex-col pt-2 pb-36">
      <UserProvider user={toPublicUser(session)}>
        <IndexRenderDynamic />
      </UserProvider>
    </div>
  );
}
