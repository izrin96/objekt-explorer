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
import { type CSSProperties, useEffect, useState } from "react";

import { useLiveSession } from "@/hooks/use-live-session";

import { Button } from "../intentui/button";
import { Popover, PopoverContent } from "../intentui/popover";
import { Slider, SliderFill, SliderThumb, SliderTrack } from "../intentui/slider";
import Portal from "../portal";
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
    <div className="flex h-full w-full items-center justify-center" style={style}>
      <div
        className="relative h-24 w-24 rounded-full outline-4 outline-(--color)"
        style={
          {
            "--color": liveSession.channel.primaryColorHex,
          } as CSSProperties
        }
      >
        <img
          className="absolute size-full rounded-full object-contain object-center"
          src={liveSession.channel.profileImageUrl}
          alt={participant.name}
        />
      </div>
    </div>
  );
};

function CustomParticipantViewUI() {
  const toggleFullscreen = useToggleFullScreen();

  return (
    <Portal to="#fullscreen-control-content">
      <Button intent="outline" size="sq-sm" onPress={toggleFullscreen}>
        <CornersOutIcon />
      </Button>
    </Portal>
  );
}

function LiveControl() {
  return (
    <>
      <LiveDuration />
      <ParticipantCounter />
      <LiveVolumeControl />
    </>
  );
}

function LiveVolumeControl() {
  const { useParticipants, useSpeakerState } = useCallStateHooks();
  const [currentSpeaker] = useParticipants();
  const { speaker } = useSpeakerState();

  if (!currentSpeaker) return null;

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
    <>
      {currentSpeaker ? (
        <>
          <div className="relative">
            <ParticipantView
              PictureInPicturePlaceholder={null}
              className="relative flex h-[calc(100svh-7.5rem)] w-full flex-col items-center justify-center gap-2 [&>video]:h-full [&>video]:w-full [&>video]:object-contain"
              // render when video is disabled
              VideoPlaceholder={CustomVideoPlaceholder}
              // render after video element
              ParticipantViewUI={<CustomParticipantViewUI />}
              participant={currentSpeaker}
              muteAudio={!open}
              key={`${open}`}
            />
            {!open && (
              <div className="bg-bg/50 absolute top-0 left-0 flex h-full w-full items-center justify-center">
                <Button intent="primary" onPress={() => setOpen((prev) => !prev)}>
                  Unmute
                </Button>
              </div>
            )}
          </div>
          <LiveFooter>
            <LiveControl />
            <div className="contents" id="fullscreen-control-content"></div>
          </LiveFooter>
        </>
      ) : (
        <LiveEndedLayout />
      )}
    </>
  );
};

export function LiveEndedLayout() {
  return (
    <>
      <LiveEnded />
      <LiveFooter />
    </>
  );
}
