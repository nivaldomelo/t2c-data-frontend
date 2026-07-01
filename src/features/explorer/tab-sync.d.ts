import type { DetailTab } from "./types";

export type ExplorerDetailTabSyncInput = {
  activeTab: DetailTab;
  pendingTab: DetailTab | null;
  urlTab: DetailTab;
};

export function shouldMirrorExplorerDetailTabFromUrl(input: ExplorerDetailTabSyncInput): boolean;
