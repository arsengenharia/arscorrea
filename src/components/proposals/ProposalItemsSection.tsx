import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, ChevronUp, ChevronDown, List } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

const CATEGORIES = [
  "Serviços preliminares",
  "Acesso e segurança",
  "Tratamento de patologias",
  "Recuperação de concreto",
  "Selantes/Juntas",
  "Pintura/Revitalização",
  "Limpeza/Proteção",
  "Mobilização",
  "Outros",
];

const UNITS = ["m²", "m", "un", "vb", "dia", "mês"];

export interface ProposalItem {
  id: string;
  category: string;
  description: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  total: number;
  notes: string;
}

interface ProposalItemsSectionProps {
  items: ProposalItem[];
  onItemsChange: (items: ProposalItem[]) => void;
}

export const ProposalItemsSection = ({
  items,
  onItemsChange,
}: ProposalItemsSectionProps) => {
  const [expandedNotes, setExpandedNotes] = useState<Set<string>>(new Set());

  const addItem = () => {
    const newItem: ProposalItem = {
      id: crypto.randomUUID(),
      category: "",
      description: "",
      unit: "un",
      quantity: 0,
      unitPrice: 0,
      total: 0,
      notes: "",
    };
    onItemsChange([...items, newItem]);
  };

  const removeItem = (id: string) => {
    onItemsChange(items.filter((item) => item.id !== id));
  };

  const updateItem = (id: string, field: keyof ProposalItem, value: string | number) => {
    onItemsChange(
      items.map((item) => {
        if (item.id !== id) return item;
        
        const updated = { ...item, [field]: value };
        
        // Recalculate total when quantity or unitPrice changes
        if (field === "quantity" || field === "unitPrice") {
          updated.total = Number(updated.quantity) * Number(updated.unitPrice);
        }
        
        return updated;
      })
    );
  };

  const moveItem = (index: number, direction: "up" | "down") => {
    const newItems = [...items];
    const newIndex = direction === "up" ? index - 1 : index + 1;
    
    if (newIndex < 0 || newIndex >= items.length) return;
    
    [newItems[index], newItems[newIndex]] = [newItems[newIndex], newItems[index]];
    onItemsChange(newItems);
  };

  const toggleNotes = (id: string) => {
    const newExpanded = new Set(expandedNotes);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedNotes(newExpanded);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <List className="h-5 w-5" />
            Itens da Proposta
          </span>
          <Button onClick={addItem} size="sm" className="gap-2">
            <Plus className="h-4 w-4" />
            Adicionar Item
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>Nenhum item adicionado</p>
            <Button variant="link" onClick={addItem} className="mt-2">
              Adicionar primeiro item
            </Button>
          </div>
        ) : (
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40px]"></TableHead>
                  <TableHead className="min-w-[150px]">Categoria</TableHead>
                  <TableHead className="min-w-[200px]">Descrição</TableHead>
                  <TableHead className="w-[80px]">Unidade</TableHead>
                  <TableHead className="w-[100px]">Qtd</TableHead>
                  <TableHead className="w-[120px]">Valor Unit.</TableHead>
                  <TableHead className="w-[120px] text-right">Total</TableHead>
                  <TableHead className="w-[80px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item, index) => (
                  <>
                    <TableRow key={item.id}>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => moveItem(index, "up")}
                            disabled={index === 0}
                          >
                            <ChevronUp className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => moveItem(index, "down")}
                            disabled={index === items.length - 1}
                          >
                            <ChevronDown className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={item.category}
                          onValueChange={(v) => updateItem(item.id, "category", v)}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Categoria" />
                          </SelectTrigger>
                          <SelectContent>
                            {CATEGORIES.map((cat) => (
                              <SelectItem key={cat} value={cat}>
                                {cat}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Collapsible
                          open={expandedNotes.has(item.id)}
                          onOpenChange={() => toggleNotes(item.id)}
                        >
                          <div className="space-y-2">
                            <Input
                              value={item.description}
                              onChange={(e) =>
                                updateItem(item.id, "description", e.target.value)
                              }
                              placeholder="Descrição do serviço"
                            />
                            <CollapsibleTrigger asChild>
                              <Button variant="ghost" size="sm" className="text-xs">
                                {expandedNotes.has(item.id) ? "Ocultar obs." : "Observação"}
                              </Button>
                            </CollapsibleTrigger>
                            <CollapsibleContent>
                              <Textarea
                                value={item.notes}
                                onChange={(e) =>
                                  updateItem(item.id, "notes", e.target.value)
                                }
                                placeholder="Observações do item..."
                                className="text-sm"
                              />
                            </CollapsibleContent>
                          </div>
                        </Collapsible>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={item.unit}
                          onValueChange={(v) => updateItem(item.id, "unit", v)}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {UNITS.map((unit) => (
                              <SelectItem key={unit} value={unit}>
                                {unit}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.quantity || ""}
                          onChange={(e) =>
                            updateItem(item.id, "quantity", parseFloat(e.target.value) || 0)
                          }
                          className="w-full"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.unitPrice || ""}
                          onChange={(e) =>
                            updateItem(item.id, "unitPrice", parseFloat(e.target.value) || 0)
                          }
                          className="w-full"
                        />
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(item.total)}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeItem(item.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  </>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
