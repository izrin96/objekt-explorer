export type TicketAuth = {
  expireAt: string;
  ticket: string;
};

export type TicketQuery = {
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
};
