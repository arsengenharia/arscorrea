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

// --- Hybrid PDF extraction helpers ---

function extractTextFromPdf(pdfBytes: Uint8Array): string {
  const raw = new TextDecoder("latin1").decode(pdfBytes);
  const textParts: string[] = [];

  // Method 1: Extract text between parentheses in BT...ET blocks
  const btEtRegex = /BT\s([\s\S]*?)ET/g;
  let match;
  while ((match = btEtRegex.exec(raw)) !== null) {
    const block = match[1];
    const strRegex = /\(([^)]*)\)/g;
    let strMatch;
    while ((strMatch = strRegex.exec(block)) !== null) {
      const text = strMatch[1]
        .replace(/\\n/g, "\n")
        .replace(/\\r/g, "")
        .replace(/\\\\/g, "\\")
        .replace(/\\(/g, "(")
        .replace(/\\)/g, ")");
      if (text.trim().length > 0) textParts.push(text.trim());
    }
  }

  // Method 2: Look for readable ASCII sequences (fallback for compressed streams)
  if (textParts.join("").length < 50) {
    const readableRegex = /[\x20-\x7E\xC0-\xFF]{5,}/g;
    const readable = raw.match(readableRegex) || [];
    textParts.push(...readable.filter(s =>
      !s.includes("stream") && !s.includes("endobj") && !s.includes("xref")
      && !s.includes("/Type") && !s.includes("/Font")
    ));
  }

  return textParts.join(" ").replace(/\s+/g, " ").trim();
}

function parseDanfeText(text: string): {
  cnpj: string | null;
  razaoSocial: string | null;
  numeroNota: string | null;
  dataEmissao: string | null;
  valorTotal: number | null;
  chaveNfe: string | null;
  items: Array<{ xProd: string; vProd: number; NCM: string; qCom: number; uCom: string; vUnCom: number }>;
} {
  const cnpjMatch = text.match(/(\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2})/);
  const cnpj = cnpjMatch ? cnpjMatch[1].replace(/\D/g, "") : null;

  const chaveMatch = text.match(/(\d{44})/);
  const chaveNfe = chaveMatch ? chaveMatch[1] : null;

  const numMatch = text.match(/(?:N[ºo°]|NF-?e?\s*N[ºo°]?)\s*[:.]?\s*(\d{1,9})/i);
  const numeroNota = numMatch ? numMatch[1] : null;

  const dataMatch = text.match(/(?:EMISS[ÃA]O|DATA\s*(?:DE\s*)?EMISS[ÃA]O)\s*[:.]?\s*(\d{2}\/\d{2}\/\d{4})/i)
    || text.match(/(\d{2}\/\d{2}\/20\d{2})/);
  let dataEmissao = null;
  if (dataMatch) {
    const [d, m, y] = dataMatch[1].split("/");
    dataEmissao = `${y}-${m}-${d}`;
  }

  const valorMatch = text.match(/VALOR\s*TOTAL\s*(?:DA\s*(?:NF|NOTA))?\s*[:.]?\s*R?\$?\s*([\d.,]+)/i);
  let valorTotal = null;
  if (valorMatch) {
    valorTotal = parseFloat(valorMatch[1].replace(/\./g, "").replace(",", "."));
  }

  const razaoSocial = null;

  return { cnpj, razaoSocial, numeroNota, dataEmissao, valorTotal, chaveNfe, items: [] };
}

