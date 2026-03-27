import { useNavigate, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { LayoutDashboard, Receipt, GitMerge, Split, Settings, FileCheck, HandCoins, ShieldAlert } from "lucide-react";

const tabs = [
  { label: "Visão Geral", path: "/financeiro/visao-geral", icon: LayoutDashboard },
  { label: "Lançamentos", path: "/financeiro/lancamentos", icon: Receipt },
  { label: "Recebíveis", path: "/financeiro/recebiveis", icon: HandCoins },
  { label: "Conciliação", path: "/financeiro/conciliacao", icon: GitMerge },
  { label: "Rateio", path: "/financeiro/rateio", icon: Split },
  { label: "NF-e", path: "/financeiro/nfe", icon: FileCheck },
  { label: "Anomalias", path: "/financeiro/anomalias", icon: ShieldAlert },
  { label: "Configurações", path: "/financeiro/configuracoes", icon: Settings },
];

export default function Financeiro() {
  const navigate = useNavigate();
  const location = useLocation();

  if (location.pathname === "/financeiro") {
    navigate("/financeiro/visao-geral", { replace: true });
    return null;
  }

  return null;
}

export function FinanceiroTabs() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div className="flex gap-1 border-b mb-6 overflow-x-auto">
      {tabs.map((tab) => {
        const isActive = location.pathname === tab.path;
        return (
          <button
            key={tab.path}
            onClick={() => navigate(tab.path)}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px whitespace-nowrap",
              isActive
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30"
            )}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
