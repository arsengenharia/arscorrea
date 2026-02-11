import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Eye, EyeOff, LogIn, ArrowLeft, Mail } from "lucide-react";

export default function PortalLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [forgotMode, setForgotMode] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      // Check if user has admin or client role
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", data.user.id)
        .in("role", ["admin", "client"])
        .maybeSingle();

      if (!roleData) {
        await supabase.auth.signOut();
        toast.error("Acesso não autorizado ao portal do cliente.");
        return;
      }

      // Admin always goes to project list
      if (roleData.role === "admin") {
        navigate("/portal/obras");
        return;
      }

      // Client: check portal access
      const { data: accessData } = await supabase
        .from("client_portal_access")
        .select("project_id")
        .eq("user_id", data.user.id);

      if (accessData && accessData.length === 1) {
        navigate(`/portal/obra/${accessData[0].project_id}`);
      } else if (accessData && accessData.length > 1) {
        navigate("/portal/obras");
      } else {
        toast.error("Nenhuma obra vinculada ao seu acesso.");
        await supabase.auth.signOut();
      }
    } catch (error: any) {
      toast.error(error.message === "Invalid login credentials" 
        ? "Email ou senha inválidos" 
        : error.message
      );
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail) {
      toast.error("Informe seu e-mail");
      return;
    }
    setForgotLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
        redirectTo: "https://arscorrea.lovable.app/portal/redefinir-senha",
      });
      if (error) throw error;
      setForgotSent(true);
      toast.success("E-mail de recuperação enviado!");
    } catch (error: any) {
      toast.error(error.message || "Erro ao enviar e-mail de recuperação");
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Logo */}
        <div className="text-center">
          <img
            src="/lovable-uploads/ars-correa-logo.png"
            alt="ARS Correa"
            className="h-12 w-auto mx-auto mb-4"
          />
          <h1 className="text-2xl font-bold text-slate-800">Portal do Cliente</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {forgotMode ? "Recupere sua senha de acesso" : "Acompanhe o andamento da sua obra"}
          </p>
        </div>

        <Card className="border-slate-200 shadow-lg">
          {forgotMode ? (
            <>
              <CardHeader className="pb-4">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Mail className="h-5 w-5" />
                  Recuperar Senha
                </CardTitle>
                <CardDescription>
                  {forgotSent
                    ? "Verifique sua caixa de entrada"
                    : "Informe o e-mail cadastrado para receber o link de recuperação"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {forgotSent ? (
                  <div className="text-center space-y-4 py-2">
                    <p className="text-sm text-muted-foreground">
                      Se o e-mail estiver cadastrado, você receberá um link para redefinir sua senha.
                    </p>
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => {
                        setForgotMode(false);
                        setForgotSent(false);
                        setForgotEmail("");
                      }}
                    >
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      Voltar ao login
                    </Button>
                  </div>
                ) : (
                  <form onSubmit={handleForgotPassword} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="forgot-email">Email</Label>
                      <Input
                        id="forgot-email"
                        type="email"
                        placeholder="seu@email.com"
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
                        required
                        autoComplete="email"
                      />
                    </div>
                    <Button type="submit" className="w-full" disabled={forgotLoading}>
                      {forgotLoading ? "Enviando..." : "Enviar link de recuperação"}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      className="w-full"
                      onClick={() => {
                        setForgotMode(false);
                        setForgotEmail("");
                      }}
                    >
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      Voltar ao login
                    </Button>
                  </form>
                )}
              </CardContent>
            </>
          ) : (
            <>
              <CardHeader className="pb-4">
                <CardTitle className="text-lg">Entrar</CardTitle>
                <CardDescription>
                  Use o email e senha fornecidos pelo administrador
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="seu@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      autoComplete="email"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password">Senha</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        autoComplete="current-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? (
                      "Entrando..."
                    ) : (
                      <>
                        <LogIn className="h-4 w-4 mr-2" />
                        Entrar
                      </>
                    )}
                  </Button>

                  <div className="text-center">
                    <button
                      type="button"
                      onClick={() => setForgotMode(true)}
                      className="text-sm text-primary hover:underline"
                    >
                      Esqueci minha senha
                    </button>
                  </div>
                </form>
              </CardContent>
            </>
          )}
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          Caso não tenha acesso, entre em contato com o administrador da obra.
        </p>
      </div>
    </div>
  );
}