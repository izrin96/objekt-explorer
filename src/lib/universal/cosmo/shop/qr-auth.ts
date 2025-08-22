export type TicketAuth = {
  expireAt: string;
  ticket: string;
};

type TicketSuccess<T extends string> = {
  status: T;
  ticketRemainingMs: number;
  ticketOtpRemainingMs: number;
  profiles: {
    artistName: string;
    profileImageUrl: string;
  }[];
  user: {
    id: number;
    nickname: string;
    profileImageUrl: string;
  };
};

export type TicketCheck =
  | {
      status: "wait_for_user_action";
      ticketRemainingMs: number;
    }
  | TicketSuccess<"wait_for_certify">
  | TicketSuccess<"certified">
  | {
      status: "expired";
    };

export type CosmoShopUser = {
  nickname: string;
  address: string;
};
