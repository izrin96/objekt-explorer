import ProfileHeader from "@/components/profile/profile-header";
import ProfileTabs from "@/components/profile/profile-tabs";
import { Container } from "@/components/ui";
import { ProfileProvider } from "@/hooks/use-profile";
import { UserProvider } from "@/hooks/use-user";
import { getUserByIdentifier } from "@/lib/client-fetching";
import { cachedSession, toPublicUser } from "@/lib/server/auth";
import { fetchUserProfiles } from "@/lib/server/profile";
import { PublicProfile } from "@/lib/universal/user";
import Image from "next/image";
import { PropsWithChildren } from "react";
import { getMimeTypeFromExtension } from "@/lib/utils";
import { cn } from "@/utils/classes";
import { LockIcon } from "@phosphor-icons/react/dist/ssr";

type Props = PropsWithChildren<{
  params: Promise<{
    nickname: string;
  }>;
}>;

const BANNER_BREAKPOINT =
  "h-[280px] sm:h-[340px] md:h-[420px] lg:h-[500px] xl:h-[540px] 2xl:h-[600px]";

export default async function UserCollectionLayout(props: Props) {
  const params = await props.params;

  const session = await cachedSession();

  const [targetUser, profiles] = await Promise.all([
    getUserByIdentifier(params.nickname),
    session ? fetchUserProfiles(session.user.id) : undefined,
  ]);

  if (
    targetUser.privateProfile &&
    !(profiles?.some((a) => a.address === targetUser.address) ?? false)
  )
    return (
      <div className="flex flex-col justify-center items-center w-full gap-2 py-12 font-semibold">
        <LockIcon size={72} weight="thin" />
        Profile Private
      </div>
    );

  return (
    <>
      <ProfileBanner profile={targetUser} />

      <Container>
        {targetUser.bannerImgUrl && (
          <div className={cn("-mt-22", BANNER_BREAKPOINT)}></div>
        )}
        <div className="flex flex-col gap-4 pb-8 pt-2">
          <ProfileProvider profile={targetUser}>
            <UserProvider profiles={profiles} user={toPublicUser(session)}>
              <ProfileHeader user={targetUser} />
              <ProfileTabs nickname={params.nickname} />
              {props.children}
            </UserProvider>
          </ProfileProvider>
        </div>
      </Container>
    </>
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
              "relative mask-x-from-100% xl:mask-x-from-90%",
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
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-bg from-70% via-80% to-100%"></div>
          </div>
        </div>
      </div>
      <div className={cn("absolute top-0 inset-0 -z-10", BANNER_BREAKPOINT)}>
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
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-bg backdrop-blur-xl from-70% via-80% to-100%"></div>
      </div>
    </>
  );
}
