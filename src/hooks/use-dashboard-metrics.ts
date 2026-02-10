import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { startOfDay, endOfDay, subDays, startOfMonth, endOfMonth, addDays, differenceInDays, format, subMonths } from "date-fns";

export type DateRange = {
  start: Date;
  end: Date;
};

export type PeriodType = "today" | "7days" | "30days" | "month" | "custom";

export function getDateRange(period: PeriodType, customRange?: DateRange): DateRange {
  const now = new Date();
  
  switch (period) {
    case "today":
      return { start: startOfDay(now), end: endOfDay(now) };
    case "7days":
      return { start: startOfDay(subDays(now, 7)), end: endOfDay(now) };
    case "30days":
      return { start: startOfDay(subDays(now, 30)), end: endOfDay(now) };
    case "month":
      return { start: startOfMonth(now), end: endOfMonth(now) };
    case "custom":
      return customRange || { start: startOfDay(subDays(now, 30)), end: endOfDay(now) };
    default:
      return { start: startOfDay(subDays(now, 30)), end: endOfDay(now) };
  }
}

export function useDashboardMetrics(dateRange: DateRange) {
  const { start, end } = dateRange;
  const today = new Date();

  // Financial KPIs from contract_payments
  const { data: financialData, isLoading: isLoadingFinancial } = useQuery({
    queryKey: ["dashboard-financial", start.toISOString(), end.toISOString()],
    queryFn: async () => {
      // Get all payments with contract info
      const { data: payments, error } = await supabase
        .from("contract_payments")
        .select(`
          id,
          kind,
          expected_value,
          expected_date,
          received_value,
          received_date,
          status,
          description,
          contract_id,
          contracts (
            contract_number,
            clients (name)
          )
        `);

      if (error) {
        console.error("Error fetching payments:", error);
        throw error;
      }

      return payments || [];
    },
  });

  // Projects data
  const { data: projectsData, isLoading: isLoadingProjects } = useQuery({
    queryKey: ["dashboard-projects"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("id, name, status, start_date, end_date, project_manager, client_id, clients(name)");
      if (error) throw error;
      return data || [];
    },
  });

  // Project costs
  const { data: projectCostsData } = useQuery({
    queryKey: ["dashboard-project-costs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_costs")
        .select("id, project_id, actual_value, expected_value, record_date");
      if (error) throw error;
      return data || [];
    },
  });

  // Project revenues
  const { data: projectRevenuesData } = useQuery({
    queryKey: ["dashboard-project-revenues"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_revenues")
        .select("id, project_id, actual_value, expected_value, record_date");
      if (error) throw error;
      return data || [];
    },
  });

  // Proposals data
  const { data: proposalsData, isLoading: isLoadingProposals } = useQuery({
    queryKey: ["dashboard-proposals", start.toISOString(), end.toISOString()],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("proposals")
        .select(`
          id,
          number,
          total,
          created_at,
          stage_id,
          work_address,
          city,
          state,
          condo_name,
          proposal_stages (name),
          clients (name, street, number, city, state)
        `);

      if (error) {
        console.error("Error fetching proposals:", error);
        throw error;
      }

      return data || [];
    },
  });

  // Calculate financial metrics
  const calculateFinancialMetrics = () => {
    if (!financialData) return null;

    const nonCommissionPayments = financialData.filter(p => p.kind !== "comissao");
    const commissionPayments = financialData.filter(p => p.kind === "comissao");

    // Valores em aberto (non-received, non-commission)
    const valoresEmAberto = nonCommissionPayments
      .filter(p => p.status !== "recebido")
      .reduce((sum, p) => sum + ((p.expected_value || 0) - (p.received_value || 0)), 0);

    // Valores recebidos no período
    const valoresRecebidos = nonCommissionPayments
      .filter(p => {
        if (!p.received_date) return false;
        const receivedDate = new Date(p.received_date);
        return receivedDate >= start && receivedDate <= end;
      })
      .reduce((sum, p) => sum + (p.received_value || 0), 0);

    // Previsibilidade próximos 30 dias
    const next30Days = addDays(today, 30);
    const previsibilidade = nonCommissionPayments
      .filter(p => {
        if (!p.expected_date || p.status === "recebido") return false;
        const expectedDate = new Date(p.expected_date);
        return expectedDate >= today && expectedDate <= next30Days;
      })
      .reduce((sum, p) => sum + ((p.expected_value || 0) - (p.received_value || 0)), 0);

    // Parcelas vencidas
    const parcelasVencidas = nonCommissionPayments
      .filter(p => {
        if (!p.expected_date || p.status === "recebido") return false;
        const expectedDate = new Date(p.expected_date);
        return expectedDate < today;
      })
      .reduce((sum, p) => sum + ((p.expected_value || 0) - (p.received_value || 0)), 0);

    // Comissão prevista e recebida
    const comissaoPrevista = commissionPayments
      .reduce((sum, p) => sum + (p.expected_value || 0), 0);

    const comissaoRecebida = commissionPayments
      .reduce((sum, p) => sum + (p.received_value || 0), 0);

    return {
      valoresEmAberto,
      valoresRecebidos,
      previsibilidade,
      parcelasVencidas,
      comissaoPrevista,
      comissaoRecebida,
    };
  };

  // Cash flow series by week
  const calculateCashFlowSeries = () => {
    if (!financialData) return [];

    const weeks: { [key: string]: { previsto: number; recebido: number; label: string } } = {};
    
    financialData
      .filter(p => p.kind !== "comissao")
      .forEach(p => {
        // For expected
        if (p.expected_date) {
          const date = new Date(p.expected_date);
          if (date >= start && date <= end) {
            const weekKey = getWeekKey(date);
            if (!weeks[weekKey]) {
              weeks[weekKey] = { previsto: 0, recebido: 0, label: weekKey };
            }
            weeks[weekKey].previsto += (p.expected_value || 0);
          }
        }
        
        // For received
        if (p.received_date) {
          const date = new Date(p.received_date);
          if (date >= start && date <= end) {
            const weekKey = getWeekKey(date);
            if (!weeks[weekKey]) {
              weeks[weekKey] = { previsto: 0, recebido: 0, label: weekKey };
            }
            weeks[weekKey].recebido += (p.received_value || 0);
          }
        }
      });

    return Object.values(weeks).sort((a, b) => a.label.localeCompare(b.label));
  };

  // Overdue aging buckets
  const calculateOverdueAging = () => {
    if (!financialData) return [];

    const buckets = {
      "0-7": 0,
      "8-15": 0,
      "16-30": 0,
      "31-60": 0,
      "60+": 0,
    };

    financialData
      .filter(p => p.kind !== "comissao" && p.status !== "recebido" && p.expected_date)
      .forEach(p => {
        const expectedDate = new Date(p.expected_date!);
        if (expectedDate >= today) return; // Not overdue

        const daysOverdue = differenceInDays(today, expectedDate);
        const amount = (p.expected_value || 0) - (p.received_value || 0);

        if (daysOverdue <= 7) buckets["0-7"] += amount;
        else if (daysOverdue <= 15) buckets["8-15"] += amount;
        else if (daysOverdue <= 30) buckets["16-30"] += amount;
        else if (daysOverdue <= 60) buckets["31-60"] += amount;
        else buckets["60+"] += amount;
      });

    return Object.entries(buckets).map(([name, value]) => ({ name, value }));
  };

  // Next payments table
  const getNextPayments = () => {
    if (!financialData) return [];

    return financialData
      .filter(p => p.kind !== "comissao" && p.status !== "recebido" && p.expected_date)
      .map(p => ({
        id: p.id,
        contractNumber: p.contracts?.contract_number || "-",
        clientName: p.contracts?.clients?.name || "-",
        description: p.description || "-",
        expectedDate: p.expected_date,
        expectedValue: p.expected_value || 0,
        saldoAberto: (p.expected_value || 0) - (p.received_value || 0),
      }))
      .sort((a, b) => new Date(a.expectedDate!).getTime() - new Date(b.expectedDate!).getTime())
      .slice(0, 10);
  };

  // Proposals by stage
  const calculateProposalsByStage = () => {
    if (!proposalsData) return [];

    const stageMap: { [key: string]: number } = {};
    
    proposalsData.forEach(p => {
      const stageName = p.proposal_stages?.name || "Sem etapa";
      stageMap[stageName] = (stageMap[stageName] || 0) + 1;
    });

    return Object.entries(stageMap).map(([name, value]) => ({ name, value }));
  };

  // Proposals aging
  const calculateProposalsAging = () => {
    if (!proposalsData) return [];

    const agingData: { [bucket: string]: { [stage: string]: number } } = {
      "0-7": {},
      "8-15": {},
      "16-30": {},
      "31-60": {},
      "60+": {},
    };

    proposalsData.forEach(p => {
      const createdAt = new Date(p.created_at);
      const daysOld = differenceInDays(today, createdAt);
      const stageName = p.proposal_stages?.name || "Sem etapa";

      let bucket: string;
      if (daysOld <= 7) bucket = "0-7";
      else if (daysOld <= 15) bucket = "8-15";
      else if (daysOld <= 30) bucket = "16-30";
      else if (daysOld <= 60) bucket = "31-60";
      else bucket = "60+";

      agingData[bucket][stageName] = (agingData[bucket][stageName] || 0) + 1;
    });

    // Get all unique stages
    const allStages = [...new Set(proposalsData.map(p => p.proposal_stages?.name || "Sem etapa"))];

    return Object.entries(agingData).map(([bucket, stages]) => ({
      bucket,
      ...allStages.reduce((acc, stage) => ({ ...acc, [stage]: stages[stage] || 0 }), {}),
    }));
  };

  // Oldest open proposals
  const getOldestOpenProposals = () => {
    if (!proposalsData) return [];

    return proposalsData
      .filter(p => {
        const stageName = p.proposal_stages?.name?.toLowerCase();
        return stageName !== "proposta aprovada" && stageName !== "proposta recusada";
      })
      .map(p => ({
        id: p.id,
        number: p.number || "-",
        clientName: p.clients?.name || "-",
        daysOpen: differenceInDays(today, new Date(p.created_at)),
        total: p.total || 0,
      }))
      .sort((a, b) => b.daysOpen - a.daysOpen)
      .slice(0, 10);
  };

  // Loss rate
  const calculateLossRate = () => {
    if (!proposalsData) return 0;

    const fechadas = proposalsData.filter(p => 
      p.proposal_stages?.name?.toLowerCase() === "proposta aprovada"
    ).length;
    
    const perdidas = proposalsData.filter(p => 
      p.proposal_stages?.name?.toLowerCase() === "proposta recusada"
    ).length;

    const total = fechadas + perdidas;
    if (total === 0) return 0;

    return Math.round((perdidas / total) * 100);
  };

  // Commercial KPIs calculations
  const calculateCommercialMetrics = () => {
    if (!proposalsData) return null;

    // Propostas em aberto (não fechadas e não perdidas)
    const proposalsEmAberto = proposalsData.filter(p => {
      const stageName = p.proposal_stages?.name?.toLowerCase();
      return stageName !== "proposta aprovada" && stageName !== "proposta recusada";
    }).length;

    // Propostas criadas no período filtrado
    const proposalsNoPeriodo = proposalsData.filter(p => {
      const createdAt = new Date(p.created_at);
      return createdAt >= start && createdAt <= end;
    }).length;

    // Valor total em aberto
    const valorTotalEmAberto = proposalsData
      .filter(p => {
        const stageName = p.proposal_stages?.name?.toLowerCase();
        return stageName !== "proposta aprovada" && stageName !== "proposta recusada";
      })
      .reduce((sum, p) => sum + (p.total || 0), 0);

    // Taxa de conversão
    const fechadas = proposalsData.filter(p => 
      p.proposal_stages?.name?.toLowerCase() === "proposta aprovada"
    ).length;
    
    const perdidas = proposalsData.filter(p => 
      p.proposal_stages?.name?.toLowerCase() === "proposta recusada"
    ).length;

    const totalFinalizadas = fechadas + perdidas;
    const taxaConversao = totalFinalizadas > 0 
      ? (fechadas / totalFinalizadas) * 100 
      : 0;

    // Ticket médio (média das propostas fechadas)
    const propostasFechadas = proposalsData.filter(p => 
      p.proposal_stages?.name?.toLowerCase() === "proposta aprovada"
    );
    
    const ticketMedio = propostasFechadas.length > 0
      ? propostasFechadas.reduce((sum, p) => sum + (p.total || 0), 0) / propostasFechadas.length
      : 0;

    return {
      proposalsEmAberto,
      proposalsNoPeriodo,
      valorTotalEmAberto,
      taxaConversao,
      ticketMedio,
    };
  };

  // Build address string for proposals
  const buildProposalAddress = (proposal: typeof proposalsData extends (infer T)[] ? T : never) => {
    // Priority 1: work_address + city + state
    if (proposal.work_address) {
      const parts = [proposal.work_address];
      if (proposal.city) parts.push(proposal.city);
      if (proposal.state) parts.push(proposal.state);
      return parts.join(", ");
    }
    
    // Priority 2: condo_name + city + state
    if (proposal.condo_name) {
      const parts = [proposal.condo_name];
      if (proposal.city) parts.push(proposal.city);
      if (proposal.state) parts.push(proposal.state);
      return parts.join(", ");
    }
    
    // Priority 3: city + state from proposal
    if (proposal.city || proposal.state) {
      const parts = [];
      if (proposal.city) parts.push(proposal.city);
      if (proposal.state) parts.push(proposal.state);
      return parts.join(", ");
    }
    
    // Fallback: client address
    const client = proposal.clients;
    if (client) {
      const parts = [];
      if (client.street) {
        parts.push(client.number ? `${client.street}, ${client.number}` : client.street);
      }
      if (client.city) parts.push(client.city);
      if (client.state) parts.push(client.state);
      if (parts.length > 0) return parts.join(", ");
    }
    
    return "";
  };

  // Prepare proposals for map
  const getProposalsForMap = () => {
    if (!proposalsData) return [];
    
    return proposalsData.map(p => ({
      id: p.id,
      number: p.number || "",
      clientName: p.clients?.name || "",
      stageName: p.proposal_stages?.name || "",
      total: p.total || 0,
      address: buildProposalAddress(p),
    }));
  };

  // Project KPIs
  const calculateProjectMetrics = (managerFilter?: string, statusFilter?: string) => {
    if (!projectsData) return null;

    let filtered = projectsData;
    if (managerFilter) filtered = filtered.filter(p => p.project_manager === managerFilter);
    if (statusFilter) filtered = filtered.filter(p => p.status === statusFilter);

    const obrasEmAndamento = filtered.filter(p => p.status === "em_andamento").length;
    
    const obrasCriticas = filtered.filter(p => {
      if (p.status === "concluida" || p.status === "concluded") return false;
      if (!p.end_date) return false;
      return new Date(p.end_date) < today;
    }).length;

    // Margem de lucro média
    const costs = projectCostsData || [];
    const revenues = projectRevenuesData || [];
    
    let totalRevenue = 0;
    let totalCost = 0;
    
    filtered.forEach(proj => {
      const projCosts = costs.filter(c => c.project_id === proj.id).reduce((s, c) => s + (c.actual_value || 0), 0);
      const projRevenues = revenues.filter(r => r.project_id === proj.id).reduce((s, r) => s + (r.actual_value || 0), 0);
      totalCost += projCosts;
      totalRevenue += projRevenues;
    });

    const margemMedia = totalRevenue > 0 ? ((totalRevenue - totalCost) / totalRevenue) * 100 : 0;

    // Custo realizado no período
    const custoNoPeriodo = costs
      .filter(c => {
        if (!c.record_date) return false;
        const d = new Date(c.record_date);
        return d >= start && d <= end && filtered.some(p => p.id === c.project_id);
      })
      .reduce((s, c) => s + (c.actual_value || 0), 0);

    return { obrasEmAndamento, obrasCriticas, margemMedia, custoNoPeriodo };
  };

  // Critical projects table
  const getCriticalProjects = (managerFilter?: string, statusFilter?: string) => {
    if (!projectsData) return [];

    let filtered = projectsData;
    if (managerFilter) filtered = filtered.filter(p => p.project_manager === managerFilter);
    if (statusFilter) filtered = filtered.filter(p => p.status === statusFilter);

    return filtered
      .filter(p => {
        if (p.status === "concluida" || p.status === "concluded") return false;
        if (!p.end_date) return false;
        return new Date(p.end_date) < today;
      })
      .map(p => ({
        id: p.id,
        name: p.name,
        clientName: p.clients?.name || "-",
        status: p.status,
        endDate: p.end_date,
        daysOverdue: differenceInDays(today, new Date(p.end_date!)),
        manager: p.project_manager || "-",
      }))
      .sort((a, b) => b.daysOverdue - a.daysOverdue);
  };

  // Revenue vs Cost per month (last 12 months)
  const calculateRevenueCostByMonth = () => {
    const costs = projectCostsData || [];
    const revenues = projectRevenuesData || [];
    const months: { month: string; receita: number; custo: number }[] = [];

    for (let i = 11; i >= 0; i--) {
      const d = subMonths(today, i);
      const monthKey = format(d, "yyyy-MM");
      const label = format(d, "MMM/yy");
      
      const monthCost = costs
        .filter(c => c.record_date && c.record_date.startsWith(monthKey))
        .reduce((s, c) => s + (c.actual_value || 0), 0);
      
      const monthRevenue = revenues
        .filter(r => r.record_date && r.record_date.startsWith(monthKey))
        .reduce((s, r) => s + (r.actual_value || 0), 0);

      months.push({ month: label, receita: monthRevenue, custo: monthCost });
    }
    return months;
  };

  // Profit margin per project
  const calculateProfitMarginByProject = (managerFilter?: string, statusFilter?: string) => {
    if (!projectsData) return [];
    const costs = projectCostsData || [];
    const revenues = projectRevenuesData || [];

    let filtered = projectsData;
    if (managerFilter) filtered = filtered.filter(p => p.project_manager === managerFilter);
    if (statusFilter) filtered = filtered.filter(p => p.status === statusFilter);

    return filtered
      .map(proj => {
        const projCost = costs.filter(c => c.project_id === proj.id).reduce((s, c) => s + (c.actual_value || 0), 0);
        const projRevenue = revenues.filter(r => r.project_id === proj.id).reduce((s, r) => s + (r.actual_value || 0), 0);
        const margin = projRevenue > 0 ? ((projRevenue - projCost) / projRevenue) * 100 : 0;
        return { name: proj.name, margem: Math.round(margin * 10) / 10, receita: projRevenue, custo: projCost };
      })
      .filter(p => p.receita > 0 || p.custo > 0)
      .sort((a, b) => b.margem - a.margem);
  };

  // Distinct managers and statuses for filters
  const projectManagers = projectsData
    ? [...new Set(projectsData.map(p => p.project_manager).filter(Boolean) as string[])]
    : [];

  const projectStatuses = projectsData
    ? [...new Set(projectsData.map(p => p.status))]
    : [];

  return {
    isLoading: isLoadingFinancial || isLoadingProposals || isLoadingProjects,
    financial: calculateFinancialMetrics(),
    cashFlowSeries: calculateCashFlowSeries(),
    overdueAging: calculateOverdueAging(),
    nextPayments: getNextPayments(),
    proposalsByStage: calculateProposalsByStage(),
    proposalsAging: calculateProposalsAging(),
    oldestOpenProposals: getOldestOpenProposals(),
    lossRate: calculateLossRate(),
    commercial: calculateCommercialMetrics(),
    proposalsForMap: getProposalsForMap(),
    allStages: proposalsData 
      ? [...new Set(proposalsData.map(p => p.proposal_stages?.name || "Sem etapa"))]
      : [],
    // New project metrics
    projectMetrics: calculateProjectMetrics,
    criticalProjects: getCriticalProjects,
    revenueCostByMonth: calculateRevenueCostByMonth(),
    profitMarginByProject: calculateProfitMarginByProject,
    projectManagers,
    projectStatuses,
  };
}

function getWeekKey(date: Date): string {
  const weekStart = new Date(date);
  weekStart.setDate(date.getDate() - date.getDay());
  return `${weekStart.getDate().toString().padStart(2, '0')}/${(weekStart.getMonth() + 1).toString().padStart(2, '0')}`;
}
