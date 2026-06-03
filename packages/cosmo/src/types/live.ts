export interface LiveSession {
  id: number;
  thumbnailImage: string;
  startedAt: string;
  endedAt: string | null;
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
}
