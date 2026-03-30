import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req) => {
  const { nfe_inbox_id } = await req.json();
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  
  await supabase.from("nfe_inbox").update({ status: "processando" }).eq("id", nfe_inbox_id);
  
  const { data: inbox } = await supabase.from("nfe_inbox").select("*").eq("id", nfe_inbox_id).single();
  if (!inbox) return new Response("not found", { status: 404 });

  const { data: fileData } = await supabase.storage.from("nfe-attachments").download(inbox.arquivo_path);
  if (!fileData) return new Response("file not found", { status: 404 });

  if (inbox.arquivo_tipo === "pdf") {
    // Simple PDF: just mark for review
    await supabase.from("nfe_inbox").update({
      status: "aguardando_revisao",
      observacao: "PDF recebido — use Digitar NF-e para adicionar dados manualmente",
    }).eq("id", nfe_inbox_id);
    return new Response(JSON.stringify({ mode: "pdf_manual" }), { headers: { "Content-Type": "application/json" } });
  }

  // XML parsing
  const { DOMParser } = await import("https://esm.sh/@xmldom/xmldom@0.8.10");
  const xmlContent = await fileData.text();
  const doc = new DOMParser().parseFromString(xmlContent, "text/xml");
  
  const getTag = (parent: any, name: string): string => {
    const el = parent?.getElementsByTagName(name)[0];
    return el?.textContent?.trim() ?? "";
  };

  const rawId = doc.getElementsByTagName("infNFe")[0]?.getAttribute("Id") ?? "";
  const chaveNfe = rawId.replace("NFe", "");
  
  // Dedup
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

  // Items
  const dets = doc.getElementsByTagName("det");
  const itens = Array.from(dets).map((d: any) => ({
    xProd: getTag(d, "xProd"),
    vProd: parseFloat(getTag(d, "vProd") || "0"),
    NCM: getTag(d, "NCM"),
    CFOP: getTag(d, "CFOP"),
    qCom: parseFloat(getTag(d, "qCom") || "1"),
    uCom: getTag(d, "uCom"),
    vUnCom: parseFloat(getTag(d, "vUnCom") || "0"),
  }));

  // Find/create supplier
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
    status: "aguardando_revisao",
    supplier_id: supplierId,
    razao_social: razaoSocial,
    cnpj,
    numero_nota: numeroNota,
    data_emissao: dataEmissao,
    valor_total: valorTotal,
    chave_nfe: chaveNfe || null,
    categoria_sugerida: "materiais_obra",
    ai_confianca: 0.5,
    itens_json: itens,
    obras_ativas_json: obras,
  }).eq("id", nfe_inbox_id);

  return new Response(JSON.stringify({ mode: "xml", items: itens.length }), { headers: { "Content-Type": "application/json" } });
});
