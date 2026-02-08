import React from "react";
import { Document, Page, View, Text, Image } from "@react-pdf/renderer";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { styles } from "./proposalStyles";

type ProposalClient = {
  name: string;
  document: string | null;
  responsible: string | null;
  phone: string | null;
  email: string | null;
  street: string | null;
  number: string | null;
  complement?: string | null;
  neighborhood?: string | null;
  city: string | null;
  state: string | null;
  zip_code?: string | null;
};

type Proposal = {
  number: string;
  title: string | null;
  created_at: string;

  // Campos da obra (podem existir no banco; PDF só mostra se houver valor)
  condo_name?: string | null;
  work_address?: string | null;
  city?: string | null;
  state?: string | null;

  scope_text?: string | null;

  payment_terms?: string | null;
  warranty_terms?: string | null;
  exclusions?: string | null;
  notes?: string | null;

  subtotal: number | null;
  discount_type: string | null; // 'percent' | 'fixed'
  discount_value: number | null;
  total: number | null;

  client: ProposalClient | null;
};

type ProposalItem = {
  category: string | null;
  description: string | null;
  unit: string | null;
  quantity: number | null;
  unit_price: number | null;
  total: number | null;
  notes: string | null;
};

export interface ProposalPDFProps {
  proposal: Proposal;
  items: ProposalItem[];
}

const formatCurrency = (value: number | null) => {
  const v = typeof value === "number" ? value : 0;
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(v);
};

const safeText = (value?: string | null) => (value && value.trim() ? value : "-");

const unitLabel = (u: string | null) => {
  const map: Record<string, string> = {
    m2: "m²",
    m: "m",
    un: "un",
    vb: "vb",
    dia: "dia",
    mes: "mês",
  };
  if (!u) return "-";
  return map[u] ?? u;
};

