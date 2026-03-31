import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

// ---------------------------------------------------------------------------
// Question-type detection — best-effort classification of user intent
// ---------------------------------------------------------------------------
export function detectQuestionType(
  message: string
): "data" | "analysis" | "action" | "comparison" | "projection" | "general" {
  const lower = message.toLowerCase();

  // Data questions — asking for a specific value
  if (
    /^(qual|quanto|quantos|quantas|quando|onde|quem)\b/.test(lower) &&
    lower.length < 80
  )
    return "data";
  if (
    /\b(saldo|valor|total|custo|receita|margem|quantidade)\b/.test(lower) &&
    !/\b(analis|compar|projet|preve)\b/.test(lower)
  )
    return "data";

  // Comparison
  if (
    /\b(compar[ae]|diferença|versus|vs\.?|melhor|pior|entre)\b/.test(lower)
  )
    return "comparison";

  // Projection
  if (
    /\b(projet[ae]|preve[jr]|estim[ae]|projeção|previsão|tendência|cenário|futuro)\b/.test(
      lower
    )
  )
    return "projection";

  // Action
  if (
    /\b(ger[ae]|cri[ae]|filt[re]|naveg|abr[aei]|envie|atualize|delete|mude|altere)\b/.test(
      lower
    )
  )
    return "action";

  // Analysis
  if (
    /\b(analis|investig|resum|diagnóstic|avali[ae]|audit|verifi|identifi|detect|problema|risco)\b/.test(
      lower
    )
  )
    return "analysis";

  return "general";
}

// ---------------------------------------------------------------------------
// Type-specific prompt addenda
// ---------------------------------------------------------------------------
const typeInstructions: Record<string, string> = {
  data: `
## Formato desta resposta
O usuario fez uma pergunta de dado. Responda de forma DIRETA e CURTA:
- Valor em destaque (negrito)
- Fonte do dado (tabela/view)
- Periodo de referencia se aplicavel
- Sem formato achado/evidencia/impacto/recomendacao
Exemplo: "O saldo da obra Alvinopolis e **R$ 45.230,00** (receitas - custos, atualizado em 27/03)."`,

  analysis: `
## Formato desta resposta
O usuario pediu uma analise. Use o formato estruturado:
**Achado:** [o que foi detectado]
**Evidencia:** [dados que sustentam — cite tabela, valores, datas]
**Impacto:** [consequencia para a obra/empresa]
**Recomendacao:** [o que fazer — acao especifica]`,

  action: `
## Formato desta resposta
O usuario pediu uma acao. Antes de executar:
1. Confirme o que vai fazer
2. Mostre os parametros que vai usar
3. Peca confirmacao explicita se a acao e destrutiva ou irreversivel
Para acoes simples (filtrar, navegar), execute direto e confirme o resultado.`,

  comparison: `
## Formato desta resposta
O usuario pediu uma comparacao. Use formato de tabela:
| Criterio | Item A | Item B |
|----------|--------|--------|
| ...      | ...    | ...    |

Apos a tabela, destaque as diferencas mais relevantes em 1-2 frases.`,

  projection: `
## Formato desta resposta
O usuario pediu uma projecao. Inclua:
1. **Dados base:** valores atuais que fundamentam a projecao
2. **Projecao:** cenario provavel com valores estimados
3. **Premissas:** o que esta sendo assumido
4. **Ressalvas:** fatores que podem alterar a projecao
⚠️ Sempre deixe claro que projecoes sao estimativas baseadas em dados historicos.`,

  general: "", // No additional instructions
};

