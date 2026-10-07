import { MESSAGE_ALLOW, type MessageAllow } from "@repo/api/schemas/chat";
import { truncateAddress } from "@repo/lib/address";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Label } from "@/components/ui/label";
import { Radio, RadioGroup } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { toastManager } from "@/components/ui/toast";
import { chatSettingsOptions } from "@/features/chat/queries";
import { useUserProfiles } from "@/features/user/hooks";
import { displayNickname } from "@/lib/address";
import { orpc } from "@/lib/orpc";
import { m } from "@/paraglide/messages";

const ALLOW_LABEL: Record<MessageAllow, { label: () => string; description: () => string }> = {
  anyone: { label: m.chat_settings_allow_anyone, description: m.chat_settings_allow_anyone_desc },
  nobody: { label: m.chat_settings_allow_nobody, description: m.chat_settings_allow_nobody_desc },
};

/** Each control saves on change, like the notification switches. */
export function MessagesSection() {
  const queryClient = useQueryClient();
  const options = chatSettingsOptions();
  const settings = useQuery(options);
  const profiles = useUserProfiles();
  const { queryKey } = options;

  const mutation = useMutation(
    orpc.chat.setSettings.mutationOptions({
      onMutate: async (input) => {
        await queryClient.cancelQueries({ queryKey });
        const previous = queryClient.getQueryData(queryKey);
        queryClient.setQueryData(queryKey, (old) => (old ? { ...old, ...input } : old));
        return { previous };
      },
      onError: (_error, _input, context) => {
        queryClient.setQueryData(queryKey, context?.previous);
        toastManager.add({ type: "error", title: m.chat_settings_error() });
      },
      // open threads read Seen from the conversation, so they read it again under the new switch
      onSuccess: (_, input) =>
        input.showActivity === undefined
          ? undefined
          : queryClient.invalidateQueries({ queryKey: orpc.chat.thread.key() }),
      onSettled: () => queryClient.invalidateQueries({ queryKey }),
    }),
  );

  return (
    <div className="flex flex-col gap-6">
      <section aria-labelledby="account-messages-allow" className="flex flex-col gap-3">
        <div className="flex flex-col gap-0.5">
          <h3 id="account-messages-allow" className="text-sm font-medium text-balance">
            {m.chat_settings_allow()}
          </h3>
          <p className="text-muted-foreground text-xs text-pretty">
            {m.chat_settings_allow_desc()}
          </p>
        </div>
        <RadioGroup
          aria-labelledby="account-messages-allow"
          value={settings.data?.allow ?? null}
          disabled={!settings.data}
          onValueChange={(next) => {
            const allow = MESSAGE_ALLOW.find((value) => value === next);
            if (allow) mutation.mutate({ allow });
          }}
          className="gap-2.5"
        >
          {MESSAGE_ALLOW.map((value) => (
            <Field key={value} className="w-full flex-row items-start gap-2.5">
              <Radio value={value} className="mt-0.5" />
              <FieldLabel className="flex-col items-start gap-0.5 font-normal">
                <span className="font-medium">{ALLOW_LABEL[value].label()}</span>
                <FieldDescription render={<span />}>
                  {ALLOW_LABEL[value].description()}
                </FieldDescription>
              </FieldLabel>
            </Field>
          ))}
        </RadioGroup>
      </section>

      <Label
        htmlFor="account-messages-activity"
        className="flex min-w-0 items-start justify-between gap-3 font-normal"
      >
        <span className="flex min-w-0 flex-col gap-0.5">
          <span className="text-sm font-medium">{m.chat_settings_activity()}</span>
          <span className="text-muted-foreground text-xs text-pretty">
            {m.chat_settings_activity_desc()}
          </span>
        </span>
        <Switch
          id="account-messages-activity"
          className="mt-0.5 shrink-0"
          checked={settings.data?.showActivity ?? true}
          disabled={!settings.data}
          onCheckedChange={(showActivity) => mutation.mutate({ showActivity })}
        />
      </Label>

      {profiles.length > 0 ? (
        <section aria-labelledby="account-messages-chat-as" className="flex flex-col gap-3">
          <div className="flex flex-col gap-0.5">
            <h3 id="account-messages-chat-as" className="text-sm font-medium text-balance">
              {m.chat_settings_chat_as()}
            </h3>
            <p className="text-muted-foreground text-xs text-pretty">
              {m.chat_settings_chat_as_desc()}
            </p>
          </div>
          <RadioGroup
            aria-labelledby="account-messages-chat-as"
            value={settings.data?.chatAs ?? null}
            disabled={!settings.data}
            onValueChange={(next) => {
              if (typeof next === "string") mutation.mutate({ chatAs: next });
            }}
            className="gap-2.5"
          >
            {profiles.map((profile) => (
              <Field key={profile.address} className="w-full flex-row items-center gap-2.5">
                <Radio value={profile.address.toLowerCase()} />
                <FieldLabel className="min-w-0 gap-2 font-normal">
                  <span className="truncate font-medium">
                    {displayNickname(profile.address, profile.nickname)}
                  </span>
                  <span className="text-muted-foreground font-mono text-xs">
                    {truncateAddress(profile.address)}
                  </span>
                </FieldLabel>
              </Field>
            ))}
          </RadioGroup>
        </section>
      ) : null}
    </div>
  );
}
