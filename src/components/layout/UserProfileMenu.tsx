import { useNavigate } from "react-router-dom";
import { Bell, LogOut, User } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/components/auth/AuthProvider";
import { useProfile } from "@/hooks/use-profile";

export function UserProfileMenu() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { profile, getInitials } = useProfile();

  if (!user) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-2 rounded-full focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">
          <Avatar className="h-8 w-8 cursor-pointer">
            {profile.avatarUrl && <AvatarImage src={profile.avatarUrl} alt="Avatar" />}
            <AvatarFallback className="bg-primary text-primary-foreground text-xs font-medium">
              {getInitials()}
            </AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">
              {profile.displayName || "Usuário"}
            </p>
            <p className="text-xs text-muted-foreground leading-none">
              {user.email}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => navigate("/perfil")} className="cursor-pointer">
          <User className="mr-2 h-4 w-4" />
          Meu Perfil
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => navigate("/notificacoes")} className="cursor-pointer">
          <Bell className="mr-2 h-4 w-4" />
          Notificações
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={signOut} className="cursor-pointer">
          <LogOut className="mr-2 h-4 w-4" />
          Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
