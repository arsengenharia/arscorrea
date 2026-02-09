import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { encode as encodeBase64 } from "https://deno.land/std@0.168.0/encoding/base64.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Combined system prompt: read PDF content and extract structured JSON
const PARSER_SYSTEM_PROMPT = `Você é um especialista em análise de propostas de engenharia para reforma de fachadas (obras prediais).
Sua tarefa é ler o documento PDF fornecido e extrair dados estruturados da proposta comercial.

Retorne APENAS um JSON válido no seguinte schema, sem nenhum texto adicional:

{
  "scope_text": "string | null",
  "payment_terms": "string | null",
  "warranty_terms": "string | null",
  "exclusions": "string | null",
  "notes": "string | null",
  "totals": {
    "subtotal": "number | null",
    "discount_type": "percent | fixed | null",
    "discount_value": "number | null",
    "total": "number | null"
  },
  "items": [
    {
      "category": "string | null",
      "description": "string",
      "unit": "m2 | m | un | vb | dia | mes | null",
      "quantity": "number | null",
      "unit_price": "number | null",
      "total": "number | null"
    }
  ],
  "confidence": {
    "scope_text": "number 0..1",
    "payment_terms": "number 0..1",
    "warranty_terms": "number 0..1",
    "exclusions": "number 0..1",
    "notes": "number 0..1",
    "totals": "number 0..1",
    "items": "number 0..1"
  }
}

REGRAS:
1. Normalize valores brasileiros: "R$ 1.234,56" => 1234.56
2. Categorias válidas: "Mão de Obra", "Material", "Equipamento", "Serviço Terceirizado", "Outros"
3. Se não identificar categoria, use "Outros"
4. Unidades válidas: "m2", "m", "un", "vb", "dia", "mes"
5. Itens devem ter descrição; ignore linhas vazias
6. Se não encontrar um campo, retorne null
7. Priorize "Total Geral" quando houver múltiplos totais
8. confidence deve ser um número entre 0 e 1 indicando a confiança na extração`;

const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15MB

// Helper to update import status
async function updateImportStatus(
  supabase: ReturnType<typeof createClient>,
  importId: string,
  status: string,
  extra: Record<string, unknown> = {}
) {
  const { error } = await supabase
    .from("proposal_imports")
    .update({ status, ...extra })
    .eq("id", importId);
  
  if (error) {
    console.error(`Failed to update status to ${status}:`, error);
  }
}

// Parse JSON from AI response (handles markdown code blocks)
function parseJsonFromResponse(content: string): unknown {
  let jsonStr = content.trim();
  
  const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    jsonStr = jsonMatch[1].trim();
  }
  
  return JSON.parse(jsonStr);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY não configurada");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !userData?.user) {
      return new Response(JSON.stringify({ error: "Usuário não autenticado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = userData.user.id;
    console.log("Authenticated user:", userId);

    const { importId } = await req.json();

    if (!importId) {
      return new Response(JSON.stringify({ error: "importId é obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: importRecord, error: importError } = await supabase
      .from("proposal_imports")
      .select("*")
      .eq("id", importId)
      .single();

    if (importError || !importRecord) {
      return new Response(JSON.stringify({ error: "Import não encontrado" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (importRecord.created_by !== userId) {
      return new Response(JSON.stringify({ error: "Acesso negado" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await updateImportStatus(supabase, importId, "extracting");

    // Download PDF
    console.log("Downloading PDF:", importRecord.file_path);
    const { data: fileData, error: downloadError } = await supabase.storage
      .from("proposal_uploads")
      .download(importRecord.file_path);

    if (downloadError || !fileData) {
      console.error("Download error:", downloadError);
      await updateImportStatus(supabase, importId, "failed", {
        error_message: "Erro ao baixar PDF",
      });
      return new Response(JSON.stringify({ error: "Erro ao baixar PDF" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const arrayBuffer = await fileData.arrayBuffer();
    const fileSize = arrayBuffer.byteLength;
    console.log("PDF size:", fileSize, "bytes");

    if (fileSize > MAX_FILE_SIZE) {
      await updateImportStatus(supabase, importId, "failed", {
        error_message: `PDF muito grande: ${Math.round(fileSize / 1024 / 1024)}MB`,
      });
      return new Response(JSON.stringify({ 
        error: `PDF muito grande (máximo ${MAX_FILE_SIZE / 1024 / 1024}MB)` 
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Convert to base64
    console.log("Converting to base64...");
    const base64 = encodeBase64(new Uint8Array(arrayBuffer));
    console.log("Base64 length:", base64.length);

    await updateImportStatus(supabase, importId, "parsing");

    // Single AI call: send PDF as file input and ask for structured extraction
    console.log("Calling AI Gateway for PDF parsing...");
    
    let response: Response;
    try {
      response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.0-flash",
          messages: [
            { role: "system", content: PARSER_SYSTEM_PROMPT },
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: "Analise este documento PDF de proposta comercial de engenharia. Leia todo o conteúdo do documento e extraia os dados estruturados conforme o schema especificado. Retorne APENAS o JSON.",
                },
                {
                  type: "image_url",
                  image_url: {
                    url: `data:application/pdf;base64,${base64}`,
                  },
                },
              ],
            },
          ],
        }),
      });
    } catch (fetchError) {
      console.error("Fetch error calling AI Gateway:", fetchError);
      await updateImportStatus(supabase, importId, "failed", {
        error_message: "Erro de conexão com IA",
      });
      return new Response(JSON.stringify({ error: "Erro de conexão com IA" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("AI Gateway response status:", response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI Gateway error:", response.status, errorText);

      const errorMessages: Record<number, string> = {
        429: "Limite de requisições excedido. Tente novamente mais tarde.",
        402: "Créditos de IA insuficientes.",
      };

      const msg = errorMessages[response.status] || "Erro ao processar com IA";
      await updateImportStatus(supabase, importId, "failed", { error_message: msg });
      
      return new Response(JSON.stringify({ error: msg }), {
        status: response.status >= 400 && response.status < 500 ? response.status : 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    console.log("AI response received, content length:", content?.length || 0);

    if (!content) {
      await updateImportStatus(supabase, importId, "failed", {
        error_message: "IA não retornou conteúdo",
      });
      return new Response(JSON.stringify({ error: "IA não retornou conteúdo" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse the JSON from AI response
    let parsedJson;
    try {
      parsedJson = parseJsonFromResponse(content);
    } catch (parseError) {
      console.error("JSON parse error:", parseError, "Content:", content.substring(0, 500));
      await updateImportStatus(supabase, importId, "failed", {
        error_message: "Erro ao interpretar resposta da IA",
        extracted_text: content,
      });
      return new Response(JSON.stringify({ error: "Erro ao interpretar resposta da IA" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Success
    await updateImportStatus(supabase, importId, "done", {
      parsed_json: parsedJson,
      extracted_text: content,
    });

    console.log("Import completed successfully");

    return new Response(JSON.stringify({ 
      success: true, 
      data: parsedJson 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Error in parse-proposal-pdf:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Erro interno" 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
