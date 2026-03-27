import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { DOMParser } from "https://esm.sh/@xmldom/xmldom@0.8.10";
import Anthropic from "npm:@anthropic-ai/sdk";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NFeItem {
  xProd: string;
  vProd: number;
  NCM: string;
  CFOP: string;
  qCom: number;
  uCom: string;
  vUnCom: number;
}

function tag(parent: any, name: string): string {
  return parent?.getElementsByTagName(name)[0]?.textContent?.trim() ?? "";
}

function extractItems(doc: Document): NFeItem[] {
  return Array.from(doc.getElementsByTagName("det")).map((d) => ({
    xProd: tag(d, "xProd"),
    vProd: parseFloat(tag(d, "vProd") || "0"),
    NCM: tag(d, "NCM"),
    CFOP: tag(d, "CFOP"),
    qCom: parseFloat(tag(d, "qCom") || "1"),
    uCom: tag(d, "uCom"),
    vUnCom: parseFloat(tag(d, "vUnCom") || "0"),
  }));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const { nfe_inbox_id } = await req.json();
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  await supabase.from("nfe_inbox").update({ status: "processando" }).eq("id", nfe_inbox_id);

  try {
    const { data: inbox } = await supabase.from("nfe_inbox").select("*").eq("id", nfe_inbox_id).single();
    if (!inbox) throw new Error("not found");

    const { data: fileData } = await supabase.storage.from("nfe-attachments").download(inbox.arquivo_path);
    if (!fileData) throw new Error("file not found");

    if (inbox.arquivo_tipo === "pdf") {
      await supabase.from("nfe_inbox").update({ status: "aguardando_revisao", observacao: "PDF — preencha manualmente" }).eq("id", nfe_inbox_id);
      return new Response("PDF queued", { status: 200, headers: corsHeaders });
    }

    const doc = new DOMParser().parseFromString(await fileData.text(), "text/xml");
    const rawId = doc.getElementsByTagName("infNFe")[0]?.getAttribute("Id") ?? "";
    const chaveNfe = rawId.replace("NFe", "");

    if (chaveNfe) {
      const { data: dup } = await supabase.from("project_financial_entries").select("id").eq("chave_nfe", chaveNfe).maybeSingle();
      if (dup) {
        await supabase.from("nfe_inbox").update({ status: "duplicata", chave_nfe: chaveNfe, observacao: `Duplicata: ${dup.id}` }).eq("id", nfe_inbox_id);
        return new Response("duplicate", { status: 200, headers: corsHeaders });
      }
    }

    const emit = doc.getElementsByTagName("emit")[0];
    const cnpj = emit ? tag(emit, "CNPJ") : tag(doc, "CNPJ");
    const razaoSocial = emit ? tag(emit, "xNome") : tag(doc, "xNome");
    const nomeFantasia = emit ? tag(emit, "xFant") : "";
    const numeroNota = tag(doc, "nNF");
    const dataEmissao = (tag(doc, "dhEmi") || "").substring(0, 10) || null;
    const valorTotal = parseFloat(tag(doc, "vNF") || "0");
    const itens = extractItems(doc);

    // Address from XML emitter
    const enderEmit = emit?.getElementsByTagName("enderEmit")[0];

    // Match or create supplier — CORRECT field names
    let supplierId: string | null = null;
    if (cnpj) {
      const { data: existing } = await supabase.from("suppliers").select("id").eq("document", cnpj).maybeSingle();
      if (existing) { supplierId = existing.id; }
      else {
        const supData: any = {
          document: cnpj, legal_name: razaoSocial, trade_name: nomeFantasia || razaoSocial,
          tipo: "Juridica", observacoes: "Cadastro automatico via NF-e", ativo: true,
        };
        if (enderEmit) {
          supData.rua = tag(enderEmit, "xLgr"); supData.numero = tag(enderEmit, "nro");
          supData.bairro = tag(enderEmit, "xBairro"); supData.cidade = tag(enderEmit, "xMun");
          supData.estado = tag(enderEmit, "UF"); supData.cep = tag(enderEmit, "CEP");
        }
        if (emit) supData.phone = tag(emit, "fone");
        const { data: ns } = await supabase.from("suppliers").insert(supData).select("id").single();
        supplierId = ns?.id ?? null;
      }
    }

    // AI classification
    let aiData = { categoria_sugerida: "materiais_obra", confianca: 0.5, justificativa: "" };
    const aiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (aiKey && itens.length > 0) {
      try {
        const ai = new Anthropic({ apiKey: aiKey });
        const cats = [
          "mao_obra_direta — Mao de Obra", "materiais_obra — Materiais",
          "servicos_prestados — Servicos", "equipamentos — Equipamentos",
          "reembolsos_despesas — Reembolsos", "custo_administrativo — Administrativo",
        ];
        const r = await ai.messages.create({
          model: "claude-sonnet-4-6", max_tokens: 300,
          messages: [{ role: "user", content:
            `Classifique NF-e construcao civil.\nFornecedor: ${razaoSocial}\nItens:\n${itens.map((it,i)=>`${i+1}. ${it.xProd} R$${it.vProd.toFixed(2)} NCM:${it.NCM}`).join("\n")}\nCategorias (use CODIGO):\n${cats.join("\n")}\nJSON: {"categoria_sugerida":"codigo","confianca":0.0,"justificativa":"..."}`
          }],
        });
        const txt = r.content[0].type === "text" ? r.content[0].text : "{}";
        const p = JSON.parse(txt); if (p.categoria_sugerida) aiData = p;
      } catch (e) { console.error("AI:", e); }
    }

    const { data: obras } = await supabase.from("projects").select("id, name")
      .in("status", ["Pendente", "Em Andamento", "pendente", "em andamento", "em_andamento", "iniciado"]).order("name");

    await supabase.from("nfe_inbox").update({
      status: "aguardando_revisao", supplier_id: supplierId, razao_social: razaoSocial,
      cnpj, numero_nota: numeroNota, data_emissao: dataEmissao, valor_total: valorTotal,
      chave_nfe: chaveNfe || null, categoria_sugerida: aiData.categoria_sugerida,
      ai_confianca: aiData.confianca, ai_justificativa: aiData.justificativa,
      itens_json: itens, obras_ativas_json: obras,
    }).eq("id", nfe_inbox_id);

    return new Response("OK", { status: 200, headers: corsHeaders });
  } catch (err) {
    console.error("Parse:", err);
    await supabase.from("nfe_inbox").update({ status: "erro", observacao: String(err) }).eq("id", nfe_inbox_id);
    return new Response("error", { status: 500, headers: corsHeaders });
  }
});
