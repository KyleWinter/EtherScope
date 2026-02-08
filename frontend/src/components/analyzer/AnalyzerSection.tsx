"use client";

import { useState } from "react";
import { Loader2, Play, CheckCircle2, XCircle, Clock, FileSearch, Database, Sparkles } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { apiClient } from "@/lib/api/client";
import { useWebSocket } from "@/hooks/useWebSocket";
import { useNavigateTab } from "@/hooks/useNavigateTab";
import type { WsMessage } from "@/lib/types";

type AnalysisStep = {
  id: string;
  label: string;
  icon: any;
  status: "pending" | "running" | "completed" | "error";
};

export default function AnalyzerSection() {
  const nav = useNavigateTab();
  const [txHash, setTxHash] = useState("");
  const [projectRoot, setProjectRoot] = useState("/tmp/slither-test");
  const [target, setTarget] = useState("contracts");
  const [selectedTools, setSelectedTools] = useState<Array<"slither" | "mythril">>([
    "slither",
  ]);
  const [jobId, setJobId] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [jobStatus, setJobStatus] = useState<string>("");
  const [reportId, setReportId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [steps, setSteps] = useState<AnalysisStep[]>([
    { id: "init", label: "Initializing", icon: Clock, status: "pending" },
    { id: "scan", label: "Scanning Code", icon: FileSearch, status: "pending" },
    { id: "analyze", label: "Running Slither", icon: Sparkles, status: "pending" },
    { id: "save", label: "Saving Results", icon: Database, status: "pending" },
  ]);

  useWebSocket(jobId ? `job:${jobId}` : "*", (message: WsMessage) => {
    if (message.type === "job:update" && message.jobId === jobId) {
      const msg = message.message;
      setJobStatus(msg);
      setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);

      // Update steps based on message content
      if (msg.includes("Starting") || msg.includes("Submitting")) {
        updateStepStatus(0, "running");
      } else if (msg.includes("Scanning") || msg.includes("Reading")) {
        updateStepStatus(0, "completed");
        updateStepStatus(1, "running");
      } else if (msg.includes("Running") || msg.includes("Analyzing")) {
        updateStepStatus(1, "completed");
        updateStepStatus(2, "running");
      } else if (msg.includes("Parsing") || msg.includes("Processing")) {
        updateStepStatus(2, "completed");
        updateStepStatus(3, "running");
      }
    } else if (message.type === "job:done" && message.jobId === jobId) {
      setIsAnalyzing(false);
      if (message.error) {
        setError(message.error);
        setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ❌ Error: ${message.error}`]);
        updateStepStatus(currentStep, "error");
      } else if (message.reportId) {
        setReportId(message.reportId);
        setJobStatus("Analysis complete!");
        setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ✅ Analysis complete! Report ID: ${message.reportId}`]);
        updateStepStatus(3, "completed");
        setCurrentStep(4);
      }
    }
  });

  const updateStepStatus = (stepIndex: number, status: AnalysisStep["status"]) => {
    setSteps(prev => prev.map((step, idx) =>
      idx === stepIndex ? { ...step, status } : step
    ));
    setCurrentStep(stepIndex);
  };

  const toggleTool = (tool: "slither" | "mythril") => {
    setSelectedTools((prev) =>
      prev.includes(tool) ? prev.filter((t) => t !== tool) : [...prev, tool]
    );
  };

  const handleAnalyze = async () => {
    if (!projectRoot) {
      setError("Project root is required");
      return;
    }

    // Reset state
    setIsAnalyzing(true);
    setError(null);
    setJobStatus("Starting analysis...");
    setReportId(null);
    setLogs([`[${new Date().toLocaleTimeString()}] 🚀 Starting analysis...`]);
    setCurrentStep(0);
    setSteps([
      { id: "init", label: "Initializing", icon: Clock, status: "running" },
      { id: "scan", label: "Scanning Code", icon: FileSearch, status: "pending" },
      { id: "analyze", label: "Running Slither", icon: Sparkles, status: "pending" },
      { id: "save", label: "Saving Results", icon: Database, status: "pending" },
    ]);

    try {
      const response = await apiClient.analyze({
        txHash: txHash || undefined,
        projectRoot,
        target,
        tools: selectedTools,
        mode: "local",
      });

      if (response.ok && response.jobId) {
        setJobId(response.jobId);
        setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] 📋 Job created: ${response.jobId}`]);
      } else {
        setError(response.error || "Failed to start analysis");
        setIsAnalyzing(false);
        updateStepStatus(0, "error");
        setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ❌ Failed to start: ${response.error}`]);
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Failed to start analysis";
      setError(errorMsg);
      setIsAnalyzing(false);
      updateStepStatus(0, "error");
      setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ❌ Error: ${errorMsg}`]);
    }
  };

  return (
    <div className="grid gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Transaction Analysis</CardTitle>
          <CardDescription>
            Analyze smart contracts for vulnerabilities and optimization opportunities
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">
              Transaction Hash (Optional)
            </label>
            <Input
              placeholder="0x..."
              value={txHash}
              onChange={(e) => setTxHash(e.target.value)}
              disabled={isAnalyzing}
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">
              Project Root Path <span className="text-destructive">*</span>
            </label>
            <Input
              placeholder="/path/to/hardhat/project"
              value={projectRoot}
              onChange={(e) => setProjectRoot(e.target.value)}
              disabled={isAnalyzing}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Path to your Hardhat/Foundry project root directory
            </p>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Target</label>
            <Input
              placeholder="contracts or specific file path"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              disabled={isAnalyzing}
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Analysis Tools</label>
            <div className="flex gap-2">
              <Badge
                variant={selectedTools.includes("slither") ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => !isAnalyzing && toggleTool("slither")}
              >
                Slither
              </Badge>
              <Badge
                variant={selectedTools.includes("mythril") ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => !isAnalyzing && toggleTool("mythril")}
              >
                Mythril
              </Badge>
            </div>
          </div>

          <Button
            onClick={handleAnalyze}
            disabled={isAnalyzing || !projectRoot}
            className="w-full"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Play className="mr-2 h-4 w-4" />
                Start Analysis
              </>
            )}
          </Button>

          {/* Progress Visualization */}
          {isAnalyzing && (
            <Card className="border-primary/20 bg-primary/5">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Analysis in Progress
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Steps Indicator */}
                <div className="space-y-3">
                  {steps.map((step, idx) => {
                    const Icon = step.icon;
                    return (
                      <div key={step.id} className="flex items-center gap-3">
                        <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 transition-all ${
                          step.status === "completed" ? "bg-green-500 border-green-500" :
                          step.status === "running" ? "bg-primary border-primary animate-pulse" :
                          step.status === "error" ? "bg-red-500 border-red-500" :
                          "bg-muted border-muted"
                        }`}>
                          {step.status === "completed" ? (
                            <CheckCircle2 className="h-4 w-4 text-white" />
                          ) : step.status === "error" ? (
                            <XCircle className="h-4 w-4 text-white" />
                          ) : step.status === "running" ? (
                            <Icon className="h-4 w-4 text-white animate-pulse" />
                          ) : (
                            <Icon className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                        <div className="flex-1">
                          <div className={`text-sm font-medium ${
                            step.status === "running" ? "text-primary" :
                            step.status === "completed" ? "text-green-600 dark:text-green-400" :
                            step.status === "error" ? "text-red-600 dark:text-red-400" :
                            "text-muted-foreground"
                          }`}>
                            {step.label}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Progress Bar */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Progress</span>
                    <span>{Math.round((currentStep / steps.length) * 100)}%</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all duration-500 ease-out"
                      style={{ width: `${(currentStep / steps.length) * 100}%` }}
                    />
                  </div>
                </div>

                {/* Live Logs */}
                <div className="space-y-2">
                  <div className="text-xs font-medium text-muted-foreground">Live Logs</div>
                  <div className="max-h-40 overflow-y-auto rounded-md bg-black/5 dark:bg-black/20 p-3 font-mono text-xs space-y-1">
                    {logs.map((log, idx) => (
                      <div key={idx} className="text-muted-foreground animate-in fade-in slide-in-from-bottom-2 duration-300">
                        {log}
                      </div>
                    ))}
                    {logs.length === 0 && (
                      <div className="text-muted-foreground/50 italic">Waiting for logs...</div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive flex items-start gap-2">
              <XCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <div>{error}</div>
            </div>
          )}

          {reportId && !isAnalyzing && (
            <Card className="border-green-500/20 bg-green-500/5">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-green-500">
                      <CheckCircle2 className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <div className="font-semibold text-green-700 dark:text-green-400">Analysis Complete!</div>
                      <div className="text-xs text-muted-foreground">Report ID: {reportId}</div>
                    </div>
                  </div>
                  <Button
                    onClick={() => {
                      nav.setReportId?.(reportId);
                      nav.setActiveTab("findings");
                    }}
                    size="sm"
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    View Results
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
