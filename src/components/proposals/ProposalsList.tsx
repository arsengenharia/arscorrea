import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Eye, Pencil, Trash2, Download, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ProposalStatusBadge } from "./ProposalStatusBadge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

type ProposalWithClient = {
  id: string;
  number: string | null;
  title: string | null;
  condo_name: string | null;
  status: string | null;
  total: number | null;
  created_at: string;
  pdf_path: string | null;
  client: {
    id: string;
    name: string;
  } | null;
};

export const ProposalsList = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: proposals, isLoading } = useQuery({
    queryKey: ["proposals"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("proposals")
        .select(`*, client:clients(id, name)`)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as ProposalWithClient[];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (proposalId: string) => {
      const { error } = await supabase
        .from("proposals")
        .delete()
        .eq("id", proposalId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["proposals"] });
      toast.success("Proposta excluída com sucesso");
    },
    onError: () => {
      toast.error("Erro ao excluir proposta");
    },
  });

  const handleDownloadPDF = async (pdfPath: string | null) => {
    if (!pdfPath) {
      toast.error("PDF não disponível");
      return;
    }

    const { data, error } = await supabase.storage
      .from("proposals")
      .createSignedUrl(pdfPath, 60);

    if (error || !data?.signedUrl) {
      toast.error("Erro ao baixar PDF");
      return;
    }

    window.open(data.signedUrl, "_blank");
  };

  const formatCurrency = (value: number | null) => {
    if (value === null) return "R$ 0,00";
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!proposals || proposals.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>Nenhuma proposta cadastrada</p>
        <Button
          variant="link"
          onClick={() => navigate("/propostas/nova")}
          className="mt-2"
        >
          Criar primeira proposta
        </Button>
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Número / Título</TableHead>
            <TableHead>Cliente</TableHead>
            <TableHead>Condomínio</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Total</TableHead>
            <TableHead>Data</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {proposals.map((proposal) => (
            <TableRow key={proposal.id}>
              <TableCell>
                <div>
                  <span className="font-medium">{proposal.number}</span>
                  {proposal.title && (
                    <p className="text-sm text-muted-foreground truncate max-w-[200px]">
                      {proposal.title}
                    </p>
                  )}
                </div>
              </TableCell>
              <TableCell>{proposal.client?.name || "-"}</TableCell>
              <TableCell>{proposal.condo_name || "-"}</TableCell>
              <TableCell>
                <ProposalStatusBadge status={proposal.status || "draft"} />
              </TableCell>
              <TableCell className="text-right font-medium">
                {formatCurrency(proposal.total)}
              </TableCell>
              <TableCell>
                {format(new Date(proposal.created_at), "dd/MM/yyyy", {
                  locale: ptBR,
                })}
              </TableCell>
              <TableCell>
                <div className="flex justify-end gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => navigate(`/propostas/${proposal.id}`)}
                    title="Visualizar/Editar"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => navigate(`/propostas/${proposal.id}`)}
                    title="Editar"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  {proposal.pdf_path && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDownloadPDF(proposal.pdf_path)}
                      title="Baixar PDF"
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  )}
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" title="Excluir">
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Excluir proposta?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Esta ação não pode ser desfeita. A proposta será
                          permanentemente excluída.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => deleteMutation.mutate(proposal.id)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Excluir
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
