export type WsTopic =
  | { type: "job:update"; jobId: string; message?: string }
  | { type: "job:done"; jobId: string; reportId?: string; error?: string }
  | { type: "monitor:alert"; address: string; message: string };

export function topicKey(t: WsTopic): string {
  switch (t.type) {
    case "job:update":
      return `job:update:${t.jobId}`;
    case "job:done":
      return `job:done:${t.jobId}`;
    case "monitor:alert":
      return `monitor:alert:${t.address.toLowerCase()}`;
  }
}
