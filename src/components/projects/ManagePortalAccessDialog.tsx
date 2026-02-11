import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Users, Plus, Trash2, Loader2 } from "lucide-react";

interface ManagePortalAccessDialogProps {
  projectId: string;
  clientId: string;
}

export function ManagePortalAccessDialog({ projectId, clientId }: ManagePortalAccessDialogProps) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [creating, setCreating] = useState(false);
  const queryClient = useQueryClient();

  const { data: accessList, isLoading } = useQuery({
    queryKey: ["portal-access", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_portal_access")
        .select("*")
        .eq("project_id", projectId);

      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  const handleCreateAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setCreating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch(
        `https://qajzskxuvxsbvuyuvlnd.supabase.co/functions/v1/create-portal-user`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.access_token}`,
            apikey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFhanpza3h1dnhzYnZ1eXV2bG5kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA1NDg1NjEsImV4cCI6MjA4NjEyNDU2MX0.ZCfY08R3-_Nhy4JYd-jZaIanNLPr1be87D8Cu4Ncfos",
          },
          body: JSON.stringify({
            email: email.trim(),
            client_id: clientId,
            project_id: projectId,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Erro ao criar acesso");
      }

      toast.success(result.message);
      setEmail("");
      queryClient.invalidateQueries({ queryKey: ["portal-access", projectId] });
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setCreating(false);
    }
  };

  const handleRemoveAccess = async (accessId: string) => {
    try {
      const { error } = await supabase
        .from("client_portal_access")
        .delete()
        .eq("id", accessId);

      if (error) throw error;

      toast.success("Acesso removido");
      queryClient.invalidateQueries({ queryKey: ["portal-access", projectId] });
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="text-slate-600 hover:text-violet-600 hover:bg-violet-50 h-8 px-2 lg:px-3"
          title="Portal do Cliente"
        >
          <Users className="w-4 h-4 lg:mr-2" />
          <span className="hidden lg:inline">Portal</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Portal do Cliente</DialogTitle>
          <DialogDescription>
            Gerencie o acesso do cliente para acompanhar esta obra.
          </DialogDescription>
        </DialogHeader>

        {/* Add new access */}
        <form onSubmit={handleCreateAccess} className="flex gap-2">
          <div className="flex-1">
            <Label htmlFor="portal-email" className="sr-only">
              Email do cliente
            </Label>
            <Input
              id="portal-email"
              type="email"
              placeholder="email@cliente.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <Button type="submit" size="sm" disabled={creating} className="shrink-0">
            {creating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Plus className="h-4 w-4 mr-1" />
                Convidar
              </>
            )}
          </Button>
        </form>

        {/* Current access list */}
        <div className="space-y-2 mt-2">
          <h4 className="text-sm font-medium text-muted-foreground">Acessos ativos</h4>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Carregando...</p>
          ) : !accessList?.length ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              Nenhum acesso configurado
            </p>
          ) : (
            accessList.map((access) => (
              <div
                key={access.id}
                className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100"
              >
                <span className="text-sm text-slate-600 truncate">
                  {access.email || `${access.user_id.slice(0, 8)}...`}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveAccess(access.id)}
                  className="text-destructive hover:text-destructive hover:bg-red-50 h-7 w-7 p-0"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
