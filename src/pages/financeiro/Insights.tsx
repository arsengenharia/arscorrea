import { Layout } from "@/components/layout/Layout";
import { FinanceiroTabs } from "./Financeiro";
import { RiscosOperacionais } from "@/components/financeiro/RiscosOperacionais";
import { ProjecoesFinanceiras } from "@/components/financeiro/ProjecoesFinanceiras";
import { ResolvidosRecentemente } from "@/components/financeiro/ResolvidosRecentemente";
import { useRealtimeInsights } from "@/hooks/useRealtimeInsights";

export default function Insights() {
  useRealtimeInsights();

  return (
    <Layout>
      <div className="w-full max-w-5xl mx-auto space-y-6 pb-10">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-800">Financeiro</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Insights operacionais e projecoes financeiras em tempo real
          </p>
        </div>

        <FinanceiroTabs />

        <div className="space-y-8">
          <RiscosOperacionais />
          <ProjecoesFinanceiras />
          <ResolvidosRecentemente />
        </div>
      </div>
    </Layout>
  );
}
