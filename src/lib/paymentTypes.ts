export const PAYMENT_KINDS = [
  { value: "entrada", label: "Entrada" },
  { value: "sinal", label: "Sinal" },
  { value: "parcela", label: "Parcela" },
  { value: "ajuste", label: "Ajuste" },
  { value: "comissao", label: "Comissão" },
] as const;

export const PAYMENT_STATUSES = [
  { value: "pendente", label: "Pendente" },
  { value: "parcial", label: "Parcial" },
  { value: "recebido", label: "Recebido" },
] as const;

export interface PaymentLine {
  id?: string;
  kind: string;
  description: string;
  expected_value: number;
  expected_date: string | null;
  received_value: number;
  received_date: string | null;
  status: string;
  order_index: number;
  notes?: string;
}

export type PaymentKind = typeof PAYMENT_KINDS[number]["value"];
export type PaymentStatus = typeof PAYMENT_STATUSES[number]["value"];
