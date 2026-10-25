import { MagnifyingGlassIcon, XIcon } from "@phosphor-icons/react";
import { type ChatBox, SEARCH_MAX_LENGTH } from "@repo/api/schemas/chat";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { useDebouncedCallback } from "@/hooks/use-debounced-callback";
import { m } from "@/paraglide/messages";

import { conversationsOptions } from "./queries";

/** The field holds its own text and writes `q` to the URL on a debounce; the server filters. */
export function ConversationSearch({ box, q }: { box: ChatBox; q: string | undefined }) {
  const navigate = useNavigate();
  const [draft, setDraft] = useState(q ?? "");
  const [seen, setSeen] = useState(q);
  const [sent, setSent] = useState(q);

  // a Clear elsewhere or a pasted link changes `q` under the field; our own commits do not
  if (q !== seen) {
    setSeen(q);
    if (q !== sent) {
      setSent(q);
      setDraft(q ?? "");
    }
  }

  const commit = useDebouncedCallback((value: string) => {
    const next = value.trim() || undefined;
    setSent(next);
    // "." is the current route, so a thread open beside the list stays open
    void navigate({ to: ".", search: (prev) => ({ ...prev, q: next }), replace: true });
  }, 250);

  const input = useRef<HTMLInputElement>(null);
  const [focused, setFocused] = useState(false);
  // the list is already loading this query; an empty Requests or Archived box has nothing to
  // search, but the field stays while it is in use, so clearing a search never drops focus
  const { data, isSuccess, isPlaceholderData } = useInfiniteQuery(conversationsOptions(box, q));
  const nothingToSearch =
    box !== "inbox" &&
    q === undefined &&
    isSuccess &&
    !isPlaceholderData &&
    data.pages[0]?.items.length === 0;
  if (nothingToSearch && !focused && draft === "") return null;

  const clear = () => {
    setDraft("");
    commit("");
    input.current?.focus();
  };

  return (
    <div className="shrink-0 border-b p-2">
      <InputGroup>
        <InputGroupInput
          ref={input}
          size="sm"
          type="search"
          aria-label={m.chat_search_label()}
          placeholder={m.chat_search_label()}
          maxLength={SEARCH_MAX_LENGTH}
          value={draft}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onChange={(event) => {
            setDraft(event.target.value);
            commit(event.target.value);
          }}
          onKeyDown={(event) => {
            if (event.key !== "Escape" || draft.length === 0) return;
            event.preventDefault();
            clear();
          }}
        />
        <InputGroupAddon>
          <MagnifyingGlassIcon />
        </InputGroupAddon>
        {draft.length > 0 ? (
          <InputGroupAddon align="inline-end">
            <Button
              variant="ghost"
              size="icon-xs"
              aria-label={m.chat_search_clear()}
              onClick={clear}
            >
              <XIcon />
            </Button>
          </InputGroupAddon>
        ) : null}
      </InputGroup>
    </div>
  );
}
