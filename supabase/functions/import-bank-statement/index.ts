import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { bank_account_id, csv_content, separator = ";" } = await req.json();

    if (!bank_account_id || !csv_content) {
      return new Response(
        JSON.stringify({ error: "bank_account_id and csv_content are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Decode base64
    const decoded = atob(csv_content);
    const lines = decoded.split("\n").map((l) => l.trim()).filter((l) => l.length > 0);

    // Skip header row
    const dataLines = lines.slice(1);

    // Parse CSV rows into transaction objects
    const transactions: {
      bank_account_id: string;
      data_transacao: string;
      descricao_banco: string;
      valor: number;
      tipo_origem: string;
      status_conciliacao: string;
    }[] = [];

    for (const line of dataLines) {
      const parts = line.split(separator);
      if (parts.length < 4) continue;

      const [dateStr, descricao, valorStr, tipo] = parts.map((p) => p.trim());

      // Parse date DD/MM/YYYY → YYYY-MM-DD
      const dateParts = dateStr.split("/");
      if (dateParts.length !== 3) continue;
      const [d, m, y] = dateParts;
      const data_transacao = `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;

      // Validate date
      if (isNaN(Date.parse(data_transacao))) continue;

      // Parse Brazilian number format: remove thousand separators (.) then replace decimal comma
      const cleanVal = valorStr.replace(/\./g, "").replace(",", ".");
      const valor = parseFloat(cleanVal);

      if (isNaN(valor)) continue;

      transactions.push({
        bank_account_id,
        data_transacao,
        descricao_banco: descricao,
        valor,
        tipo_origem: tipo,
        status_conciliacao: "pendente",
      });
    }

    if (transactions.length === 0) {
      return new Response(
        JSON.stringify({ error: "No valid transactions found in CSV" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Insert all transactions
    const { data: inserted, error: insertErr } = await supabase
      .from("bank_transactions")
      .insert(transactions)
      .select();

    if (insertErr) throw insertErr;
    if (!inserted || inserted.length === 0) throw new Error("No transactions were inserted");

    // Fetch all pending entries for this bank account once (avoid N+1 for matching)
    const { data: allEntries, error: entriesErr } = await supabase
      .from("project_financial_entries")
      .select("id, valor, data")
      .eq("bank_account_id", bank_account_id)
      .eq("situacao", "pendente");

    if (entriesErr) throw entriesErr;

    const pendingEntries = allEntries || [];

    // Track which entries have already been matched to avoid duplicate links
    const matchedEntryIds = new Set<string>();

    let autoMatched = 0;

    for (const tx of inserted) {
      const txDate = new Date(tx.data_transacao);

      const candidates = pendingEntries.filter((entry) => {
        if (matchedEntryIds.has(entry.id)) return false;
        const valDiff = Math.abs(Number(entry.valor) - Number(tx.valor));
        const entryDate = new Date(entry.data);
        const dayDiff =
          Math.abs((txDate.getTime() - entryDate.getTime()) / (1000 * 60 * 60 * 24));
        return valDiff < 0.01 && dayDiff <= 1;
      });

      if (candidates.length === 1) {
        const match = candidates[0];

        // Create reconciliation record
        const { error: reconErr } = await supabase.from("bank_reconciliations").insert({
          transaction_id: tx.id,
          lancamento_id: match.id,
          tipo_match: "automatico",
        });
        if (reconErr) {
          console.error("Error creating reconciliation for tx", tx.id, reconErr);
          continue;
        }

        // Update transaction status and link lancamento
        await supabase
          .from("bank_transactions")
          .update({ status_conciliacao: "conciliado", lancamento_id: match.id })
          .eq("id", tx.id);

        // Update entry situacao
        await supabase
          .from("project_financial_entries")
          .update({ situacao: "conciliado" })
          .eq("id", match.id);

        matchedEntryIds.add(match.id);
        autoMatched++;
      }
      // 0 matches → stays pendente
      // 2+ matches → stays pendente (needs manual review)
    }

    const pending = inserted.length - autoMatched;

    // Fetch final state of transactions just imported
    const insertedIds = inserted.map((t: { id: string }) => t.id);
    const { data: finalTx } = await supabase
      .from("bank_transactions")
      .select("id, descricao_banco, valor, data_transacao, status_conciliacao")
      .in("id", insertedIds)
      .order("data_transacao", { ascending: false });

    return new Response(
      JSON.stringify({
        imported: inserted.length,
        auto_matched: autoMatched,
        pending,
        transactions: finalTx || [],
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Error:", err);
    return new Response(
      JSON.stringify({ error: (err as Error).message || "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
