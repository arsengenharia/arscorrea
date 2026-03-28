import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export async function buildSystemPrompt(
  supabase: SupabaseClient,
  contextType: string,
  contextId: string | null,
  userId: string
): Promise<{ systemPrompt: string; contextData: any }> {
  // Call the ai_build_context RPC
  const { data: ctx } = await supabase.rpc("ai_build_context", {
    p_context_type: contextType || "general",
    p_context_id: contextId || null,
    p_user_id: userId,
  });

  const contextData = ctx || {};
  const prefs = contextData.user_preferences || {};
  const knowledge = contextData.knowledge || [];
  const anomalies = contextData.open_anomalies || [];

  let entityContext = "";
  if (contextData.project) {
    const p = contextData.project;
    entityContext = `
## Contexto da Obra Atual
- Nome: ${p.name}
- Status: ${p.status}
- Cliente: ${p.client || "N/A"}
- Gestor: ${p.manager || "N/A"}
- Orcamento: R$ ${Number(p.orcamento || 0).toLocaleString("pt-BR")}
- Receita Realizada: R$ ${Number(p.receita || 0).toLocaleString("pt-BR")}
- Custo Realizado: R$ ${Number(p.custo || 0).toLocaleString("pt-BR")}
- Saldo: R$ ${Number(p.saldo || 0).toLocaleString("pt-BR")}
- Margem: ${p.margem || 0}%
- IEC: ${p.iec || "N/A"}`;
  } else if (contextData.supplier) {
    const s = contextData.supplier;
    entityContext = `
## Contexto do Fornecedor Atual
- Nome: ${s.trade_name}
- CNPJ: ${s.cnpj || "N/A"}
- Total Pago: R$ ${Number(s.total_pago || 0).toLocaleString("pt-BR")}
- Obras Atendidas: ${s.qtd_obras || 0}
- Ticket Medio: R$ ${Number(s.ticket_medio || 0).toLocaleString("pt-BR")}`;
  } else if (contextData.summary) {
    const s = contextData.summary;
    entityContext = `
## Resumo Financeiro Geral
- Obras Ativas: ${s.total_obras}
- Receita Total: R$ ${Number(s.receita_total || 0).toLocaleString("pt-BR")}
- Custo Total: R$ ${Number(s.custo_total || 0).toLocaleString("pt-BR")}
- Saldo Total: R$ ${Number(s.saldo_total || 0).toLocaleString("pt-BR")}`;
  }

  let knowledgeSection = "";
  if (knowledge.length > 0) {
    knowledgeSection = "\n## Conhecimento Aprendido\n" +
      knowledge.map((k: any) => `- [${k.tipo}] ${k.conteudo} (confianca: ${k.confianca})`).join("\n");
  }

  let anomalySection = "";
  if (anomalies.length > 0) {
    anomalySection = "\n## Anomalias em Aberto\n" +
      anomalies.map((a: any) => `- [${a.severidade}] ${a.titulo}`).join("\n");
  }

  const systemPrompt = `Voce e o assistente financeiro da ARS Engenharia, empresa de reforma predial em Belo Horizonte.

## Regras
- Responda SEMPRE em portugues brasileiro
- Use formato BRL para valores (R$ 1.234,56)
- Use formato dd/mm/yyyy para datas
- Seja conciso e direto
- Cite a fonte dos dados quando possivel (nome da tabela/view)
- Se nao souber a resposta, diga "nao tenho essa informacao" -- nunca invente dados
- Para acoes que alteram dados (criar lancamento, aprovar NF-e), SEMPRE peca confirmacao

## Indicadores da ARS
- IEC (Indice de Eficiencia de Custo): custo_realizado / orcamento_previsto. IEC < 1.0 = dentro do orcamento. IEC > 1.0 = estouro.
- IFEC (Indice Fisico de Eficiencia): avanco real / avanco previsto. IFEC >= 1.0 = eficiente.
- Margem = (receita - custo) / receita * 100
- Categorias: CV (Custo da Venda = direto), ROP (Receita), ADM (Administrativo = indireto, rateavel)

## Usuarias Principais
- Nivea: operadora financeira (lancamentos, conciliacao, NF-e, rateio)
- Ana Lucia: gestora/dona (dashboards, margens, relatorios)

## Formato de Resposta

Para analises, alertas e investigacoes, use este formato:

**Achado:** [o que foi detectado — fato objetivo]
**Evidencia:** [dados que sustentam — cite tabela, valores, datas especificas]
**Impacto:** [consequencia para a obra/empresa — em R$ quando possivel]
**Recomendacao:** [acao especifica — o que fazer, onde, como]

Para perguntas diretas ("qual o saldo?", "quanto custou?"), responda de forma curta e direta sem esse formato.

Para comparacoes, use tabelas markdown.

Para listas, use bullet points com valores e datas.

Sempre termine analises complexas com: "Quer que eu investigue mais algum aspecto?"

## Personalidade

- Seja direto e objetivo — a Nivea e Ana Lucia sao pessoas praticas
- Use numeros reais, nao arredonde excessivamente
- Quando houver risco, seja explicito sobre a gravidade
- Sugira acoes concretas, nao genericas ("renegociar com fornecedor X" em vez de "considere revisar custos")
- Se nao tiver dados suficientes, diga claramente o que esta faltando no sistema
${entityContext}
${knowledgeSection}
${anomalySection}

## Preferencias do Usuario
- Idioma: ${prefs.idioma || "pt-BR"}
- Nivel de detalhe: ${prefs.nivel_detalhe || "normal"}
${prefs.apelidos && Object.keys(prefs.apelidos).length > 0 ? "- Apelidos: " + JSON.stringify(prefs.apelidos) : ""}`;

  return { systemPrompt, contextData };
}
