"use client";

import { createContext, useContext } from "react";

export interface TabNavigationContext {
  setActiveTab: (tab: string) => void;
  setTxHash: (hash: string) => void;
  setBlockNumber: (num: string) => void;
  setContractAddress: (addr: string) => void;
  setReportId?: (id: string) => void;
}

export const TabNavContext = createContext<TabNavigationContext>({
  setActiveTab: () => {},
  setTxHash: () => {},
  setBlockNumber: () => {},
  setContractAddress: () => {},
  setReportId: () => {},
});

export function useNavigateTab() {
  return useContext(TabNavContext);
}
