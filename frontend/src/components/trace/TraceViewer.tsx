"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import TraceTree, { type TraceNode } from "./TraceTree";

interface TraceViewerProps {
  traces?: TraceNode[];
  txHash?: string;
}

export default function TraceViewer({ traces, txHash }: TraceViewerProps) {
  const totalGasUsed = traces?.reduce((sum, node) => {
    const nodeGas = node.gasUsed || 0;
    const childrenGas =
      node.children?.reduce((childSum, child) => childSum + (child.gasUsed || 0), 0) || 0;
    return sum + nodeGas + childrenGas;
  }, 0);

  const callCount = traces?.reduce((count, node) => {
    const childCount = node.children?.length || 0;
    return count + 1 + childCount;
  }, 0);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Transaction Trace</CardTitle>
            {txHash && (
              <CardDescription className="font-mono text-xs mt-1">
                {txHash}
              </CardDescription>
            )}
          </div>
          <div className="flex gap-2">
            <Badge variant="outline">
              {callCount || 0} Call{callCount !== 1 ? "s" : ""}
            </Badge>
            {totalGasUsed && (
              <Badge variant="secondary">
                {totalGasUsed.toLocaleString()} Gas
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="border rounded-lg p-4 bg-muted/30 overflow-x-auto">
          <TraceTree nodes={traces || []} />
        </div>
      </CardContent>
    </Card>
  );
}
