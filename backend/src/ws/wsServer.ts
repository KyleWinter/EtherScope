import { WebSocketServer, type WebSocket } from "ws";
import type { Server } from "node:http";
import { topicKey, type WsTopic } from "./channels";

type Client = WebSocket & { _subs?: Set<string> };

export function createWsServer(httpServer: Server) {
  const wss = new WebSocketServer({ server: httpServer });

  function safeSend(ws: WebSocket, data: unknown) {
    if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(data));
  }

  wss.on("connection", (ws: Client) => {
    ws._subs = new Set();

    safeSend(ws, { type: "hello", msg: "etherscope ws connected" });

    ws.on("message", (raw) => {
      let msg: any;
      try {
        msg = JSON.parse(raw.toString());
      } catch {
        return safeSend(ws, { type: "error", error: "invalid json" });
      }

      if (msg?.type === "subscribe" && typeof msg?.topic === "string") {
        ws._subs!.add(msg.topic);
        return safeSend(ws, { type: "subscribed", topic: msg.topic });
      }

      if (msg?.type === "unsubscribe" && typeof msg?.topic === "string") {
        ws._subs!.delete(msg.topic);
        return safeSend(ws, { type: "unsubscribed", topic: msg.topic });
      }

      safeSend(ws, { type: "error", error: "unknown message" });
    });
  });

  function publish(topic: WsTopic, payload: any) {
    const key = topicKey(topic);
    for (const client of wss.clients as Set<Client>) {
      if (client._subs?.has(key)) {
        safeSend(client, { topic: key, payload });
      }
    }
  }

  return { wss, publish };
}
