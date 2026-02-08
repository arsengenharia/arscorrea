import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
  Font,
} from "@react-pdf/renderer";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

// Register fonts
Font.register({
  family: "Helvetica",
  src: "https://fonts.gstatic.com/s/roboto/v30/KFOmCnqEu92Fr1Mu4mxK.woff2",
});

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: "Helvetica",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 30,
    borderBottom: 2,
    borderBottomColor: "#1e40af",
    paddingBottom: 15,
  },
  logo: {
    width: 120,
    height: 50,
  },
  headerInfo: {
    textAlign: "right",
  },
  proposalNumber: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#1e40af",
  },
  proposalDate: {
    fontSize: 9,
    color: "#666",
    marginTop: 4,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#1e40af",
    marginBottom: 10,
    borderBottom: 1,
    borderBottomColor: "#e5e7eb",
    paddingBottom: 5,
  },
  clientInfo: {
    backgroundColor: "#f8fafc",
    padding: 10,
    borderRadius: 4,
  },
  clientRow: {
    flexDirection: "row",
    marginBottom: 4,
  },
  clientLabel: {
    width: 80,
    fontWeight: "bold",
    color: "#374151",
  },
  clientValue: {
    flex: 1,
    color: "#1f2937",
  },
  workInfo: {
    backgroundColor: "#f0f9ff",
    padding: 10,
    borderRadius: 4,
  },
  scopeText: {
    fontSize: 9,
    lineHeight: 1.5,
    whiteSpace: "pre-wrap",
  },
  table: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#1e40af",
    color: "white",
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  tableRowAlt: {
    backgroundColor: "#f8fafc",
  },
  tableCell: {
    padding: 6,
    fontSize: 8,
  },
  tableCellCategory: {
    width: "20%",
  },
  tableCellDescription: {
    width: "30%",
  },
  tableCellUnit: {
    width: "10%",
    textAlign: "center",
  },
  tableCellQty: {
    width: "10%",
    textAlign: "right",
  },
  tableCellPrice: {
    width: "15%",
    textAlign: "right",
  },
  tableCellTotal: {
    width: "15%",
    textAlign: "right",
  },
  totalsSection: {
    marginTop: 20,
    alignItems: "flex-end",
  },
  totalsRow: {
    flexDirection: "row",
    width: 200,
    justifyContent: "space-between",
    paddingVertical: 4,
  },
  totalsLabel: {
    color: "#374151",
  },
  totalsValue: {
    fontWeight: "bold",
  },
  totalFinal: {
    flexDirection: "row",
    width: 200,
    justifyContent: "space-between",
    paddingVertical: 8,
    borderTopWidth: 2,
    borderTopColor: "#1e40af",
    marginTop: 4,
  },
  totalFinalLabel: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#1e40af",
  },
  totalFinalValue: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#1e40af",
  },
  termsGrid: {
    flexDirection: "row",
    gap: 20,
    marginBottom: 10,
  },
  termItem: {
    flex: 1,
    backgroundColor: "#f8fafc",
    padding: 8,
    borderRadius: 4,
  },
  termLabel: {
    fontSize: 8,
    color: "#6b7280",
    marginBottom: 2,
  },
  termValue: {
    fontSize: 10,
    fontWeight: "bold",
  },
  termSection: {
    marginBottom: 10,
  },
  termText: {
    fontSize: 9,
    lineHeight: 1.4,
    color: "#374151",
  },
  footer: {
    position: "absolute",
    bottom: 30,
    left: 40,
    right: 40,
    textAlign: "center",
    fontSize: 8,
    color: "#9ca3af",
    borderTop: 1,
    borderTopColor: "#e5e7eb",
    paddingTop: 10,
  },
});

