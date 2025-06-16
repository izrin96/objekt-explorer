"use client";

import { useEffect, useState } from "react";
import {
  Call,
  ParticipantView,
  StreamCall,
  useCallStateHooks,
  useParticipantViewContext,
  useStreamVideoClient,
  VideoPlaceholderProps,
} from "@stream-io/video-react-sdk";
import { Avatar, Button } from "../ui";
import { useLiveSession } from "@/hooks/use-live-session";
import LiveEnded from "./live-ended";
import LiveFooter from "./live-footer";
import { CornersOutIcon } from "@phosphor-icons/react/dist/ssr";
import { useToggleFullScreen } from "./hooks";

export const CustomLivestreamPlayer = (props: {
  callType: string;
  callId: string;
}) => {
  const { callType, callId } = props;
  const client = useStreamVideoClient();

  const [call, setCall] = useState<Call>();
  useEffect(() => {
    if (!client) return;
    const myCall = client.call(callType, callId);
    myCall.setPreferredIncomingVideoResolution({ width: 1080, height: 1920 });
    setCall(myCall);
    myCall.join().catch((e) => {
      console.error("Failed to join call", e);
    });
    return () => {
      myCall.leave().catch((e) => {
        console.error("Failed to leave call", e);
      });
      setCall(undefined);
    };
  }, [client, callId, callType]);

  if (!call) return null;
  return (
    <StreamCall call={call}>
      <CustomLivestreamLayout />
    </StreamCall>
  );
};

const CustomVideoPlaceholder = ({ style }: VideoPlaceholderProps) => {
  const liveSession = useLiveSession();
  const { participant } = useParticipantViewContext();
  return (
    <div
      className="w-full h-full aspect-[9/16] flex items-center justify-center"
      style={style}
    >
      <Avatar
        size="extra-large"
        initials={participant.name}
        src={liveSession.channel.profileImageUrl}
      />
    </div>
  );
};

function LiveControl() {
  const toggleFullscreen = useToggleFullScreen();
  return (
    <Button intent="outline" size="extra-small" onClick={toggleFullscreen}>
      <CornersOutIcon />
    </Button>
  );
}

const CustomLivestreamLayout = () => {
  const { useParticipants } = useCallStateHooks();
  const [firstParticipant] = useParticipants();
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      {firstParticipant ? (
        <>
          <ParticipantView
            className="h-[calc(100svh-140px)] relative w-full aspect-[9/16] flex flex-col items-center justify-center gap-2 [&>video]:w-full [&>video]:h-full [&>video]:object-contain"
            // render when video is disabled
            VideoPlaceholder={CustomVideoPlaceholder}
            // render after video element
            ParticipantViewUI={
              <LiveFooter>
                <LiveControl />
              </LiveFooter>
            }
            participant={firstParticipant}
            muteAudio={!open}
            key={"" + open}
          />
          {!open && (
            <div className="absolute top-0 left-0 w-full h-full bg-bg/50 flex justify-center items-center">
              <Button
                intent="secondary"
                onClick={() => setOpen((prev) => !prev)}
              >
                Unmute
              </Button>
            </div>
          )}
        </>
      ) : (
        <LiveEnded />
      )}
    </div>
  );
};