export const ProposalPDF = ({ proposal, items }: ProposalPDFProps) => {
  const subtotal = proposal.subtotal ?? 0;
  const discountValue = proposal.discount_value ?? 0;

  const discountAmount = proposal.discount_type === "percent" ? subtotal * (discountValue / 100) : discountValue;

  const total = typeof proposal.total === "number" ? proposal.total : Math.max(0, subtotal - discountAmount);

  const createdAt = proposal.created_at
    ? format(new Date(proposal.created_at), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
    : "-";

  const hasWorkInfo = !!proposal.condo_name || !!proposal.work_address || !!proposal.city || !!proposal.state;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Image src="/lovable-uploads/ars-correa-logo.png" style={styles.logo} />
          <View style={styles.headerInfo}>
            <Text style={styles.proposalNumber}>{safeText(proposal.number)}</Text>
            <Text style={styles.proposalDate}>{createdAt}</Text>
          </View>
        </View>

        {/* Title */}
        {proposal.title ? (
          <View style={styles.section}>
            <Text style={styles.title}>{proposal.title}</Text>
          </View>
        ) : null}

        {/* Cliente */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>CLIENTE</Text>

          <View style={styles.infoBlock}>
            <View style={styles.infoRow}>
              <Text style={styles.label}>Nome:</Text>
              <Text style={styles.value}>{safeText(proposal.client?.name)}</Text>
            </View>

            {proposal.client?.document ? (
              <View style={styles.infoRow}>
                <Text style={styles.label}>CNPJ/CPF:</Text>
                <Text style={styles.value}>{proposal.client.document}</Text>
              </View>
            ) : null}

            {proposal.client?.responsible ? (
              <View style={styles.infoRow}>
                <Text style={styles.label}>Responsável:</Text>
                <Text style={styles.value}>{proposal.client.responsible}</Text>
              </View>
            ) : null}

            {proposal.client?.phone ? (
              <View style={styles.infoRow}>
                <Text style={styles.label}>Telefone:</Text>
                <Text style={styles.value}>{proposal.client.phone}</Text>
              </View>
            ) : null}

            {proposal.client?.email ? (
              <View style={styles.infoRow}>
                <Text style={styles.label}>E-mail:</Text>
                <Text style={styles.value}>{proposal.client.email}</Text>
              </View>
            ) : null}

            {/* Endereço do cliente */}
            {proposal.client?.street || proposal.client?.city || proposal.client?.state ? (
              <View style={styles.infoRow}>
                <Text style={styles.label}>Endereço:</Text>
                <Text style={styles.value}>
                  {[
                    proposal.client?.street,
                    proposal.client?.number,
                    proposal.client?.neighborhood,
                    proposal.client?.city,
                    proposal.client?.state ? `${proposal.client.state}` : null,
                    proposal.client?.zip_code ? `CEP: ${proposal.client.zip_code}` : null,
                  ]
                    .filter(Boolean)
                    .join(", ")}
                </Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* Obra (só aparece se tiver informação) */}
        {hasWorkInfo ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>OBRA</Text>
            <View style={styles.infoBlock}>
              {proposal.condo_name ? (
                <View style={styles.infoRow}>
                  <Text style={styles.label}>Condomínio:</Text>
                  <Text style={styles.value}>{proposal.condo_name}</Text>
                </View>
              ) : null}

              {proposal.work_address ? (
                <View style={styles.infoRow}>
                  <Text style={styles.label}>Endereço:</Text>
                  <Text style={styles.value}>{proposal.work_address}</Text>
                </View>
              ) : null}

              {proposal.city || proposal.state ? (
                <View style={styles.infoRow}>
                  <Text style={styles.label}>Cidade/UF:</Text>
                  <Text style={styles.value}>{[proposal.city, proposal.state].filter(Boolean).join(" / ")}</Text>
                </View>
              ) : null}
            </View>
          </View>
        ) : null}

        {/* Escopo */}
        {proposal.scope_text ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>ESCOPO</Text>
            <View style={styles.infoBlock}>
              <Text style={styles.paragraph}>{proposal.scope_text}</Text>
            </View>
          </View>
        ) : null}

        {/* Itens */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ITENS</Text>

          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.th, styles.colCat]}>Categoria</Text>
              <Text style={[styles.th, styles.colDesc]}>Descrição</Text>
              <Text style={[styles.th, styles.colUnit]}>Un</Text>
              <Text style={[styles.th, styles.colQty]}>Qtd</Text>
              <Text style={[styles.th, styles.colPrice]}>V. Unit.</Text>
              <Text style={[styles.th, styles.colTotal]}>Total</Text>
            </View>

            {(items || []).map((it, idx) => (
              <View key={`${idx}`} style={styles.tableRow}>
                <Text style={[styles.td, styles.colCat]}>{safeText(it.category)}</Text>
                <Text style={[styles.td, styles.colDesc]}>{safeText(it.description)}</Text>
                <Text style={[styles.td, styles.colUnit]}>{unitLabel(it.unit)}</Text>
                <Text style={[styles.td, styles.colQty]}>{(it.quantity ?? 0).toString()}</Text>
                <Text style={[styles.td, styles.colPrice]}>{formatCurrency(it.unit_price)}</Text>
                <Text style={[styles.td, styles.colTotal]}>{formatCurrency(it.total)}</Text>
              </View>
            ))}
          </View>

          {/* Totais */}
          <View style={styles.totals}>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Subtotal:</Text>
              <Text style={styles.totalValue}>{formatCurrency(subtotal)}</Text>
            </View>

            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>
                Desconto{proposal.discount_type === "percent" ? ` (${discountValue}%)` : ""}:
              </Text>
              <Text style={styles.totalValue}>- {formatCurrency(discountAmount)}</Text>
            </View>

            <View style={styles.totalRowStrong}>
              <Text style={styles.totalLabelStrong}>Total:</Text>
              <Text style={styles.totalValueStrong}>{formatCurrency(total)}</Text>
            </View>
          </View>
        </View>

        {/* Condições */}
        {proposal.payment_terms || proposal.warranty_terms || proposal.exclusions || proposal.notes ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>CONDIÇÕES</Text>
            <View style={styles.infoBlock}>
              {proposal.payment_terms ? (
                <View style={styles.blockLine}>
                  <Text style={styles.blockTitle}>Forma de pagamento</Text>
                  <Text style={styles.paragraph}>{proposal.payment_terms}</Text>
                </View>
              ) : null}

              {proposal.warranty_terms ? (
                <View style={styles.blockLine}>
                  <Text style={styles.blockTitle}>Garantia</Text>
                  <Text style={styles.paragraph}>{proposal.warranty_terms}</Text>
                </View>
              ) : null}

              {proposal.exclusions ? (
                <View style={styles.blockLine}>
                  <Text style={styles.blockTitle}>Exclusões</Text>
                  <Text style={styles.paragraph}>{proposal.exclusions}</Text>
                </View>
              ) : null}

              {proposal.notes ? (
                <View style={styles.blockLine}>
                  <Text style={styles.blockTitle}>Observações</Text>
                  <Text style={styles.paragraph}>{proposal.notes}</Text>
                </View>
              ) : null}
            </View>
          </View>
        ) : null}

        {/* Rodapé */}
        <Text style={styles.footer}>ARS Engenharia e Consultoria Estratégica • Corrêa Engenharia</Text>
      </Page>
    </Document>
  );
};
