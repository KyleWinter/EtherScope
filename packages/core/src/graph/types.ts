export type GraphNode = {
  id: string;
  label: string;
  address?: string;
  kind: "EOA" | "CONTRACT";
};

export type GraphEdge = {
  id: string;
  from: string;
  to: string;
  label?: string; // selector/signature
  weight?: number; // e.g. number of calls
};

export type InteractionGraph = {
  nodes: GraphNode[];
  edges: GraphEdge[];
};
