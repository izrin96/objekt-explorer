import type { AddSource, PublicList } from "@repo/api/schemas/list";
import { collectionCode, type ListRuleInput } from "@repo/api/schemas/list-rule";
import type { ListEntryFields, ValidObjekt } from "@repo/lib/types/objekt";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createContext, type ReactNode, use, useCallback, useMemo, useState } from "react";

import { Note } from "@/components/shared/note";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectItem,
  SelectPopup,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toastManager } from "@/components/ui/toast";
import { isObjektOwned } from "@/features/objekt/objekt-utils";
import { useUserLists } from "@/features/user/hooks";
import { isSameAddress } from "@/lib/address";
import { client, orpc } from "@/lib/orpc";
import { refusalText } from "@/lib/refusal";
import { m } from "@/paraglide/messages";

import { useAddToList } from "./actions";
import { CreateListDialog } from "./create-list-dialog";
import { LIST_TYPE_LABEL } from "./list-type-badge";
import { RULE_KEYS } from "./rules/queries";

/** Any member of the objekt's collection, online, with its member as prio. */
function anyMemberRule(objekt: ValidObjekt): Extract<ListRuleInput, { kind: "collection" }> {
  return {
    kind: "collection",
    artist: objekt.artist,
    season: objekt.season,
    collectionNo: objekt.collectionNo.replace(/[A-Z]$/, "Z"),
    prio: [objekt.member],
    skipOwned: true,
  };
}

/**
 * A `combined` card stands for its whole collection, so a bound list takes
 * every copy the profile owns of it rather than the one token on the card.
 */
type AddOptions = { combined?: boolean };

/** a list's own cards carry their entry, which a list-to-list add copies from */
export type AddableObjekt = ValidObjekt & Partial<ListEntryFields>;

type OpenAddToList = (objekts: AddableObjekt[], options?: AddOptions) => void;

type AddTarget = AddOptions & { objekts: AddableObjekt[] };

const AddToListContext = createContext<OpenAddToList | null>(null);

/**
 * One dialog per surface, opened from anywhere under it: a menu closes on click
 * and takes its whole popup subtree — a dialog rendered inside it included.
 */
export function AddToListProvider({
  address,
  sourceList,
  children,
}: {
  /** the profile whose objekts these are; unlocks that profile's bound lists */
  address?: string;
  /** a bound list hiding serials whose entries these are: each `id` is an entry id */
  sourceList?: string;
  children: ReactNode;
}) {
  const [target, setTarget] = useState<AddTarget>({ objekts: [] });
  const [open, setOpen] = useState(false);

  const openAddToList = useCallback<OpenAddToList>((objekts, options) => {
    if (objekts.length === 0) return;
    setTarget({ objekts, combined: options?.combined });
    setOpen(true);
  }, []);

  return (
    <AddToListContext value={openAddToList}>
      {children}
      <AddToListDialog
        open={open}
        onOpenChange={setOpen}
        target={target}
        address={address}
        sourceList={sourceList}
      />
    </AddToListContext>
  );
}

export function useOpenAddToList(): OpenAddToList {
  const open = use(AddToListContext);
  if (!open) throw new Error("useOpenAddToList must be used within AddToListProvider");
  return open;
}

/** `dropped` counts the picked objekts the source leaves out: unowned ones a bound list refuses, or rows that are no list entry. */
function toSource(
  list: PublicList,
  { objekts, combined }: AddTarget,
  sourceList: string | undefined,
): { from: AddSource; dropped: number } {
  if (!list.isProfileBind || combined === true) {
    return { from: { type: "collections", slugs: objekts.map((o) => o.slug) }, dropped: 0 };
  }
  if (sourceList !== undefined) {
    const entryIds = objekts.flatMap((o) => (o.entryId === undefined ? [] : [o.entryId]));
    return {
      from: { type: "list", slug: sourceList, entryIds },
      dropped: objekts.length - entryIds.length,
    };
  }
  const owned = objekts.filter(isObjektOwned);
  return {
    from: { type: "objekts", tokenIds: owned.map((o) => o.tokenId) },
    dropped: objekts.length - owned.length,
  };
}

