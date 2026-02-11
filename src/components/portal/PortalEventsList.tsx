import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/auth/AuthProvider";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { MessageSquare, Clock, CheckCircle2, Search, Pencil, Trash2, X, Check, Loader2 } from "lucide-react";
import { useSignedUrl } from "@/hooks/use-signed-url";
import { PhotoLightbox } from "./PhotoLightbox";
import { toast } from "sonner";

interface PortalEventsListProps {
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

const EVENT_TYPES = [
  { value: "Dúvida", label: "Dúvida" },
  { value: "Sugestão", label: "Sugestão" },
  { value: "Problema", label: "Problema" },
  { value: "Solicitação", label: "Solicitação" },
];

function EventPhoto({ photoPath, onClick }: { photoPath: string; onClick: () => void }) {
  const { signedUrl } = useSignedUrl("portal_events", photoPath);
  if (!signedUrl) return <div className="w-16 h-16 bg-slate-100 rounded animate-pulse" />;
  return (
    <button onClick={onClick} className="cursor-pointer hover:opacity-80 transition-opacity focus:outline-none focus:ring-2 focus:ring-primary rounded">
      <img src={signedUrl} alt="" className="w-16 h-16 object-cover rounded border border-slate-200" />
    </button>
  );
}

export function PortalEventsList({ projectId }: PortalEventsListProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [lightbox, setLightbox] = useState<{ photos: string[]; index: number } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editType, setEditType] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

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

  const startEdit = (event: any) => {
    setEditingId(event.id);
    setEditTitle(event.title);
    setEditDescription(event.description);
    setEditType(event.event_type);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditTitle("");
    setEditDescription("");
    setEditType("");
  };

  const handleSaveEdit = async (eventId: string) => {
    if (!editTitle.trim() || !editDescription.trim() || !editType) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("portal_events")
        .update({ title: editTitle.trim(), description: editDescription.trim(), event_type: editType })
        .eq("id", eventId);
      if (error) throw error;
      toast.success("Ocorrência atualizada!");
      cancelEdit();
      queryClient.invalidateQueries({ queryKey: ["portal-events", projectId] });
    } catch (error: any) {
      toast.error("Erro: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      // Delete photos first
      const { error: photosError } = await supabase
        .from("portal_event_photos")
        .delete()
        .eq("event_id", deleteId);
      if (photosError) throw photosError;

      const { error } = await supabase
        .from("portal_events")
        .delete()
        .eq("id", deleteId);
      if (error) throw error;
      toast.success("Ocorrência excluída!");
      setDeleteId(null);
      queryClient.invalidateQueries({ queryKey: ["portal-events", projectId] });
    } catch (error: any) {
      toast.error("Erro: " + error.message);
    } finally {
      setDeleting(false);
    }
  };

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
    <>
      <div className="space-y-3">
        {events.map((event) => {
          const status = statusConfig[event.status] || statusConfig.aberto;
          const type = typeConfig[event.event_type] || { className: "bg-slate-100 text-slate-700" };
          const photoPaths = event.portal_event_photos?.map((p: any) => p.photo_url) || [];
          const isOwner = user?.id === event.user_id;
          const isEditing = editingId === event.id;
          const canEdit = isOwner && event.status === "aberto";

          return (
            <Card key={event.id} className="border-slate-200">
              <CardContent className="p-4">
                {isEditing ? (
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label>Tipo</Label>
                      <Select value={editType} onValueChange={setEditType}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {EVENT_TYPES.map((t) => (
                            <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Título</Label>
                      <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Descrição</Label>
                      <Textarea value={editDescription} onChange={(e) => setEditDescription(e.target.value)} rows={3} />
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => handleSaveEdit(event.id)} disabled={saving}>
                        {saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Check className="w-4 h-4 mr-1" />}
                        Salvar
                      </Button>
                      <Button size="sm" variant="ghost" onClick={cancelEdit}>Cancelar</Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <Badge variant="secondary" className={type.className}>{event.event_type}</Badge>
                          <Badge variant="outline" className={`${status.className} gap-1`}>{status.icon}{status.label}</Badge>
                        </div>
                        <h4 className="font-semibold text-slate-800 truncate">{event.title}</h4>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {canEdit && (
                          <>
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => startEdit(event)}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeleteId(event.id)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </>
                        )}
                        <span className="text-xs text-muted-foreground ml-1">
                          {new Date(event.created_at).toLocaleDateString("pt-BR")}
                        </span>
                      </div>
                    </div>

                    <p className="text-sm text-muted-foreground whitespace-pre-line mb-3">{event.description}</p>

                    {photoPaths.length > 0 && (
                      <div className="flex gap-2 flex-wrap mb-3">
                        {event.portal_event_photos!.map((photo: any, idx: number) => (
                          <EventPhoto key={photo.id} photoPath={photo.photo_url} onClick={() => setLightbox({ photos: photoPaths, index: idx })} />
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
                          <p className="text-xs text-blue-500 mt-1">{new Date(event.responded_at).toLocaleDateString("pt-BR")}</p>
                        )}
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {lightbox && (
        <PhotoLightbox photos={lightbox.photos} bucket="portal_events" initialIndex={lightbox.index} open={true} onOpenChange={(open) => { if (!open) setLightbox(null); }} />
      )}

      <AlertDialog open={!!deleteId} onOpenChange={(open) => { if (!open) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir ocorrência?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita. A ocorrência e suas fotos serão removidas permanentemente.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleting ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : null}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