interface ProposalPDFProps {
  proposal: {
    number: string | null;
    title: string | null;
    condo_name: string | null;
    work_address: string | null;
    city: string | null;
    state: string | null;
    scope_text: string | null;
    validity_days: number | null;
    execution_days: number | null;
    payment_terms: string | null;
    warranty_terms: string | null;
    exclusions: string | null;
    notes: string | null;
    subtotal: number | null;
    discount_type: string | null;
    discount_value: number | null;
    total: number | null;
    created_at: string;
    client: {
      name: string;
      document: string | null;
      responsible: string | null;
      phone: string | null;
      email: string | null;
      street: string | null;
      number: string | null;
      city: string | null;
      state: string | null;
    } | null;
  };
  items: Array<{
    category: string | null;
    description: string | null;
    unit: string | null;
    quantity: number | null;
    unit_price: number | null;
    total: number | null;
    notes: string | null;
  }>;
}

const formatCurrency = (value: number | null) => {
  if (value === null) return "R$ 0,00";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
};

export const ProposalPDF = ({ proposal, items }: ProposalPDFProps) => {
  const discountAmount =
    proposal.discount_type === "percent"
      ? (proposal.subtotal || 0) * ((proposal.discount_value || 0) / 100)
      : proposal.discount_value || 0;

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
            <Text style={styles.proposalNumber}>{proposal.number}</Text>
            <Text style={styles.proposalDate}>
              {format(new Date(proposal.created_at), "dd 'de' MMMM 'de' yyyy", {
                locale: ptBR,
              })}
            </Text>
          </View>
        </View>

        {/* Title */}
        {proposal.title && (
          <View style={styles.section}>
            <Text style={{ fontSize: 14, fontWeight: "bold", textAlign: "center" }}>
              {proposal.title}
            </Text>
          </View>
        )}

        {/* Client Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>CLIENTE</Text>
          <View style={styles.clientInfo}>
            <View style={styles.clientRow}>
              <Text style={styles.clientLabel}>Nome:</Text>
              <Text style={styles.clientValue}>{proposal.client?.name || "-"}</Text>
            </View>
            {proposal.client?.document && (
              <View style={styles.clientRow}>
                <Text style={styles.clientLabel}>CNPJ/CPF:</Text>
                <Text style={styles.clientValue}>{proposal.client.document}</Text>
              </View>
            )}
            {proposal.client?.responsible && (
              <View style={styles.clientRow}>
                <Text style={styles.clientLabel}>Responsável:</Text>
                <Text style={styles.clientValue}>{proposal.client.responsible}</Text>
              </View>
            )}
            {proposal.client?.phone && (
              <View style={styles.clientRow}>
                <Text style={styles.clientLabel}>Telefone:</Text>
                <Text style={styles.clientValue}>{proposal.client.phone}</Text>
              </View>
            )}
            {proposal.client?.email && (
              <View style={styles.clientRow}>
                <Text style={styles.clientLabel}>E-mail:</Text>
                <Text style={styles.clientValue}>{proposal.client.email}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Work Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>LOCAL DA OBRA</Text>
          <View style={styles.workInfo}>
            {proposal.condo_name && (
              <View style={styles.clientRow}>
                <Text style={styles.clientLabel}>Condomínio:</Text>
                <Text style={styles.clientValue}>{proposal.condo_name}</Text>
              </View>
            )}
            {proposal.work_address && (
              <View style={styles.clientRow}>
                <Text style={styles.clientLabel}>Endereço:</Text>
                <Text style={styles.clientValue}>{proposal.work_address}</Text>
              </View>
            )}
            {(proposal.city || proposal.state) && (
              <View style={styles.clientRow}>
                <Text style={styles.clientLabel}>Cidade/UF:</Text>
                <Text style={styles.clientValue}>
                  {[proposal.city, proposal.state].filter(Boolean).join(" - ")}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Scope */}
        {proposal.scope_text && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>ESCOPO DOS SERVIÇOS</Text>
            <Text style={styles.scopeText}>{proposal.scope_text}</Text>
          </View>
        )}

        {/* Items Table */}
        {items.length > 0 && (
          <View style={styles.section} break>
            <Text style={styles.sectionTitle}>ITENS DA PROPOSTA</Text>
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableCell, styles.tableCellCategory]}>Categoria</Text>
                <Text style={[styles.tableCell, styles.tableCellDescription]}>Descrição</Text>
                <Text style={[styles.tableCell, styles.tableCellUnit]}>Un.</Text>
                <Text style={[styles.tableCell, styles.tableCellQty]}>Qtd</Text>
                <Text style={[styles.tableCell, styles.tableCellPrice]}>V. Unit.</Text>
                <Text style={[styles.tableCell, styles.tableCellTotal]}>Total</Text>
              </View>
              {items.map((item, index) => (
                <View
                  key={index}
                  style={[styles.tableRow, index % 2 === 1 ? styles.tableRowAlt : {}]}
                >
                  <Text style={[styles.tableCell, styles.tableCellCategory]}>
                    {item.category || "-"}
                  </Text>
                  <Text style={[styles.tableCell, styles.tableCellDescription]}>
                    {item.description || "-"}
                  </Text>
                  <Text style={[styles.tableCell, styles.tableCellUnit]}>
                    {item.unit || "-"}
                  </Text>
                  <Text style={[styles.tableCell, styles.tableCellQty]}>
                    {item.quantity || 0}
                  </Text>
                  <Text style={[styles.tableCell, styles.tableCellPrice]}>
                    {formatCurrency(item.unit_price)}
                  </Text>
                  <Text style={[styles.tableCell, styles.tableCellTotal]}>
                    {formatCurrency(item.total)}
                  </Text>
                </View>
              ))}
            </View>

            {/* Totals */}
            <View style={styles.totalsSection}>
              <View style={styles.totalsRow}>
                <Text style={styles.totalsLabel}>Subtotal:</Text>
                <Text style={styles.totalsValue}>
                  {formatCurrency(proposal.subtotal)}
                </Text>
              </View>
              {(proposal.discount_value || 0) > 0 && (
                <View style={styles.totalsRow}>
                  <Text style={styles.totalsLabel}>
                    Desconto
                    {proposal.discount_type === "percent"
                      ? ` (${proposal.discount_value}%)`
                      : ""}
                    :
                  </Text>
                  <Text style={styles.totalsValue}>
                    - {formatCurrency(discountAmount)}
                  </Text>
                </View>
              )}
              <View style={styles.totalFinal}>
                <Text style={styles.totalFinalLabel}>TOTAL:</Text>
                <Text style={styles.totalFinalValue}>
                  {formatCurrency(proposal.total)}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Terms */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>CONDIÇÕES COMERCIAIS</Text>
          <View style={styles.termsGrid}>
            <View style={styles.termItem}>
              <Text style={styles.termLabel}>Prazo de Execução</Text>
              <Text style={styles.termValue}>{proposal.execution_days || 60} dias</Text>
            </View>
            <View style={styles.termItem}>
              <Text style={styles.termLabel}>Validade da Proposta</Text>
              <Text style={styles.termValue}>{proposal.validity_days || 10} dias</Text>
            </View>
          </View>

          {proposal.payment_terms && (
            <View style={styles.termSection}>
              <Text style={[styles.termLabel, { marginBottom: 4 }]}>
                Forma de Pagamento:
              </Text>
              <Text style={styles.termText}>{proposal.payment_terms}</Text>
            </View>
          )}

          {proposal.warranty_terms && (
            <View style={styles.termSection}>
              <Text style={[styles.termLabel, { marginBottom: 4 }]}>Garantia:</Text>
              <Text style={styles.termText}>{proposal.warranty_terms}</Text>
            </View>
          )}

          {proposal.exclusions && (
            <View style={styles.termSection}>
              <Text style={[styles.termLabel, { marginBottom: 4 }]}>Exclusões:</Text>
              <Text style={styles.termText}>{proposal.exclusions}</Text>
            </View>
          )}

          {proposal.notes && (
            <View style={styles.termSection}>
              <Text style={[styles.termLabel, { marginBottom: 4 }]}>Observações:</Text>
              <Text style={styles.termText}>{proposal.notes}</Text>
            </View>
          )}
        </View>

        {/* Footer */}
        <Text style={styles.footer}>
          ARS Engenharia - Documento gerado automaticamente
        </Text>
      </Page>
    </Document>
  );
};
