import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ChevronLeft, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { queryClient } from "@/lib/query-client";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export default function ProjectRevenues() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ revenue_type: "Contrato", description: "", expected_value: "", actual_value: "", record_date: "" });

  const { data: revenues, isLoading } = useQuery({
    queryKey: ["project-revenues", projectId],
    queryFn: async () => {
      const { data, error } = await supabase.from("project_revenues").select("*").eq("project_id", projectId!).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("project_revenues").insert({
        project_id: projectId!,
        revenue_type: form.revenue_type,
        description: form.description || null,
        expected_value: Number(form.expected_value) || 0,
        actual_value: Number(form.actual_value) || 0,
        record_date: form.record_date || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Receita adicionada!");
      queryClient.invalidateQueries({ queryKey: ["project-revenues", projectId] });
      setOpen(false);
      setForm({ revenue_type: "Contrato", description: "", expected_value: "", actual_value: "", record_date: "" });
    },
    onError: () => toast.error("Erro ao adicionar receita"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("project_revenues").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Receita removida!");
      queryClient.invalidateQueries({ queryKey: ["project-revenues", projectId] });
    },
    onError: () => toast.error("Erro ao remover receita"),
  });

  const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  return (
    <Layout>
      <div className="container mx-auto p-6">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => navigate(`/obras/${projectId}`)} className="rounded-full">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <h2 className="text-3xl font-bold tracking-tight">Receitas da Obra</h2>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="w-4 h-4 mr-2" />Adicionar Receita</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Nova Receita</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Tipo</Label>
                  <Select value={form.revenue_type} onValueChange={(v) => setForm({ ...form, revenue_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Contrato">Contrato</SelectItem>
                      <SelectItem value="Aditivo">Aditivo</SelectItem>
                      <SelectItem value="Outro">Outro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Descrição</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
                <div><Label>Valor Previsto</Label><Input type="number" step="0.01" value={form.expected_value} onChange={(e) => setForm({ ...form, expected_value: e.target.value })} /></div>
                <div><Label>Valor Realizado</Label><Input type="number" step="0.01" value={form.actual_value} onChange={(e) => setForm({ ...form, actual_value: e.target.value })} /></div>
                <div><Label>Data</Label><Input type="date" value={form.record_date} onChange={(e) => setForm({ ...form, record_date: e.target.value })} /></div>
                <Button onClick={() => createMutation.mutate()} disabled={createMutation.isPending} className="w-full">Salvar</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? <p>Carregando...</p> : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tipo</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Previsto</TableHead>
                <TableHead>Realizado</TableHead>
                <TableHead>Data</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(revenues || []).map((r) => (
                <TableRow key={r.id}>
                  <TableCell>{r.revenue_type}</TableCell>
                  <TableCell>{r.description}</TableCell>
                  <TableCell>{fmt(Number(r.expected_value))}</TableCell>
                  <TableCell>{fmt(Number(r.actual_value))}</TableCell>
                  <TableCell>{r.record_date}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(r.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                  </TableCell>
                </TableRow>
              ))}
              {(!revenues || revenues.length === 0) && (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">Nenhuma receita cadastrada</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </div>
    </Layout>
  );
}
