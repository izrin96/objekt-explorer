import { isAddress } from "@repo/lib";
import { createFileRoute, notFound, useNavigate } from "@tanstack/react-router";
import { useState } from "react";

import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Form } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { canOpenTab } from "@/features/moderation/staff-tabs";
import type { FieldErrors } from "@/lib/form";
import { generateMetadata } from "@/lib/meta";
import { m } from "@/paraglide/messages";

export const Route = createFileRoute("/(container)/mod/addresses/")({
  beforeLoad: ({ context: { viewerRole } }) => {
    if (!canOpenTab("addresses", viewerRole)) throw notFound();
  },
  head: () => generateMetadata({ title: m.mod_lookup_title() }),
  component: AddressLookup,
});

function AddressLookup() {
  const navigate = useNavigate();
  const [errors, setErrors] = useState<FieldErrors>({});

  return (
    <>
      <PageHeader title={m.mod_lookup_title()} description={m.mod_lookup_description()} />
      <Form
        errors={errors}
        className="max-w-md"
        onFormSubmit={(values) => {
          const address = String(values.address ?? "").trim();
          if (!isAddress(address)) {
            setErrors({ address: m.mod_lookup_invalid() });
            return;
          }
          setErrors({});
          void navigate({ to: "/mod/addresses/$address", params: { address } });
        }}
      >
        <Field name="address" className="gap-1.5">
          <FieldLabel>{m.mod_lookup_label()}</FieldLabel>
          <div className="flex gap-2">
            <Input
              className="font-mono"
              autoComplete="off"
              spellCheck={false}
              aria-required
              placeholder="0x…"
            />
            <Button type="submit">{m.mod_lookup_submit()}</Button>
          </div>
          <FieldError />
        </Field>
      </Form>
    </>
  );
}
