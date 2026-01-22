// some was taken from https://github.com/teamreflex/cosmo-web/blob/main/packages/util/src/index.ts

export function isAddress(address: string) {
  return /^0x[a-fA-F0-9]{40}$/g.test(address);
}

export const addr = (address: string) => address.toLowerCase();

export const Addresses = {
  NULL: addr("0x0000000000000000000000000000000000000000"),
  SPIN: addr("0xD3D5f29881ad87Bb10C1100e2c709c9596dE345F"),
  OBJEKT: addr("0x99Bb83AE9bb0C0A6be865CaCF67760947f91Cb70"),
  COMO: addr("0xd0EE3ba23a384A8eeFd43f33A957dED60eD12706"),
  GRAVITY: addr("0xF1A787da84af2A6e8227aD87112a21181B7b9b39"),
};
