import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "jsx-email";
import type { ReactNode } from "react";

export interface Site {
  name: string;
  url: string;
}

export interface ActionEmailProps {
  site: Site;
  url: string;
}

interface LayoutProps extends ActionEmailProps {
  preview: string;
  heading: string;
  action: string;
  expiry: string;
  footer: string;
  children: ReactNode;
}

const ink = "#15171c";
const muted = "#5c616b";
const border = "#e4e6eb";
const paper = "#f6f7f9";

const sans = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';
const mono = 'ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace';

export function Paragraph({ children }: { children: ReactNode }) {
  return (
    <Text style={{ margin: "0 0 16px", fontSize: "15px", lineHeight: "24px", color: ink }}>
      {children}
    </Text>
  );
}

export function Layout({
  site,
  url,
  preview,
  heading,
  action,
  expiry,
  footer,
  children,
}: LayoutProps) {
  return (
    <Html lang="en">
      <Head />
      <Preview>{preview}</Preview>
      <Body style={{ margin: 0, backgroundColor: paper, fontFamily: sans }}>
        <Container containerWidth={480} style={{ padding: "40px 16px" }}>
          <Text
            style={{
              margin: "0 0 24px",
              fontSize: "14px",
              fontWeight: 600,
              letterSpacing: "-0.01em",
              color: ink,
            }}
          >
            {site.name}
          </Text>
          <Section
            style={{
              padding: "32px",
              backgroundColor: "#ffffff",
              border: `1px solid ${border}`,
              borderRadius: "12px",
            }}
          >
            <Heading
              as="h1"
              style={{
                margin: "0 0 16px",
                fontSize: "22px",
                lineHeight: "28px",
                fontWeight: 600,
                letterSpacing: "-0.01em",
                color: ink,
              }}
            >
              {heading}
            </Heading>
            {children}
            <Section style={{ margin: "8px 0 24px" }}>
              <Button
                href={url}
                width={200}
                height={44}
                backgroundColor={ink}
                textColor="#ffffff"
                borderRadius={8}
                fontSize={15}
                style={{ fontWeight: 600 }}
              >
                {action}
              </Button>
            </Section>
            <Text
              style={{ margin: "0 0 12px", fontSize: "13px", lineHeight: "20px", color: muted }}
            >
              {expiry}
            </Text>
            <Text
              data-skip="true"
              style={{ margin: "0 0 4px", fontSize: "13px", lineHeight: "20px", color: muted }}
            >
              If the button doesn't work, paste this link into your browser:
            </Text>
            <Link
              data-skip="true"
              href={url}
              style={{
                fontFamily: mono,
                fontSize: "12px",
                lineHeight: "18px",
                color: muted,
                wordBreak: "break-all",
              }}
            >
              {url}
            </Link>
          </Section>
          <Hr style={{ margin: "24px 0 16px", borderColor: border }} />
          <Text style={{ margin: "0 0 8px", fontSize: "13px", lineHeight: "20px", color: muted }}>
            {footer}
          </Text>
          <Link
            data-skip="true"
            href={site.url}
            style={{ fontSize: "13px", lineHeight: "20px", color: muted }}
          >
            {new URL(site.url).host}
          </Link>
        </Container>
      </Body>
    </Html>
  );
}
