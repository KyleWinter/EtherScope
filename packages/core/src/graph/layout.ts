import { InteractionGraph } from "./types.js";

export type LayoutPos = { id: string; x: number; y: number };

export function naiveCircleLayout(g: InteractionGraph): LayoutPos[] {
  const n = g.nodes.length;
  const r = Math.max(150, n * 20);
  return g.nodes.map((node, i) => {
    const theta = (2 * Math.PI * i) / Math.max(1, n);
    return { id: node.id, x: Math.cos(theta) * r, y: Math.sin(theta) * r };
  });
}
