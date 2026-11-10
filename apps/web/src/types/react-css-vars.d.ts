import "react";

declare module "react" {
  // lets `style` set a custom property (`--cols`) without a cast; React passes it through
  interface CSSProperties {
    [property: `--${string}`]: string | number | undefined;
  }
}
