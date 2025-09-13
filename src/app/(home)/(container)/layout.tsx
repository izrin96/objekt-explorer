import type { PropsWithChildren } from "react";
import { DynamicContainerClient } from "@/components/dynamic-container";

export default async function Layout(props: PropsWithChildren) {
  return <DynamicContainerClient>{props.children}</DynamicContainerClient>;
}
