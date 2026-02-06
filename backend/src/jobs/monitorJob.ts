import type { Job } from "./queue";
import { queue } from "./queueInstance";
import { monitorService } from "../services/monitorService";

export interface MonitorJobInput {
  // placeholder: future use (poll chain, etc.)
  tick?: number;
}

export function registerMonitorJobHandler() {
  queue.register<MonitorJobInput>("monitor", async (_job: Job<MonitorJobInput>) => {
    // 课程项目：先占位。未来这里做轮询链上事件/地址告警。
    monitorService.tick();
  });
}
