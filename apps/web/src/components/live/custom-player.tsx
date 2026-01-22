"use client";

import { CornersOutIcon, SpeakerHighIcon } from "@phosphor-icons/react/dist/ssr";
import {
  type Call,
  ParticipantView,
  StreamCall,
  useCallStateHooks,
  useParticipantViewContext,
  useStreamVideoClient,
  type VideoPlaceholderProps,
} from "@stream-io/video-react-sdk";
import Image from "next/image";
import { type CSSProperties, useEffect, useState } from "react";

import { useLiveSession } from "@/hooks/use-live-session";

import { Button } from "../ui/button";
import { Popover, PopoverContent } from "../ui/popover";
import { Slider, SliderFill, SliderThumb, SliderTrack } from "../ui/slider";
import { useToggleFullScreen, useUpdateCallDuration } from "./hooks";
import ParticipantCounter from "./live-counter";
import LiveEnded from "./live-ended";
import LiveFooter from "./live-footer";

export const CustomLivestreamPlayer = (props: { callType: string; callId: string }) => {
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
    <div className="flex aspect-9/16 h-full w-full items-center justify-center" style={style}>
      <div
        className="relative h-24 w-24 rounded-full outline-4 outline-(--color)"
        style={
          {
            "--color": liveSession.channel.primaryColorHex,
          } as CSSProperties
        }
      >
        <Image
          priority
          fill
          className="size-full rounded-full object-contain object-center"
          src={liveSession.channel.profileImageUrl}
          alt={participant.name}
        />
      </div>
    </div>
  );
};

function LiveControl() {
  const toggleFullscreen = useToggleFullScreen();
  return (
    <>
      <LiveDuration />
      <ParticipantCounter />
      <LiveVolumeControl />
      <Button intent="outline" size="sq-sm" onClick={toggleFullscreen}>
        <CornersOutIcon />
      </Button>
    </>
  );
}

function LiveVolumeControl() {
  const { useParticipants, useSpeakerState } = useCallStateHooks();
  const [currentSpeaker] = useParticipants();
  const { speaker } = useSpeakerState();
  return (
    <Popover>
      <Button size="sq-sm" intent="outline">
        <SpeakerHighIcon />
      </Button>
      <PopoverContent>
        <Slider
          className="p-6"
          defaultValue={currentSpeaker.audioVolume ?? 1}
          minValue={0}
          maxValue={1}
          step={0.01}
          aria-label="Volume"
          orientation="vertical"
          onChange={(value) => {
            speaker.setParticipantVolume(currentSpeaker.sessionId, value as number);
          }}
        >
          <SliderTrack className="min-h-24">
            <SliderFill />
            <SliderThumb />
          </SliderTrack>
        </Slider>
      </PopoverContent>
    </Popover>
  );
}

const formatDuration = (durationInMs: number) => {
  const days = Math.floor(durationInMs / 86400);
  const hours = Math.floor(durationInMs / 3600);
  const minutes = Math.floor((durationInMs % 3600) / 60);
  const seconds = durationInMs % 60;

  return `${days ? `${days} ` : ""}${hours ? `${hours}:` : ""}${
    minutes < 10 ? "0" : ""
  }${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
};

function LiveDuration() {
  const duration = useUpdateCallDuration();

  return (
    <div className="flex items-center gap-2 text-sm tabular-nums">{formatDuration(duration)}</div>
  );
}

const CustomLivestreamLayout = () => {
  const { useParticipants } = useCallStateHooks();
  const [currentSpeaker] = useParticipants();
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      {currentSpeaker ? (
        <>
          <ParticipantView
            PictureInPicturePlaceholder={null}
            className="relative flex aspect-9/16 h-[calc(100svh-140px)] w-full flex-col items-center justify-center gap-2 [&>video]:h-full [&>video]:w-full [&>video]:object-contain"
            // render when video is disabled
            VideoPlaceholder={CustomVideoPlaceholder}
            // render after video element
            ParticipantViewUI={
              <LiveFooter>
                <LiveControl />
              </LiveFooter>
            }
            participant={currentSpeaker}
            muteAudio={!open}
            key={`${open}`}
          />
          {!open && (
            <div className="bg-bg/50 absolute top-0 left-0 flex h-full w-full items-center justify-center">
              <Button intent="outline" onClick={() => setOpen((prev) => !prev)}>
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
