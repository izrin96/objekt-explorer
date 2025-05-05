export type TicketAuth = {
  expireAt: string;
  ticket: string;
};

export type TicketCheck =
  | {
      status: "wait_for_user_action" | "wait_for_certify" | "certified";
      ticketRemainingMs: number;
      profiles: {
        artistName: string;
        profileImageUrl: string;
      }[];
      user: {
        id: number;
        nickname: string;
        profileImageUrl: string;
      };
    }
  | {
      status: "expired";
    };
