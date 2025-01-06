"use client";

import { ReactNode, createContext, useContext, useState } from "react";

type ContextProps = {
  currentTab?: string;
  setCurrentTab: (val: string) => void;
};

const ObjektModalContext = createContext<ContextProps>({} as ContextProps);

type ProviderProps = {
  children: ReactNode;
  initialTab?: string;
};

export function ObjektModalProvider({ children, initialTab }: ProviderProps) {
  const [currentTab, setCurrentTab] = useState(initialTab);
  return (
    <ObjektModalContext value={{ currentTab, setCurrentTab }}>
      {children}
    </ObjektModalContext>
  );
}

export function useObjektModal() {
  const ctx = useContext(ObjektModalContext);
  return {
    ...ctx,
  };
}
