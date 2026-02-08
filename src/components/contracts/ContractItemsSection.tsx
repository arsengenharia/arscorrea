import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Trash2, GripVertical } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ITEM_CATEGORIES, ITEM_UNITS, normalizeCategory, normalizeUnit } from "@/lib/itemOptions";

export interface ContractItem {
  id?: string;
  category: string;
  description: string;
  unit: string;
  quantity: number;
  unit_price: number;
  total: number;
  order_index: number;
  notes?: string;
}

interface ContractItemsSectionProps {
  items: ContractItem[];
  onChange: (items: ContractItem[]) => void;
}

export function ContractItemsSection({ items, onChange }: ContractItemsSectionProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const parseCurrency = (value: string): number => {
    const cleaned = value.replace(/[^\d,.-]/g, "").replace(",", ".");
    return parseFloat(cleaned) || 0;
  };

  const addItem = () => {
    const newItem: ContractItem = {
      category: "",
      description: "",
      unit: "un",
      quantity: 1,
      unit_price: 0,
      total: 0,
      order_index: items.length,
    };
    onChange([...items, newItem]);
  };

  const updateItem = (index: number, field: keyof ContractItem, value: string | number) => {
    const updatedItems = [...items];
    const item = { ...updatedItems[index] };

    if (field === "quantity" || field === "unit_price") {
      const numValue = typeof value === "string" ? parseCurrency(value) : value;
      (item as Record<string, unknown>)[field] = numValue;
      item.total = item.quantity * item.unit_price;
    } else {
      (item as Record<string, unknown>)[field] = value;
    }

    updatedItems[index] = item;
    onChange(updatedItems);
  };

  const removeItem = (index: number) => {
    const updatedItems = items.filter((_, i) => i !== index);
    onChange(updatedItems.map((item, i) => ({ ...item, order_index: i })));
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base">Itens do Contrato</CardTitle>
        <Button variant="outline" size="sm" onClick={addItem} className="gap-1">
          <Plus className="h-4 w-4" />
          Adicionar Item
        </Button>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-4">
            Nenhum item adicionado. Clique em "Adicionar Item" para começar.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8"></TableHead>
                  <TableHead className="w-32">Categoria</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead className="w-20">Unidade</TableHead>
                  <TableHead className="w-24 text-right">Qtd</TableHead>
                  <TableHead className="w-32 text-right">Valor Unit.</TableHead>
                  <TableHead className="w-32 text-right">Total</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                    </TableCell>
                    <TableCell>
                      <Select
                        value={normalizeCategory(item.category)}
                        onValueChange={(value) => updateItem(index, "category", value)}
                      >
                        <SelectTrigger className="h-8">
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          {ITEM_CATEGORIES.map((cat) => (
                            <SelectItem key={cat} value={cat}>
                              {cat}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Input
                        value={item.description}
                        onChange={(e) => updateItem(index, "description", e.target.value)}
                        className="h-8"
                        placeholder="Descrição do item"
                      />
                    </TableCell>
                    <TableCell>
                      <Select
                        value={normalizeUnit(item.unit)}
                        onValueChange={(value) => updateItem(index, "unit", value)}
                      >
                        <SelectTrigger className="h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ITEM_UNITS.map((unit) => (
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
                        value={item.quantity}
                        onChange={(e) => updateItem(index, "quantity", parseFloat(e.target.value) || 0)}
                        className="h-8 text-right"
                        min="0"
                        step="0.01"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={item.unit_price}
                        onChange={(e) => updateItem(index, "unit_price", parseFloat(e.target.value) || 0)}
                        className="h-8 text-right"
                        min="0"
                        step="0.01"
                      />
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(item.total)}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeItem(index)}
                        className="h-8 w-8 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
