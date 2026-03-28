import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: string;
  className?: string;
}

const statusConfig: Record<string, { label: string; className: string }> = {
  // Financial entries
  pendente: { label: "Pendente", className: "bg-slate-100 text-slate-900 border-slate-200" },
  conciliado: { label: "Conciliado", className: "bg-green-100 text-green-900 border-green-200" },
  divergente: { label: "Divergente", className: "bg-red-100 text-red-900 border-red-200" },

  // NF-e
  recebido: { label: "Recebido", className: "bg-blue-100 text-blue-900 border-blue-200" },
  processando: { label: "Processando", className: "bg-yellow-100 text-yellow-900 border-yellow-200" },
  aguardando_revisao: { label: "Aguardando Revisão", className: "bg-amber-100 text-amber-900 border-amber-200" },
  aprovado: { label: "Aprovado", className: "bg-green-100 text-green-900 border-green-200" },
  rejeitado: { label: "Rejeitado", className: "bg-red-100 text-red-900 border-red-200" },
  duplicata: { label: "Duplicata", className: "bg-slate-100 text-slate-900 border-slate-200" },
  erro: { label: "Erro", className: "bg-red-100 text-red-900 border-red-200" },

  // Conciliação
  nao_identificado: { label: "Não Identificado", className: "bg-red-100 text-red-900 border-red-200" },

  // Anomalies
  aberta: { label: "Aberta", className: "bg-amber-100 text-amber-900 border-amber-200" },
  em_analise: { label: "Em Análise", className: "bg-blue-100 text-blue-900 border-blue-200" },
  resolvida: { label: "Resolvida", className: "bg-green-100 text-green-900 border-green-200" },
  ignorada: { label: "Ignorada", className: "bg-slate-100 text-slate-900 border-slate-200" },

  // Rateio
  rateado: { label: "Rateado", className: "bg-green-100 text-green-900 border-green-200" },

  // Recebíveis
  parcial: { label: "Parcial", className: "bg-amber-100 text-amber-900 border-amber-200" },
  recebido_payment: { label: "Recebido", className: "bg-green-100 text-green-900 border-green-200" },
  vencido: { label: "Vencido", className: "bg-red-100 text-red-900 border-red-200" },

  // Ativo/Inativo
  ativo: { label: "Ativo", className: "bg-green-100 text-green-900 border-green-200" },
  inativo: { label: "Inativo", className: "bg-slate-100 text-slate-900 border-slate-200" },

  // Severidade
  critica: { label: "Crítica", className: "bg-red-200 text-red-900 border-red-300" },
  alta: { label: "Alta", className: "bg-orange-100 text-orange-900 border-orange-200" },
  media: { label: "Média", className: "bg-amber-100 text-amber-900 border-amber-200" },
  baixa: { label: "Baixa", className: "bg-slate-100 text-slate-900 border-slate-200" },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status] || { label: status, className: "bg-slate-100 text-slate-900 border-slate-200" };
  return (
    <span className={cn(
      "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border",
      config.className,
      className
    )}>
      {config.label}
    </span>
  );
}
