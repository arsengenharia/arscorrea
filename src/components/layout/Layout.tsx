
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { UserMenu } from "./UserMenu";
import { useIsMobile } from "@/hooks/use-mobile";

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const isMobile = useIsMobile();
  
  return (
    <SidebarProvider defaultOpen={false}>
      <div className="grid min-h-screen grid-cols-[auto_1fr]">
        <AppSidebar />
        <div className="flex flex-col">
          <UserMenu />
          <main className={`flex-1 overflow-auto ${isMobile ? 'p-3' : 'p-8'} max-w-[1920px] mx-auto w-full`}>
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
