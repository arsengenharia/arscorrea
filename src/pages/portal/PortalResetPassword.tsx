import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Eye, EyeOff, Lock, CheckCircle } from "lucide-react";

export default function PortalResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [success, setSuccess] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);

  useEffect(() => {
    // Supabase automatically picks up the recovery token from the URL hash
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setSessionReady(true);
      }
      if (event === "SIGNED_IN") {
        setSessionReady(true);
      }
    });

    // Check if already in a session (e.g. token already processed)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setSessionReady(true);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password.length < 6) {
      toast.error("A senha deve ter pelo menos 6 caracteres");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("As senhas não coincidem");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });

      if (error) throw error;

      setSuccess(true);
      toast.success("Senha definida com sucesso!");
    } catch (error: any) {
      toast.error(error.message || "Erro ao definir senha");
    } finally {
      setLoading(false);
    }
  };

  const handleGoToPortal = () => {
    navigate("/portal");
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <img
            src="/lovable-uploads/ars-correa-logo.png"
            alt="ARS Correa"
            className="h-12 w-auto mx-auto mb-4"
          />
          <h1 className="text-2xl font-bold text-slate-800">Portal do Cliente</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Defina sua senha de acesso
          </p>
        </div>

        <Card className="border-slate-200 shadow-lg">
          {success ? (
            <CardContent className="pt-6">
              <div className="text-center space-y-4 py-4">
                <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
                <h2 className="text-xl font-semibold text-slate-800">
                  Senha definida com sucesso!
                </h2>
                <p className="text-muted-foreground">
                  Agora você pode acessar o portal para acompanhar sua obra.
                </p>
                <Button onClick={handleGoToPortal} className="w-full mt-4">
                  Acessar Portal
                </Button>
              </div>
            </CardContent>
          ) : (
            <>
              <CardHeader className="pb-4">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Lock className="h-5 w-5" />
                  Definir Senha
                </CardTitle>
                <CardDescription>
                  {sessionReady
                    ? "Crie uma senha para acessar o portal"
                    : "Processando link de acesso..."}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleResetPassword} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="password">Nova senha</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Mínimo 6 caracteres"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        minLength={6}
                        disabled={!sessionReady}
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

                  <div className="space-y-2">
                    <Label htmlFor="confirm-password">Confirmar senha</Label>
                    <Input
                      id="confirm-password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Repita a senha"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      minLength={6}
                      disabled={!sessionReady}
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={loading || !sessionReady}
                  >
                    {loading ? "Salvando..." : "Definir Senha"}
                  </Button>
                </form>
              </CardContent>
            </>
          )}
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          Caso tenha problemas, entre em contato com o administrador da obra.
        </p>
      </div>
    </div>
  );
}