async function extractWithVision(
  pdfBase64: string,
  aws: any,
  region: string,
): Promise<any> {
  const prompt = `Extraia todos os dados desta Nota Fiscal Eletrônica (DANFE/NF-e).

Responda APENAS com JSON válido:

{
  "cnpj": "00000000000000",
  "razao_social": "Nome da Empresa",
  "numero_nota": "000123",
  "data_emissao": "2026-03-20",
  "valor_total": 2300.00,
  "chave_nfe": "35260312345678000199550010000012341000012345",
  "itens": [
    {"xProd": "CIMENTO CP-II 50KG", "NCM": "25232900", "CFOP": "5102", "qCom": 100, "uCom": "KG", "vUnCom": 15.50, "vProd": 1550.00}
  ]
}

Se algum campo não estiver legível, use null.`;

  const modelId = "us.anthropic.claude-sonnet-4-6-20250514";
  const url = `https://bedrock-runtime.${region}.amazonaws.com/model/${modelId}/invoke`;

  const response = await aws.fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      anthropic_version: "bedrock-2023-05-31",
      messages: [{
        role: "user",
        content: [
          {
            type: "image",
            source: { type: "base64", media_type: "image/jpeg", data: pdfBase64 },
          },
          { type: "text", text: prompt },
        ],
      }],
      max_tokens: 2000,
    }),
  });

  if (!response.ok) {
    throw new Error("Vision API error: " + await response.text());
  }

  const result = await response.json();
  const text = result.content?.[0]?.text || "{}";

  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
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
      const pdfBytes = new Uint8Array(await fileData.arrayBuffer());

      // Step 1: Try native text extraction
      const extractedText = extractTextFromPdf(pdfBytes);
      const charCount = extractedText.length;

      let cnpj: string | null = null, razaoSocial: string | null = null, numeroNota: string | null = null;
      let dataEmissao: string | null = null, valorTotal: number | null = null, chaveNfe: string | null = null;
      let itens: any[] = [];
      let extractionMode = "manual";

      if (charCount > 100) {
        const parsed = parseDanfeText(extractedText);
        cnpj = parsed.cnpj;
        razaoSocial = parsed.razaoSocial;
        numeroNota = parsed.numeroNota;
        dataEmissao = parsed.dataEmissao;
        valorTotal = parsed.valorTotal;
        chaveNfe = parsed.chaveNfe;
        itens = parsed.items;
        extractionMode = (cnpj && valorTotal) ? "pdf_nativo" : "pdf_nativo_parcial";
      }

      // Step 2: If critical fields missing, try Claude Vision via Bedrock
      if (!cnpj || !valorTotal) {
        const awsKey = Deno.env.get("AWS_ACCESS_KEY_ID");
        const awsSecret = Deno.env.get("AWS_SECRET_ACCESS_KEY");

        if (awsKey && awsSecret) {
          try {
            const { AwsClient } = await import("https://esm.sh/aws4fetch@1.0.20");
            const aws = new AwsClient({
              accessKeyId: awsKey, secretAccessKey: awsSecret,
              region: Deno.env.get("AWS_REGION") || "us-east-1",
            });

            const pdfBase64 = btoa(String.fromCharCode(...pdfBytes.slice(0, 5 * 1024 * 1024)));
            const visionResult = await extractWithVision(
              pdfBase64, aws, Deno.env.get("AWS_REGION") || "us-east-1",
            );

            if (visionResult) {
              cnpj = visionResult.cnpj || cnpj;
              razaoSocial = visionResult.razao_social || razaoSocial;
              numeroNota = visionResult.numero_nota || numeroNota;
              dataEmissao = visionResult.data_emissao || dataEmissao;
              valorTotal = visionResult.valor_total || valorTotal;
              chaveNfe = visionResult.chave_nfe || chaveNfe;
              if (visionResult.itens?.length > 0) itens = visionResult.itens;
              extractionMode = "pdf_vision";
            }

            await supabase.from("ai_query_log").insert({
              module: "nfe_vision",
              prompt: "PDF Vision extraction for NF-e",
              response: JSON.stringify(visionResult).substring(0, 2000),
              model: "claude-sonnet-4-6",
              context_type: "nfe_inbox",
              context_id: nfe_inbox_id,
              success: !!visionResult,
            });
          } catch (visionErr) {
            console.error("Vision fallback failed:", visionErr);
            await supabase.from("ai_query_log").insert({
              module: "nfe_vision",
              prompt: "PDF Vision extraction for NF-e",
              success: false,
              error_message: String(visionErr).substring(0, 500),
            });
          }
        }
      }

      // Step 3: Dedup check by chave_nfe
      if (chaveNfe) {
        const { data: existing } = await supabase
          .from("project_financial_entries")
          .select("id").eq("chave_nfe", chaveNfe).maybeSingle();
        if (existing) {
          await supabase.from("nfe_inbox").update({
            status: "duplicata", chave_nfe: chaveNfe,
            observacao: `NF-e já lançada — entry id: ${existing.id}`,
          }).eq("id", nfe_inbox_id);
          return new Response("duplicate", { status: 200, headers: corsHeaders });
        }
      }

      // Step 4: Find/create supplier
      let supplierId: string | null = null;
      if (cnpj) {
        const cleanCnpj = cnpj.replace(/\D/g, "");
        const { data: existingSup } = await supabase
          .from("suppliers").select("id, trade_name").eq("document", cleanCnpj).maybeSingle();
        if (existingSup) {
          supplierId = existingSup.id;
          if (!razaoSocial) razaoSocial = existingSup.trade_name;
        } else if (razaoSocial) {
          const { data: newSup } = await supabase.from("suppliers").insert({
            document: cleanCnpj, trade_name: razaoSocial, legal_name: razaoSocial,
            tipo: "Juridica", observacoes: "Cadastro automatico via PDF NF-e", ativo: true,
          } as any).select("id").single();
          supplierId = newSup?.id || null;
        }
      }

      // Step 5: AI categorization (if we have items)
      let aiData = { categoria_sugerida: "materiais_obra", confianca: 0.5, justificativa: "" };
      const aiKey = Deno.env.get("ANTHROPIC_API_KEY");
      if (aiKey && itens.length > 0) {
        try {
          const ai = new Anthropic({ apiKey: aiKey });
          const cats = [
            "mao_obra_direta — Mão de Obra", "materiais_obra — Materiais",
            "servicos_prestados — Serviços", "equipamentos — Equipamentos",
            "reembolsos_despesas — Reembolsos", "custo_administrativo — Administrativo",
          ];
          const r = await ai.messages.create({
            model: "claude-sonnet-4-6", max_tokens: 300,
            messages: [{ role: "user", content:
              `Classifique NF-e.\nFornecedor: ${razaoSocial}\nItens:\n${itens.map((it: any, i: number) => `${i+1}. ${it.xProd} R$${it.vProd}`).join("\n")}\nCategorias (CODIGO):\n${cats.join("\n")}\nJSON: {"categoria_sugerida":"codigo","confianca":0.0,"justificativa":"..."}`
            }],
          });
          const txt = r.content[0].type === "text" ? r.content[0].text : "{}";
          const p = JSON.parse(txt); if (p.categoria_sugerida) aiData = p;
        } catch (e) { console.error("AI categorization:", e); }
      }

      // Step 6: Active projects
      const { data: obras } = await supabase.from("projects").select("id, name")
        .in("status", ["Pendente", "Em Andamento", "pendente", "em andamento", "em_andamento", "iniciado"]).order("name");

      // Step 7: Update nfe_inbox with extracted data
      const confianca = extractionMode === "pdf_vision" ? 0.85
        : extractionMode === "pdf_nativo" ? 0.70 : 0.30;

      await supabase.from("nfe_inbox").update({
        status: "aguardando_revisao",
        supplier_id: supplierId,
        razao_social: razaoSocial,
        cnpj: cnpj?.replace(/\D/g, "") || null,
        numero_nota: numeroNota,
        data_emissao: dataEmissao,
        valor_total: valorTotal,
        chave_nfe: chaveNfe,
        categoria_sugerida: aiData.categoria_sugerida,
        ai_confianca: Math.min(aiData.confianca, confianca),
        ai_justificativa: `Modo: ${extractionMode}. ${aiData.justificativa}`,
        itens_json: itens.length > 0 ? itens : null,
        obras_ativas_json: obras,
        observacao: extractionMode === "manual"
          ? "PDF sem texto extraível — preencha manualmente"
          : `Dados extraídos via ${extractionMode} (${charCount} chars). Verifique antes de aprovar.`,
      }).eq("id", nfe_inbox_id);

      return new Response(JSON.stringify({ mode: extractionMode, chars: charCount }), {
        status: 200, headers: corsHeaders,
      });
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
