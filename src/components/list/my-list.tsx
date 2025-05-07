"use client";

import {
  Button,
  Card,
  Checkbox,
  Form,
  Link,
  Menu,
  Modal,
  Note,
  Select,
  Tabs,
  TextField,
} from "@/components/ui";
import { api } from "@/lib/trpc/client";
import React, { useEffect, useState } from "react";
import { IconDotsVertical } from "@intentui/icons";
import { QueryErrorResetBoundary } from "@tanstack/react-query";
import { ErrorBoundary } from "react-error-boundary";
import ErrorFallbackRender from "../error-boundary";
import { groupBy } from "es-toolkit";
import { CollectionFormat } from "@/lib/server/api/routers/list";
import { getBaseURL } from "@/lib/utils";
import { Textarea } from "../ui/textarea";

export default function MyListRender() {
  return (
    <QueryErrorResetBoundary>
      {({ reset }) => (
        <ErrorBoundary onReset={reset} FallbackComponent={ErrorFallbackRender}>
          <MyList />
        </ErrorBoundary>
      )}
    </QueryErrorResetBoundary>
  );
}

export function MyList() {
  const [lists] = api.list.myList.useSuspenseQuery();

  return (
    <div className="flex flex-col gap-4">
      <div className="text-xl font-semibold">My List</div>

      <Tabs aria-label="Navbar">
        <Tabs.List>
          <Tabs.Tab id="a">Normal List</Tabs.Tab>
          <Tabs.Tab id="b">Profile List</Tabs.Tab>
        </Tabs.List>
        <Tabs.Panel id="a" className="flex flex-col gap-4">
          <div className="w-full flex gap-2">
            <CreateList />
            <GenerateDiscordFormat />
          </div>

          <div className="grid gap-2 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {lists.map((list) => (
              <Card key={list.slug} className="bg-secondary/20">
                <Card.Content className="flex justify-between">
                  <Link
                    href={`/list/${list.slug}`}
                    className="font-semibold text-base flex-1"
                  >
                    {list.name}
                  </Link>
                  <EditList slug={list.slug} list={list}>
                    {({ open: openEdit }) => (
                      <DeleteList slug={list.slug}>
                        {({ open: openDelete }) => (
                          <Menu>
                            <Button intent="outline" size="extra-small">
                              <IconDotsVertical />
                            </Button>
                            <Menu.Content className="sm:min-w-56">
                              <Menu.Item href={`/list/${list.slug}`}>
                                Open
                              </Menu.Item>
                              <Menu.Item onAction={openEdit}>Edit</Menu.Item>
                              <Menu.Item isDanger onAction={openDelete}>
                                Delete
                              </Menu.Item>
                            </Menu.Content>
                          </Menu>
                        )}
                      </DeleteList>
                    )}
                  </EditList>
                </Card.Content>
              </Card>
            ))}
          </div>
        </Tabs.Panel>
        <Tabs.Panel id="b">
          <Note>This feature is not yet available</Note>
        </Tabs.Panel>
      </Tabs>
    </div>
  );
}

function GenerateDiscordFormat() {
  const [open, setOpen] = useState(false);
  const [formatText, setFormatText] = useState("");
  const [showCount, setShowCount] = useState(false);
  const [includeLink, setIncludeLink] = useState(false);

  const generateDiscordFormat = api.list.generateDiscordFormat.useMutation();
  const list = api.list.myList.useQuery();

  useEffect(() => {
    if (!generateDiscordFormat.data) return;

    const { have, want, haveSlug, wantSlug } = generateDiscordFormat.data;
    const haveMap = new Map(have);
    const wantMap = new Map(want);

    setFormatText(
      [
        "### Have:",
        ...format(haveMap, showCount),
        ...[
          ...(includeLink
            ? [
                "",
                `[View this list with picture](<${getBaseURL()}/list/${haveSlug}>)`,
                "", // give a little bit of spacing
              ]
            : []),
        ],
        "### Want:",
        ...format(wantMap, showCount),
        ...[
          ...(includeLink
            ? [
                "",
                `[View this list with picture](<${getBaseURL()}/list/${wantSlug}>)`,
              ]
            : []),
        ],
      ].join("\n")
    );
  }, [generateDiscordFormat.data, includeLink, showCount]);

  return (
    <>
      <Button intent="outline" onClick={() => setOpen(true)}>
        Generate Discord Format
      </Button>
      <Modal.Content isOpen={open} onOpenChange={setOpen}>
        <Form
          onSubmit={async (e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            generateDiscordFormat.mutate({
              haveSlug: formData.get("haveSlug") as string,
              wantSlug: formData.get("wantSlug") as string,
            });
          }}
        >
          <Modal.Header>
            <Modal.Title>Generate Discord Format</Modal.Title>
          </Modal.Header>
          <Modal.Body className="flex flex-col gap-2">
            <Select label="Have list" name="haveSlug" isRequired>
              <Select.Trigger />
              <Select.List items={list.data ?? []}>
                {(item) => (
                  <Select.Option id={item.slug} textValue={item.slug}>
                    {item.name}
                  </Select.Option>
                )}
              </Select.List>
            </Select>
            <Select label="Want list" name="wantSlug" isRequired>
              <Select.Trigger />
              <Select.List items={list.data ?? []}>
                {(item) => (
                  <Select.Option id={item.slug} textValue={item.slug}>
                    {item.name}
                  </Select.Option>
                )}
              </Select.List>
            </Select>
            <Checkbox
              label="Show count"
              isSelected={showCount}
              onChange={setShowCount}
            />
            <Checkbox
              label="Include link"
              isSelected={includeLink}
              onChange={setIncludeLink}
            />
            <Textarea label="Formatted discord text" value={formatText} />
          </Modal.Body>
          <Modal.Footer className="flex justify-end">
            <Button type="submit" isPending={generateDiscordFormat.isPending}>
              Generate
            </Button>
          </Modal.Footer>
        </Form>
      </Modal.Content>
    </>
  );
}

