import { Document, Page, Text, View, StyleSheet, Image } from "@react-pdf/renderer";

const LOGO_URL = "/lovable-uploads/ars-correa-logo.png";

const fmt = (value: number) =>
  value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const fmtDate = (dateStr: string) => {
  const parts = dateStr.split("-");
  return parts.reverse().join("/");
};

const s = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: "Helvetica",
    fontSize: 10,
    color: "#333",
  },
  header: {
    backgroundColor: "#1e3a5f",
    padding: 16,
    marginBottom: 20,
    borderRadius: 4,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  headerLogo: {
    width: 48,
    height: 48,
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#ffffff",
    marginBottom: 4,
  },
  headerSub: {
    fontSize: 10,
    color: "#cbd5e1",
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#1e3a5f",
    marginBottom: 10,
    borderBottom: "1px solid #e5e7eb",
    paddingBottom: 5,
  },
  table: {
    marginTop: 4,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#1e3a5f",
    padding: 7,
    fontWeight: "bold",
    fontSize: 9,
  },
  tableHeaderText: {
    color: "#ffffff",
    fontWeight: "bold",
    fontSize: 9,
  },
  tableRow: {
    flexDirection: "row",
    padding: 7,
    borderBottom: "1px solid #e5e7eb",
  },
  tableRowAlt: {
    flexDirection: "row",
    padding: 7,
    borderBottom: "1px solid #e5e7eb",
    backgroundColor: "#f8fafc",
  },
  summaryLabel: {
    flex: 1,
    fontSize: 10,
    fontWeight: "bold",
    color: "#374151",
  },
  summaryValue: {
    width: 160,
    textAlign: "right",
    fontSize: 10,
    color: "#111827",
  },
  summaryLabelHeader: {
    flex: 1,
    color: "#ffffff",
    fontWeight: "bold",
    fontSize: 9,
  },
  summaryValueHeader: {
    width: 160,
    textAlign: "right",
    color: "#ffffff",
    fontWeight: "bold",
    fontSize: 9,
  },
  colData: { width: "12%", fontSize: 8 },
  colCategoria: { width: "22%", fontSize: 8 },
  colFornecedor: { width: "28%", fontSize: 8 },
  colTipoDoc: { width: "18%", fontSize: 8 },
  colValor: { width: "20%", textAlign: "right", fontSize: 8 },
  colDataHeader: { width: "12%", color: "#ffffff", fontWeight: "bold", fontSize: 8 },
  colCategoriaHeader: { width: "22%", color: "#ffffff", fontWeight: "bold", fontSize: 8 },
  colFornecedorHeader: { width: "28%", color: "#ffffff", fontWeight: "bold", fontSize: 8 },
  colTipoDocHeader: { width: "18%", color: "#ffffff", fontWeight: "bold", fontSize: 8 },
  colValorHeader: { width: "20%", textAlign: "right", color: "#ffffff", fontWeight: "bold", fontSize: 8 },
  colNum: { width: "8%", fontSize: 9 },
  colSupplier: { width: "62%", fontSize: 9 },
  colTotal: { width: "30%", textAlign: "right", fontSize: 9 },
  colNumHeader: { width: "8%", color: "#ffffff", fontWeight: "bold", fontSize: 9 },
  colSupplierHeader: { width: "62%", color: "#ffffff", fontWeight: "bold", fontSize: 9 },
  colTotalHeader: { width: "30%", textAlign: "right", color: "#ffffff", fontWeight: "bold", fontSize: 9 },
  negativeValue: {
    color: "#dc2626",
  },
  footer: {
    position: "absolute",
    bottom: 30,
    left: 40,
    right: 40,
    textAlign: "center",
    fontSize: 8,
    color: "#999",
    borderTop: "1px solid #e5e7eb",
    paddingTop: 10,
  },
  section: {
    marginBottom: 16,
  },
});

interface FinanceiroPDFProps {
  projectName: string;
  totalRecebido: number;
  totalGasto: number;
  saldo: number;
  margem: number;
  iecAtual: number | null;
  orcamentoPrevisto: number | null;
  entries: Array<{
    data: string;
    valor: number;
    tipo_documento: string;
    observacoes: string | null;
    category: { nome: string; prefixo: string } | null;
    supplier: { trade_name: string } | null;
  }>;
}

function Footer() {
  return (
    <View style={s.footer} fixed>
      <Text>ARS Engenharia — Relatório Financeiro</Text>
    </View>
  );
}

