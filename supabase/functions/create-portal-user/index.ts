import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify the calling user is an admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Client with caller's token to verify admin role
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user: callerUser },
      error: callerError,
    } = await callerClient.auth.getUser();

    if (callerError || !callerUser) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if caller is admin using service role client (bypasses RLS)
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { data: roleData } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", callerUser.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) {
      return new Response(
        JSON.stringify({ error: "Apenas administradores podem criar acessos" }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Parse request body
    const { email, client_id, project_id } = await req.json();

    if (!email || !client_id || !project_id) {
      return new Response(
        JSON.stringify({ error: "email, client_id e project_id são obrigatórios" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Check if user already exists in auth
    const { data: existingUsers } = await adminClient.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(
      (u) => u.email?.toLowerCase() === email.toLowerCase()
    );

    let portalUserId: string;

    if (existingUser) {
      portalUserId = existingUser.id;
    } else {
      // Create user with a random password (client will use password reset to set theirs)
      const tempPassword = crypto.randomUUID() + "Aa1!";
      const { data: newUser, error: createError } =
        await adminClient.auth.admin.createUser({
          email,
          password: tempPassword,
          email_confirm: true,
        });

      if (createError) {
        return new Response(
          JSON.stringify({ error: `Erro ao criar usuário: ${createError.message}` }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      portalUserId = newUser.user.id;
    }

    // Ensure user has 'client' role
    await adminClient
      .from("user_roles")
      .upsert(
        { user_id: portalUserId, role: "client" },
        { onConflict: "user_id,role" }
      );

    // Create portal access record
    const { error: accessError } = await adminClient
      .from("client_portal_access")
      .upsert(
        {
          user_id: portalUserId,
          client_id,
          project_id,
          created_by: callerUser.id,
        },
        { onConflict: "user_id,project_id" }
      );

    if (accessError) {
      return new Response(
        JSON.stringify({ error: `Erro ao criar acesso: ${accessError.message}` }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Send password reset email so client can set their own password
    if (!existingUser) {
      await adminClient.auth.admin.generateLink({
        type: "recovery",
        email,
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        user_id: portalUserId,
        is_new_user: !existingUser,
        message: existingUser
          ? "Acesso concedido ao usuário existente"
          : "Usuário criado e acesso concedido. O cliente receberá um email para definir a senha.",
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message || "Erro interno" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
