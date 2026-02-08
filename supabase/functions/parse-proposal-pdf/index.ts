import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// System prompt for the AI parser
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

serve(async (req) => {
  // Handle CORS preflight
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
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY não configurada");
      throw new Error("LOVABLE_API_KEY não configurada");
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    // Create client with user's auth token
    const supabaseUser = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    // Validate the JWT using getClaims
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseUser.auth.getUser(token);
    
    if (claimsError || !claimsData?.user) {
      console.error("Auth error:", claimsError);
      return new Response(JSON.stringify({ error: "Usuário não autenticado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.user.id;
    console.log("Authenticated user:", userId);

    const { importId } = await req.json();

    if (!importId) {
      return new Response(JSON.stringify({ error: "importId é obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch import record
    const { data: importRecord, error: importError } = await supabaseAdmin
      .from("proposal_imports")
      .select("*")
      .eq("id", importId)
      .eq("created_by", userId)
      .single();

    if (importError || !importRecord) {
      return new Response(JSON.stringify({ error: "Import não encontrado" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Update status to extracting
    await supabaseAdmin
      .from("proposal_imports")
      .update({ status: "extracting" })
      .eq("id", importId);

    // Download PDF from storage
    const { data: fileData, error: downloadError } = await supabaseAdmin.storage
      .from("proposal_uploads")
      .download(importRecord.file_path);

    if (downloadError || !fileData) {
      await supabaseAdmin
        .from("proposal_imports")
        .update({ status: "failed", error_message: "Erro ao baixar PDF" })
        .eq("id", importId);

      return new Response(JSON.stringify({ error: "Erro ao baixar PDF" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Convert to base64 for AI processing
    const arrayBuffer = await fileData.arrayBuffer();
    const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));

    // Check file size (max 15MB)
    if (arrayBuffer.byteLength > 15 * 1024 * 1024) {
      await supabaseAdmin
        .from("proposal_imports")
        .update({ status: "failed", error_message: "PDF muito grande (máximo 15MB)" })
        .eq("id", importId);

      return new Response(JSON.stringify({ error: "PDF muito grande (máximo 15MB)" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Update status to parsing
    await supabaseAdmin
      .from("proposal_imports")
      .update({ status: "parsing" })
      .eq("id", importId);

    // Call Lovable AI with the PDF
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: PARSER_SYSTEM_PROMPT },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Analise este PDF de proposta comercial de engenharia e extraia os dados estruturados conforme o schema especificado. Retorne APENAS o JSON.",
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

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI Gateway error:", aiResponse.status, errorText);

      // Handle rate limits
      if (aiResponse.status === 429) {
        await supabaseAdmin
          .from("proposal_imports")
          .update({ status: "failed", error_message: "Limite de requisições excedido. Tente novamente mais tarde." })
          .eq("id", importId);

        return new Response(JSON.stringify({ error: "Limite de requisições excedido" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (aiResponse.status === 402) {
        await supabaseAdmin
          .from("proposal_imports")
          .update({ status: "failed", error_message: "Créditos de IA insuficientes." })
          .eq("id", importId);

        return new Response(JSON.stringify({ error: "Créditos de IA insuficientes" }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      await supabaseAdmin
        .from("proposal_imports")
        .update({ status: "failed", error_message: "Erro ao processar com IA" })
        .eq("id", importId);

      return new Response(JSON.stringify({ error: "Erro ao processar com IA" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content;

    if (!content) {
      await supabaseAdmin
        .from("proposal_imports")
        .update({ status: "failed", error_message: "IA não retornou conteúdo" })
        .eq("id", importId);

      return new Response(JSON.stringify({ error: "IA não retornou conteúdo" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse the JSON from AI response
    let parsedJson;
    try {
      // Try to extract JSON from markdown code blocks if present
      let jsonStr = content;
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        jsonStr = jsonMatch[1].trim();
      }
      parsedJson = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error("JSON parse error:", parseError, "Content:", content);
      await supabaseAdmin
        .from("proposal_imports")
        .update({ 
          status: "failed", 
          error_message: "Erro ao interpretar resposta da IA",
          extracted_text: content 
        })
        .eq("id", importId);

      return new Response(JSON.stringify({ error: "Erro ao interpretar resposta da IA" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Update import record with success
    await supabaseAdmin
      .from("proposal_imports")
      .update({
        status: "done",
        parsed_json: parsedJson,
        extracted_text: content,
      })
      .eq("id", importId);

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
