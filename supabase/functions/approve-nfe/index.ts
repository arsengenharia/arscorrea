import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const { nfe_inbox_id, project_id, bank_account_id, categoria_codigo, observacoes } = await req.json();
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  const { data: inbox } = await supabase.from("nfe_inbox").select("*").eq("id", nfe_inbox_id).single();
  if (!inbox) return new Response(JSON.stringify({ error: "NF-e nao encontrada" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  if (inbox.status !== "aguardando_revisao") return new Response(JSON.stringify({ error: `Status: ${inbox.status}` }), { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  const { data: cat } = await supabase.from("financial_categories").select("id").eq("codigo", categoria_codigo).single();
  if (!cat) return new Response(JSON.stringify({ error: "Categoria nao encontrada" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  let bankId = bank_account_id;
  if (!bankId) {
    const { data: proj } = await supabase.from("projects").select("bank_account_id").eq("id", project_id).single();
    bankId = proj?.bank_account_id;
  }
  if (!bankId) return new Response(JSON.stringify({ error: "Selecione conta bancaria" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  const authH = req.headers.get("Authorization") ?? "";
  const { data: { user } } = await supabase.auth.getUser(authH.replace("Bearer ", ""));

  const { data: entry, error: eErr } = await supabase.from("project_financial_entries").insert({
    project_id, bank_account_id: bankId, category_id: cat.id, supplier_id: inbox.supplier_id,
    data: inbox.data_emissao, valor: -(Math.abs(inbox.valor_total)), tipo_documento: "NF-e",
    numero_documento: inbox.numero_nota, nota_fiscal: inbox.numero_nota, chave_nfe: inbox.chave_nfe,
    arquivo_url: inbox.arquivo_path, situacao: "pendente",
    observacoes: observacoes || `NF-e ${inbox.numero_nota} — ${inbox.razao_social}`, created_by: user?.id,
  } as any).select().single();

  if (eErr) return new Response(JSON.stringify({ error: eErr.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  await supabase.from("nfe_inbox").update({
    status: "aprovado", project_id_selecionado: project_id, bank_account_id_selecionado: bankId,
    categoria_final: categoria_codigo, financial_entry_id: entry.id,
    revisado_por: user?.id, revisado_em: new Date().toISOString(),
  }).eq("id", nfe_inbox_id);

  if (inbox.supplier_id && cat.id) {
    await supabase.from("suppliers").update({ categoria_padrao_id: cat.id } as any)
      .eq("id", inbox.supplier_id).is("categoria_padrao_id", null);
  }

  // 7. Create normalized nfe_items from itens_json
  if (inbox.itens_json && Array.isArray(inbox.itens_json)) {
    const itemRows = inbox.itens_json.map((item: any) => ({
      nfe_inbox_id: nfe_inbox_id,
      financial_entry_id: entry.id,
      descricao_original: item.xProd || "",
      ncm: item.NCM || null,
      cfop: item.CFOP || null,
      quantidade: item.qCom || 1,
      unidade: item.uCom || null,
      valor_unitario: item.vUnCom || null,
      valor_total: item.vProd || 0,
      project_id: project_id,
      supplier_id: inbox.supplier_id,
    }));

    if (itemRows.length > 0) {
      const { error: itemsErr } = await supabase
        .from("nfe_items")
        .insert(itemRows);

      if (itemsErr) {
        console.error("Error creating nfe_items:", itemsErr.message);
        // Don't fail the approval — items are secondary
      }

      // Auto-link items to catalog by NCM
      for (const row of itemRows) {
        if (row.ncm) {
          const { data: catalogMatch } = await supabase
            .from("item_catalog")
            .select("id, nome_padrao, categoria")
            .eq("ncm", row.ncm)
            .limit(1)
            .maybeSingle();

          if (catalogMatch) {
            await supabase.from("nfe_items")
              .update({
                item_catalog_id: catalogMatch.id,
                nome_padronizado: catalogMatch.nome_padrao,
                categoria_item: catalogMatch.categoria,
              })
              .eq("nfe_inbox_id", nfe_inbox_id)
              .eq("ncm", row.ncm);
          }
        }
      }
    }
  }

  await supabase.rpc("calc_project_balance", { p_project_id: project_id });

  return new Response(JSON.stringify({ entry_id: entry.id }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
});
