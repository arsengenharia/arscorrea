import { useParams } from "react-router-dom";
import { ContractFormContent } from "@/components/contracts/ContractFormContent";

export default function ContractForm() {
  const { id } = useParams();

  return <ContractFormContent contractId={id} />;
}
