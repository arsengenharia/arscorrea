import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
// AwsClient loaded dynamically to avoid boot errors

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
    // Most DANFEs use FlateDecode compression. We decompress streams first.
    const raw = new TextDecoder("latin1").decode(pdfBytes);
    const textParts: string[] = [];

    // Method A: Decompress FlateDecode streams with pako and extract text
    try {
      const pako = await import("https://esm.sh/pako@2.1.0");

      const streamRegex = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
      let streamMatch;
      while ((streamMatch = streamRegex.exec(raw)) !== null) {
        try {
          const preCtx = raw.substring(Math.max(0, streamMatch.index - 200), streamMatch.index);
          const compressed = new Uint8Array(streamMatch[1].split("").map(c => c.charCodeAt(0)));

          let decompressed: string;
          if (preCtx.includes("FlateDecode")) {
            const inflated = pako.inflate(compressed);
            decompressed = new TextDecoder("latin1").decode(inflated);
          } else {
            decompressed = streamMatch[1];
          }

          // Extract text from BT/ET blocks
          const btRe = /BT\s([\s\S]*?)ET/g;
          let bm;
          while ((bm = btRe.exec(decompressed)) !== null) {
            // Parenthesized strings
            const pRe = /\(([^)]*)\)/g;
            let pm;
            while ((pm = pRe.exec(bm[1])) !== null) {
              const t = pm[1].replace(/\\n/g, " ").replace(/\\\\/g, "\\").trim();
              if (t.length > 0) textParts.push(t);
            }
            // TJ arrays
            const tjRe = /\[([\s\S]*?)\]\s*TJ/g;
            let tjm;
            while ((tjm = tjRe.exec(bm[1])) !== null) {
              const inner = /\(([^)]*)\)/g;
              let im;
              let combined = "";
              while ((im = inner.exec(tjm[1])) !== null) combined += im[1];
              if (combined.trim().length > 0) textParts.push(combined.trim());
            }
          }
        } catch { /* skip bad streams */ }
      }
    } catch { /* pako import failed — skip decompression */ }

    // Method B: Direct BT/ET on uncompressed content (fallback)
    if (textParts.join("").length < 50) {
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
    }

    // Method C: Readable ASCII fallback
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
        const { AwsClient } = await import("https://esm.sh/aws4fetch@1.0.20");
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

    // ── Step 3: If Haiku couldn't extract (CIDFont/scanned PDF), use Sonnet Vision ──
    if ((!cnpj || !valorTotal) && Deno.env.get("AWS_ACCESS_KEY_ID")) {
      try {
        const region = Deno.env.get("AWS_REGION") || "us-east-1";
        const { AwsClient } = await import("https://esm.sh/aws4fetch@1.0.20");
        const aws = new AwsClient({
          accessKeyId: Deno.env.get("AWS_ACCESS_KEY_ID")!,
          secretAccessKey: Deno.env.get("AWS_SECRET_ACCESS_KEY")!,
          region,
          service: "bedrock",
        });

        // Encode PDF as base64 for Sonnet (supports PDF documents)
        const { encodeBase64 } = await import("https://deno.land/std@0.224.0/encoding/base64.ts");
        const b64 = encodeBase64(pdfBytes.slice(0, 2 * 1024 * 1024)); // max 2MB

        // Sonnet 4 supports PDF natively
        // Use cross-region inference profile (required for on-demand)
        const visionUrl = `https://bedrock-runtime.${region}.amazonaws.com/model/us.anthropic.claude-sonnet-4-20250514-v1:0/invoke`;

        const vResp = await aws.fetch(visionUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            anthropic_version: "bedrock-2023-05-31",
            max_tokens: 2000,
            messages: [{
              role: "user",
              content: [
                { type: "document", source: { type: "base64", media_type: "application/pdf", data: b64 } },
                { type: "text", text: 'Extraia todos os dados desta NF-e/DANFE brasileira. Responda APENAS com JSON valido:\n{"cnpj":"14 digitos sem pontuacao do EMITENTE","razao_social":"nome do emitente","numero_nota":"numero","data_emissao":"YYYY-MM-DD","valor_total":0.00,"chave_nfe":"44 digitos ou null","itens":[{"xProd":"descricao","NCM":"8 digitos","qCom":1,"uCom":"UN","vUnCom":0.00,"vProd":0.00}]}' }
              ]
            }],
          }),
        });

        if (vResp.ok) {
          const vResult = await vResp.json();
          const vText = vResult.content?.[0]?.text || "{}";
          const jsonStr = vText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
          try {
            const parsed = JSON.parse(jsonStr);
            cnpj = parsed.cnpj || cnpj;
            razaoSocial = parsed.razao_social || razaoSocial;
            numeroNota = parsed.numero_nota || numeroNota;
            dataEmissao = parsed.data_emissao || dataEmissao;
            valorTotal = parsed.valor_total ? Number(parsed.valor_total) : valorTotal;
            chaveNfe = parsed.chave_nfe || chaveNfe;
            itens = (parsed.itens?.length > 0) ? parsed.itens : itens;
            extractionMode = "pdf_vision";
          } catch { /* JSON parse failed */ }

          await supabase.from("ai_query_log").insert({
            module: "nfe_vision", prompt: "Sonnet PDF Vision",
            response: vText.substring(0, 2000), model: "claude-sonnet-4",
            tokens_input: vResult.usage?.input_tokens, tokens_output: vResult.usage?.output_tokens,
            success: extractionMode === "pdf_vision",
            context_type: "nfe_inbox", context_id: nfe_inbox_id,
          });
        } else {
          const errBody = await vResp.text();
          await supabase.from("ai_query_log").insert({
            module: "nfe_vision", prompt: "Sonnet Vision ERROR " + vResp.status,
            response: errBody.substring(0, 2000), success: false,
            error_message: errBody.substring(0, 200),
            context_type: "nfe_inbox", context_id: nfe_inbox_id,
          });
        }
      } catch (vErr) {
        await supabase.from("ai_query_log").insert({
          module: "nfe_vision", prompt: "Vision EXCEPTION",
          success: false, error_message: String(vErr).substring(0, 500),
          context_type: "nfe_inbox", context_id: nfe_inbox_id,
        });
      }
    }

    // ── Step 5: Find/create supplier ──
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

    // ── Step 6: Dedup check ──
    if (chaveNfe) {
      const { data: existing } = await supabase.from("project_financial_entries").select("id").eq("chave_nfe", chaveNfe).maybeSingle();
      if (existing) {
        await supabase.from("nfe_inbox").update({ status: "duplicata", chave_nfe: chaveNfe, observacao: "Duplicata: " + existing.id }).eq("id", nfe_inbox_id);
        return new Response(JSON.stringify({ mode: "duplicate" }), { headers: { "Content-Type": "application/json" } });
      }
    }

    const { data: obras } = await supabase.from("projects").select("id, name")
      .in("status", ["Pendente", "Em Andamento", "pendente", "em andamento", "em_andamento", "iniciado"]).order("name");

    const confianca = extractionMode === "pdf_vision" ? 0.90 : extractionMode === "pdf_ai" ? 0.80 : 0.30;

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
