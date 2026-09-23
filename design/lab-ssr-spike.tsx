// TEMPORARY SSR SPIKE — Base UI under TanStack Start. Not for commit.
import { Dialog } from "@base-ui/react/dialog";
import { Menu } from "@base-ui/react/menu";
import { NumberField } from "@base-ui/react/number-field";
import { Popover } from "@base-ui/react/popover";
import { Select } from "@base-ui/react/select";
import { Tabs } from "@base-ui/react/tabs";
import { Toast } from "@base-ui/react/toast";
import { Tooltip } from "@base-ui/react/tooltip";
import { useRender } from "@base-ui/react/use-render";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import * as z from "zod";

const searchSchema = z.object({
  tab: z.enum(["one", "two", "three"]).catch("one"),
});

export const Route = createFileRoute("/(container)/lab-ssr")({
  validateSearch: searchSchema,
  component: LabSsrPage,
});

const btn =
  "rounded-md border border-neutral-500 px-3 py-1.5 text-sm hover:bg-neutral-500/10 data-[popup-open]:bg-neutral-500/20";
const popup =
  "rounded-md border border-neutral-500 bg-white p-3 text-sm text-black shadow-lg dark:bg-neutral-900 dark:text-white";
const item =
  "cursor-default rounded px-2 py-1 outline-none data-[highlighted]:bg-neutral-500/20 data-[selected]:font-semibold";

/* useRender polymorphic button */
function PolyButton(props: useRender.ComponentProps<"button">) {
  const { render, ...rest } = props;
  return useRender({
    defaultTagName: "button",
    render,
    props: { type: "button", className: btn, ...rest },
  });
}

function LabSsrPage() {
  return (
    <Toast.Provider>
      <div className="flex flex-col gap-8 py-8" data-testid="lab-ssr-page">
        <h2 className="font-display text-xl font-semibold">Base UI SSR spike</h2>

        <Section title="Dialog">
          <Dialog.Root>
            <Dialog.Trigger className={btn} data-testid="dialog-trigger">
              Open dialog
            </Dialog.Trigger>
            <Dialog.Portal>
              <Dialog.Backdrop className="fixed inset-0 bg-black/40" />
              <Dialog.Popup
                className={`${popup} fixed top-1/2 left-1/2 w-80 -translate-x-1/2 -translate-y-1/2`}
                data-testid="dialog-popup"
              >
                <Dialog.Title className="font-semibold">Hello dialog</Dialog.Title>
                <Dialog.Description>Rendered via Dialog.Portal.</Dialog.Description>
                <Dialog.Close className={btn} data-testid="dialog-close">
                  Close
                </Dialog.Close>
              </Dialog.Popup>
            </Dialog.Portal>
          </Dialog.Root>
        </Section>

        <Section title="Popover">
          <Popover.Root>
            <Popover.Trigger className={btn} data-testid="popover-trigger">
              Open popover
            </Popover.Trigger>
            <Popover.Portal>
              <Popover.Positioner sideOffset={8}>
                <Popover.Popup className={popup} data-testid="popover-popup">
                  <Popover.Title className="font-semibold">Popover</Popover.Title>
                  <Popover.Description>Positioned with Popover.Positioner.</Popover.Description>
                </Popover.Popup>
              </Popover.Positioner>
            </Popover.Portal>
          </Popover.Root>
        </Section>

        <Section title="Select (single)">
          <SingleSelect />
        </Section>

        <Section title="Select (multiple)">
          <MultiSelect />
        </Section>

        <Section title="Menu with Router Link item">
          <Menu.Root>
            <Menu.Trigger className={btn} data-testid="menu-trigger">
              Open menu
            </Menu.Trigger>
            <Menu.Portal>
              <Menu.Positioner sideOffset={8}>
                <Menu.Popup className={popup} data-testid="menu-popup">
                  <Menu.Item className={item} data-testid="menu-item-plain">
                    Plain item
                  </Menu.Item>
                  <Menu.Item
                    className={item}
                    data-testid="menu-item-link"
                    render={<Link to="/" />}
                  >
                    Go home (Link)
                  </Menu.Item>
                </Menu.Popup>
              </Menu.Positioner>
            </Menu.Portal>
          </Menu.Root>
        </Section>

        <Section title="Tabs (?tab=)">
          <UrlTabs />
        </Section>

        <Section title="Tooltip">
          <Tooltip.Provider>
            <Tooltip.Root>
              <Tooltip.Trigger className={btn} data-testid="tooltip-trigger">
                Hover me
              </Tooltip.Trigger>
              <Tooltip.Portal>
                <Tooltip.Positioner sideOffset={6}>
                  <Tooltip.Popup className={popup} data-testid="tooltip-popup">
                    Tooltip text
                  </Tooltip.Popup>
                </Tooltip.Positioner>
              </Tooltip.Portal>
            </Tooltip.Root>
          </Tooltip.Provider>
        </Section>

        <Section title="NumberField">
          <NumberField.Root defaultValue={5} min={0} max={10} className="flex flex-col gap-1">
            <NumberField.ScrubArea>
              <label className="text-xs">Quantity</label>
            </NumberField.ScrubArea>
            <NumberField.Group className="flex">
              <NumberField.Decrement className={btn} data-testid="nf-dec">
                -
              </NumberField.Decrement>
              <NumberField.Input
                className="w-16 border-y border-neutral-500 text-center"
                data-testid="nf-input"
              />
              <NumberField.Increment className={btn} data-testid="nf-inc">
                +
              </NumberField.Increment>
            </NumberField.Group>
          </NumberField.Root>
        </Section>

        <Section title="Toast">
          <ToastButton />
        </Section>

        <Section title="useRender polymorphic Button">
          <div className="flex gap-2">
            <PolyButton data-testid="poly-button">Native button</PolyButton>
            <PolyButton render={<Link to="/terms-privacy" />} data-testid="poly-link">
              Rendered as Link
            </PolyButton>
          </div>
        </Section>
      </div>

      <Toast.Portal>
        <Toast.Viewport className="fixed right-4 bottom-4 flex w-72 flex-col gap-2">
          <ToastList />
        </Toast.Viewport>
      </Toast.Portal>
    </Toast.Provider>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h3 className="text-sm font-medium text-neutral-500">{title}</h3>
      {children}
    </section>
  );
}

