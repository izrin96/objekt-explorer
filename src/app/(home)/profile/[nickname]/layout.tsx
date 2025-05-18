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
import { cn } from "@/utils/classes";

type Props = PropsWithChildren<{
  params: Promise<{
    nickname: string;
  }>;
}>;

const BANNER_BREAKPOINT =
  "h-[280px] sm:h-[320px] md:h-[380px] lg:h-[440px] xl:h-[500px] 2xl:h-[560px]";

export default async function UserCollectionLayout(props: Props) {
  const params = await props.params;

  const session = await cachedSession();

  const [targetUser, profiles] = await Promise.all([
    getUserByIdentifier(params.nickname),
    session ? fetchUserProfiles(session.user.id) : undefined,
  ]);

  return (
    <ProfileProvider profile={targetUser}>
      <UserProvider profiles={profiles}>
        <ProfileBanner profile={targetUser} />
        <Container>
          {targetUser.bannerImgUrl && (
            <div className={cn("-mt-20", BANNER_BREAKPOINT)}></div>
          )}
          <div className="flex flex-col gap-4 pb-8">
            <ProfileHeader user={targetUser} />

            <div className="flex flex-col gap-4">
              <ProfileTabs nickname={params.nickname} />
              {props.children}
            </div>
          </div>
        </Container>
      </UserProvider>
    </ProfileProvider>
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
        <div className="mx-auto w-full max-w-7xl lg:max-w-(--breakpoint-xl) 2xl:max-w-(--breakpoint-2xl)">
          <div
            className={cn(
              "relative mask-b-from-75% mask-x-from-100% xl:mask-x-from-90%",
              BANNER_BREAKPOINT
            )}
          >
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
        </div>
      </div>
      <div
        className={cn(
          "absolute top-0 inset-0 -z-10 mask-b-from-75%",
          BANNER_BREAKPOINT
        )}
      >
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
