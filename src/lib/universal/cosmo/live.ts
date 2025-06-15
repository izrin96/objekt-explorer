export type LiveSession = {
  id: number;
  thumbnailImage: string;
  startedAt: string;
  endedAt: string;
  videoCallId: string;
  chatChannelId: string;
  slowModeSecond: number;
  status: "in_progress" | "ended";
  createdAt: string;
  updatedAt: string;
  channel: {
    id: number;
    name: string;
    profileImageUrl: string;
    primaryColorHex: string;
    isConnected: boolean;
  };
  title: string;
};

export type OnAirResult = {
  isOnAir: boolean;
};
