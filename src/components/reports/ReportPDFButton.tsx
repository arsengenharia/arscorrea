import { PDFDownloadLink } from "@react-pdf/renderer";
import { Button } from "@/components/ui/button";
import { FileDown } from "lucide-react";
import { ReportPDF } from "./pdf/ReportPDF";

interface ReportPDFButtonProps {
  data: any;
}

export function ReportPDFButton({ data }: ReportPDFButtonProps) {
  const fileName = `relatorio-gerencial-${data.obra.nome.replace(/\s+/g, "-").toLowerCase()}.pdf`;

  return (
    <PDFDownloadLink document={<ReportPDF data={data} />} fileName={fileName}>
      {({ loading }) => (
        <Button variant="outline" size="icon" disabled={loading} title="Exportar PDF" className="rounded-full">
          <FileDown className="w-4 h-4" />
        </Button>
      )}
    </PDFDownloadLink>
  );
}
