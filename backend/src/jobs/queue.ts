import { EventEmitter } from "node:events";
import { nanoid } from "nanoid";

export type JobStatus = "queued" | "running" | "succeeded" | "failed";
export type JobType = "analyze" | "monitor";

export interface Job<TInput = unknown> {
  id: string;
  type: JobType;
  status: JobStatus;
  input: TInput;
  createdAt: string;
  updatedAt: string;
  error?: string;
  result?: unknown;
}

type Handler<T> = (job: Job<T>) => Promise<void>;

export class InMemoryQueue extends EventEmitter {
  private handlers = new Map<JobType, Handler<any>>();
  private q: Job[] = [];
  private running = 0;

  constructor(private concurrency = 1) {
    super();
  }

  register<T>(type: JobType, handler: Handler<T>) {
    this.handlers.set(type, handler);
  }

  enqueue<T>(type: JobType, input: T): Job<T> {
    const now = new Date().toISOString();
    const job: Job<T> = {
      id: nanoid(),
      type,
      status: "queued",
      input,
      createdAt: now,
      updatedAt: now
    };
    this.q.push(job);
    this.emit("enqueued", job);
    this.pump();
    return job;
  }

  private pump() {
    while (this.running < this.concurrency && this.q.length > 0) {
      const job = this.q.shift()!;
      const handler = this.handlers.get(job.type);
      if (!handler) {
        job.status = "failed";
        job.error = `No handler for job type: ${job.type}`;
        this.emit("failed", job);
        continue;
      }

      this.running++;
      job.status = "running";
      job.updatedAt = new Date().toISOString();
      this.emit("running", job);

      handler(job)
        .then(() => {
          job.status = "succeeded";
          job.updatedAt = new Date().toISOString();
          this.emit("succeeded", job);
        })
        .catch((e) => {
          job.status = "failed";
          job.updatedAt = new Date().toISOString();
          job.error = String(e?.message ?? e);
          this.emit("failed", job);
        })
        .finally(() => {
          this.running--;
          this.pump();
        });
    }
  }
}
