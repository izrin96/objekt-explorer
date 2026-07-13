import { ArchiveBoxXMarkIcon } from "@heroicons/react/24/outline";
import {
  CaretLeftIcon,
  CaretRightIcon,
  DotsThreeVerticalIcon,
  LockSimpleIcon,
  PushPinIcon,
} from "@phosphor-icons/react/dist/ssr";
import { useAsyncList } from "@react-stately/data";
import { type OwnedObjekt, type ValidObjekt } from "@repo/lib/types/objekt";
import { format } from "date-fns";
import { useCallback, useMemo, useState } from "react";
import type { SortDescriptor } from "react-aria-components";

import { useObjektModal, type ValidTab } from "@/hooks/use-objekt-modal";
import { useObjektSelect } from "@/hooks/use-objekt-select";
import { useProfileTarget } from "@/hooks/use-profile-target";
import { useCurrentUser, useProfileAuthed } from "@/hooks/use-user";
import { isObjektOwned } from "@/lib/objekt-utils";
import { type CurrentUser } from "@/lib/universal/current-user";
import { m } from "@/paraglide/messages";

import { Badge } from "../intentui/badge";
import { Button } from "../intentui/button";
import { Card, CardContent } from "../intentui/card";
import { Menu, MenuContent, MenuSeparator } from "../intentui/menu";
import { Table, TableBody, TableCell, TableColumn, TableHeader, TableRow } from "../intentui/table";
import { Tab, TabList, TabPanel, Tabs } from "../intentui/tabs";
import { ApolloIcon } from "../shared/apollo-icon";
import { AddToListMenu } from "./actions/list";
import { ToggleLockMenuItem } from "./actions/lock";
import { MovePinMenuItem, TogglePinMenuItem } from "./actions/pin";
import MarketView from "./market-view";
import TradeView from "./trade-view";

const ITEM_PAGE = 10;

export function ObjektPanel({ objekts }: { objekts: ValidObjekt[] }) {
  const { showOwned, currentTab, setCurrentTab } = useObjektModal();
  const [objekt] = objekts;
  const [serial, setSerial] = useState(() => {
    return objekt && isObjektOwned(objekt) ? objekt.serial : null;
  });

  if (!objekt) return null;

  const isOwned = isObjektOwned(objekt);

  return (
    <Tabs
      aria-label={m.objekt_tab_aria()}
      selectedKey={currentTab}
      onSelectionChange={(key) => setCurrentTab(key.toString() as ValidTab)}
      className="w-full pb-2"
    >
      <TabList className="px-2.5">
        {showOwned && (
          <Tab id="owned">
            {m.objekt_owned()}
            {objekts.length > 1 ? ` (${objekts.length.toLocaleString()})` : ""}
          </Tab>
        )}
        <Tab id="trades">{m.objekt_trades()}</Tab>
        <Tab id="market">{m.objekt_market()}</Tab>
        <Tab
          href={`https://apollo.cafe/?id=${objekt.slug}`}
          rel="noopener noreferrer"
          target="_blank"
        >
          <ApolloIcon />
          {m.objekt_view_in_apollo()}
        </Tab>
      </TabList>
      {showOwned && (
        <TabPanel id="owned">
          {isOwned ? (
            <OwnedListPanel setSerial={setSerial} objekts={objekts.filter(isObjektOwned)} />
          ) : (
            <div className="flex flex-col items-center justify-center gap-3">
              <ArchiveBoxXMarkIcon className="size-16" strokeWidth={1} />
              <span>{m.objekt_not_owned()}</span>
            </div>
          )}
        </TabPanel>
      )}
      <TabPanel id="trades">
        <TradeView objekt={objekt} serial={serial} />
      </TabPanel>
      <TabPanel id="market">
        <MarketView collectionSlug={objekt.slug} />
      </TabPanel>
    </Tabs>
  );
}

