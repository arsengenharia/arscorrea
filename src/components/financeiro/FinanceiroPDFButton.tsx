import { PDFDownloadLink } from "@react-pdf/renderer";
import { FinanceiroPDF } from "./FinanceiroPDF";
import { Button } from "@/components/ui/button";
import { FileDown } from "lucide-react";

interface FinanceiroPDFButtonProps {
  projectName: string;
  totalRecebido: number;
  totalGasto: number;
  saldo: number;
  margem: number;
  iecAtual: number | null;
  orcamentoPrevisto: number | null;
  entries: any[];
}

export function FinanceiroPDFButton(props: FinanceiroPDFButtonProps) {
  const fileName = `financeiro-${props.projectName.replace(/\s+/g, "-").toLowerCase()}-${new Date().toISOString().split("T")[0]}.pdf`;

  return (
    <PDFDownloadLink
      document={<FinanceiroPDF {...props} />}
      fileName={fileName}
    >
      {({ loading }) => (
        <Button variant="outline" size="sm" disabled={loading}>
          <FileDown className="w-4 h-4 mr-2" />
          {loading ? "Gerando PDF..." : "Exportar PDF"}
        </Button>
      )}
    </PDFDownloadLink>
  );
}