export function FinanceiroPDF({
  projectName,
  totalRecebido,
  totalGasto,
  saldo,
  margem,
  iecAtual,
  orcamentoPrevisto,
  entries,
}: FinanceiroPDFProps) {
  const today = new Date().toLocaleDateString("pt-BR");

  // Build top suppliers
  const supplierMap: Record<string, number> = {};
  for (const e of entries) {
    if (e.valor < 0 && e.supplier) {
      const name = e.supplier.trade_name;
      supplierMap[name] = (supplierMap[name] ?? 0) + Math.abs(e.valor);
    }
  }
  const topSuppliers = Object.entries(supplierMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15);

  const summaryRows = [
    { label: "Total Recebido", value: fmt(totalRecebido) },
    { label: "Total Gasto", value: fmt(totalGasto) },
    { label: "Saldo da Obra", value: fmt(saldo) },
    { label: "Margem Bruta", value: `${margem.toFixed(2)}%` },
    { label: "IEC", value: iecAtual != null ? iecAtual.toFixed(3) : "—" },
    { label: "Orçamento Previsto", value: orcamentoPrevisto != null ? fmt(orcamentoPrevisto) : "—" },
  ];

  return (
    <Document title={`Relatório Financeiro — ${projectName}`} author="ARS Engenharia">
      {/* Page 1 — Summary */}
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          <Image style={s.headerLogo} src={LOGO_URL} />
          <View style={s.headerText}>
            <Text style={s.headerTitle}>ARS Engenharia — Relatório Financeiro</Text>
            <Text style={s.headerSub}>{projectName}</Text>
            <Text style={s.headerSub}>Gerado em: {today}</Text>
          </View>
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>Resumo Financeiro</Text>
          <View style={s.table}>
            <View style={s.tableHeader}>
              <Text style={s.summaryLabelHeader}>Métrica</Text>
              <Text style={s.summaryValueHeader}>Valor</Text>
            </View>
            {summaryRows.map((row, i) => (
              <View key={i} style={i % 2 === 0 ? s.tableRow : s.tableRowAlt}>
                <Text style={s.summaryLabel}>{row.label}</Text>
                <Text style={s.summaryValue}>{row.value}</Text>
              </View>
            ))}
          </View>
        </View>

        <Footer />
      </Page>

      {/* Page 2 — Extrato Financeiro */}
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          <Image style={s.headerLogo} src={LOGO_URL} />
          <View style={s.headerText}>
            <Text style={s.headerTitle}>Extrato Financeiro</Text>
            <Text style={s.headerSub}>{projectName}</Text>
          </View>
        </View>

        <View style={s.section}>
          <View style={s.table}>
            <View style={s.tableHeader}>
              <Text style={s.colDataHeader}>Data</Text>
              <Text style={s.colCategoriaHeader}>Categoria</Text>
              <Text style={s.colFornecedorHeader}>Fornecedor</Text>
              <Text style={s.colTipoDocHeader}>Tipo Doc.</Text>
              <Text style={s.colValorHeader}>Valor</Text>
            </View>
            {entries.map((entry, i) => {
              const isNeg = entry.valor < 0;
              const rowStyle = i % 2 === 0 ? s.tableRow : s.tableRowAlt;
              const valorStr = isNeg
                ? `-${fmt(Math.abs(entry.valor))}`
                : fmt(entry.valor);
              return (
                <View key={i} style={rowStyle}>
                  <Text style={s.colData}>{fmtDate(entry.data)}</Text>
                  <Text style={s.colCategoria}>
                    {entry.category
                      ? `${entry.category.prefixo} ${entry.category.nome}`
                      : "—"}
                  </Text>
                  <Text style={s.colFornecedor}>
                    {entry.supplier?.trade_name ?? "—"}
                  </Text>
                  <Text style={s.colTipoDoc}>{entry.tipo_documento || "—"}</Text>
                  <Text style={[s.colValor, isNeg ? s.negativeValue : {}]}>
                    {valorStr}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

        <Footer />
      </Page>

      {/* Page 3 — Top Fornecedores (if data exists) */}
      {topSuppliers.length > 0 && (
        <Page size="A4" style={s.page}>
          <View style={s.header}>
            <Image style={s.headerLogo} src={LOGO_URL} />
            <View style={s.headerText}>
              <Text style={s.headerTitle}>Top Fornecedores</Text>
              <Text style={s.headerSub}>{projectName}</Text>
            </View>
          </View>

          <View style={s.section}>
            <View style={s.table}>
              <View style={s.tableHeader}>
                <Text style={s.colNumHeader}>#</Text>
                <Text style={s.colSupplierHeader}>Fornecedor</Text>
                <Text style={s.colTotalHeader}>Total Gasto</Text>
              </View>
              {topSuppliers.map(([name, total], i) => (
                <View key={i} style={i % 2 === 0 ? s.tableRow : s.tableRowAlt}>
                  <Text style={s.colNum}>{i + 1}</Text>
                  <Text style={s.colSupplier}>{name}</Text>
                  <Text style={s.colTotal}>{fmt(total)}</Text>
                </View>
              ))}
            </View>
          </View>

          <Footer />
        </Page>
      )}
    </Document>
  );
}