function OwnedListPanel({
  objekts,
  setSerial,
}: {
  objekts: OwnedObjekt[];
  setSerial: (serial: number) => void;
}) {
  const [currentPage, setCurrentPage] = useState(1);
  const { setCurrentTab, isProfile, showPinLock } = useObjektModal();
  const profile = useProfileTarget();
  const isProfileAuthed = useProfileAuthed();
  const showPinLockActions = showPinLock && isProfileAuthed;
  const selectMode = useObjektSelect((a) => a.mode);
  const select = useObjektSelect((a) => a.select);
  const { data: currentUser } = useCurrentUser();

  const openTrades = useCallback(
    (serial: number) => {
      setSerial(serial);
      setCurrentTab("trades");
    },
    [setSerial, setCurrentTab],
  );

  const handleSort = useCallback(
    ({ items, sortDescriptor }: { items: OwnedObjekt[]; sortDescriptor: SortDescriptor }) => {
      return items.toSorted((a, b) => {
        let cmp = 0;
        if (sortDescriptor.column === "receivedAt") {
          const aTime = new Date(a.receivedAt).getTime();
          const bTime = new Date(b.receivedAt).getTime();
          if (aTime < bTime) cmp = -1;
          else if (aTime > bTime) cmp = 1;
          else cmp = 0;
        }
        if (sortDescriptor.column === "serial") {
          if (a.serial < b.serial) cmp = -1;
          else if (a.serial > b.serial) cmp = 1;
          else cmp = 0;
        }
        if (sortDescriptor.direction === "descending") cmp *= -1;
        return cmp;
      });
    },
    [],
  );

  const list = useAsyncList<OwnedObjekt>({
    getKey: (item) => item.id,
    async load() {
      return {
        items: objekts,
        sortDescriptor: {
          column: "receivedAt",
          direction: "descending",
        },
      };
    },
    async sort(params) {
      return {
        items: handleSort(params),
      };
    },
  });

  const totalPages = useMemo(() => Math.ceil(list.items.length / ITEM_PAGE), [list.items.length]);
  const startIndex = (currentPage - 1) * ITEM_PAGE;
  const endIndex = startIndex + ITEM_PAGE;
  const currentItems = list.items.slice(startIndex, endIndex);

  return (
    <div className="flex flex-col gap-2">
      <Card className="py-0">
        <CardContent className="px-3">
          <Table
            className="[--gutter:--spacing(3)]"
            bleed
            aria-label={m.objekt_owned_table_aria()}
            sortDescriptor={list.sortDescriptor}
            onSortChange={list.sort}
          >
            <TableHeader>
              <TableColumn id="serial" allowsSorting isRowHeader maxWidth={110}>
                {m.objekt_serial()}
              </TableColumn>
              <TableColumn>{m.objekt_token_id()}</TableColumn>
              <TableColumn id="receivedAt" allowsSorting minWidth={200}>
                {m.objekt_received()}
              </TableColumn>
              <TableColumn>{m.objekt_transferable()}</TableColumn>
              <TableColumn maxWidth={48} />
            </TableHeader>
            <TableBody>
              {currentItems.map((item) => (
                <OwnedTableRow
                  key={item.id}
                  item={item}
                  selectMode={selectMode}
                  onSelect={() => select([item])}
                  onOpenTrades={() => openTrades(item.serial)}
                  showPinLockActions={showPinLockActions}
                  isProfile={isProfile}
                  profileAddress={profile?.address}
                  currentUser={currentUser}
                />
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <Button
            size="sq-md"
            intent="outline"
            isDisabled={currentPage <= 1}
            aria-label={m.objekt_pagination_previous_aria()}
            onPress={() => setCurrentPage(currentPage - 1)}
          >
            <CaretLeftIcon />
          </Button>
          <span>
            {currentPage} / {totalPages}
          </span>
          <Button
            size="sq-md"
            intent="outline"
            isDisabled={currentPage >= totalPages}
            aria-label={m.objekt_pagination_next_aria()}
            onPress={() => setCurrentPage(currentPage + 1)}
          >
            <CaretRightIcon />
          </Button>
        </div>
      )}
    </div>
  );
}

function OwnedTableRow({
  item,
  selectMode,
  onSelect,
  onOpenTrades,
  showPinLockActions,
  isProfile,
  profileAddress,
  currentUser,
}: {
  item: OwnedObjekt;
  selectMode: boolean;
  onSelect: () => void;
  onOpenTrades: () => void;
  showPinLockActions: boolean | undefined;
  isProfile: boolean | undefined;
  profileAddress: string | undefined;
  currentUser: CurrentUser;
}) {
  const isSelected = useObjektSelect((state) => state.isSelected(item));

  return (
    <TableRow
      id={item.id}
      onAction={selectMode ? onSelect : undefined}
      className={isSelected ? "outline-primary rounded-md outline-2 -outline-offset-2" : ""}
    >
      <TableCell onClick={onOpenTrades} className="cursor-pointer">
        <div className="inline-flex items-center gap-2">
          {item.serial}
          {item.isPin && <PushPinIcon weight="regular" className="size-3" />}
          {item.isLocked && <LockSimpleIcon weight="regular" className="size-3" />}
        </div>
      </TableCell>
      <TableCell>{item.tokenId}</TableCell>
      <TableCell>{format(item.receivedAt, "yyyy/MM/dd h:mm:ss a")}</TableCell>
      <TableCell>
        <Badge intent={item.transferable ? "info" : "danger"}>
          {item.transferable ? m.objekt_yes() : m.objekt_no()}
        </Badge>
      </TableCell>
      <TableCell>
        {currentUser && (
          <Menu>
            <Button size="sq-xs" intent="plain" aria-label={m.objekt_menu_aria()}>
              <DotsThreeVerticalIcon size={16} weight="bold" />
            </Button>
            <MenuContent placement="bottom right" popover={{ offset: -2 }}>
              {showPinLockActions && (
                <>
                  <TogglePinMenuItem isPin={item.isPin ?? false} tokenId={item.tokenId} />
                  {item.isPin && (
                    <>
                      <MovePinMenuItem tokenId={item.tokenId} direction="up" />
                      <MovePinMenuItem tokenId={item.tokenId} direction="down" />
                    </>
                  )}
                  <ToggleLockMenuItem isLocked={item.isLocked ?? false} tokenId={item.tokenId} />
                  <MenuSeparator />
                </>
              )}
              <AddToListMenu objekts={[item]} address={isProfile ? profileAddress : undefined} />
            </MenuContent>
          </Menu>
        )}
      </TableCell>
    </TableRow>
  );
}
