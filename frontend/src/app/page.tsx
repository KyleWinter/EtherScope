"use client";

import { useState, useCallback } from "react";
import { Activity, Search, LayoutGrid, FileCode, Shield, TrendingUp, Sparkles } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/Tabs";
import { TabNavContext } from "@/hooks/useNavigateTab";
import TransactionLookup from "@/components/tx/TransactionLookup";
import BlockExplorer from "@/components/blocks/BlockExplorer";
import ContractAnalysis from "@/components/contract/ContractAnalysis";
import AnalyzerSection from "@/components/analyzer/AnalyzerSection";
import FindingsSection from "@/components/findings/FindingsSection";
import GasTrendsSection from "@/components/trends/GasTrendsSection";
import MonitorSection from "@/components/monitor/MonitorSection";
import WalletButton from "@/components/wallet/WalletButton";

export default function Home() {
  const [activeTab, setActiveTab] = useState("tx");
  const [txHash, setTxHash] = useState<string | undefined>();
  const [blockNumber, setBlockNumber] = useState<string | undefined>();
  const [contractAddress, setContractAddress] = useState<string | undefined>();
  const [reportId, setReportId] = useState<string | undefined>();

  const handleSetTxHash = useCallback((hash: string) => setTxHash(hash), []);
  const handleSetBlockNumber = useCallback((num: string) => setBlockNumber(num), []);
  const handleSetContractAddress = useCallback((addr: string) => setContractAddress(addr), []);
  const handleSetReportId = useCallback((id: string) => setReportId(id), []);

  return (
    <TabNavContext.Provider
      value={{
        setActiveTab,
        setTxHash: handleSetTxHash,
        setBlockNumber: handleSetBlockNumber,
        setContractAddress: handleSetContractAddress,
        setReportId: handleSetReportId,
      }}
    >
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
        <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
                  <Activity className="h-6 w-6 text-primary-foreground" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold">EtherScope</h1>
                  <p className="text-sm text-muted-foreground">
                    EVM Transaction Debugger & Analyzer
                  </p>
                </div>
              </div>
              <WalletButton />
            </div>
          </div>
        </header>

        <main className="container mx-auto px-4 py-8">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-7 lg:w-auto">
              <TabsTrigger value="tx" className="flex items-center gap-2">
                <Search className="h-4 w-4" />
                <span className="hidden sm:inline">Tx Lookup</span>
              </TabsTrigger>
              <TabsTrigger value="blocks" className="flex items-center gap-2">
                <LayoutGrid className="h-4 w-4" />
                <span className="hidden sm:inline">Blocks</span>
              </TabsTrigger>
              <TabsTrigger value="contract" className="flex items-center gap-2">
                <FileCode className="h-4 w-4" />
                <span className="hidden sm:inline">Contract</span>
              </TabsTrigger>
              <TabsTrigger value="analyzer" className="flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                <span className="hidden sm:inline">Analyzer</span>
              </TabsTrigger>
              <TabsTrigger value="findings" className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                <span className="hidden sm:inline">Findings</span>
              </TabsTrigger>
              <TabsTrigger value="trends" className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                <span className="hidden sm:inline">Trends</span>
              </TabsTrigger>
              <TabsTrigger value="monitor" className="flex items-center gap-2">
                <Activity className="h-4 w-4" />
                <span className="hidden sm:inline">Monitor</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="tx" className="space-y-4">
              <TransactionLookup key={txHash} initialHash={txHash} />
            </TabsContent>

            <TabsContent value="blocks" className="space-y-4">
              <BlockExplorer key={blockNumber} initialBlockNumber={blockNumber} />
            </TabsContent>

            <TabsContent value="contract" className="space-y-4">
              <ContractAnalysis key={contractAddress} initialAddress={contractAddress} />
            </TabsContent>

            <TabsContent value="analyzer" className="space-y-4">
              <AnalyzerSection />
            </TabsContent>

            <TabsContent value="findings" className="space-y-4">
              <FindingsSection key={reportId} initialReportId={reportId} />
            </TabsContent>

            <TabsContent value="trends" className="space-y-4">
              <GasTrendsSection />
            </TabsContent>

            <TabsContent value="monitor" className="space-y-4">
              <MonitorSection />
            </TabsContent>
          </Tabs>
        </main>

        <footer className="border-t mt-12 py-6">
          <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
            <p>
              EtherScope - Built for developers to debug and optimize smart contracts
            </p>
          </div>
        </footer>
      </div>
    </TabNavContext.Provider>
  );
}
