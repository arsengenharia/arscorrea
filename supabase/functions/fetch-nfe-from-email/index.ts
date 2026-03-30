import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// This edge function proxies to the IMAP fetcher running on EC2
// because Supabase Edge Functions don't support TCP sockets (IMAP)

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const EC2_FETCHER_URL = "http://18.228.154.111:8090/sync";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const resp = await fetch(EC2_FETCHER_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });

    const data = await resp.json();

    return new Response(JSON.stringify(data), {
      status: resp.ok ? 200 : 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({
      error: "Serviço de email não disponível. Verifique se o servidor está rodando.",
      processed: 0,
      errors: 1,
    }), {
      status: 503,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
