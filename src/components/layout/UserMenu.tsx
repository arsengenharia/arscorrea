
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { useAuth } from "../auth/AuthProvider";
import { useIsMobile } from "@/hooks/use-mobile";

export function UserMenu() {
  const { user, signOut } = useAuth();
  const isMobile = useIsMobile();
  
  if (!user) return null;
  
  return (
    <div className="flex items-center justify-between p-2 md:p-4 border-t border-gray-200">
      <div className="text-sm font-medium truncate pr-2">
        {isMobile ? user.email?.split('@')[0] : user.email}
      </div>
      <Button 
        variant="ghost" 
        size="sm" 
        onClick={signOut} 
        className="flex items-center gap-1"
      >
        <LogOut size={16} />
        <span className="sr-only sm:not-sr-only sm:inline">Sair</span>
      </Button>
    </div>
  );
}
