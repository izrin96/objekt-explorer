export type ObjektSerial = number;

export type ObjektTransfer = {
  id: string;
  to: string;
  timestamp: Date;
  nickname?: string;
};

export type ObjektTransferResponse = {
  tokenId: number | undefined;
  owner: string | undefined;
  transferable: boolean | undefined;
  transfers: ObjektTransfer[];
};
