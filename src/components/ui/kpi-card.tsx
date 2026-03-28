import { Card, CardContent } from "@/components/ui/card";
import { type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface KpiCardProps {
  icon: LucideIcon;
  iconBg: string;       // e.g. "emerald", "rose", "blue", "amber", "purple", "sky"
  label: string;
  value: string | number;
  valueClassName?: string; // override value color
  subtitle?: string;
  className?: string;
}

const bgMap: Record<string, string> = {
  emerald: "bg-emerald-50 text-emerald-600",
  rose: "bg-rose-50 text-rose-600",
  blue: "bg-blue-50 text-blue-600",
  amber: "bg-amber-50 text-amber-600",
  purple: "bg-purple-50 text-purple-600",
  sky: "bg-sky-50 text-sky-600",
  red: "bg-red-50 text-red-600",
  green: "bg-green-50 text-green-600",
  orange: "bg-orange-50 text-orange-600",
  slate: "bg-slate-50 text-slate-600",
};

export function KpiCard({ icon: Icon, iconBg, label, value, valueClassName, subtitle, className }: KpiCardProps) {
  const colors = bgMap[iconBg] || bgMap.blue;
  return (
    <Card className={cn("hover:shadow-md transition-shadow", className)}>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <div className={cn("p-1.5 rounded-md", colors.split(" ")[0])}>
            <Icon className={cn("h-4 w-4", colors.split(" ")[1])} />
          </div>
          <span className="text-xs text-muted-foreground font-medium">{label}</span>
        </div>
        <p className={cn("text-xl font-bold text-foreground", valueClassName)}>{value}</p>
        {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
      </CardContent>
    </Card>
  );
}
