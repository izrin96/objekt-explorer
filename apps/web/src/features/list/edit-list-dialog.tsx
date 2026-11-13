import { startForList } from "@repo/api/schemas/trade-post";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { type RefObject, useState } from "react";

import { DialogLoadPanel } from "@/components/shared/dialog-load-panel";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPanel,
  DialogPopup,
  DialogTitle,
} from "@/components/ui/dialog";
import { Form } from "@/components/ui/form";
import { useOpenComposer } from "@/features/trade/composer/use-open-composer";
import { usePlanLists } from "@/features/trade/post-plan";
import { TradeLine } from "@/features/trade/trade-line";
import { useUserProfiles } from "@/features/user/hooks";
import { isSameAddress, nicknameParam } from "@/lib/address";
import { type FieldErrors, zodErrors } from "@/lib/form";
import { m } from "@/paraglide/messages";

import { useEditList } from "./actions";
import {
  type ListDraft,
  type ListUrl,
  listDraftSchema,
  type StoredList,
  toDraft,
  toEditInput,
} from "./list-draft";
import { ListForm } from "./list-form";
import { offTradeOpenTo } from "./list-open-to";
import { listFindOptions } from "./queries";

export function EditListDialog({
  slug,
  open,
  onOpenChange,
  redirectOnSave = false,
  showTradeLine = true,
  finalFocus,
}: {
  slug: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** for the list's own page: a save can move its profile address, and `/list/$slug` redirects to wherever it now lives */
  redirectOnSave?: boolean;
  /** off in the composer, where Edit post or Post it would reopen the page it is on and drop its picks */
  showTradeLine?: boolean;
  finalFocus?: RefObject<HTMLElement | null>;
}) {
  const navigate = useNavigate();
  const { data, error } = useQuery(listFindOptions(slug, open));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPopup className="max-w-md" finalFocus={finalFocus}>
        {data ? (
          // mounted with the stored list in hand, so the draft is its initial state
          <EditListForm
            list={data}
            showTradeLine={showTradeLine}
            onClose={() => onOpenChange(false)}
            onDone={() => {
              onOpenChange(false);
              if (redirectOnSave) void navigate({ to: "/list/$slug", params: { slug } });
            }}
          />
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="font-display">{m.list_edit_title()}</DialogTitle>
              <DialogDescription>{m.list_edit_description()}</DialogDescription>
            </DialogHeader>
            <DialogLoadPanel error={error} />
            <DialogFooter>
              <DialogClose render={<Button variant="outline" />}>
                {m.common_modal_close()}
              </DialogClose>
            </DialogFooter>
          </>
        )}
      </DialogPopup>
    </Dialog>
  );
}

/** mirrors `getListLinkOption`: the nickname when the profile has one, else the address */
function toListUrl(
  list: StoredList,
  profiles: { address: string; nickname: string | null }[],
): ListUrl | undefined {
  const address = list.profileAddress?.toLowerCase();
  if (!address || !list.profileSlug) return undefined;
  const profile = profiles.find((entry) => isSameAddress(entry.address, address));
  return {
    nickname: nicknameParam(address, profile?.nickname),
    profileSlug: list.profileSlug,
    listSlug: list.slug,
  };
}

function EditListForm({
  list,
  showTradeLine,
  onDone,
  onClose,
}: {
  list: StoredList;
  showTradeLine: boolean;
  onDone: () => void;
  onClose: () => void;
}) {
  const profiles = useUserProfiles();
  const planLists = usePlanLists();
  const openComposer = useOpenComposer();
  const edit = useEditList();
  // what the draft started from: a refetch after another tab's edit must not read as this one's
  const [seed] = useState(() => toDraft(list));
  const [draft, setDraft] = useState<ListDraft>(seed);
  const [errors, setErrors] = useState<FieldErrors>({});
  // the seed's flags, which the draft is compared with; inside the composer its Post sets Open to
  const storedOpenTo = showTradeLine
    ? offTradeOpenTo({
        listType: list.listType,
        discoverable: list.discoverable,
        matchSale: seed.matchSale,
        matchHave: seed.matchHave,
      })
    : null;

  return (
    <Form
      className="contents"
      errors={errors}
      onFormSubmit={() => {
        const next = zodErrors(listDraftSchema(), draft);
        setErrors(next);
        if (Object.keys(next).length > 0) return;
        edit.mutate(toEditInput(list.slug, draft, seed.ratio, storedOpenTo), { onSuccess: onDone });
      }}
    >
      <DialogHeader>
        <DialogTitle className="font-display">{m.list_edit_title()}</DialogTitle>
        <DialogDescription>{m.list_edit_description()}</DialogDescription>
      </DialogHeader>
      <DialogPanel>
        <ListForm
          mode="edit"
          value={draft}
          onChange={setDraft}
          profiles={profiles}
          url={toListUrl(list, profiles)}
          showOpenTo={storedOpenTo !== null}
          tradeLine={
            showTradeLine ? (
              <TradeLine
                slug={list.slug}
                saveFirst={JSON.stringify(draft) !== JSON.stringify(seed)}
                onCompose={() => {
                  onClose();
                  openComposer(startForList(planLists, list.slug));
                }}
              />
            ) : null
          }
        />
      </DialogPanel>
      <DialogFooter>
        <DialogClose render={<Button variant="outline" />}>{m.common_modal_cancel()}</DialogClose>
        <Button type="submit" loading={edit.isPending}>
          {m.common_actions_save()}
        </Button>
      </DialogFooter>
    </Form>
  );
}
