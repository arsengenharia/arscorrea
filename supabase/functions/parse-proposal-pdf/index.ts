import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { encodeBase64 } from "https://deno.land/std@0.168.0/encoding/base64.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// System prompt for the AI parser (text -> JSON)
const PARSER_SYSTEM_PROMPT = `Você é um especialista em análise de propostas de engenharia para reforma de fachadas (obras prediais).
Sua tarefa é extrair dados estruturados de textos de propostas comerciais.

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

// OCR prompt - extract text only
const OCR_SYSTEM_PROMPT = `Você é um sistema de OCR. Extraia TODO o texto visível deste documento PDF.
Retorne APENAS o texto extraído, sem formatação especial, sem markdown, sem comentários.
Mantenha a estrutura original (quebras de linha, tabelas como texto).
Se houver tabelas, formate como texto tabulado.`;

const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15MB
const MAX_PAGES = 10;
const MIN_TEXT_LENGTH = 300; // Minimum chars to consider native extraction successful

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

// Helper to call AI Gateway
async function callAI(
  apiKey: string,
  messages: Array<{ role: string; content: unknown }>,
  model = "google/gemini-3-flash-preview"
): Promise<{ success: boolean; content?: string; error?: string; status?: number }> {
  try {
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ model, messages }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI Gateway error:", response.status, errorText);
      return { success: false, error: errorText, status: response.status };
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    if (!content) {
      return { success: false, error: "AI não retornou conteúdo" };
    }

    return { success: true, content };
  } catch (error) {
    console.error("AI call error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Erro desconhecido" };
  }
}

// Parse JSON from AI response (handles markdown code blocks)
function parseJsonFromResponse(content: string): unknown {
  let jsonStr = content.trim();
  
  // Try to extract JSON from markdown code blocks
  const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    jsonStr = jsonMatch[1].trim();
  }
  
  return JSON.parse(jsonStr);
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // 1. Validate auth header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      console.error("Missing or invalid Authorization header");
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Get environment variables
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    console.log("Environment check - URL exists:", !!SUPABASE_URL);
    console.log("Environment check - ANON_KEY exists:", !!SUPABASE_ANON_KEY);
    console.log("Environment check - LOVABLE_API_KEY exists:", !!LOVABLE_API_KEY);

    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY não configurada");
      throw new Error("LOVABLE_API_KEY não configurada");
    }

    // 3. Create Supabase client with user's auth token
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    // 4. Validate the user
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !userData?.user) {
      console.error("Auth error:", authError?.message || "No user found");
      return new Response(JSON.stringify({ error: "Usuário não autenticado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = userData.user.id;
    console.log("Authenticated user:", userId);

    // 5. Parse request body
    const { importId } = await req.json();

    if (!importId) {
      return new Response(JSON.stringify({ error: "importId é obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 6. Fetch import record (RLS ensures user owns it)
    const { data: importRecord, error: importError } = await supabase
      .from("proposal_imports")
      .select("*")
      .eq("id", importId)
      .single();

    if (importError || !importRecord) {
      console.error("Import not found:", importError);
      return new Response(JSON.stringify({ error: "Import não encontrado" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify ownership (extra check beyond RLS)
    if (importRecord.created_by !== userId) {
      console.error("User doesn't own this import");
      return new Response(JSON.stringify({ error: "Acesso negado" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 7. Update status to extracting
    await updateImportStatus(supabase, importId, "extracting");

    // 8. Download PDF from storage
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

    // 9. Get array buffer and validate size BEFORE any heavy operations
    const arrayBuffer = await fileData.arrayBuffer();
    const fileSize = arrayBuffer.byteLength;
    console.log("PDF size:", fileSize, "bytes");

    if (fileSize > MAX_FILE_SIZE) {
      await updateImportStatus(supabase, importId, "failed", {
        error_message: `PDF muito grande: ${Math.round(fileSize / 1024 / 1024)}MB (máximo ${MAX_FILE_SIZE / 1024 / 1024}MB)`,
      });
      return new Response(JSON.stringify({ 
        error: `PDF muito grande (máximo ${MAX_FILE_SIZE / 1024 / 1024}MB)` 
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 10. Convert to base64 using safe method (no stack overflow)
    console.log("Converting to base64...");
    const base64 = encodeBase64(new Uint8Array(arrayBuffer));
    console.log("Base64 length:", base64.length);

    // 11. Try native text extraction first (placeholder - will use OCR for now)
    // In a full implementation, we'd use a PDF parsing library here
    // For now, we'll use the AI for OCR when needed
    let extractedText = "";
    
    // 12. Since we can't easily extract native text in edge runtime,
    // we'll use the AI to do OCR first, then parse
    console.log("Performing OCR extraction...");
    
    const ocrResult = await callAI(LOVABLE_API_KEY, [
      { role: "system", content: OCR_SYSTEM_PROMPT },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `Extraia todo o texto deste documento PDF (máximo ${MAX_PAGES} páginas). Se o documento tiver mais de ${MAX_PAGES} páginas, extraia apenas as primeiras ${MAX_PAGES}.`,
          },
          {
            type: "image_url",
            image_url: {
              url: `data:application/pdf;base64,${base64}`,
            },
          },
        ],
      },
    ]);

    if (!ocrResult.success) {
      // Handle rate limits
      if (ocrResult.status === 429) {
        await updateImportStatus(supabase, importId, "failed", {
          error_message: "Limite de requisições excedido. Tente novamente mais tarde.",
        });
        return new Response(JSON.stringify({ error: "Limite de requisições excedido" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (ocrResult.status === 402) {
        await updateImportStatus(supabase, importId, "failed", {
          error_message: "Créditos de IA insuficientes.",
        });
        return new Response(JSON.stringify({ error: "Créditos de IA insuficientes" }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      await updateImportStatus(supabase, importId, "failed", {
        error_message: "Erro ao extrair texto do PDF",
      });
      return new Response(JSON.stringify({ error: "Erro ao extrair texto do PDF" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    extractedText = ocrResult.content || "";
    console.log("Extracted text length:", extractedText.length);

    // Check if we got enough text
    if (extractedText.length < MIN_TEXT_LENGTH) {
      console.warn("Extracted text too short, may be a scanned document with issues");
    }

    // 13. Update status to parsing and save extracted text
    await updateImportStatus(supabase, importId, "parsing", {
      extracted_text: extractedText,
    });

    // 14. Parse extracted text to JSON
    console.log("Parsing text to JSON...");
    const parseResult = await callAI(LOVABLE_API_KEY, [
      { role: "system", content: PARSER_SYSTEM_PROMPT },
      {
        role: "user",
        content: `Analise este texto de proposta comercial de engenharia e extraia os dados estruturados conforme o schema especificado. Retorne APENAS o JSON.\n\n--- TEXTO DA PROPOSTA ---\n${extractedText}`,
      },
    ]);

    if (!parseResult.success) {
      if (parseResult.status === 429) {
        await updateImportStatus(supabase, importId, "failed", {
          error_message: "Limite de requisições excedido. Tente novamente mais tarde.",
        });
        return new Response(JSON.stringify({ error: "Limite de requisições excedido" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (parseResult.status === 402) {
        await updateImportStatus(supabase, importId, "failed", {
          error_message: "Créditos de IA insuficientes.",
        });
        return new Response(JSON.stringify({ error: "Créditos de IA insuficientes" }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      await updateImportStatus(supabase, importId, "failed", {
        error_message: "Erro ao processar com IA",
      });
      return new Response(JSON.stringify({ error: "Erro ao processar com IA" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 15. Parse the JSON from AI response
    let parsedJson;
    try {
      parsedJson = parseJsonFromResponse(parseResult.content!);
    } catch (parseError) {
      console.error("JSON parse error:", parseError, "Content:", parseResult.content);
      await updateImportStatus(supabase, importId, "failed", {
        error_message: "Erro ao interpretar resposta da IA",
        extracted_text: extractedText, // Keep for debugging
      });
      return new Response(JSON.stringify({ error: "Erro ao interpretar resposta da IA" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 16. Update import record with success
    await updateImportStatus(supabase, importId, "done", {
      parsed_json: parsedJson,
      extracted_text: extractedText,
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
