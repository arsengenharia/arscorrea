import { Layout } from "@/components/layout/Layout";
import { SuppliersList } from "@/components/suppliers/SuppliersList";

export default function Suppliers() {
  return (
    <Layout>
      <div className="w-full max-w-6xl mx-auto">
        <SuppliersList />
      </div>
    </Layout>
  );
}
