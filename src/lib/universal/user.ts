export type PublicProfile = {
  nickname: string;
  address: string;
  user?: PublicUser | null;
};

export type PublicUser = {
  name: string;
  image: string | null;
  username: string | null;
};
