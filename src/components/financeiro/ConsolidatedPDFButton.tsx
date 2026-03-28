import { PDFDownloadLink } from "@react-pdf/renderer";
import { ConsolidatedPDF } from "./ConsolidatedPDF";
import { Button } from "@/components/ui/button";
import { FileDown } from "lucide-react";

interface ConsolidatedPDFButtonProps {
  projects: any[];
  totalReceita: number;
  totalCusto: number;
  totalSaldo: number;
  margemMedia: number;
}

export function ConsolidatedPDFButton(props: ConsolidatedPDFButtonProps) {
  const fileName = `financeiro-consolidado-${new Date().toISOString().split("T")[0]}.pdf`;

  return (
    <PDFDownloadLink
      document={
        <ConsolidatedPDF
          {...props}
          generatedAt={new Date().toLocaleDateString("pt-BR")}
        />
      }
      fileName={fileName}
    >
      {({ loading }) => (
        <Button variant="outline" size="sm" disabled={loading}>
          <FileDown className="w-4 h-4 mr-2" />
          {loading ? "Gerando..." : "Exportar PDF Geral"}
        </Button>
      )}
    </PDFDownloadLink>
  );
}
