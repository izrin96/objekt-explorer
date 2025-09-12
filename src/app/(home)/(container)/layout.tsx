import type { PropsWithChildren } from "react";
import DynamicContainer from "@/components/dynamic-container";

export default async function Layout(props: PropsWithChildren) {
  return <DynamicContainer>{props.children}</DynamicContainer>;
}
