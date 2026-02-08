"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, ArrowRight, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export interface TraceNode {
  type: "call" | "delegatecall" | "staticcall" | "create" | "create2";
  from: string;
  to?: string;
  value?: string;
  gas?: number;
  gasUsed?: number;
  input?: string;
  output?: string;
  error?: string;
  children?: TraceNode[];
  depth: number;
}

interface TraceTreeProps {
  nodes: TraceNode[];
}

export default function TraceTree({ nodes }: TraceTreeProps) {
  if (!nodes || nodes.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No trace data available
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {nodes.map((node, idx) => (
        <TraceNodeComponent key={idx} node={node} />
      ))}
    </div>
  );
}

function TraceNodeComponent({ node }: { node: TraceNode }) {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = node.children && node.children.length > 0;

  const getTypeColor = (type: string) => {
    switch (type) {
      case "call":
        return "text-blue-600 dark:text-blue-400";
      case "delegatecall":
        return "text-purple-600 dark:text-purple-400";
      case "staticcall":
        return "text-green-600 dark:text-green-400";
      case "create":
      case "create2":
        return "text-orange-600 dark:text-orange-400";
      default:
        return "text-gray-600 dark:text-gray-400";
    }
  };

  return (
    <div style={{ marginLeft: `${node.depth * 20}px` }}>
      <div
        className={cn(
          "flex items-start gap-2 p-2 rounded hover:bg-accent/50 cursor-pointer transition-colors",
          node.error && "bg-red-50 dark:bg-red-950/20 border-l-2 border-red-500"
        )}
        onClick={() => hasChildren && setExpanded(!expanded)}
      >
        <div className="flex-shrink-0 mt-0.5">
          {hasChildren ? (
            expanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )
          ) : (
            <div className="w-4" />
          )}
        </div>

        <div className="flex-1 space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={cn("font-mono text-sm font-semibold", getTypeColor(node.type))}>
              {node.type.toUpperCase()}
            </span>
            <ArrowRight className="h-3 w-3 text-muted-foreground" />
            <span className="font-mono text-xs text-muted-foreground">
              {node.from.slice(0, 10)}...{node.from.slice(-8)}
            </span>
            {node.to && (
              <>
                <ArrowRight className="h-3 w-3 text-muted-foreground" />
                <span className="font-mono text-xs">
                  {node.to.slice(0, 10)}...{node.to.slice(-8)}
                </span>
              </>
            )}
            {node.value && node.value !== "0" && (
              <span className="text-xs bg-blue-100 dark:bg-blue-900 px-2 py-0.5 rounded">
                {node.value} ETH
              </span>
            )}
          </div>

          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            {node.gas && (
              <span>
                Gas: <span className="font-mono">{node.gas.toLocaleString()}</span>
              </span>
            )}
            {node.gasUsed && (
              <span>
                Used: <span className="font-mono">{node.gasUsed.toLocaleString()}</span>
              </span>
            )}
          </div>

          {node.error && (
            <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
              <AlertCircle className="h-4 w-4" />
              <span>Error: {node.error}</span>
            </div>
          )}

          {node.input && node.input.length > 10 && (
            <div className="text-xs font-mono bg-muted p-2 rounded overflow-x-auto">
              Input: {node.input.slice(0, 66)}
              {node.input.length > 66 && "..."}
            </div>
          )}

          {node.output && node.output.length > 10 && (
            <div className="text-xs font-mono bg-muted p-2 rounded overflow-x-auto">
              Output: {node.output.slice(0, 66)}
              {node.output.length > 66 && "..."}
            </div>
          )}
        </div>
      </div>

      {expanded && hasChildren && (
        <div className="space-y-1">
          {node.children!.map((child, idx) => (
            <TraceNodeComponent key={idx} node={child} />
          ))}
        </div>
      )}
    </div>
  );
}