const fruits = ["apple", "banana", "cherry", "durian"];

function SingleSelect() {
  const [value, setValue] = useState<string | null>("apple");
  return (
    <Select.Root value={value} onValueChange={setValue}>
      <Select.Trigger className={btn} data-testid="select-single-trigger">
        <Select.Value />
        <Select.Icon className="ml-2">▾</Select.Icon>
      </Select.Trigger>
      <Select.Portal>
        <Select.Positioner sideOffset={8}>
          <Select.Popup className={popup} data-testid="select-single-popup">
            {fruits.map((f) => (
              <Select.Item key={f} value={f} className={item}>
                <Select.ItemIndicator>✓ </Select.ItemIndicator>
                <Select.ItemText>{f}</Select.ItemText>
              </Select.Item>
            ))}
          </Select.Popup>
        </Select.Positioner>
      </Select.Portal>
    </Select.Root>
  );
}

function MultiSelect() {
  const [value, setValue] = useState<string[]>(["apple"]);
  return (
    <Select.Root multiple value={value} onValueChange={setValue}>
      <Select.Trigger className={btn} data-testid="select-multi-trigger">
        <Select.Value>
          {(v: string[]) => (v.length === 0 ? "Pick fruits" : v.join(", "))}
        </Select.Value>
        <Select.Icon className="ml-2">▾</Select.Icon>
      </Select.Trigger>
      <Select.Portal>
        <Select.Positioner sideOffset={8}>
          <Select.Popup className={popup} data-testid="select-multi-popup">
            {fruits.map((f) => (
              <Select.Item key={f} value={f} className={item} data-testid={`multi-item-${f}`}>
                <Select.ItemIndicator>✓ </Select.ItemIndicator>
                <Select.ItemText>{f}</Select.ItemText>
              </Select.Item>
            ))}
          </Select.Popup>
        </Select.Positioner>
      </Select.Portal>
    </Select.Root>
  );
}

function UrlTabs() {
  const { tab } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  return (
    <Tabs.Root
      value={tab}
      onValueChange={(v) => {
        void navigate({ search: { tab: v as typeof tab }, replace: true });
      }}
    >
      <Tabs.List className="flex gap-1 border-b border-neutral-500" data-testid="tab-list">
        {(["one", "two", "three"] as const).map((t) => (
          <Tabs.Tab
            key={t}
            value={t}
            className="px-3 py-1 text-sm data-[selected]:border-b-2 data-[selected]:font-semibold"
            data-testid={`tab-${t}`}
          >
            Tab {t}
          </Tabs.Tab>
        ))}
        <Tabs.Indicator />
      </Tabs.List>
      <Tabs.Panel value="one" data-testid="panel-one">
        Panel one
      </Tabs.Panel>
      <Tabs.Panel value="two" data-testid="panel-two">
        Panel two
      </Tabs.Panel>
      <Tabs.Panel value="three" data-testid="panel-three">
        Panel three
      </Tabs.Panel>
    </Tabs.Root>
  );
}

function ToastButton() {
  const toastManager = Toast.useToastManager();
  return (
    <button
      type="button"
      className={btn}
      data-testid="toast-trigger"
      onClick={() => toastManager.add({ title: "Toast fired", description: "From Base UI Toast" })}
    >
      Fire toast
    </button>
  );
}

function ToastList() {
  const { toasts } = Toast.useToastManager();
  return toasts.map((t) => (
    <Toast.Root key={t.id} toast={t} className={popup} data-testid="toast-root">
      <Toast.Title className="font-semibold" />
      <Toast.Description />
      <Toast.Close className={btn}>×</Toast.Close>
    </Toast.Root>
  ));
}
