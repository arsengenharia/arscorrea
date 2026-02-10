import { useState } from "react";
import { Layout } from "@/components/layout/Layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { subDays } from "date-fns";

import { DashboardFilters } from "@/components/dashboard/DashboardFilters";
import { FinancialKPIs } from "@/components/dashboard/FinancialKPIs";
import { CommercialKPIs } from "@/components/dashboard/CommercialKPIs";
import { CashFlowChart } from "@/components/dashboard/CashFlowChart";
import { OverdueAgingChart } from "@/components/dashboard/OverdueAgingChart";
import { NextPaymentsTable } from "@/components/dashboard/NextPaymentsTable";
import { ProposalsFunnel } from "@/components/dashboard/ProposalsFunnel";
import { ProposalsAgingChart } from "@/components/dashboard/ProposalsAgingChart";
import { OldestProposalsTable } from "@/components/dashboard/OldestProposalsTable";
import { ProposalsMap } from "@/components/dashboard/ProposalsMap";
import { ProjectsKPIs } from "@/components/dashboard/ProjectsKPIs";
import { CriticalProjectsTable } from "@/components/dashboard/CriticalProjectsTable";
import { RevenueCostChart } from "@/components/dashboard/RevenueCostChart";
import { ProfitMarginChart } from "@/components/dashboard/ProfitMarginChart";

import { 
  useDashboardMetrics, 
  getDateRange, 
  type PeriodType, 
  type DateRange 
} from "@/hooks/use-dashboard-metrics";

const Index = () => {
  const [period, setPeriod] = useState<PeriodType>("30days");
  const [customRange, setCustomRange] = useState<DateRange>({
    start: subDays(new Date(), 30),
    end: new Date(),
  });
  const [activeTab, setActiveTab] = useState("commercial");
  const [managerFilter, setManagerFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const dateRange = getDateRange(period, customRange);
  
  const {
    isLoading,
    financial,
    commercial,
    cashFlowSeries,
    overdueAging,
    nextPayments,
    proposalsByStage,
    proposalsAging,
    oldestOpenProposals,
    lossRate,
    allStages,
    proposalsForMap,
    projectMetrics,
    criticalProjects,
    revenueCostByMonth,
    profitMarginByProject,
    projectManagers,
    projectStatuses,
  } = useDashboardMetrics(dateRange);

  const mgr = managerFilter || undefined;
  const sts = statusFilter || undefined;

  return (
    <Layout>
      <div className="w-full max-w-7xl mx-auto pb-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h2 className="text-3xl font-bold">Dashboard</h2>
          <DashboardFilters
            period={period}
            onPeriodChange={setPeriod}
            customRange={customRange}
            onCustomRangeChange={setCustomRange}
            activeTab={activeTab}
            managerFilter={managerFilter}
            onManagerFilterChange={setManagerFilter}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
            projectManagers={projectManagers}
            projectStatuses={projectStatuses}
          />
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full max-w-lg grid-cols-3">
            <TabsTrigger value="commercial">Comercial</TabsTrigger>
            <TabsTrigger value="financial">Financeiro</TabsTrigger>
            <TabsTrigger value="projects">Obras</TabsTrigger>
          </TabsList>

          {/* Commercial Tab */}
          <TabsContent value="commercial" className="space-y-6 mt-6">
            <CommercialKPIs data={commercial} isLoading={isLoading} />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ProposalsFunnel data={proposalsByStage} lossRate={lossRate} isLoading={isLoading} />
              <ProposalsAgingChart data={proposalsAging} allStages={allStages} isLoading={isLoading} />
            </div>
            <ProposalsMap data={proposalsForMap} isLoading={isLoading} />
            <OldestProposalsTable data={oldestOpenProposals} isLoading={isLoading} />
          </TabsContent>

          {/* Financial Tab */}
          <TabsContent value="financial" className="space-y-6 mt-6">
            <FinancialKPIs data={financial} isLoading={isLoading} />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <CashFlowChart data={cashFlowSeries} isLoading={isLoading} />
              <OverdueAgingChart data={overdueAging} isLoading={isLoading} />
            </div>
            <NextPaymentsTable data={nextPayments} isLoading={isLoading} />
          </TabsContent>

          {/* Projects Tab */}
          <TabsContent value="projects" className="space-y-6 mt-6">
            <ProjectsKPIs data={projectMetrics(mgr, sts)} isLoading={isLoading} />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <RevenueCostChart data={revenueCostByMonth} isLoading={isLoading} />
              <ProfitMarginChart data={profitMarginByProject(mgr, sts)} isLoading={isLoading} />
            </div>
            <CriticalProjectsTable data={criticalProjects(mgr, sts)} isLoading={isLoading} />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default Index;
