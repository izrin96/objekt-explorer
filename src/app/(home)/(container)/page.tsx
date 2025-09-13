import IndexRender from "@/components/index/index-view";
import { ProfileProvider } from "@/components/profile-provider";
import { getSession, toPublicUser } from "@/lib/server/auth";

export default async function Home() {
  const session = await getSession();

  return (
    <div className="flex flex-col pt-2 pb-36">
      <ProfileProvider user={toPublicUser(session)}>
        <IndexRender />
      </ProfileProvider>
    </div>
  );
}
