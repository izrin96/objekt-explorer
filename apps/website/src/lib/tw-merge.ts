import { extendTailwindMerge } from "tailwind-merge";
export { type ClassNameValue, twJoin } from "tailwind-merge";

export const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [
        {
          text: [
            "xxs",
            "xs",
            "sm",
            "base",
            "lg",
            "xl",
            "2xl",
            "3xl",
            "4xl",
            "5xl",
            "6xl",
            "7xl",
            "8xl",
            "9xl",
          ],
        },
      ],
    },
  },
});
