import { queue } from "./queueInstance";

let timer: NodeJS.Timeout | null = null;

export function startScheduler() {
  // 每 10s 触发一次 monitor tick（占位）
  timer = setInterval(() => {
    queue.enqueue("monitor", { tick: Date.now() });
  }, 10_000);
}

export function stopScheduler() {
  if (timer) clearInterval(timer);
  timer = null;
}
