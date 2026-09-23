import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectItem,
  SelectPopup,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useCosmoLinks } from "@/store/link";
import {
  LIST_TYPE_DESC,
  LIST_TYPE_LABEL,
  LIST_TYPES,
  type ListType,
  type NewList,
  useLists,
} from "@/store/lists";

/** the app's `common_form_none` */
const NONE = "None";
/** `Select` cannot hold `null` as an item value without colliding with "cleared" */
const NONE_VALUE = "__none__";

const CURRENCY_RE = /^[A-Za-z]{3}$/;

/**
 * `currency` is only collected for `sale` lists, matching the app, so a list
 * that is no longer for sale must not keep a stale code on save. `isProfileBind`
 * is the same shape one field over: it only means anything while a profile is
 * chosen, so a list with no profile must not keep a stale `true`.
 */
export function normalizeList(draft: NewList): NewList {
  return {
    ...draft,
    name: draft.name.trim(),
    currency: draft.type === "sale" ? draft.currency : "",
    isProfileBind: draft.profileNickname === null ? false : draft.isProfileBind,
  };
}

/** Same rules as `create-list-modal.tsx`: name required, currency 3 letters when selling. */
function listErrors(draft: NewList): { name?: string; currency?: string } {
  const errors: { name?: string; currency?: string } = {};
  if (draft.name.trim() === "") errors.name = "Name is required.";
  if (draft.type === "sale" && !CURRENCY_RE.test(draft.currency))
    errors.currency = "Enter a valid 3-letter currency code";
  return errors;
}

export function isListValid(draft: NewList): boolean {
  return Object.keys(listErrors(draft)).length === 0;
}

type ListFormProps = {
  /** prefixes every field id, so create and edit can be open in one document */
  idPrefix: string;
  value: NewList;
  onChange: (next: NewList) => void;
  /** show validation messages; the dialogs flip it on the first submit attempt */
  showErrors: boolean;
  /** the list being edited, which must not offer itself as its own paired list */
  excludeListId?: string;
};

/**
 * The field set of `apps/website/src/components/list/modal/{create,edit}-list-modal.tsx`,
 * shared by both lab dialogs so the two can never drift apart. Copy is the
 * `list_create_*` Paraglide messages, verbatim.
 *
 * Every field sits in a `min-w-0` column: cnippet's `SelectTrigger` renders
 * `w-full`, and a grid track that is not explicitly `minmax(0, …)` sizes to
 * the trigger's content rather than the other way round.
 */
