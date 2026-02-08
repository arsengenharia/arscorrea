import { Layout } from "@/components/layout/Layout";
import { ProposalFormContent } from "@/components/proposals/ProposalFormContent";
import { useParams } from "react-router-dom";

const ProposalForm = () => {
  const { id } = useParams<{ id: string }>();
  const isEditing = !!id;

  return (
    <Layout>
      <ProposalFormContent proposalId={id} isEditing={isEditing} />
    </Layout>
  );
};

export default ProposalForm;
