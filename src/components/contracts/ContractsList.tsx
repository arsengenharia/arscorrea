import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
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
import { ContractStatusBadge } from "./ContractStatusBadge";
import { Pencil, FileDown, DollarSign, Trash2, MessageCircle, MapPin } from "lucide-react";
import { useState } from "react";

const GOOGLE_MAPS_API_KEY = "AIzaSyBEZQ3dPHqho8u6nfKSVWlAVIXzG7Yawck";

const formatPhoneForWhatsApp = (phone: string): string => {
  const numbers = phone.replace(/\D/g, "");
  if (numbers.length <= 11) {
    return `55${numbers}`;
  }
  return numbers;
};

const openWhatsApp = (phone: string) => {
  const formattedPhone = formatPhoneForWhatsApp(phone);
  window.open(`https://wa.me/${formattedPhone}`, "_blank");
};

const openGoogleMaps = (address: string) => {
  const encodedAddress = encodeURIComponent(address);
  window.open(
    `https://www.google.com/maps/search/?api=1&query=${encodedAddress}&key=${GOOGLE_MAPS_API_KEY}`,
    "_blank"
  );
};

export function ContractsList() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: contracts, isLoading } = useQuery({
    queryKey: ["contracts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contracts")
        .select(`
          *,
          clients (
            name,
            document,
            phone,
            street,
            number,
            neighborhood,
            city,
            state
          )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("contracts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Contrato excluído!");
      queryClient.invalidateQueries({ queryKey: ["contracts"] });
      setDeleteId(null);
    },
    onError: (error: any) => {
      console.error("Erro ao excluir contrato:", error);
      toast.error("Erro ao excluir contrato: " + (error?.message || "Erro desconhecido"));
    },
  });

  const formatCurrency = (value: number | null) => {
    if (!value) return "R$ 0,00";
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  if (!contracts || contracts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-48 text-center">
        <p className="text-muted-foreground mb-4">Nenhum contrato encontrado</p>
        <Button onClick={() => navigate("/contratos/novo")}>Criar Contrato</Button>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Número</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Telefone</TableHead>
              <TableHead>Endereço</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Comissão</TableHead>
              <TableHead>Data</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {contracts.map((contract) => {
              const fullAddress = [
                contract.clients?.street,
                contract.clients?.number,
                contract.clients?.neighborhood,
                contract.clients?.city,
                contract.clients?.state,
              ].filter(Boolean).join(", ");

              return (
                <TableRow key={contract.id}>
                  <TableCell className="font-medium">
                    {contract.contract_number}
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{contract.clients?.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {contract.clients?.document || "Sem documento"}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    {contract.clients?.phone ? (
                      <div className="flex items-center gap-2">
                        <span className="text-sm">{contract.clients.phone}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-green-600 hover:text-green-700 hover:bg-green-50"
                          onClick={() => openWhatsApp(contract.clients!.phone!)}
                          title="Abrir WhatsApp"
                        >
                          <MessageCircle className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {fullAddress ? (
                      <div className="flex items-center gap-2">
                        <span className="text-sm truncate max-w-[150px]" title={fullAddress}>
                          {fullAddress}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                          onClick={() => openGoogleMaps(fullAddress)}
                          title="Abrir no Google Maps"
                        >
                          <MapPin className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(contract.total)}
                  </TableCell>
                  <TableCell>
                    <ContractStatusBadge status={contract.status || "ativo"} />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="text-sm">
                      <span className="text-muted-foreground">Prev: </span>
                      {formatCurrency(contract.commission_expected_value)}
                    </div>
                    <div className="text-sm text-green-600">
                      <span className="text-muted-foreground">Rec: </span>
                      {formatCurrency(contract.commission_received_value)}
                    </div>
                  </TableCell>
                  <TableCell>
                    {format(new Date(contract.created_at), "dd/MM/yyyy", { locale: ptBR })}
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => navigate(`/contratos/${contract.id}`)}
                        title="Editar"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => navigate(`/contratos/${contract.id}/financeiro`)}
                        title="Financeiro"
                      >
                        <DollarSign className="h-4 w-4" />
                      </Button>
                      {contract.pdf_path && (
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Baixar PDF"
                        >
                          <FileDown className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteId(contract.id)}
                        title="Excluir"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este contrato? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
