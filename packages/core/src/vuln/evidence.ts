import { CallNode } from "../trace/types.js";

export function buildCallPath(flatById: Map<string, CallNode>, leafId: string): string[] {
  const path: string[] = [];
  let cur: CallNode | undefined = flatById.get(leafId);
  while (cur) {
    path.push(cur.id);
    cur = cur.parentId ? flatById.get(cur.parentId) : undefined;
  }
  path.reverse();
  return path;
}
