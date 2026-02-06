import type { Router } from "express";
import { z } from "zod";
import { monitorService } from "../services/monitorService";

const SubReq = z.object({
  address: z.string().trim().min(1)
});

export function registerMonitorRoutes(router: Router) {
  router.post("/monitor/subscribe", (req, res) => {
    const p = SubReq.safeParse(req.body);
    if (!p.success) return res.status(400).json({ ok: false, error: p.error.flatten() });

    const id = monitorService.subscribe(p.data.address);
    res.json({ ok: true, id });
  });

  router.post("/monitor/unsubscribe", (req, res) => {
    const p = SubReq.safeParse(req.body);
    if (!p.success) return res.status(400).json({ ok: false, error: p.error.flatten() });

    monitorService.unsubscribe(p.data.address);
    res.json({ ok: true });
  });

  router.get("/monitor/list", (_req, res) => {
    res.json({ ok: true, items: monitorService.list() });
  });
}