function format(
  collectionMap: Map<string, CollectionFormat[]>,
  showQuantity: boolean
) {
  return Array.from(collectionMap.entries()).map(([member, collections]) => {
    const formatCollections = collections.map((collection) => {
      const seasonType = collection.season.charAt(0);
      const seasonNumber = parseInt(collection.season.slice(-2));
      const seasonFormat = Array.from({ length: seasonNumber })
        .map(() => seasonType)
        .join("");

      return `${seasonFormat}${collection.collectionNo}`;
    });

    const groupedFormat = groupBy(formatCollections, (a) => a);

    const formattedWithQuantity = Object.entries(groupedFormat)
      .map(([key, group]) =>
        showQuantity && group.length > 1 ? `${key} (x${group.length})` : key
      )
      .sort();

    return `${member} ${formattedWithQuantity.join(", ")}`;
  });
}

function CreateList() {
  const [open, setOpen] = useState(false);
  const utils = api.useUtils();
  const createList = api.list.create.useMutation({
    onSuccess: () => {
      setOpen(false);
      utils.list.myList.invalidate();
    },
  });
  return (
    <>
      <Button onClick={() => setOpen(true)}>Create list</Button>
      <Modal.Content isOpen={open} onOpenChange={setOpen}>
        <Form
          onSubmit={async (e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            createList.mutate({ name: formData.get("name") as string });
          }}
        >
          <Modal.Header>
            <Modal.Title>Create list</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <TextField
              isRequired
              autoFocus
              label="Name"
              placeholder="My list"
              name="name"
            />
          </Modal.Body>
          <Modal.Footer>
            <Modal.Close>Cancel</Modal.Close>
            <Button type="submit" isPending={createList.isPending}>
              Create
            </Button>
          </Modal.Footer>
        </Form>
      </Modal.Content>
    </>
  );
}

function DeleteList({
  slug,
  children,
}: {
  slug: string;
  children: ({ open }: { open: () => void }) => React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const utils = api.useUtils();
  const deleteList = api.list.delete.useMutation({
    onSuccess: () => {
      setOpen(false);
      utils.list.myList.invalidate();
    },
  });
  return (
    <>
      {children?.({
        open: () => {
          setOpen(true);
        },
      })}
      <Modal.Content role="alertdialog" isOpen={open} onOpenChange={setOpen}>
        <Form
          onSubmit={async (e) => {
            e.preventDefault();
            deleteList.mutate({ slug });
          }}
        >
          <Modal.Header>
            <Modal.Title>Delete list</Modal.Title>
            <Modal.Description>
              This will permanently delete the selected list. Continue?
            </Modal.Description>
          </Modal.Header>
          <Modal.Footer>
            <Modal.Close>Cancel</Modal.Close>
            <Button
              intent="danger"
              type="submit"
              isPending={deleteList.isPending}
            >
              Continue
            </Button>
          </Modal.Footer>
        </Form>
      </Modal.Content>
    </>
  );
}

function EditList({
  slug,
  list,
  children,
}: {
  slug: string;
  list: { name: string };
  children: ({ open }: { open: () => void }) => React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const utils = api.useUtils();
  const editList = api.list.edit.useMutation({
    onSuccess: () => {
      setOpen(false);
      utils.list.myList.invalidate();
    },
  });
  return (
    <>
      {children?.({
        open: () => {
          setOpen(true);
        },
      })}
      <Modal.Content isOpen={open} onOpenChange={setOpen}>
        <Form
          onSubmit={async (e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            editList.mutate({ slug, name: formData.get("name") as string });
          }}
        >
          <Modal.Header>
            <Modal.Title>Edit list</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <TextField
              isRequired
              autoFocus
              label="Name"
              placeholder="My list"
              name="name"
              defaultValue={list.name}
            />
          </Modal.Body>
          <Modal.Footer>
            <Modal.Close>Cancel</Modal.Close>
            <Button type="submit" isPending={editList.isPending}>
              Save
            </Button>
          </Modal.Footer>
        </Form>
      </Modal.Content>
    </>
  );
}
