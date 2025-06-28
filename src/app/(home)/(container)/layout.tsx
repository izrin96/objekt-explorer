import type { PropsWithChildren } from "react";
import { Container } from "@/components/ui";

export default async function Layout(props: PropsWithChildren) {
  return <Container>{props.children}</Container>;
}
