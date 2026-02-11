import { useAuth } from "@/components/auth/AuthProvider";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";

export function PortalLayout({ children }: { children: React.ReactNode }) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isProjectDetail = location.pathname.startsWith("/portal/obra/");

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/90 backdrop-blur-md">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <img
              src="/lovable-uploads/ars-correa-logo.png"
              alt="ARS Correa"
              className="h-8 w-auto cursor-pointer"
              onClick={() => navigate("/portal/obras")}
            />
            <span className="text-sm font-medium text-muted-foreground hidden sm:inline">
              Portal do Cliente
            </span>
            {isProjectDetail && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/portal/obras")}
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                ← Minhas Obras
              </Button>
            )}
          </div>

          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground hidden sm:inline">
              {user?.email}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={signOut}
              className="text-muted-foreground hover:text-destructive"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sair
            </Button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  );
}
