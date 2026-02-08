import { useEffect, useRef, useState } from "react";
import { wsClient } from "@/lib/api/client";
import type { WsMessage } from "@/lib/types";

export function useWebSocket(channel: string, onMessage?: (message: WsMessage) => void) {
  const [connected, setConnected] = useState(false);
  const callbackRef = useRef(onMessage);

  useEffect(() => {
    callbackRef.current = onMessage;
  }, [onMessage]);

  useEffect(() => {
    wsClient.connect();
    setConnected(true);

    const unsubscribe = wsClient.subscribe(channel, (message) => {
      callbackRef.current?.(message);
    });

    return () => {
      unsubscribe();
    };
  }, [channel]);

  return { connected };
}
