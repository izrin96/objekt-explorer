import { MagnifyingGlassIcon } from "@phosphor-icons/react";
import { MAX_USER_SEARCH_LENGTH } from "@repo/api/schemas/user";
import type { CosmoPublicUser } from "@repo/cosmo/types/user";
import { useMutation } from "@tanstack/react-query";

import {
  Autocomplete,
  AutocompleteEmpty,
  AutocompleteInput,
  AutocompleteItem,
  AutocompleteList,
} from "@/components/ui/autocomplete";
import { Spinner } from "@/components/ui/spinner";
import { StepError } from "@/features/link/steps/step-error";
import { UserRowBody, UserSearchEmpty, useUserSearch } from "@/features/user/user-search";
import { orpc } from "@/lib/orpc";
import { refusalText } from "@/lib/refusal";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";

const MAX_NICKNAME_RESULTS = 5;

export function NicknameStep({
  initialQuery,
  onFound,
}: {
  initialQuery: string | undefined;
  onFound: (found: CosmoPublicUser) => void;
}) {
  const search = useUserSearch(initialQuery);
  const { query, serverError, searching } = search;
  const check = useMutation(orpc.cosmoLink.checkAddress.mutationOptions());

  // the search fans out on a prefix, and only the first few can be the user's own;
  // a user our cache holds without a Cosmo ID (id 0) could never verify
  const results = (search.results ?? [])
    .filter((user) => user.id > 0)
    .slice(0, MAX_NICKNAME_RESULTS);

  const pick = (user: CosmoPublicUser) => {
    if (check.isPending) return;
    check.mutate(user.address, { onSuccess: () => onFound(user) });
  };

  return (
    <div className="flex flex-col gap-3">
      <p className="text-muted-foreground text-sm text-pretty">
        {m.link_process_nickname_step_prompt()}
      </p>

      {/* the server filters (`mode="none"`); a row acts from its own `onClick`,
          which Enter on the highlighted row also fires */}
      <Autocomplete
        inline
        open
        mode="none"
        autoHighlight="always"
        keepHighlight
        items={results}
        value={query}
        onValueChange={(next, details) => {
          // picking a row writes its nickname into the input; the row acts instead
          if (details.reason === "item-press") return;
          search.setQuery(next);
          // an "already linked" belongs to the pick, not to the next search
          check.reset();
        }}
        itemToStringValue={(user) => user.nickname}
      >
        <AutocompleteInput
          autoFocus
          aria-label={m.link_enter_nickname()}
          placeholder={m.link_nickname_placeholder()}
          maxLength={MAX_USER_SEARCH_LENGTH}
          startAddon={<MagnifyingGlassIcon />}
          className="w-full"
        />
        {query.trim() !== "" && (
          <div className="bg-background mt-2 flex max-h-72 flex-col overflow-hidden rounded-lg border">
            {/* the searching rows bring their own padding */}
            <AutocompleteEmpty className={cn(searching && "not-empty:p-0")}>
              <UserSearchEmpty
                searching={searching}
                serverError={serverError}
                notFound={{
                  title: m.link_nickname_not_found(),
                  hint: m.link_nickname_not_found_hint(),
                }}
              />
            </AutocompleteEmpty>
            <AutocompleteList>
              {(user: CosmoPublicUser) => (
                <AutocompleteItem
                  key={user.address}
                  value={user}
                  onClick={() => pick(user)}
                  className="py-1.5"
                >
                  <span className="flex min-w-0 flex-1 items-center justify-between gap-2">
                    <UserRowBody user={user} />
                    {check.isPending && check.variables === user.address && (
                      <Spinner className="size-4 flex-none" />
                    )}
                  </span>
                </AutocompleteItem>
              )}
            </AutocompleteList>
          </div>
        )}
      </Autocomplete>

      {check.isError && <StepError message={refusalText(check.error)} />}
    </div>
  );
}
