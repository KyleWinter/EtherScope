import { StorageDiffItem } from "./types.js";

export type StorageDiffProvider = {
  // 例如某些节点或外部服务可返回 storage diff
  getStorageDiff(txHash: string): Promise<StorageDiffItem[]>;
};

export async function tryGetStorageDiff(
  provider: StorageDiffProvider | undefined,
  txHash: string
): Promise<StorageDiffItem[] | undefined> {
  if (!provider) return undefined;
  try {
    return await provider.getStorageDiff(txHash);
  } catch {
    return undefined;
  }
}
