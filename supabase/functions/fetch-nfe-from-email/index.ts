import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

  const { ImapFlow } = await import("npm:imapflow@1.0.162");
  const client = new ImapFlow({
    host: Deno.env.get("IMAP_HOST") || "imap.hostinger.com",
    port: Number(Deno.env.get("IMAP_PORT") || "993"),
    secure: true,
    auth: {
      user: Deno.env.get("IMAP_USER") || "nfe@ars.eng.br",
      pass: Deno.env.get("IMAP_PASS")!,
    },
    logger: false,
  });

  let processed = 0;
  let errors = 0;

  try {
    await client.connect();
    const lock = await client.getMailboxLock("INBOX");

    try {
      for await (const msg of client.fetch({ seen: false }, { uid: true, envelope: true, bodyStructure: true })) {
        try {
          const from = msg.envelope?.from?.[0]?.address ?? "unknown";
          const subject = msg.envelope?.subject ?? "";
          const dateReceived = msg.envelope?.date?.toISOString() ?? new Date().toISOString();

          const attachments = findAttachments(msg.bodyStructure);

          for (const att of attachments) {
            const isXml = att.type.includes("xml") || att.filename?.toLowerCase().endsWith(".xml");
            const isPdf = att.type.includes("pdf") || att.filename?.toLowerCase().endsWith(".pdf");
            if (!isXml && !isPdf) continue;

            const { content } = await client.download(String(msg.uid), att.part, { uid: true });
            const chunks: Uint8Array[] = [];
            for await (const chunk of content) chunks.push(chunk);
            const fileBytes = concatArrays(chunks);
            if (fileBytes.length === 0) continue;

            const safeName = (att.filename || `att-${Date.now()}`).replace(/[^a-zA-Z0-9._-]/g, "_");
            const filePath = `inbox/${Date.now()}-${safeName}`;

            const { error: upErr } = await supabase.storage
              .from("nfe-attachments")
              .upload(filePath, fileBytes, { contentType: isXml ? "application/xml" : "application/pdf" });

            if (upErr) { console.error("Upload:", upErr.message); errors++; continue; }

            const { error: insErr } = await supabase.from("nfe_inbox").insert({
              status: "recebido",
              origem: "email",
              arquivo_path: filePath,
              arquivo_tipo: isXml ? "xml" : "pdf",
              email_remetente: from,
              email_assunto: subject,
              email_recebido_em: dateReceived,
            });

            if (insErr) { console.error("Insert:", insErr.message); errors++; }
            else processed++;
          }

          await client.messageFlagsAdd(String(msg.uid), ["\\Seen"], { uid: true });
        } catch (msgErr) { console.error("Msg error:", msgErr); errors++; }
      }
    } finally { lock.release(); }

    await client.logout();
  } catch (err) {
    console.error("IMAP error:", err);
    return new Response(JSON.stringify({ error: String(err), processed, errors }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ processed, errors }), {
    status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});

interface AttInfo { part: string; filename: string | null; type: string; }

function findAttachments(structure: any, prefix = ""): AttInfo[] {
  if (!structure) return [];
  if (structure.childNodes) {
    return structure.childNodes.flatMap((child: any, i: number) =>
      findAttachments(child, prefix ? `${prefix}.${i + 1}` : `${i + 1}`)
    );
  }
  const filename = structure.dispositionParameters?.filename || structure.parameters?.name || null;
  const type = `${structure.type || "application"}/${structure.subtype || "octet-stream"}`.toLowerCase();
  if (structure.disposition === "attachment" || filename?.match(/\.(xml|pdf)$/i) || type.includes("xml")) {
    return [{ part: prefix || "1", filename, type }];
  }
  return [];
}

function concatArrays(arrays: Uint8Array[]): Uint8Array {
  const len = arrays.reduce((s, a) => s + a.length, 0);
  const r = new Uint8Array(len);
  let off = 0;
  for (const a of arrays) { r.set(a, off); off += a.length; }
  return r;
}
