import ProfileHeader from "@/components/profile/profile-header";
import ProfileTabs from "@/components/profile/profile-tabs";
import { Container } from "@/components/ui";
import { ProfileProvider } from "@/hooks/use-profile";
import { UserProvider } from "@/hooks/use-user";
import { getUserByIdentifier } from "@/lib/client-fetching";
import { cachedSession } from "@/lib/server/auth";
import { fetchUserProfiles } from "@/lib/server/profile";
import { PublicProfile } from "@/lib/universal/user";
import Image from "next/image";
import { PropsWithChildren } from "react";
import { getMimeTypeFromExtension } from "@/lib/utils";

type Props = PropsWithChildren<{
  params: Promise<{
    nickname: string;
  }>;
}>;

export default async function UserCollectionLayout(props: Props) {
  const params = await props.params;

  const session = await cachedSession();

  const [targetUser, profiles] = await Promise.all([
    getUserByIdentifier(params.nickname),
    session ? fetchUserProfiles(session.user.id) : undefined,
  ]);

  return (
    <UserProvider profiles={profiles}>
      <ProfileProvider profile={targetUser}>
        <ProfileBanner profile={targetUser} />
        <Container>
          {targetUser.bannerImgUrl && (
            <div className="h-[250px] md:h-[350px] xl:h-[450px] -mt-16"></div>
          )}
          <div className="flex flex-col gap-4 pb-8">
            <ProfileHeader user={targetUser} />

            <div className="flex flex-col gap-4">
              <ProfileTabs nickname={params.nickname} />
              {props.children}
            </div>
          </div>
        </Container>
      </ProfileProvider>
    </UserProvider>
  );
}

function ProfileBanner({ profile }: { profile: PublicProfile }) {
  if (!profile.bannerImgUrl) return;

  const isVideo = getMimeTypeFromExtension(profile.bannerImgUrl).startsWith(
    "video"
  );

  return (
    <>
      <div className="absolute top-0 inset-0 -z-5">
        <Container>
          <div className="h-[250px] md:h-[350px] xl:h-[450px] relative mask-b-from-75% mask-x-from-90%">
            {isVideo ? (
              <video
                src={profile.bannerImgUrl}
                className="object-cover object-center size-full"
                autoPlay
                loop
                muted
                playsInline
              />
            ) : (
              <Image
                src={profile.bannerImgUrl}
                className="object-cover object-center size-full"
                fill
                alt="Banner"
                priority
              />
            )}
          </div>
        </Container>
      </div>
      <div className="absolute top-0 inset-0 -z-10 h-[250px] md:h-[350px] xl:h-[450px] mask-b-from-75%">
        {isVideo ? (
          <video
            src={profile.bannerImgUrl}
            className="object-cover object-center size-full"
            autoPlay
            loop
            muted
            playsInline
          />
        ) : (
          <Image
            src={profile.bannerImgUrl}
            className="object-cover object-center size-full"
            fill
            alt="Banner"
            priority
          />
        )}
        <div className="absolute inset-0 backdrop-blur-xl"></div>
      </div>
    </>
  );
}
