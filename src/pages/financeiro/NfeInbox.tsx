import { Layout } from "@/components/layout/Layout";
import { FinanceiroTabs } from "./Financeiro";

export default function NfeInbox() {
  return (
    <Layout>
      <div className="w-full max-w-6xl mx-auto space-y-6">
        <h2 className="text-3xl font-bold tracking-tight">Financeiro</h2>
        <FinanceiroTabs />
        <h3 className="text-xl font-semibold">Notas Fiscais Eletrônicas</h3>
        <p className="text-muted-foreground py-8 text-center">
          Módulo NF-e — em construção. As notas fiscais recebidas por email aparecerão aqui para revisão e aprovação.
        </p>
      </div>
    </Layout>
  );
}
