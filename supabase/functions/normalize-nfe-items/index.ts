import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Anthropic from "npm:@anthropic-ai/sdk";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  let normalized = 0;
  let catalogCreated = 0;
  let errors = 0;

  try {
    // 1. Fetch unnormalized items (no item_catalog_id)
    const { data: items } = await supabase
      .from("nfe_items")
      .select("id, descricao_original, ncm, unidade, valor_unitario")
      .is("item_catalog_id", null)
      .limit(100);

    if (!items || items.length === 0) {
      return new Response(JSON.stringify({ normalized: 0, message: "Nenhum item para normalizar" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Group by NCM
    const ncmGroups = new Map<string, typeof items>();
    for (const item of items) {
      const ncm = item.ncm || "SEM_NCM";
      if (!ncmGroups.has(ncm)) ncmGroups.set(ncm, []);
      ncmGroups.get(ncm)!.push(item);
    }

    // 3. For each NCM group
    for (const [ncm, groupItems] of ncmGroups) {
      if (ncm === "SEM_NCM") continue;

      // Check existing catalog
      const { data: existing } = await supabase
        .from("item_catalog")
        .select("id, nome_padrao, categoria")
        .eq("ncm", ncm)
        .limit(1)
        .maybeSingle();

      let catalogId: string;
      let nomePadrao: string;
      let categoria: string;

      if (existing) {
        // Already in catalog — just link
        catalogId = existing.id;
        nomePadrao = existing.nome_padrao;
        categoria = existing.categoria;
      } else {
        // Use AI to suggest standardized name
        const sampleDescs = groupItems.map(i => i.descricao_original).slice(0, 5).join("; ");
        const sampleUnit = groupItems[0]?.unidade || "";

        let aiResult = { nome_padrao: sampleDescs.split(";")[0].trim(), categoria: "Materiais", unidade_padrao: sampleUnit };

        const aiKey = Deno.env.get("ANTHROPIC_API_KEY");
        if (aiKey) {
          try {
            const ai = new Anthropic({ apiKey: aiKey });
            const resp = await ai.messages.create({
              model: "claude-sonnet-4-6",
              max_tokens: 200,
              messages: [{
                role: "user",
                content: `Voce padroniza nomes de materiais de construcao civil.\n\nNCM: ${ncm}\nDescricoes encontradas em NF-e: ${sampleDescs}\nUnidade: ${sampleUnit}\n\nResponda APENAS com JSON:\n{"nome_padrao":"nome padronizado curto","categoria":"uma de: Cimento, Agregados, Alvenaria, Ferragem, Madeira, Hidraulica, Eletrica, Pintura, Impermeabilizacao, Argamassa, Acabamento, Equipamento, EPI, Outros","unidade_padrao":"kg ou m ou m2 ou m3 ou un ou l"}`
              }],
            });
            const txt = resp.content[0].type === "text" ? resp.content[0].text : "{}";
            const parsed = JSON.parse(txt);
            if (parsed.nome_padrao) aiResult = parsed;

            // Log AI query
            await supabase.from("ai_query_log").insert({
              module: "item_normalization",
              prompt: `NCM: ${ncm}, Descs: ${sampleDescs}`,
              response: txt,
              model: "claude-sonnet-4-6",
              context_type: "ncm",
              context_id: null,
              success: true,
            });
          } catch (aiErr) {
            console.error("AI error for NCM", ncm, aiErr);
            await supabase.from("ai_query_log").insert({
              module: "item_normalization",
              prompt: `NCM: ${ncm}`,
              response: null,
              model: "claude-sonnet-4-6",
              success: false,
              error_message: String(aiErr),
            });
          }
        }

        // Create catalog entry
        const { data: newCatalog, error: catErr } = await supabase
          .from("item_catalog")
          .insert({
            ncm,
            nome_padrao: aiResult.nome_padrao,
            unidade_padrao: aiResult.unidade_padrao || sampleUnit || null,
            categoria: aiResult.categoria || "Outros",
          })
          .select("id")
          .single();

        if (catErr) {
          console.error("Catalog insert error:", catErr.message);
          errors++;
          continue;
        }

        catalogId = newCatalog.id;
        nomePadrao = aiResult.nome_padrao;
        categoria = aiResult.categoria || "Outros";
        catalogCreated++;
      }

      // 4. Link all items in this NCM group to the catalog
      const itemIds = groupItems.map(i => i.id);
      const { error: linkErr } = await supabase
        .from("nfe_items")
        .update({
          item_catalog_id: catalogId,
          nome_padronizado: nomePadrao,
          categoria_item: categoria,
        })
        .in("id", itemIds);

      if (linkErr) {
        console.error("Link error:", linkErr.message);
        errors++;
      } else {
        normalized += itemIds.length;
      }
    }

    return new Response(JSON.stringify({ normalized, catalogCreated, errors }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
