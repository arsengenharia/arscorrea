import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/components/auth/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function Auth() {
  const { signIn } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);

    try {
      await signIn(email, password);
    } catch (error) {
      // Error is already handled in the signIn function
    } finally {
      setIsLoading(false);
    }
  }

  // Create admin user if it doesn't exist yet
  async function createAdminUser() {
    try {
      setIsLoading(true);
      const { data, error } = await supabase.auth.signUp({
        email: "admin@arsengenharia.com",
        password: "ARSEngenharia01",
      });
      
      if (error) {
        toast.error("Erro ao criar usuário admin: " + error.message);
      } else {
        toast.success("Usuário admin criado com sucesso!");
        // Auto-fill the form with admin credentials
        setEmail("admin@arsengenharia.com");
        setPassword("ARSEngenharia01");
      }
    } catch (error: any) {
      toast.error("Erro: " + error.message);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="flex flex-col items-center gap-2">
          <img
            src="/lovable-uploads/ars-correa-logo.png"
            alt="ARS Engenharia e Consultoria Estratégica"
            className="h-24"
          />
        </div>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Senha</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? "Carregando..." : "Entrar"}
          </Button>
        </form>
        
        <div className="text-center text-sm text-muted-foreground">
          <Button 
            variant="link" 
            size="sm" 
            onClick={createAdminUser}
            disabled={isLoading}
            className="text-xs text-muted-foreground"
          >
            Criar usuário admin (somente para desenvolvimento)
          </Button>
        </div>
      </div>
    </div>
  );
}
