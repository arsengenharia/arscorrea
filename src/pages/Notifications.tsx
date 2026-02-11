import { Layout } from "@/components/layout/Layout";
import { Bell } from "lucide-react";

export default function Notifications() {
  return (
    <Layout>
      <div className="max-w-xl mx-auto p-4 md:p-8">
        <h1 className="text-2xl font-bold mb-6">Notificações</h1>
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <Bell className="h-12 w-12 mb-4 opacity-40" />
          <p className="text-lg">Nenhuma notificação no momento</p>
          <p className="text-sm mt-1">Quando houver novidades, elas aparecerão aqui.</p>
        </div>
      </div>
    </Layout>
  );
}
