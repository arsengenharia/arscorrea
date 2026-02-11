import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/auth/AuthProvider";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  MessageSquare,
  Clock,
  CheckCircle2,
  Search,
  Send,
  Loader2,
  AlertTriangle,
  User,
} from "lucide-react";
import { useSignedUrl } from "@/hooks/use-signed-url";
import { toast } from "sonner";

interface PortalEventsAdminProps {
  projectId: string;
}

const statusConfig: Record<string, { label: string; icon: React.ReactNode; className: string }> = {
  aberto: { label: "Aberto", icon: <Clock className="h-3.5 w-3.5" />, className: "bg-amber-50 text-amber-700 border-amber-200" },
  em_analise: { label: "Em Análise", icon: <Search className="h-3.5 w-3.5" />, className: "bg-blue-50 text-blue-700 border-blue-200" },
  resolvido: { label: "Resolvido", icon: <CheckCircle2 className="h-3.5 w-3.5" />, className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  fechado: { label: "Fechado", icon: <CheckCircle2 className="h-3.5 w-3.5" />, className: "bg-slate-100 text-slate-600 border-slate-200" },
};

const typeConfig: Record<string, { className: string }> = {
  "Dúvida": { className: "bg-purple-50 text-purple-700" },
  "Sugestão": { className: "bg-teal-50 text-teal-700" },
  "Problema": { className: "bg-red-50 text-red-700" },
  "Solicitação": { className: "bg-indigo-50 text-indigo-700" },
};

function AdminEventPhoto({ photoPath }: { photoPath: string }) {
  const { signedUrl } = useSignedUrl("portal_events", photoPath);
  if (!signedUrl) return <div className="w-16 h-16 bg-slate-100 rounded animate-pulse" />;
  return <img src={signedUrl} alt="" className="w-16 h-16 object-cover rounded border border-slate-200" />;
}

export function PortalEventsAdmin({ projectId }: PortalEventsAdminProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [respondingTo, setRespondingTo] = useState<string | null>(null);
  const [response, setResponse] = useState("");
  const [newStatus, setNewStatus] = useState("");
  const [saving, setSaving] = useState(false);

  const { data: events, isLoading } = useQuery({
    queryKey: ["admin-portal-events", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("portal_events")
        .select("*, portal_event_photos(*)")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const handleRespond = async (eventId: string) => {
    if (!response.trim() && !newStatus) return;
    setSaving(true);

    try {
      const updates: Record<string, any> = {};
      if (response.trim()) {
        updates.admin_response = response.trim();
        updates.responded_at = new Date().toISOString();
        updates.responded_by = user?.id;
      }
      if (newStatus) {
        updates.status = newStatus;
      }

      const { error } = await supabase
        .from("portal_events")
        .update(updates)
        .eq("id", eventId);

      if (error) throw error;

      toast.success("Resposta enviada!");
      setRespondingTo(null);
      setResponse("");
      setNewStatus("");
      queryClient.invalidateQueries({ queryKey: ["admin-portal-events", projectId] });
    } catch (error: any) {
      toast.error("Erro: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return <div className="text-center py-8 text-muted-foreground animate-pulse">Carregando ocorrências...</div>;
  }

  if (!events?.length) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-40" />
        <p>Nenhuma ocorrência recebida dos clientes.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {events.map((event) => {
        const status = statusConfig[event.status] || statusConfig.aberto;
        const type = typeConfig[event.event_type] || { className: "bg-slate-100 text-slate-700" };
        const isResponding = respondingTo === event.id;

        return (
          <Card key={event.id} className="border-slate-200">
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <Badge variant="secondary" className={type.className}>{event.event_type}</Badge>
                    <Badge variant="outline" className={`${status.className} gap-1`}>
                      {status.icon}{status.label}
                    </Badge>
                  </div>
                  <h4 className="font-semibold text-slate-800">{event.title}</h4>
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                    <User className="h-3 w-3" />
                    {new Date(event.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              </div>

              <p className="text-sm text-muted-foreground whitespace-pre-line mb-3">{event.description}</p>

              {event.portal_event_photos && event.portal_event_photos.length > 0 && (
                <div className="flex gap-2 flex-wrap mb-3">
                  {event.portal_event_photos.map((photo: any) => (
                    <AdminEventPhoto key={photo.id} photoPath={photo.photo_url} />
                  ))}
                </div>
              )}

              {event.admin_response && !isResponding && (
                <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 mb-3">
                  <p className="text-xs font-medium text-blue-700 mb-1">Sua resposta:</p>
                  <p className="text-sm text-blue-900 whitespace-pre-line">{event.admin_response}</p>
                </div>
              )}

              {isResponding ? (
                <div className="space-y-3 border-t border-slate-100 pt-3">
                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-1 block">Alterar Status</label>
                    <Select value={newStatus} onValueChange={setNewStatus}>
                      <SelectTrigger className="w-48">
                        <SelectValue placeholder="Manter atual" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="aberto">Aberto</SelectItem>
                        <SelectItem value="em_analise">Em Análise</SelectItem>
                        <SelectItem value="resolvido">Resolvido</SelectItem>
                        <SelectItem value="fechado">Fechado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Textarea
                    value={response}
                    onChange={(e) => setResponse(e.target.value)}
                    placeholder="Digite sua resposta ao cliente..."
                    rows={3}
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => handleRespond(event.id)} disabled={saving}>
                      {saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Send className="w-4 h-4 mr-1" />}
                      Enviar
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => { setRespondingTo(null); setResponse(""); setNewStatus(""); }}>
                      Cancelar
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setRespondingTo(event.id);
                    setResponse(event.admin_response || "");
                  }}
                >
                  <MessageSquare className="w-4 h-4 mr-1" />
                  {event.admin_response ? "Editar Resposta" : "Responder"}
                </Button>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
