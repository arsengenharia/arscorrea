import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { AwsClient } from "https://esm.sh/aws4fetch@1.0.20";

Deno.serve(async (req) => {
  const { nfe_inbox_id } = await req.json();
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  await supabase.from("nfe_inbox").update({ status: "processando" }).eq("id", nfe_inbox_id);

  const { data: inbox } = await supabase.from("nfe_inbox").select("*").eq("id", nfe_inbox_id).single();
  if (!inbox) return new Response("not found", { status: 404 });

  const { data: fileData } = await supabase.storage.from("nfe-attachments").download(inbox.arquivo_path);
  if (!fileData) return new Response("file not found", { status: 404 });

  // ══════════════════════════════════════════════════════════════
  // PDF PROCESSING
  // ══════════════════════════════════════════════════════════════
  if (inbox.arquivo_tipo === "pdf") {
    const pdfBytes = new Uint8Array(await fileData.arrayBuffer());
    let cnpj = null, razaoSocial = null, numeroNota = null, dataEmissao = null;
    let valorTotal = null, chaveNfe = null;
    let itens: any[] = [];
    let extractionMode = "pdf_manual";

    // ── Step 1: Extract native text from PDF (FREE) ──
    const raw = new TextDecoder("latin1").decode(pdfBytes);
    const textParts: string[] = [];
    const btEt = /BT\s([\s\S]*?)ET/g;
    let m;
    while ((m = btEt.exec(raw)) !== null) {
      const strRe = /\(([^)]*)\)/g;
      let sm;
      while ((sm = strRe.exec(m[1])) !== null) {
        const t = sm[1].replace(/\\n/g, " ").trim();
        if (t.length > 0) textParts.push(t);
      }
    }
    if (textParts.join("").length < 50) {
      const readable = raw.match(/[\x20-\x7E\xC0-\xFF]{8,}/g) || [];
      textParts.push(...readable.filter(s =>
        !s.includes("stream") && !s.includes("endobj") && !s.includes("/Type") && !s.includes("/Filter")
      ));
    }
    const extractedText = textParts.join(" ").replace(/\s+/g, " ").trim();

    // ── Step 2: If text found, send to Haiku via Bedrock for intelligent parsing ──
    if (extractedText.length > 80 && Deno.env.get("AWS_ACCESS_KEY_ID")) {
      try {
        const region = Deno.env.get("AWS_REGION") || "us-east-1";
        const aws = new AwsClient({
          accessKeyId: Deno.env.get("AWS_ACCESS_KEY_ID")!,
          secretAccessKey: Deno.env.get("AWS_SECRET_ACCESS_KEY")!,
          region,
          service: "bedrock",
        });

        // Send EXTRACTED TEXT (not image) to Haiku — cheap and fast
        const bedrockUrl = `https://bedrock-runtime.${region}.amazonaws.com/model/us.anthropic.claude-3-5-haiku-20241022-v1:0/invoke`;
        const truncatedText = extractedText.substring(0, 6000); // limit tokens

        const resp = await aws.fetch(bedrockUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            anthropic_version: "bedrock-2023-05-31",
            max_tokens: 1500,
            messages: [{
              role: "user",
              content: `Voce e um parser de DANFE (documento auxiliar de NF-e brasileira).

Abaixo esta o texto extraido de um PDF de NF-e. Encontre e retorne os dados em JSON.

TEXTO DO PDF:
${truncatedText}

Responda APENAS com JSON valido (sem markdown, sem explicacao):
{
  "cnpj": "14 digitos sem pontuacao do EMITENTE (nao do destinatario)",
  "razao_social": "nome/razao social do EMITENTE",
  "numero_nota": "numero da NF-e",
  "data_emissao": "YYYY-MM-DD",
  "valor_total": 0.00,
  "chave_nfe": "44 digitos ou null",
  "itens": [
    {"xProd": "descricao do produto", "NCM": "8 digitos", "qCom": 1.0, "uCom": "UN", "vUnCom": 0.00, "vProd": 0.00}
  ]
}

Se nao encontrar um campo, use null. Para valor_total use numero com ponto decimal.`
            }],
          }),
        });

        if (resp.ok) {
          const result = await resp.json();
          const aiText = result.content?.[0]?.text || "{}";
          const jsonStr = aiText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
          try {
            const parsed = JSON.parse(jsonStr);
            cnpj = parsed.cnpj || null;
            razaoSocial = parsed.razao_social || null;
            numeroNota = parsed.numero_nota || null;
            dataEmissao = parsed.data_emissao || null;
            valorTotal = parsed.valor_total ? Number(parsed.valor_total) : null;
            chaveNfe = parsed.chave_nfe || null;
            itens = parsed.itens || [];
            extractionMode = "pdf_ai";

            await supabase.from("ai_query_log").insert({
              module: "nfe_pdf_parse",
              prompt: `PDF text: ${truncatedText.length} chars`,
              response: jsonStr.substring(0, 2000),
              model: "claude-3-5-haiku",
              tokens_input: result.usage?.input_tokens,
              tokens_output: result.usage?.output_tokens,
              success: true,
              context_type: "nfe_inbox",
              context_id: nfe_inbox_id,
            });
          } catch {
            await supabase.from("ai_query_log").insert({
              module: "nfe_pdf_parse", prompt: "JSON parse failed",
              response: aiText.substring(0, 500), success: false,
              context_type: "nfe_inbox", context_id: nfe_inbox_id,
            });
          }
        } else {
          const errText = await resp.text();
          await supabase.from("ai_query_log").insert({
            module: "nfe_pdf_parse",
            prompt: "Bedrock error " + resp.status,
            response: errText.substring(0, 500),
            success: false,
            error_message: errText.substring(0, 200),
            context_type: "nfe_inbox", context_id: nfe_inbox_id,
          });
        }
      } catch (err) {
        await supabase.from("ai_query_log").insert({
          module: "nfe_pdf_parse", prompt: "Exception",
          success: false, error_message: String(err).substring(0, 500),
          context_type: "nfe_inbox", context_id: nfe_inbox_id,
        });
      }
    }

    // ── Step 3: Find/create supplier ──
    let supplierId = null;
    if (cnpj) {
      const cleanCnpj = cnpj.replace(/\D/g, "");
      if (cleanCnpj.length === 14) {
        const { data: existingSup } = await supabase.from("suppliers").select("id, trade_name").eq("document", cleanCnpj).maybeSingle();
        if (existingSup) { supplierId = existingSup.id; if (!razaoSocial) razaoSocial = existingSup.trade_name; }
        else if (razaoSocial) {
          const { data: ns } = await supabase.from("suppliers").insert({
            document: cleanCnpj, trade_name: razaoSocial, legal_name: razaoSocial,
            tipo: "Juridica", observacoes: "Cadastro automatico via PDF NF-e", ativo: true,
          } as any).select("id").single();
          supplierId = ns?.id || null;
        }
      }
    }

    // ── Step 4: Dedup check ──
    if (chaveNfe) {
      const { data: existing } = await supabase.from("project_financial_entries").select("id").eq("chave_nfe", chaveNfe).maybeSingle();
      if (existing) {
        await supabase.from("nfe_inbox").update({ status: "duplicata", chave_nfe: chaveNfe, observacao: "Duplicata: " + existing.id }).eq("id", nfe_inbox_id);
        return new Response(JSON.stringify({ mode: "duplicate" }), { headers: { "Content-Type": "application/json" } });
      }
    }

    const { data: obras } = await supabase.from("projects").select("id, name")
      .in("status", ["Pendente", "Em Andamento", "pendente", "em andamento", "em_andamento", "iniciado"]).order("name");

    const confianca = extractionMode === "pdf_ai" ? 0.80 : 0.30;

    await supabase.from("nfe_inbox").update({
      status: "aguardando_revisao", supplier_id: supplierId, razao_social: razaoSocial,
      cnpj: cnpj?.replace(/\D/g, "") || null, numero_nota: numeroNota, data_emissao: dataEmissao,
      valor_total: valorTotal, chave_nfe: chaveNfe, categoria_sugerida: "materiais_obra",
      ai_confianca: confianca,
      ai_justificativa: `Modo: ${extractionMode}. ${extractedText.length} chars extraidos do PDF.`,
      itens_json: itens.length > 0 ? itens : null, obras_ativas_json: obras,
      observacao: extractionMode === "pdf_ai"
        ? "Dados extraidos do PDF por IA. Verifique antes de aprovar."
        : "PDF sem texto suficiente — preencha manualmente.",
    }).eq("id", nfe_inbox_id);

    return new Response(JSON.stringify({ mode: extractionMode, chars: extractedText.length }), {
      headers: { "Content-Type": "application/json" }
    });
  }

  // ══════════════════════════════════════════════════════════════
  // XML PROCESSING
  // ══════════════════════════════════════════════════════════════
  const { DOMParser } = await import("https://esm.sh/@xmldom/xmldom@0.8.10");
  const doc = new DOMParser().parseFromString(await fileData.text(), "text/xml");
  const getTag = (parent: any, name: string): string => parent?.getElementsByTagName(name)[0]?.textContent?.trim() ?? "";

  const rawId = doc.getElementsByTagName("infNFe")[0]?.getAttribute("Id") ?? "";
  const chaveNfe = rawId.replace("NFe", "");
  if (chaveNfe) {
    const { data: existing } = await supabase.from("project_financial_entries").select("id").eq("chave_nfe", chaveNfe).maybeSingle();
    if (existing) {
      await supabase.from("nfe_inbox").update({ status: "duplicata", chave_nfe: chaveNfe, observacao: "Duplicata: " + existing.id }).eq("id", nfe_inbox_id);
      return new Response("duplicate", { status: 200 });
    }
  }

  const emit = doc.getElementsByTagName("emit")[0];
  const cnpj = emit ? getTag(emit, "CNPJ") : getTag(doc, "CNPJ");
  const razaoSocial = emit ? getTag(emit, "xNome") : getTag(doc, "xNome");
  const nomeFantasia = emit ? getTag(emit, "xFant") : "";
  const numeroNota = getTag(doc, "nNF");
  const dataEmissao = (getTag(doc, "dhEmi") || "").substring(0, 10) || null;
  const valorTotal = parseFloat(getTag(doc, "vNF") || "0");
  const itens = Array.from(doc.getElementsByTagName("det")).map((d: any) => ({
    xProd: getTag(d, "xProd"), vProd: parseFloat(getTag(d, "vProd") || "0"),
    NCM: getTag(d, "NCM"), CFOP: getTag(d, "CFOP"),
    qCom: parseFloat(getTag(d, "qCom") || "1"), uCom: getTag(d, "uCom"),
    vUnCom: parseFloat(getTag(d, "vUnCom") || "0"),
  }));

  let supplierId: string | null = null;
  if (cnpj) {
    const { data: existing } = await supabase.from("suppliers").select("id").eq("document", cnpj).maybeSingle();
    if (existing) { supplierId = existing.id; }
    else {
      const { data: ns } = await supabase.from("suppliers").insert({
        document: cnpj, legal_name: razaoSocial, trade_name: nomeFantasia || razaoSocial,
        tipo: "Juridica", observacoes: "Cadastro automatico via NF-e", ativo: true,
      } as any).select("id").single();
      supplierId = ns?.id ?? null;
    }
  }

  const { data: obras } = await supabase.from("projects").select("id, name")
    .in("status", ["Pendente", "Em Andamento", "pendente", "em andamento", "em_andamento", "iniciado"]).order("name");

  await supabase.from("nfe_inbox").update({
    status: "aguardando_revisao", supplier_id: supplierId, razao_social: razaoSocial, cnpj,
    numero_nota: numeroNota, data_emissao: dataEmissao, valor_total: valorTotal,
    chave_nfe: chaveNfe || null, categoria_sugerida: "materiais_obra", ai_confianca: 1.0,
    itens_json: itens, obras_ativas_json: obras,
  }).eq("id", nfe_inbox_id);

  return new Response(JSON.stringify({ mode: "xml", items: itens.length }), { headers: { "Content-Type": "application/json" } });
});
