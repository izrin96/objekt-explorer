import { splitLinks } from "@/features/chat/links";

/** A message body with its http(s) links clickable, each opening in a new tab. */
export function MessageText({ text }: { text: string }) {
  return splitLinks(text).map((part, index) =>
    part.kind === "link" ? (
      <a
        key={index}
        href={part.href}
        target="_blank"
        rel="noreferrer nofollow ugc"
        className="underline underline-offset-2 hover:decoration-2"
      >
        {part.text}
      </a>
    ) : (
      part.text
    ),
  );
}
