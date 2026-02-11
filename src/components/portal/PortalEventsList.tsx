import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Clock, CheckCircle2, Search, AlertTriangle } from "lucide-react";
import { useSignedUrl } from "@/hooks/use-signed-url";

interface PortalEventsListProps {
  projectId: string;
}

const statusConfig: Record<string, { label: string; icon: React.ReactNode; className: string }> = {
  aberto: {
    label: "Aberto",
    icon: <Clock className="h-3.5 w-3.5" />,
    className: "bg-amber-50 text-amber-700 border-amber-200",
  },
  em_analise: {
    label: "Em Análise",
    icon: <Search className="h-3.5 w-3.5" />,
    className: "bg-blue-50 text-blue-700 border-blue-200",
  },
  resolvido: {
    label: "Resolvido",
    icon: <CheckCircle2 className="h-3.5 w-3.5" />,
    className: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  fechado: {
    label: "Fechado",
    icon: <CheckCircle2 className="h-3.5 w-3.5" />,
    className: "bg-slate-100 text-slate-600 border-slate-200",
  },
};

const typeConfig: Record<string, { className: string }> = {
  "Dúvida": { className: "bg-purple-50 text-purple-700" },
  "Sugestão": { className: "bg-teal-50 text-teal-700" },
  "Problema": { className: "bg-red-50 text-red-700" },
  "Solicitação": { className: "bg-indigo-50 text-indigo-700" },
};

function EventPhoto({ photoPath }: { photoPath: string }) {
  const { signedUrl } = useSignedUrl("portal_events", photoPath);
  if (!signedUrl) return <div className="w-16 h-16 bg-slate-100 rounded animate-pulse" />;
  return (
    <img src={signedUrl} alt="" className="w-16 h-16 object-cover rounded border border-slate-200" />
  );
}

export function PortalEventsList({ projectId }: PortalEventsListProps) {
  const { data: events, isLoading } = useQuery({
    queryKey: ["portal-events", projectId],
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

  if (isLoading) {
    return <div className="text-center py-8 text-muted-foreground animate-pulse">Carregando comunicações...</div>;
  }

  if (!events?.length) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-40" />
        <p>Nenhuma ocorrência registrada.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {events.map((event) => {
        const status = statusConfig[event.status] || statusConfig.aberto;
        const type = typeConfig[event.event_type] || { className: "bg-slate-100 text-slate-700" };

        return (
          <Card key={event.id} className="border-slate-200">
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <Badge variant="secondary" className={type.className}>
                      {event.event_type}
                    </Badge>
                    <Badge variant="outline" className={`${status.className} gap-1`}>
                      {status.icon}
                      {status.label}
                    </Badge>
                  </div>
                  <h4 className="font-semibold text-slate-800 truncate">{event.title}</h4>
                </div>
                <span className="text-xs text-muted-foreground shrink-0">
                  {new Date(event.created_at).toLocaleDateString("pt-BR")}
                </span>
              </div>

              <p className="text-sm text-muted-foreground whitespace-pre-line mb-3">
                {event.description}
              </p>

              {event.portal_event_photos && event.portal_event_photos.length > 0 && (
                <div className="flex gap-2 flex-wrap mb-3">
                  {event.portal_event_photos.map((photo: any) => (
                    <EventPhoto key={photo.id} photoPath={photo.photo_url} />
                  ))}
                </div>
              )}

              {event.admin_response && (
                <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 mt-2">
                  <p className="text-xs font-medium text-blue-700 mb-1 flex items-center gap-1">
                    <MessageSquare className="h-3 w-3" />
                    Resposta ARS Correa
                  </p>
                  <p className="text-sm text-blue-900 whitespace-pre-line">{event.admin_response}</p>
                  {event.responded_at && (
                    <p className="text-xs text-blue-500 mt-1">
                      {new Date(event.responded_at).toLocaleDateString("pt-BR")}
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
