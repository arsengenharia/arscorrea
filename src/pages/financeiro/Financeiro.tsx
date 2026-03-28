import { useNavigate, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { LayoutDashboard, Receipt, GitMerge, Split, Settings, FileCheck, HandCoins, ShieldAlert, BarChart3, MoreHorizontal } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

const primaryTabs = [
  { label: "Visão Geral", path: "/financeiro/visao-geral", icon: LayoutDashboard },
  { label: "Lançamentos", path: "/financeiro/lancamentos", icon: Receipt },
  { label: "Recebíveis", path: "/financeiro/recebiveis", icon: HandCoins },
  { label: "NF-e", path: "/financeiro/nfe", icon: FileCheck },
  { label: "Indicadores", path: "/financeiro/indicadores", icon: BarChart3 },
];

const secondaryTabs = [
  { label: "Conciliação", path: "/financeiro/conciliacao", icon: GitMerge },
  { label: "Rateio", path: "/financeiro/rateio", icon: Split },
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

  const isSecondaryActive = secondaryTabs.some((t) => location.pathname === t.path);

  return (
    <div className="flex gap-1 border-b mb-6">
      {primaryTabs.map((tab) => {
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

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className={cn(
              "flex items-center gap-1 px-3 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px whitespace-nowrap",
              isSecondaryActive
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30"
            )}
          >
            <MoreHorizontal className="h-4 w-4" />
            <span className="hidden sm:inline">Mais</span>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {secondaryTabs.map((tab) => (
            <DropdownMenuItem
              key={tab.path}
              onClick={() => navigate(tab.path)}
              className={cn(location.pathname === tab.path && "bg-muted")}
            >
              <tab.icon className="h-4 w-4 mr-2" />
              {tab.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
