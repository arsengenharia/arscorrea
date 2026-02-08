import {
  Document,
  Page,
  Text,
  View,
  Image,
} from "@react-pdf/renderer";
import { contractStyles as styles } from "./contractStyles";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ContractItem {
  category: string;
  description: string;
  unit: string;
  quantity: number;
  unit_price: number;
  total: number;
}

interface Client {
  name: string;
  document?: string | null;
  phone?: string | null;
  email?: string | null;
  street?: string | null;
  number?: string | null;
  complement?: string | null;
  neighborhood?: string | null;
  city?: string | null;
  state?: string | null;
  zip_code?: string | null;
  responsible?: string | null;
}

interface ContractPDFProps {
  contractNumber: string;
  title: string;
  client: Client;
  scopeText: string;
  items: ContractItem[];
  subtotal: number;
  discountType: string;
  discountValue: number;
  total: number;
  paymentNotes: string;
  createdAt: string;
}

export function ContractPDF({
  contractNumber,
  title,
  client,
  scopeText,
  items,
  subtotal,
  discountType,
  discountValue,
  total,
  paymentNotes,
  createdAt,
}: ContractPDFProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const formatAddress = () => {
    const parts = [
      client.street,
      client.number,
      client.complement,
      client.neighborhood,
      client.city,
      client.state,
      client.zip_code,
    ].filter(Boolean);
    return parts.join(", ") || "Não informado";
  };

  const discountAmount = discountType === "percent" 
    ? (subtotal * discountValue) / 100 
    : discountValue;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Image
            src="/lovable-uploads/ars-correa-logo.png"
            style={styles.logo}
          />
          <View style={styles.headerInfo}>
            <Text style={styles.contractNumber}>{contractNumber}</Text>
            <Text style={styles.date}>
              {format(new Date(createdAt), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
            </Text>
          </View>
        </View>

        {/* Title */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>CONTRATO DE PRESTAÇÃO DE SERVIÇOS</Text>
          <Text style={{ fontSize: 11, fontWeight: "bold" }}>{title}</Text>
        </View>

        {/* Client Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>CONTRATANTE</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Nome/Razão Social:</Text>
            <Text style={styles.value}>{client.name}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>CNPJ/CPF:</Text>
            <Text style={styles.value}>{client.document || "Não informado"}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Responsável:</Text>
            <Text style={styles.value}>{client.responsible || "Não informado"}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Telefone:</Text>
            <Text style={styles.value}>{client.phone || "Não informado"}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>E-mail:</Text>
            <Text style={styles.value}>{client.email || "Não informado"}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Endereço:</Text>
            <Text style={styles.value}>{formatAddress()}</Text>
          </View>
        </View>

        {/* Scope */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>OBJETO DO CONTRATO</Text>
          <Text style={styles.scopeText}>{scopeText || "Não especificado"}</Text>
        </View>

        {/* Items */}
        {items.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>ITENS DO CONTRATO</Text>
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={styles.colCategory}>Categoria</Text>
                <Text style={styles.colDescription}>Descrição</Text>
                <Text style={styles.colUnit}>Unid.</Text>
                <Text style={styles.colQuantity}>Qtd.</Text>
                <Text style={styles.colUnitPrice}>Valor Unit.</Text>
                <Text style={styles.colTotal}>Total</Text>
              </View>
              {items.map((item, index) => (
                <View key={index} style={styles.tableRow}>
                  <Text style={styles.colCategory}>{item.category}</Text>
                  <Text style={styles.colDescription}>{item.description}</Text>
                  <Text style={styles.colUnit}>{item.unit}</Text>
                  <Text style={styles.colQuantity}>{item.quantity}</Text>
                  <Text style={styles.colUnitPrice}>{formatCurrency(item.unit_price)}</Text>
                  <Text style={styles.colTotal}>{formatCurrency(item.total)}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Totals */}
        <View style={styles.totalsSection}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Subtotal:</Text>
            <Text style={styles.totalValue}>{formatCurrency(subtotal)}</Text>
          </View>
          {discountValue > 0 && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>
                Desconto {discountType === "percent" ? `(${discountValue}%)` : ""}:
              </Text>
              <Text style={styles.totalValue}>-{formatCurrency(discountAmount)}</Text>
            </View>
          )}
          <View style={[styles.totalRow, styles.grandTotal]}>
            <Text style={styles.totalLabel}>TOTAL:</Text>
            <Text style={styles.totalValue}>{formatCurrency(total)}</Text>
          </View>
        </View>

        {/* Payment Notes */}
        {paymentNotes && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>FORMA DE PAGAMENTO</Text>
            <Text style={styles.paymentNotes}>{paymentNotes}</Text>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <Text>ARS Engenharia • CNPJ: XX.XXX.XXX/0001-XX • contato@arsengenharia.com.br</Text>
        </View>
      </Page>
    </Document>
  );
}
