export type ObjektSerial = {
  serial: number;
  owner: string;
  transferable: boolean;
};

export type ObjektTransfer = {
  id: string;
  to: string;
  timestamp: Date;
  nickname?: string;
};
