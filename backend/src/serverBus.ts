import type { createWsServer } from "./ws/wsServer";

export type WsBus = ReturnType<typeof createWsServer>;

export let wsBus: WsBus;

export function setWsBus(bus: WsBus) {
  wsBus = bus;
}
