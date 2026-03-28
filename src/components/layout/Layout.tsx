import { TopNavigation } from "./TopNavigation";
import { useIsMobile } from "@/hooks/use-mobile";
import { ChatPanel } from "@/components/ai/ChatPanel";
import { AiContextProvider } from "@/contexts/AiContext";

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const isMobile = useIsMobile();

  return (
    <AiContextProvider>
      <div className="min-h-screen bg-background">
        <TopNavigation />
        <main
          className={`pt-14 md:pt-16 ${isMobile ? "p-3" : "p-8"} max-w-[1920px] mx-auto w-full`}
        >
          {children}
        </main>
        <ChatPanel />
      </div>
    </AiContextProvider>
  );
}

