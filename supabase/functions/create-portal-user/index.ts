import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function sendInviteEmail(
  email: string,
  projectName: string,
  isNewUser: boolean,
  recoveryLink?: string
) {
  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  if (!resendApiKey) {
    console.error("RESEND_API_KEY not configured");
    return;
  }

  const portalUrl = "https://arscorrea.lovable.app/portal";

  const newUserHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #1e293b; font-size: 24px; margin: 0;">ARS Correa</h1>
        <p style="color: #64748b; font-size: 14px;">Portal do Cliente</p>
      </div>
      
      <div style="background: #f8fafc; border-radius: 12px; padding: 30px; margin-bottom: 20px;">
        <h2 style="color: #1e293b; font-size: 20px; margin-top: 0;">Bem-vindo ao Portal!</h2>
        <p style="color: #475569; line-height: 1.6;">
          Você recebeu acesso para acompanhar o andamento da obra:
        </p>
        <div style="background: #e2e8f0; border-radius: 8px; padding: 15px; margin: 15px 0;">
          <strong style="color: #1e293b; font-size: 16px;">${projectName}</strong>
        </div>
        
        <p style="color: #475569; line-height: 1.6;">
          Para acessar o portal, primeiro defina sua senha clicando no botão abaixo:
        </p>
        
        <div style="text-align: center; margin: 25px 0;">
          <a href="${recoveryLink || portalUrl}" 
             style="background: #7c3aed; color: white; padding: 12px 30px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">
            Definir Senha e Acessar
          </a>
        </div>
        
        <p style="color: #94a3b8; font-size: 13px;">
          Após definir sua senha, acesse o portal em: <a href="${portalUrl}" style="color: #7c3aed;">${portalUrl}</a>
        </p>
      </div>
      
      <div style="text-align: center; color: #94a3b8; font-size: 12px; padding-top: 20px; border-top: 1px solid #e2e8f0;">
        <p>ARS Correa — Gestão de Obras</p>
      </div>
    </div>
  `;

  const existingUserHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #1e293b; font-size: 24px; margin: 0;">ARS Correa</h1>
        <p style="color: #64748b; font-size: 14px;">Portal do Cliente</p>
      </div>
      
      <div style="background: #f8fafc; border-radius: 12px; padding: 30px; margin-bottom: 20px;">
        <h2 style="color: #1e293b; font-size: 20px; margin-top: 0;">Nova obra compartilhada!</h2>
        <p style="color: #475569; line-height: 1.6;">
          Você recebeu acesso a uma nova obra no portal:
        </p>
        <div style="background: #e2e8f0; border-radius: 8px; padding: 15px; margin: 15px 0;">
          <strong style="color: #1e293b; font-size: 16px;">${projectName}</strong>
        </div>
        
        <div style="text-align: center; margin: 25px 0;">
          <a href="${portalUrl}" 
             style="background: #7c3aed; color: white; padding: 12px 30px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">
            Acessar Portal
          </a>
        </div>
      </div>
      
      <div style="text-align: center; color: #94a3b8; font-size: 12px; padding-top: 20px; border-top: 1px solid #e2e8f0;">
        <p>ARS Correa — Gestão de Obras</p>
      </div>
    </div>
  `;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "ARS Correa <portal@mail.arscorrea.app.br>",
        to: [email],
        subject: isNewUser
          ? "Convite - Portal ARS Correa"
          : `Nova obra compartilhada - ${projectName}`,
        html: isNewUser ? newUserHtml : existingUserHtml,
      }),
    });

    const result = await res.json();
    if (!res.ok) {
      console.error("Resend error:", JSON.stringify(result));
    } else {
      console.log("Email sent successfully:", result.id);
    }
  } catch (err) {
    console.error("Failed to send email:", err);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
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

    // Fetch project name for email
    const { data: projectData } = await adminClient
      .from("projects")
      .select("name")
      .eq("id", project_id)
      .single();

    const projectName = projectData?.name || "Obra";

    // Check if user already exists
    const { data: existingUsers } = await adminClient.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(
      (u) => u.email?.toLowerCase() === email.toLowerCase()
    );

    let portalUserId: string;
    let recoveryLink: string | undefined;

    if (existingUser) {
      portalUserId = existingUser.id;
    } else {
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

    // Generate recovery link for new users
    if (!existingUser) {
      const { data: linkData } = await adminClient.auth.admin.generateLink({
        type: "recovery",
        email,
      });
      if (linkData?.properties?.action_link) {
        recoveryLink = linkData.properties.action_link;
      }
    }

    // Send invite email
    await sendInviteEmail(email, projectName, !existingUser, recoveryLink);

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
    console.error("Edge function error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Erro interno" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
