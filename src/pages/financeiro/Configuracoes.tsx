import { Layout } from "@/components/layout/Layout";
import { FinanceiroTabs } from "./Financeiro";

export default function Configuracoes() {
  return (
    <Layout>
      <div className="w-full max-w-6xl mx-auto space-y-6">
        <h2 className="text-3xl font-bold tracking-tight">Financeiro</h2>
        <FinanceiroTabs />
        <p className="text-muted-foreground py-8 text-center">Configurações — em construção</p>
      </div>
    </Layout>
  );
}
