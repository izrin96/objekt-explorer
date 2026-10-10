import { MagnifyingGlassIcon, XIcon } from "@phosphor-icons/react";
import { SEARCH_MAX_LENGTH } from "@repo/api/schemas/chat";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { useDebouncedCallback } from "@/hooks/use-debounced-callback";
import { m } from "@/paraglide/messages";

/** The field holds its own text and writes `q` to the URL on a debounce; the server filters. */
export function ConversationSearch({ q }: { q: string | undefined }) {
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

  const clear = () => {
    setDraft("");
    commit("");
  };

  return (
    <div className="shrink-0 border-b p-2">
      <InputGroup>
        <InputGroupInput
          size="sm"
          type="search"
          aria-label={m.chat_search_label()}
          placeholder={m.chat_search_label()}
          maxLength={SEARCH_MAX_LENGTH}
          value={draft}
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