// ---------------------------------------------------------------------------
// Build the full system prompt
// ---------------------------------------------------------------------------
export async function buildSystemPrompt(
  supabase: SupabaseClient,
  contextType: string,
  contextId: string | null,
  userId: string,
  userMessage?: string
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
- IEC: ${p.iec || "N/A"}
- IFEC: ${p.ifec || "N/A"}
- Avanço Real: ${p.avanco_real ? p.avanco_real + "%" : "N/A"}
- Avanço Previsto: ${p.avanco_previsto ? p.avanco_previsto + "%" : "N/A"}`;
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

## REGRA CRITICA — VOCE TEM ACESSO TOTAL AO SISTEMA
Voce tem acesso COMPLETO a TODOS os dados financeiros do sistema via tools. VOCE DEVE:
- SEMPRE usar tools para buscar dados ANTES de responder qualquer pergunta
- NUNCA dizer "preciso de acesso", "me forneca dados", "nao tenho acesso" — VOCE TEM ACESSO, USE AS TOOLS
- NUNCA pedir ao usuario para fornecer dados que voce pode buscar com as tools disponiveis
- SEMPRE responder com DADOS REAIS do sistema, nunca com recomendacoes genericas

## REGRA DE EFICIENCIA — MAXIMO 2 TOOL CALLS POR RESPOSTA
- Use NO MAXIMO 2 tools por resposta. Isso e CRITICO para evitar timeout.
- build_context JA RETORNA o resumo de TODAS as obras — NAO chame search_projects para cada obra individualmente
- Se build_context retornar os dados que precisa, NAO chame mais nenhuma tool
- Se precisa de detalhe de UMA obra especifica, use search_projects UMA VEZ so
- NUNCA chame search_projects 3+ vezes — use os dados do build_context
- Prefira responder com dados parciais do que travar chamando muitas tools

## Como responder cada tipo de pergunta:
- "analise financeira" → use build_context → responda com numeros reais do resumo
- "qual o saldo/custo/receita" → use build_context ou search_projects (1 chamada) → responda o valor exato
- "como estao as obras" → use build_context('general') → liste cada obra com seus numeros JA NO CONTEXTO
- "quais anomalias" → os dados ja estao no contexto (open_anomalias) → liste-as SEM chamar tools
- "obra do X" → use search_projects com nome parcial (1 chamada) → retorne dados financeiros
- "fornecedor Y" → use search_suppliers (1 chamada) → retorne historico de pagamentos
- "compare/ranking" → use query_budget_vs_actual ou query_monthly_by_project (1 chamada) → faca a comparacao
- "fluxo de caixa" → use query_cash_flow (1 chamada) → mostre projecao

## Regras de formatacao
- Responda SEMPRE em portugues brasileiro
- Use formato BRL para valores (R$ 1.234,56)
- Use formato dd/mm/yyyy para datas
- Seja conciso e direto — numeros primeiro, explicacao depois
- Cite a fonte dos dados
- Para acoes que alteram dados, SEMPRE peca confirmacao

## IMPORTANTE — Buscar antes de responder
- Quando o usuario mencionar uma OBRA por nome, use search_projects ANTES de responder
- Quando o usuario mencionar um FORNECEDOR, use search_suppliers ANTES de responder
- NUNCA diga "nao consigo identificar" — USE A TOOL DE BUSCA PRIMEIRO
- Se a busca retornar multiplos resultados, liste-os e pergunte qual o usuario quer
- Se a busca retornar 1 resultado, use os dados diretamente na resposta

## Indicadores da ARS
- IEC (Indice de Eficiencia de Custo): custo_realizado / orcamento_previsto. IEC < 1.0 = dentro do orcamento. IEC > 1.0 = estouro.
- IFEC (Indice Fisico de Eficiencia): avanco_real / avanco_previsto. IFEC >= 1.0 = eficiente. IFEC < 0.8 = atraso critico. Requer cronograma baseline e medicoes.
- Para consultar IFEC: use query_ifec_overview (visao geral) ou query_progress_timeline (por obra)
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
${(prefs.nivel_detalhe === "resumido") ? "IMPORTANTE: Responda em no maximo 2 frases. So numeros e conclusao. Sem explicacoes longas." : (prefs.nivel_detalhe === "detalhado") ? "IMPORTANTE: Inclua analise completa: dados, comparacoes, tendencias e recomendacoes detalhadas." : ""}
${prefs.apelidos && Object.keys(prefs.apelidos).length > 0 ? "- Apelidos: " + JSON.stringify(prefs.apelidos) : ""}`;

  // Append question-type-specific formatting instructions
  const questionType = userMessage ? detectQuestionType(userMessage) : "general";
  const extra = typeInstructions[questionType] || "";
  const finalPrompt = extra ? systemPrompt + "\n" + extra : systemPrompt;

  return { systemPrompt: finalPrompt, contextData };
}