export function ListForm({ idPrefix, value, onChange, showErrors, excludeListId }: ListFormProps) {
  const lists = useLists((s) => s.lists);
  const links = useCosmoLinks((s) => s.links);
  const errors = listErrors(value);

  const id = (field: string) => `${idPrefix}-${field}`;
  const set = (patch: Partial<NewList>) => onChange({ ...value, ...patch });

  const linkable = lists.filter((l) => l.id !== excludeListId);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex min-w-0 flex-col gap-1.5">
        <Label htmlFor={id("name")}>Name</Label>
        <Input
          id={id("name")}
          required
          autoFocus
          placeholder="My list"
          value={value.name}
          maxLength={32}
          aria-invalid={showErrors && errors.name !== undefined}
          onChange={(e) => set({ name: e.target.value })}
        />
        {showErrors && errors.name && (
          <span className="text-destructive-foreground text-xs">{errors.name}</span>
        )}
      </div>

      <div className="flex min-w-0 flex-col gap-1.5">
        <Label htmlFor={id("description")}>Description</Label>
        <Textarea
          id={id("description")}
          rows={3}
          placeholder="Optional description for your list"
          value={value.description}
          onChange={(e) => set({ description: e.target.value })}
        />
      </div>

      {/* minmax(0,…) on both tracks: without it the currency column is sized by
          the Type trigger's intrinsic width and the row overflows the dialog */}
      <div
        className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-3 data-currency:grid-cols-[minmax(0,1fr)_minmax(0,6.5rem)]"
        data-currency={value.type === "sale" || undefined}
      >
        <div className="flex min-w-0 flex-col gap-1.5">
          <Label htmlFor={id("type")}>List Type</Label>
          <Select
            value={value.type}
            onValueChange={(v: ListType | null) => set({ type: v ?? "general" })}
          >
            {/* cnippet's SelectValue prints the raw value; map it with a render fn */}
            <SelectTrigger id={id("type")} className="min-w-0">
              <SelectValue>{(v: ListType) => LIST_TYPE_LABEL[v]}</SelectValue>
            </SelectTrigger>
            <SelectPopup>
              {LIST_TYPES.map((t) => (
                <SelectItem key={t} value={t}>
                  {LIST_TYPE_LABEL[t]}
                </SelectItem>
              ))}
            </SelectPopup>
          </Select>
          {/* the website lists every type's description under a RadioGroup; the
              lab keeps the Select and shows the chosen type's line instead */}
          <span className="text-muted-foreground text-xs">{LIST_TYPE_DESC[value.type]}</span>
        </div>

        {value.type === "sale" && (
          <div className="flex min-w-0 flex-col gap-1.5">
            <Label htmlFor={id("currency")}>Currency</Label>
            <Input
              id={id("currency")}
              required
              placeholder="USD"
              maxLength={3}
              value={value.currency}
              aria-invalid={showErrors && errors.currency !== undefined}
              className="min-w-0"
              onChange={(e) => set({ currency: e.target.value.toUpperCase() })}
            />
            <span className="text-muted-foreground text-xs">
              Currency for objekt prices in this list
            </span>
            {showErrors && errors.currency && (
              <span className="text-destructive-foreground text-xs">{errors.currency}</span>
            )}
          </div>
        )}
      </div>

      <div className="flex min-w-0 flex-col gap-1.5">
        <Label htmlFor={id("linked")}>Link Paired List</Label>
        <Select
          value={value.linkedListId ?? NONE_VALUE}
          onValueChange={(v) => set({ linkedListId: v === NONE_VALUE || v === null ? null : v })}
        >
          <SelectTrigger id={id("linked")} className="min-w-0">
            <SelectValue>
              {(v) => (v === NONE_VALUE ? NONE : (lists.find((l) => l.id === v)?.name ?? NONE))}
            </SelectValue>
          </SelectTrigger>
          <SelectPopup>
            <SelectItem value={NONE_VALUE}>{NONE}</SelectItem>
            {linkable.map((l) => (
              <SelectItem key={l.id} value={l.id}>
                {l.name}
                <span className="text-muted-foreground ml-1.5 text-xs">
                  {LIST_TYPE_LABEL[l.type]}
                </span>
              </SelectItem>
            ))}
          </SelectPopup>
        </Select>
        <span className="text-muted-foreground text-xs">
          Link this list with a complementary Have/Want list
        </span>
      </div>

      <div className="flex min-w-0 flex-col gap-1.5">
        <Label htmlFor={id("profile")}>Profile</Label>
        <Select
          value={value.profileNickname ?? NONE_VALUE}
          onValueChange={(v) => {
            const profileNickname = v === NONE_VALUE || v === null ? null : v;
            // the switch below is meaningless without a profile, so clearing the
            // select clears it rather than leaving a `true` the UI cannot show
            set({
              profileNickname,
              isProfileBind: profileNickname === null ? false : value.isProfileBind,
            });
          }}
        >
          <SelectTrigger id={id("profile")} className="min-w-0">
            <SelectValue placeholder="Select a profile">
              {(v) => (v === NONE_VALUE ? NONE : v)}
            </SelectValue>
          </SelectTrigger>
          <SelectPopup>
            <SelectItem value={NONE_VALUE}>{NONE}</SelectItem>
            {links.map((l) => (
              <SelectItem key={l.address} value={l.nickname}>
                {l.nickname}
              </SelectItem>
            ))}
          </SelectPopup>
        </Select>
        <span className="text-muted-foreground text-xs">
          {links.length === 0
            ? "Link a Cosmo account first to display this list on a profile"
            : "Choose the profile this list belongs to"}
        </span>
      </div>

      {/* The website calls this `is_profile_bind` and labels it "Bind to Profile"
          (`list_create_profile_bind_label`), where the checkbox also switches the
          list to tracking owned objekts. The lab only models the visible half —
          a list can be filed under a Cosmo without appearing on it — so the copy
          is the website's `list_create_display_profile_desc` line instead. */}
      <Label className="flex min-w-0 items-center justify-between gap-3">
        <span className="flex flex-col gap-0.5">
          Show in profile
          <span className="text-muted-foreground text-xs font-normal">
            Display this list in the profile's Lists tab
          </span>
        </span>
        <Switch
          checked={value.isProfileBind}
          disabled={value.profileNickname === null}
          onCheckedChange={(checked) => set({ isProfileBind: checked })}
        />
      </Label>

      <Label className="flex min-w-0 items-center justify-between gap-3">
        <span className="flex flex-col gap-0.5">
          Public
          <span className="text-muted-foreground text-xs font-normal">
            Anyone with the link can open this list
          </span>
        </span>
        <Switch
          checked={value.isPublic}
          onCheckedChange={(checked) => set({ isPublic: checked })}
        />
      </Label>
    </div>
  );
}
