import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { AwsClient } from "https://esm.sh/aws4fetch@1.0.20";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { bucket, path, context } = await req.json();
    if (!bucket || !path) {
      return new Response(JSON.stringify({ error: "bucket and path required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Download file
    const { data: fileData, error: dlError } = await supabase.storage
      .from(bucket)
      .download(path);

    if (dlError || !fileData) {
      return new Response(JSON.stringify({ error: "File not found: " + (dlError?.message || "") }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Extract text based on file type
    let textContent = "";
    const isXml = path.toLowerCase().endsWith(".xml");
    const isPdf = path.toLowerCase().endsWith(".pdf");

    if (isXml) {
      textContent = await fileData.text();
      // Clean XML for readability
      textContent = textContent.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
      if (textContent.length > 8000) textContent = textContent.substring(0, 8000) + "... [truncado]";
    } else if (isPdf) {
      // For PDF, we can't easily extract text in Deno without a library
      // Send the raw text representation or a note
      const rawText = await fileData.text();
      // Try to extract readable parts (PDF text is mixed with binary)
      const readableParts = rawText.match(/[\x20-\x7E\xC0-\xFF]{10,}/g) || [];
      textContent = readableParts.join(" ").substring(0, 8000);
      if (textContent.length < 100) {
        textContent = "[PDF com conteudo binario - extração limitada. Arquivo: " + path + "]";
      }
    } else {
      textContent = await fileData.text();
      if (textContent.length > 8000) textContent = textContent.substring(0, 8000) + "... [truncado]";
    }

    // Summarize with Claude via Bedrock
    const region = Deno.env.get("AWS_REGION") || "us-east-1";
    const aws = new AwsClient({
      accessKeyId: Deno.env.get("AWS_ACCESS_KEY_ID")!,
      secretAccessKey: Deno.env.get("AWS_SECRET_ACCESS_KEY")!,
      region,
    });

    const prompt = `Resuma este documento de forma estruturada em português brasileiro.
${context ? "Contexto: " + context : ""}

Formato:
- **Tipo:** (contrato, proposta, NF-e, relatório, planilha, etc.)
- **Resumo:** (2-3 frases)
- **Dados Principais:** (lista dos valores/datas/partes mais importantes)
- **Observações:** (qualquer ponto de atenção)

Documento:
${textContent}`;

    const bedrockUrl = `https://bedrock-runtime.${region}.amazonaws.com/model/us.anthropic.claude-sonnet-4-6-20250514/invoke`;

    const bedrockResp = await aws.fetch(bedrockUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        anthropic_version: "bedrock-2023-05-31",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 1000,
      }),
    });

    if (!bedrockResp.ok) {
      const errText = await bedrockResp.text();
      throw new Error("Bedrock error: " + errText.substring(0, 200));
    }

    const result = await bedrockResp.json();
    const summary = result.content?.[0]?.text || "Não foi possível resumir o documento.";

    // Log to ai_query_log
    await supabase.from("ai_query_log").insert({
      module: "document_summary",
      prompt: prompt.substring(0, 500),
      response: summary.substring(0, 2000),
      model: "claude-sonnet-4-6",
      tokens_input: result.usage?.input_tokens,
      tokens_output: result.usage?.output_tokens,
      success: true,
    });

    return new Response(JSON.stringify({ summary, file_type: isXml ? "xml" : isPdf ? "pdf" : "text" }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Summarize error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
