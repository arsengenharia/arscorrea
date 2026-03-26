import { useNavigate, useLocation } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { cn } from "@/lib/utils";
import { Tags, Landmark, GitMerge } from "lucide-react";

const tabs = [
  { label: "Categorias", path: "/financeiro/categorias", icon: Tags },
  { label: "Contas Bancárias", path: "/financeiro/contas", icon: Landmark },
  { label: "Conciliação", path: "/financeiro/conciliacao", icon: GitMerge },
];

export default function Financeiro() {
  const navigate = useNavigate();
  const location = useLocation();

  // Redirect /financeiro to /financeiro/categorias
  if (location.pathname === "/financeiro") {
    navigate("/financeiro/categorias", { replace: true });
    return null;
  }

  return null;
}

export function FinanceiroTabs() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div className="flex gap-1 border-b mb-6">
      {tabs.map((tab) => (
        <button
          key={tab.path}
          onClick={() => navigate(tab.path)}
          className={cn(
            "flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px",
            location.pathname === tab.path
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30"
          )}
        >
          <tab.icon className="h-4 w-4" />
          {tab.label}
        </button>
      ))}
    </div>
  );
}
