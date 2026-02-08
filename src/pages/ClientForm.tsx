
import { Layout } from "@/components/layout/Layout";
import { ClientForm } from "@/components/clients/ClientForm";

export default function ClientFormPage() {
  return (
    <Layout>
      <div className="w-full max-w-6xl mx-auto">
        <h2 className="text-3xl font-bold tracking-tight mb-6">Cadastro de Cliente</h2>
        <ClientForm />
      </div>
    </Layout>
  );
}
