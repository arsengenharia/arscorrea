import { Document, Page, Text, View, Image } from "@react-pdf/renderer";
import { format } from "date-fns";
import { reportStyles as s } from "./reportStyles";

const fmt = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

const n = (v: number | null | undefined) => (v != null ? v.toFixed(1) : "—");

interface ReportData {
  obra: { nome: string; gestor?: string; data_inicio?: string; data_conclusao_prevista?: string; prazo_dias?: number; status: string };
  cliente: { nome: string; codigo: string; responsavel?: string; telefone?: string; endereco?: string };
  analise_fisica: {
    ifec: { valor: number; descricao: string };
    iec: { valor: number; descricao: string };
    producao_mensal: { mes_ano: string; previsto: number; real: number }[];
    producao_acumulada: { mes_ano: string; previsto: number; real: number }[];
  };
  analise_financeira: {
    custo_direto_previsto: number; custo_direto_real: number;
    custo_indireto_previsto: number; custo_indireto_real: number;
    custo_total_previsto: number; custo_total_real: number;
    receita_total_prevista: number; receita_total_realizada: number;
    saldo_obra: number; margem_lucro: number;
  };
  observacoes_gerenciais?: string;
}

function Header() {
  return (
    <View style={s.header}>
      <Image src="/lovable-uploads/ars-correa-logo.png" style={s.logo} />
      <Text style={s.headerDate}>{format(new Date(), "dd/MM/yyyy")}</Text>
    </View>
  );
}

function Footer() {
  return (
    <View style={s.footer} fixed>
      <Text>ARS Correa Engenharia — Relatório Gerencial</Text>
    </View>
  );
}

