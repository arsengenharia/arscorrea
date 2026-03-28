import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

const fmt = (value: number) =>
  value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

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
  tableRowTotals: {
    flexDirection: "row",
    padding: 7,
    borderTop: "2px solid #1e3a5f",
    backgroundColor: "#e8eef6",
    fontWeight: "bold",
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
  // Comparison table columns
  colObra: { width: "22%", fontSize: 8 },
  colStatus: { width: "12%", fontSize: 8 },
  colOrcamento: { width: "12%", textAlign: "right", fontSize: 8 },
  colReceita: { width: "12%", textAlign: "right", fontSize: 8 },
  colCusto: { width: "12%", textAlign: "right", fontSize: 8 },
  colSaldo: { width: "12%", textAlign: "right", fontSize: 8 },
  colMargem: { width: "9%", textAlign: "right", fontSize: 8 },
  colIec: { width: "9%", textAlign: "right", fontSize: 8 },
  colObraHeader: { width: "22%", color: "#ffffff", fontWeight: "bold", fontSize: 8 },
  colStatusHeader: { width: "12%", color: "#ffffff", fontWeight: "bold", fontSize: 8 },
  colOrcamentoHeader: { width: "12%", textAlign: "right", color: "#ffffff", fontWeight: "bold", fontSize: 8 },
  colReceitaHeader: { width: "12%", textAlign: "right", color: "#ffffff", fontWeight: "bold", fontSize: 8 },
  colCustoHeader: { width: "12%", textAlign: "right", color: "#ffffff", fontWeight: "bold", fontSize: 8 },
  colSaldoHeader: { width: "12%", textAlign: "right", color: "#ffffff", fontWeight: "bold", fontSize: 8 },
  colMargemHeader: { width: "9%", textAlign: "right", color: "#ffffff", fontWeight: "bold", fontSize: 8 },
  colIecHeader: { width: "9%", textAlign: "right", color: "#ffffff", fontWeight: "bold", fontSize: 8 },
  negativeValue: {
    color: "#dc2626",
  },
  boldText: {
    fontWeight: "bold",
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

export interface ConsolidatedPDFProps {
  projects: Array<{
    name: string;
    status: string;
    orcamento_previsto: number | null;
    receita_realizada: number | null;
    custo_realizado: number | null;
    saldo_atual: number | null;
    margem_atual: number | null;
    iec_atual: number | null;
  }>;
  totalReceita: number;
  totalCusto: number;
  totalSaldo: number;
  margemMedia: number;
  generatedAt: string;
}

function Footer() {
  return (
    <View style={s.footer} fixed>
      <Text>ARS Engenharia — Relatório Financeiro Consolidado</Text>
    </View>
  );
}

export function ConsolidatedPDF({
  projects,
  totalReceita,
  totalCusto,
  totalSaldo,
  margemMedia,
  generatedAt,
}: ConsolidatedPDFProps) {
  const summaryRows = [
    { label: "Receita Total", value: fmt(totalReceita) },
    { label: "Custo Total", value: fmt(totalCusto) },
    { label: "Saldo Global", value: fmt(totalSaldo), negative: totalSaldo < 0 },
    { label: "Margem Média", value: `${margemMedia.toFixed(2)}%` },
    { label: "Total de Obras", value: String(projects.length) },
  ];

  return (
    <Document title="Relatório Financeiro Consolidado — ARS Engenharia" author="ARS Engenharia">
      {/* Page 1 — Executive Summary */}
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          <Text style={s.headerTitle}>ARS Engenharia — Relatório Financeiro Consolidado</Text>
          <Text style={s.headerSub}>Gerado em: {generatedAt}</Text>
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>Resumo Executivo</Text>
          <View style={s.table}>
            <View style={s.tableHeader}>
              <Text style={s.summaryLabelHeader}>Métrica</Text>
              <Text style={s.summaryValueHeader}>Valor</Text>
            </View>
            {summaryRows.map((row, i) => (
              <View key={i} style={i % 2 === 0 ? s.tableRow : s.tableRowAlt}>
                <Text style={s.summaryLabel}>{row.label}</Text>
                <Text style={[s.summaryValue, row.negative ? s.negativeValue : {}]}>
                  {row.value}
                </Text>
              </View>
            ))}
          </View>
        </View>

        <Footer />
      </Page>

      {/* Page 2 — Projects Comparison Table */}
      <Page size="A4" style={s.page} orientation="landscape">
        <View style={s.header}>
          <Text style={s.headerTitle}>Comparativo por Obra</Text>
          <Text style={s.headerSub}>Gerado em: {generatedAt}</Text>
        </View>

        <View style={s.section}>
          <View style={s.table}>
            <View style={s.tableHeader}>
              <Text style={s.colObraHeader}>Obra</Text>
              <Text style={s.colStatusHeader}>Status</Text>
              <Text style={s.colOrcamentoHeader}>Orçamento</Text>
              <Text style={s.colReceitaHeader}>Receita</Text>
              <Text style={s.colCustoHeader}>Custo</Text>
              <Text style={s.colSaldoHeader}>Saldo</Text>
              <Text style={s.colMargemHeader}>Margem</Text>
              <Text style={s.colIecHeader}>IEC</Text>
            </View>

            {projects.map((p, i) => {
              const saldo = Number(p.saldo_atual) || 0;
              const iec = p.iec_atual != null ? Number(p.iec_atual) : null;
              const isSaldoNeg = saldo < 0;
              const isIecHigh = iec != null && iec > 1;
              const rowStyle = i % 2 === 0 ? s.tableRow : s.tableRowAlt;

              return (
                <View key={i} style={rowStyle}>
                  <Text style={s.colObra}>{p.name}</Text>
                  <Text style={s.colStatus}>{p.status}</Text>
                  <Text style={s.colOrcamento}>
                    {p.orcamento_previsto != null ? fmt(Number(p.orcamento_previsto)) : "—"}
                  </Text>
                  <Text style={s.colReceita}>
                    {fmt(Number(p.receita_realizada) || 0)}
                  </Text>
                  <Text style={s.colCusto}>
                    {fmt(Number(p.custo_realizado) || 0)}
                  </Text>
                  <Text style={[s.colSaldo, isSaldoNeg ? s.negativeValue : {}]}>
                    {fmt(saldo)}
                  </Text>
                  <Text style={s.colMargem}>
                    {p.margem_atual != null ? `${Number(p.margem_atual).toFixed(1)}%` : "—"}
                  </Text>
                  <Text style={[s.colIec, isIecHigh ? s.negativeValue : {}]}>
                    {iec != null ? iec.toFixed(3) : "—"}
                  </Text>
                </View>
              );
            })}

            {/* Totals row */}
            <View style={s.tableRowTotals}>
              <Text style={[s.colObra, s.boldText]}>TOTAL</Text>
              <Text style={s.colStatus}>—</Text>
              <Text style={s.colOrcamento}>—</Text>
              <Text style={[s.colReceita, s.boldText]}>{fmt(totalReceita)}</Text>
              <Text style={[s.colCusto, s.boldText]}>{fmt(totalCusto)}</Text>
              <Text style={[s.colSaldo, s.boldText, totalSaldo < 0 ? s.negativeValue : {}]}>
                {fmt(totalSaldo)}
              </Text>
              <Text style={[s.colMargem, s.boldText]}>{margemMedia.toFixed(1)}%</Text>
              <Text style={s.colIec}>—</Text>
            </View>
          </View>
        </View>

        <Footer />
      </Page>
    </Document>
  );
}
