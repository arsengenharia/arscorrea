import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Save, Trash2 } from "lucide-react";
import { useState } from "react";

interface FinancialEntry {
  id: string;
  contract_id: string;
  type: string;
  description: string | null;
  expected_value: number | null;
  received_value: number | null;
  expected_date: string | null;
  received_date: string | null;
  status: string | null;
  notes: string | null;
}

interface FinancialListProps {
  contractId: string;
  onCommissionUpdate?: () => void;
}

export function FinancialList({ contractId, onCommissionUpdate }: FinancialListProps) {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Partial<FinancialEntry>>({});
  const [showAddForm, setShowAddForm] = useState(false);
  const [newEntry, setNewEntry] = useState({
    type: "recebimento",
    description: "",
    expected_value: 0,
    expected_date: "",
  });

  const { data: entries, isLoading } = useQuery({
    queryKey: ["contract-financial", contractId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contract_financial")
        .select("*")
        .eq("contract_id", contractId)
        .order("created_at");

      if (error) throw error;
      return data as FinancialEntry[];
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<FinancialEntry> }) => {
      const { error } = await supabase
        .from("contract_financial")
        .update(data)
        .eq("id", id);
      if (error) throw error;

      // If updating commission, sync with contracts table
      const entry = entries?.find((e) => e.id === id);
      if (entry?.type === "comissao") {
        const { data: allCommissions } = await supabase
          .from("contract_financial")
          .select("received_value")
          .eq("contract_id", contractId)
          .eq("type", "comissao");

        const totalReceived = allCommissions?.reduce(
          (sum, c) => sum + (c.received_value || 0),
          0
        ) || 0;

        await supabase
          .from("contracts")
          .update({ commission_received_value: totalReceived })
          .eq("id", contractId);

        onCommissionUpdate?.();
      }
    },
    onSuccess: () => {
      toast.success("Lançamento atualizado!");
      queryClient.invalidateQueries({ queryKey: ["contract-financial", contractId] });
      setEditingId(null);
      setEditValues({});
    },
    onError: () => {
      toast.error("Erro ao atualizar lançamento");
    },
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("contract_financial").insert({
        contract_id: contractId,
        type: newEntry.type,
        description: newEntry.description,
        expected_value: newEntry.expected_value,
        expected_date: newEntry.expected_date || null,
        status: "pendente",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Lançamento adicionado!");
      queryClient.invalidateQueries({ queryKey: ["contract-financial", contractId] });
      setShowAddForm(false);
      setNewEntry({
        type: "recebimento",
        description: "",
        expected_value: 0,
        expected_date: "",
      });
    },
    onError: () => {
      toast.error("Erro ao adicionar lançamento");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("contract_financial").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Lançamento excluído!");
      queryClient.invalidateQueries({ queryKey: ["contract-financial", contractId] });
    },
    onError: () => {
      toast.error("Erro ao excluir lançamento");
    },
  });

  const formatCurrency = (value: number | null) => {
    if (!value) return "R$ 0,00";
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case "recebido":
        return <Badge className="bg-green-500">Recebido</Badge>;
      case "parcial":
        return <Badge className="bg-yellow-500">Parcial</Badge>;
      default:
        return <Badge variant="secondary">Pendente</Badge>;
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case "comissao":
        return <Badge variant="outline" className="border-purple-500 text-purple-500">Comissão</Badge>;
      case "ajuste":
        return <Badge variant="outline" className="border-orange-500 text-orange-500">Ajuste</Badge>;
      default:
        return <Badge variant="outline">Recebimento</Badge>;
    }
  };

  const handleEdit = (entry: FinancialEntry) => {
    setEditingId(entry.id);
    setEditValues({
      received_value: entry.received_value || 0,
      received_date: entry.received_date || "",
      status: entry.status || "pendente",
    });
  };

  const handleSave = (id: string) => {
    updateMutation.mutate({ id, data: editValues });
  };

  if (isLoading) {
    return <div className="text-center py-4">Carregando...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={() => setShowAddForm(!showAddForm)}>
          <Plus className="h-4 w-4 mr-2" />
          Adicionar Lançamento
        </Button>
      </div>

      {showAddForm && (
        <div className="border rounded-lg p-4 space-y-4 bg-muted/30">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Select
              value={newEntry.type}
              onValueChange={(value) => setNewEntry({ ...newEntry, type: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="recebimento">Recebimento</SelectItem>
                <SelectItem value="comissao">Comissão</SelectItem>
                <SelectItem value="ajuste">Ajuste</SelectItem>
              </SelectContent>
            </Select>
            <Input
              placeholder="Descrição"
              value={newEntry.description}
              onChange={(e) => setNewEntry({ ...newEntry, description: e.target.value })}
            />
            <Input
              type="number"
              placeholder="Valor previsto"
              value={newEntry.expected_value}
              onChange={(e) => setNewEntry({ ...newEntry, expected_value: parseFloat(e.target.value) || 0 })}
            />
            <Input
              type="date"
              value={newEntry.expected_date}
              onChange={(e) => setNewEntry({ ...newEntry, expected_date: e.target.value })}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setShowAddForm(false)}>
              Cancelar
            </Button>
            <Button size="sm" onClick={() => addMutation.mutate()}>
              Salvar
            </Button>
          </div>
        </div>
      )}

      {entries && entries.length > 0 ? (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tipo</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead className="text-right">Previsto</TableHead>
                <TableHead className="text-right">Recebido</TableHead>
                <TableHead>Data Prev.</TableHead>
                <TableHead>Data Rec.</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-24"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell>{getTypeBadge(entry.type)}</TableCell>
                  <TableCell>{entry.description}</TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(entry.expected_value)}
                  </TableCell>
                  <TableCell className="text-right">
                    {editingId === entry.id ? (
                      <Input
                        type="number"
                        value={editValues.received_value || 0}
                        onChange={(e) =>
                          setEditValues({
                            ...editValues,
                            received_value: parseFloat(e.target.value) || 0,
                          })
                        }
                        className="w-28 h-8"
                      />
                    ) : (
                      formatCurrency(entry.received_value)
                    )}
                  </TableCell>
                  <TableCell>
                    {entry.expected_date
                      ? format(new Date(entry.expected_date), "dd/MM/yyyy")
                      : "-"}
                  </TableCell>
                  <TableCell>
                    {editingId === entry.id ? (
                      <Input
                        type="date"
                        value={editValues.received_date || ""}
                        onChange={(e) =>
                          setEditValues({ ...editValues, received_date: e.target.value })
                        }
                        className="w-36 h-8"
                      />
                    ) : entry.received_date ? (
                      format(new Date(entry.received_date), "dd/MM/yyyy")
                    ) : (
                      "-"
                    )}
                  </TableCell>
                  <TableCell>
                    {editingId === entry.id ? (
                      <Select
                        value={editValues.status || "pendente"}
                        onValueChange={(value) =>
                          setEditValues({ ...editValues, status: value })
                        }
                      >
                        <SelectTrigger className="w-28 h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pendente">Pendente</SelectItem>
                          <SelectItem value="parcial">Parcial</SelectItem>
                          <SelectItem value="recebido">Recebido</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      getStatusBadge(entry.status)
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {editingId === entry.id ? (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleSave(entry.id)}
                          className="h-8 w-8"
                        >
                          <Save className="h-4 w-4" />
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(entry)}
                          className="h-8"
                        >
                          Editar
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteMutation.mutate(entry.id)}
                        className="h-8 w-8 text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="text-center py-8 text-muted-foreground">
          Nenhum lançamento financeiro encontrado.
        </div>
      )}
    </div>
  );
}
