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

export default function ProjectCosts() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ cost_type: "Direto", description: "", expected_value: "", actual_value: "", record_date: "" });

  const { data: costs, isLoading } = useQuery({
    queryKey: ["project-costs", projectId],
    queryFn: async () => {
      const { data, error } = await supabase.from("project_costs").select("*").eq("project_id", projectId!).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("project_costs").insert({
        project_id: projectId!,
        cost_type: form.cost_type,
        description: form.description || null,
        expected_value: Number(form.expected_value) || 0,
        actual_value: Number(form.actual_value) || 0,
        record_date: form.record_date || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Custo adicionado!");
      queryClient.invalidateQueries({ queryKey: ["project-costs", projectId] });
      setOpen(false);
      setForm({ cost_type: "Direto", description: "", expected_value: "", actual_value: "", record_date: "" });
    },
    onError: () => toast.error("Erro ao adicionar custo"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("project_costs").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Custo removido!");
      queryClient.invalidateQueries({ queryKey: ["project-costs", projectId] });
    },
    onError: () => toast.error("Erro ao remover custo"),
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
            <h2 className="text-3xl font-bold tracking-tight">Custos da Obra</h2>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="w-4 h-4 mr-2" />Adicionar Custo</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Novo Custo</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Tipo</Label>
                  <Select value={form.cost_type} onValueChange={(v) => setForm({ ...form, cost_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Direto">Direto</SelectItem>
                      <SelectItem value="Indireto">Indireto</SelectItem>
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
              {(costs || []).map((c) => (
                <TableRow key={c.id}>
                  <TableCell>{c.cost_type}</TableCell>
                  <TableCell>{c.description}</TableCell>
                  <TableCell>{fmt(Number(c.expected_value))}</TableCell>
                  <TableCell>{fmt(Number(c.actual_value))}</TableCell>
                  <TableCell>{c.record_date}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(c.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                  </TableCell>
                </TableRow>
              ))}
              {(!costs || costs.length === 0) && (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">Nenhum custo cadastrado</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </div>
    </Layout>
  );
}
