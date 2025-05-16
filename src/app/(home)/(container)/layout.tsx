import { Container } from "@/components/ui";
import { PropsWithChildren } from "react";

export default async function Layout(props: PropsWithChildren) {
  return <Container>{props.children}</Container>;
}
