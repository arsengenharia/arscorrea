import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { project_id } = await req.json();
    if (!project_id) {
      return new Response(JSON.stringify({ error: "project_id é obrigatório" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch project with client
    const { data: project, error: projErr } = await supabase
      .from("projects")
      .select("*, client:clients(*)")
      .eq("id", project_id)
      .maybeSingle();

    if (projErr || !project) {
      return new Response(JSON.stringify({ error: "Obra não encontrada" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch stages
    const { data: stages } = await supabase
      .from("stages")
      .select("*")
      .eq("project_id", project_id)
      .order("created_at", { ascending: true });

    // Fetch costs
    const { data: costs } = await supabase
      .from("project_costs")
      .select("*")
      .eq("project_id", project_id);

    // Fetch revenues
    const { data: revenues } = await supabase
      .from("project_revenues")
      .select("*")
      .eq("project_id", project_id);

    const allStages = stages || [];
    const allCosts = costs || [];
    const allRevenues = revenues || [];
    const today = new Date().toISOString().split("T")[0];

    // IFEC
    const totalStages = allStages.length;
    const completedStages = allStages.filter((s) => s.status === "concluido").length;
    const ifecValue = totalStages > 0 ? (completedStages / totalStages) * 100 : 0;

    // IEC
    const completedWeight = allStages
      .filter((s) => s.status === "concluido")
      .reduce((sum, s) => sum + (Number(s.stage_weight) || 0), 0);
    const plannedWeight = allStages
      .filter((s) => s.report_end_date && s.report_end_date <= today)
      .reduce((sum, s) => sum + (Number(s.stage_weight) || 0), 0);
    const iecValue = plannedWeight > 0 ? (completedWeight / plannedWeight) * 100 : 0;

    // Monthly production
    const monthlyMap: Record<string, { previsto: number; real: number }> = {};
    for (const s of allStages) {
      if (!s.report_end_date) continue;
      const d = new Date(s.report_end_date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (!monthlyMap[key]) monthlyMap[key] = { previsto: 0, real: 0 };
      monthlyMap[key].previsto += Number(s.stage_weight) || 0;
      if (s.status === "concluido") {
        monthlyMap[key].real += Number(s.stage_weight) || 0;
      }
    }

    const sortedMonths = Object.keys(monthlyMap).sort();
    const producaoMensal = sortedMonths.map((m) => ({
      mes_ano: m,
      previsto: +(monthlyMap[m].previsto * 100).toFixed(2),
      real: +(monthlyMap[m].real * 100).toFixed(2),
      variacao: +((monthlyMap[m].real - monthlyMap[m].previsto) * 100).toFixed(2),
    }));

    let acumPrev = 0, acumReal = 0;
    const producaoAcumulada = sortedMonths.map((m) => {
      acumPrev += monthlyMap[m].previsto;
      acumReal += monthlyMap[m].real;
      return {
        mes_ano: m,
        previsto: +(acumPrev * 100).toFixed(2),
        real: +(acumReal * 100).toFixed(2),
        variacao: +((acumReal - acumPrev) * 100).toFixed(2),
      };
    });

    // Financial
    const custoDiretoPrev = allCosts.filter((c) => c.cost_type === "Direto").reduce((s, c) => s + Number(c.expected_value), 0);
    const custoIndiretoPrev = allCosts.filter((c) => c.cost_type === "Indireto").reduce((s, c) => s + Number(c.expected_value), 0);
    const custoDiretoReal = allCosts.filter((c) => c.cost_type === "Direto").reduce((s, c) => s + Number(c.actual_value), 0);
    const custoIndiretoReal = allCosts.filter((c) => c.cost_type === "Indireto").reduce((s, c) => s + Number(c.actual_value), 0);
    const custoTotalPrev = custoDiretoPrev + custoIndiretoPrev;
    const custoTotalReal = custoDiretoReal + custoIndiretoReal;

    const receitaPrev = allRevenues.reduce((s, r) => s + Number(r.expected_value), 0);
    const receitaReal = allRevenues.reduce((s, r) => s + Number(r.actual_value), 0);

    const saldo = receitaReal - custoTotalReal;
    const margem = receitaReal > 0 ? (saldo / receitaReal) * 100 : 0;

    // Calculate prazo_dias
    let prazoDias: number | null = null;
    if (project.start_date && project.end_date) {
      const start = new Date(project.start_date);
      const end = new Date(project.end_date);
      prazoDias = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    }

    const client = project.client;
    const endereco = client
      ? [client.street, client.number, client.city, client.state].filter(Boolean).join(", ")
      : "";

    const result = {
      obra: {
        id: project.id,
        nome: project.name,
        gestor: project.project_manager,
        data_inicio: project.start_date,
        data_conclusao_prevista: project.end_date,
        prazo_dias: prazoDias,
        status: project.status,
      },
      cliente: {
        nome: client?.name || "",
        codigo: client?.code || "",
        responsavel: client?.responsible || "",
        telefone: client?.phone || "",
        endereco,
      },
      analise_fisica: {
        ifec: { valor: +ifecValue.toFixed(2), descricao: `${completedStages}/${totalStages} etapas concluídas` },
        iec: { valor: +iecValue.toFixed(2), descricao: plannedWeight > 0 ? `Eficiência: ${iecValue.toFixed(1)}%` : "Sem etapas planejadas até hoje" },
        producao_mensal: producaoMensal,
        producao_acumulada: producaoAcumulada,
      },
      analise_financeira: {
        custo_total_previsto: custoTotalPrev,
        custo_direto_previsto: custoDiretoPrev,
        custo_indireto_previsto: custoIndiretoPrev,
        custo_total_real: custoTotalReal,
        custo_direto_real: custoDiretoReal,
        custo_indireto_real: custoIndiretoReal,
        variacao_custo: custoTotalReal - custoTotalPrev,
        receita_total_prevista: receitaPrev,
        receita_total_realizada: receitaReal,
        variacao_receita: receitaReal - receitaPrev,
        saldo_obra: saldo,
        margem_lucro: +margem.toFixed(2),
      },
      observacoes_gerenciais: "",
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Error:", err);
    return new Response(JSON.stringify({ error: "Erro interno" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