function AddToListDialog({
  open,
  onOpenChange,
  target,
  address,
  sourceList,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  target: AddTarget;
  address?: string;
  sourceList?: string;
}) {
  const lists = useUserLists();
  const addToList = useAddToList();
  const [slug, setSlug] = useState<string | null>(null);
  const [skipDups, setSkipDups] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [anyMember, setAnyMember] = useState(false);
  const queryClient = useQueryClient();

  const available = useMemo(
    () =>
      lists.filter((list) =>
        list.isProfileBind ? isSameAddress(list.profileAddress, address) : true,
      ),
    [lists, address],
  );

  // a bound list has nothing to take from collections the profile does not own
  const bindable = sourceList !== undefined || target.objekts.some(isObjektOwned);
  const isDisabled = (list: PublicList) => list.isProfileBind && !bindable;

  const selected = available.find((list) => list.slug === slug && !isDisabled(list));
  const single = target.objekts.length === 1 ? target.objekts[0] : undefined;
  const rule = single && selected?.listType === "want" ? anyMemberRule(single) : null;
  const asRule = rule !== null && anyMember;
  const preview = useQuery(
    orpc.list.previewRule.queryOptions({
      input: { rule: rule! },
      enabled: rule !== null,
      staleTime: 30_000,
    }),
  );
  const addRule = useMutation({
    mutationFn: async (next: { slug: string; rule: ListRuleInput }) => {
      await client.list.addRule(next);
    },
    onSuccess: async () => {
      toastManager.add({ type: "success", title: m.rule_added() });
      onOpenChange(false);
      await Promise.all(RULE_KEYS.map((queryKey) => queryClient.invalidateQueries({ queryKey })));
    },
    onError: (error) => {
      toastManager.add({ type: "error", title: m.rule_error(), description: refusalText(error) });
    },
  });

  const submit = () => {
    if (!selected) return;
    if (asRule) {
      addRule.mutate({ slug: selected.slug, rule });
      return;
    }
    const { from, dropped } = toSource(selected, target, sourceList);

    addToList.mutate(
      { slug: selected.slug, skipDups, from },
      {
        onSuccess: ({ entries, skipped: refused }) => {
          const skipped = refused + dropped;
          toastManager.add({
            type: entries.length > 0 ? "success" : "info",
            title:
              entries.length === 1 && entries[0]
                ? m.actions_add_to_list_success_single({ collectionId: entries[0].collectionId })
                : entries.length > 1
                  ? m.actions_add_to_list_success_multiple({
                      count: entries.length.toLocaleString(),
                    })
                  : m.actions_add_to_list_nothing(),
            description:
              skipped > 0
                ? m.actions_add_to_list_skipped({ count: skipped.toLocaleString() })
                : undefined,
          });
          onOpenChange(false);
        },
      },
    );
  };

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (!next) {
            setSlug(null);
            setSkipDups(true);
            setAnyMember(false);
          }
          onOpenChange(next);
        }}
      >
        <DialogPopup className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display">{m.list_manage_objekt_add_title()}</DialogTitle>
            <DialogDescription>
              {m.filter_selected_count({ count: target.objekts.length })}
            </DialogDescription>
          </DialogHeader>
          <DialogPanel>
            {available.length === 0 ? (
              <Note>
                {m.list_manage_objekt_no_list_message()}{" "}
                <Button
                  variant="link"
                  size="sm"
                  className="h-auto p-0 underline"
                  onClick={() => setCreateOpen(true)}
                >
                  {m.list_manage_objekt_create_one_here()}
                </Button>
              </Note>
            ) : (
              <div className="flex min-w-0 flex-col gap-4">
                <div className="flex min-w-0 flex-col gap-1.5">
                  <Label htmlFor="add-to-list">{m.list_manage_objekt_list_label()}</Label>
                  {/* the last pick outlives a successful add, and may be greyed out on this open */}
                  <Select value={selected?.slug ?? null} onValueChange={setSlug}>
                    <SelectTrigger id="add-to-list" className="min-w-0">
                      <SelectValue placeholder={m.list_manage_objekt_list_placeholder()}>
                        {(value: string | null) =>
                          value === null
                            ? m.list_manage_objekt_list_placeholder()
                            : (available.find((list) => list.slug === value)?.name ?? value)
                        }
                      </SelectValue>
                    </SelectTrigger>
                    <SelectPopup>
                      {available.map((list) => (
                        <SelectItem key={list.slug} value={list.slug} disabled={isDisabled(list)}>
                          <span className="truncate">{list.name}</span>
                          <span className="text-muted-foreground ml-1.5 text-xs">
                            {isDisabled(list)
                              ? m.list_manage_objekt_owned_only()
                              : LIST_TYPE_LABEL[list.listType]()}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectPopup>
                  </Select>
                </div>

                {rule && single ? (
                  <div className="flex min-w-0 flex-col gap-1.5">
                    <Label htmlFor="add-to-list-any-member" className="font-normal">
                      <Checkbox
                        id="add-to-list-any-member"
                        checked={anyMember}
                        onCheckedChange={(checked) => setAnyMember(checked)}
                      />
                      {m.rule_any_member_of({
                        code: collectionCode(rule.artist, rule.season, rule.collectionNo),
                      })}
                    </Label>
                    <span className="text-muted-foreground ps-6.5 text-xs text-pretty sm:ps-6">
                      {!preview.data
                        ? m.rule_counting()
                        : preview.data.owned > 0
                          ? m.rule_any_member_of_desc({
                              member: single.member,
                              covers: preview.data.covers,
                              owned: preview.data.owned,
                            })
                          : m.rule_any_member_of_desc_none({
                              member: single.member,
                              covers: preview.data.covers,
                            })}
                    </span>
                    {/* a physical card whose collection has no online twin describes nothing */}
                    {asRule && preview.data?.problem ? (
                      <span className="text-destructive-foreground ps-6.5 text-xs text-pretty sm:ps-6">
                        {preview.data.problem === "no_collections"
                          ? m.rule_no_collections()
                          : m.rule_nothing_to_match()}
                      </span>
                    ) : null}
                  </div>
                ) : null}

                <div className="flex min-w-0 flex-col gap-1.5">
                  <Label htmlFor="add-to-list-skip-dups" className="font-normal">
                    <Checkbox
                      id="add-to-list-skip-dups"
                      checked={skipDups}
                      onCheckedChange={(checked) => setSkipDups(checked)}
                    />
                    {m.list_manage_objekt_skip_dups_label()}
                  </Label>
                  <span className="text-muted-foreground ps-6.5 text-xs text-pretty sm:ps-6">
                    {m.list_manage_objekt_skip_dups_desc()}
                  </span>
                </div>
              </div>
            )}
          </DialogPanel>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>
              {m.common_modal_cancel()}
            </DialogClose>
            <Button
              disabled={!selected || (asRule && preview.data?.problem != null)}
              loading={addToList.isPending || addRule.isPending}
              onClick={submit}
            >
              {asRule ? m.rule_add() : m.list_manage_objekt_add_button()}
            </Button>
          </DialogFooter>
        </DialogPopup>
      </Dialog>
      <CreateListDialog open={createOpen} onOpenChange={setCreateOpen} />
    </>
  );
}