function ProductionTable({ title, data }: { title: string; data: { mes_ano: string; previsto: number; real: number }[] }) {
  return (
    <View style={s.section}>
      <Text style={s.sectionTitle}>{title}</Text>
      <View style={s.table}>
        <View style={s.tableHeader}>
          <Text style={s.colMes}>Mês/Ano</Text>
          <Text style={s.colPrevisto}>Previsto %</Text>
          <Text style={s.colReal}>Real %</Text>
          <Text style={s.colVariacao}>Variação %</Text>
        </View>
        {data.map((row, i) => (
          <View key={i} style={i % 2 === 0 ? s.tableRow : s.tableRowAlt}>
            <Text style={s.colMes}>{row.mes_ano}</Text>
            <Text style={s.colPrevisto}>{n(row.previsto)}</Text>
            <Text style={s.colReal}>{n(row.real)}</Text>
            <Text style={s.colVariacao}>{n(row.real - row.previsto)}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

export function ReportPDF({ data }: { data: ReportData }) {
  const { obra, cliente, analise_fisica: af, analise_financeira: fin } = data;

  return (
    <Document title={`Relatório Gerencial - ${obra.nome}`} author="ARS Correa Engenharia">
      {/* Page 1 - Info */}
      <Page size="A4" style={s.page}>
        <Header />
        <Text style={s.title}>RELATÓRIO GERENCIAL — {obra.nome}</Text>

        <View style={s.section}>
          <Text style={s.sectionTitle}>Informações da Obra</Text>
          <View style={s.row}><Text style={s.label}>Nome:</Text><Text style={s.value}>{obra.nome}</Text></View>
          <View style={s.row}><Text style={s.label}>Gestor:</Text><Text style={s.value}>{obra.gestor || "—"}</Text></View>
          <View style={s.row}><Text style={s.label}>Data de Início:</Text><Text style={s.value}>{obra.data_inicio || "—"}</Text></View>
          <View style={s.row}><Text style={s.label}>Previsão de Conclusão:</Text><Text style={s.value}>{obra.data_conclusao_prevista || "—"}</Text></View>
          <View style={s.row}><Text style={s.label}>Prazo:</Text><Text style={s.value}>{obra.prazo_dias != null ? `${obra.prazo_dias} dias` : "—"}</Text></View>
          <View style={s.row}><Text style={s.label}>Status:</Text><Text style={s.value}>{obra.status}</Text></View>
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>Informações do Cliente</Text>
          <View style={s.row}><Text style={s.label}>Nome:</Text><Text style={s.value}>{cliente.nome}</Text></View>
          <View style={s.row}><Text style={s.label}>Código:</Text><Text style={s.value}>{cliente.codigo}</Text></View>
          <View style={s.row}><Text style={s.label}>Responsável:</Text><Text style={s.value}>{cliente.responsavel || "—"}</Text></View>
          <View style={s.row}><Text style={s.label}>Telefone:</Text><Text style={s.value}>{cliente.telefone || "—"}</Text></View>
          <View style={s.row}><Text style={s.label}>Endereço:</Text><Text style={s.value}>{cliente.endereco || "—"}</Text></View>
        </View>
        <Footer />
      </Page>

      {/* Page 2 - Physical Analysis */}
      <Page size="A4" style={s.page}>
        <Header />
        <Text style={s.sectionTitle}>Análise Física</Text>

        <View style={s.kpiRow}>
          <View style={s.kpiCard}>
            <Text style={s.kpiLabel}>IFEC</Text>
            <Text style={s.kpiValue}>{af.ifec.valor}%</Text>
            <Text style={s.kpiDesc}>{af.ifec.descricao}</Text>
          </View>
          <View style={s.kpiCard}>
            <Text style={s.kpiLabel}>IEC</Text>
            <Text style={s.kpiValue}>{af.iec.valor}%</Text>
            <Text style={s.kpiDesc}>{af.iec.descricao}</Text>
          </View>
        </View>

        {af.producao_mensal.length > 0 && (
          <ProductionTable title="Produção Mensal (%)" data={af.producao_mensal} />
        )}
        {af.producao_acumulada.length > 0 && (
          <ProductionTable title="Produção Acumulada (%)" data={af.producao_acumulada} />
        )}
        <Footer />
      </Page>

      {/* Page 3 - Financial Analysis */}
      <Page size="A4" style={s.page}>
        <Header />
        <Text style={s.sectionTitle}>Análise Financeira</Text>

        <View style={s.section}>
          <Text style={{ ...s.sectionTitle, fontSize: 11 }}>Custos</Text>
          <View style={s.table}>
            <View style={s.tableHeader}>
              <Text style={s.colTipo}>Tipo</Text>
              <Text style={s.colValPrev}>Previsto</Text>
              <Text style={s.colValReal}>Realizado</Text>
            </View>
            <View style={s.tableRow}>
              <Text style={s.colTipo}>Direto</Text>
              <Text style={s.colValPrev}>{fmt(fin.custo_direto_previsto)}</Text>
              <Text style={s.colValReal}>{fmt(fin.custo_direto_real)}</Text>
            </View>
            <View style={s.tableRowAlt}>
              <Text style={s.colTipo}>Indireto</Text>
              <Text style={s.colValPrev}>{fmt(fin.custo_indireto_previsto)}</Text>
              <Text style={s.colValReal}>{fmt(fin.custo_indireto_real)}</Text>
            </View>
            <View style={s.totalRow}>
              <Text style={s.colTipo}>TOTAL</Text>
              <Text style={s.colValPrev}>{fmt(fin.custo_total_previsto)}</Text>
              <Text style={s.colValReal}>{fmt(fin.custo_total_real)}</Text>
            </View>
          </View>
        </View>

        <View style={s.section}>
          <Text style={{ ...s.sectionTitle, fontSize: 11 }}>Receitas</Text>
          <View style={s.row}><Text style={s.label}>Prevista:</Text><Text style={s.value}>{fmt(fin.receita_total_prevista)}</Text></View>
          <View style={s.row}><Text style={s.label}>Realizada:</Text><Text style={s.value}>{fmt(fin.receita_total_realizada)}</Text></View>
        </View>

        <View style={s.resultSection}>
          <Text style={{ ...s.sectionTitle, color: "#1e40af", borderBottomWidth: 0 }}>Resultado</Text>
          <View style={s.resultRow}><Text style={s.resultLabel}>Saldo da Obra:</Text><Text style={s.resultValue}>{fmt(fin.saldo_obra)}</Text></View>
          <View style={s.resultRow}><Text style={s.resultLabel}>Margem de Lucro:</Text><Text style={s.resultValue}>{fin.margem_lucro}%</Text></View>
        </View>

        {data.observacoes_gerenciais && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Observações Gerenciais</Text>
            <View style={s.observations}><Text>{data.observacoes_gerenciais}</Text></View>
          </View>
        )}
        <Footer />
      </Page>
    </Document>
  );
}
