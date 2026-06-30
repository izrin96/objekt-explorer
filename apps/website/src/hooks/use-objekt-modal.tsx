import {
  createContext,
  type PropsWithChildren,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

export type ValidTab = "owned" | "trades" | "market";

interface ObjektModalState {
  currentTab: ValidTab;
  setCurrentTab: (tab: ValidTab) => void;
  showOwned: boolean;
  isProfile: boolean;
}

const ObjektModalContext = createContext<ObjektModalState | null>(null);

type ProviderProps = PropsWithChildren<{
  initialTab: ValidTab;
  showOwned: boolean;
  isProfile?: boolean;
}>;

export function ObjektModalProvider({
  children,
  initialTab,
  showOwned,
  isProfile = false,
}: ProviderProps) {
  const [currentTab, setCurrentTab] = useState(initialTab);

  useEffect(() => {
    setCurrentTab(initialTab);
  }, [initialTab]);

  const value = useMemo(
    () => ({ currentTab, setCurrentTab, showOwned, isProfile }),
    [currentTab, showOwned, isProfile],
  );

  return <ObjektModalContext value={value}>{children}</ObjektModalContext>;
}

export function useObjektModal() {
  const ctx = useContext(ObjektModalContext);
  if (!ctx) throw new Error("useObjektModal must be used within an ObjektModalProvider");
  return ctx;
}
