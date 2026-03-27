import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/sonner";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Index from "./pages/Index";
import Clients from "./pages/Clients";
import ClientFormPage from "./pages/ClientForm";
import Projects from "./pages/Projects";
import NewProject from "./pages/NewProject";
import { ProjectDetails } from "./pages/ProjectDetails";
import NotFound from "./pages/NotFound";
import { queryClient } from "./lib/query-client";
import StageForm from "./pages/StageForm";
import EditStageForm from "./pages/EditStageForm";
import Auth from "./pages/Auth";
import { AuthProvider } from "./components/auth/AuthProvider";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";
import { ClientRoute } from "./components/auth/ClientRoute";
import Proposals from "./pages/Proposals";
import ProposalForm from "./pages/ProposalForm";
import Contracts from "./pages/Contracts";
import ContractForm from "./pages/ContractForm";
import ContractFinancial from "./pages/ContractFinancial";
import Agenda from "./pages/Agenda";
import ProjectReport from "./pages/ProjectReport";
import ProjectCosts from "./pages/ProjectCosts";
import ProjectRevenues from "./pages/ProjectRevenues";
import Suppliers from "./pages/Suppliers";
import SupplierDetail from "./pages/SupplierDetail";
import ClientDetails from "./pages/ClientDetails";
import Profile from "./pages/Profile";
import Notifications from "./pages/Notifications";
import PortalLogin from "./pages/portal/PortalLogin";
import PortalProject from "./pages/portal/PortalProject";
import PortalProjectsList from "./pages/portal/PortalProjectsList";
import PortalResetPassword from "./pages/portal/PortalResetPassword";
import Categorias from "./pages/financeiro/Categorias";
import Contas from "./pages/financeiro/Contas";
import Conciliacao from "./pages/financeiro/Conciliacao";
import Rateio from "./pages/financeiro/Rateio";
import VisaoGeral from "./pages/financeiro/VisaoGeral";
import LancamentosGlobal from "./pages/financeiro/LancamentosGlobal";
import Configuracoes from "./pages/financeiro/Configuracoes";
import NfeInbox from "./pages/financeiro/NfeInbox";
import Recebiveis from "./pages/financeiro/Recebiveis";
import Lancamentos from "./pages/obras/Lancamentos";
import FinanceiroDashboard from "./pages/obras/FinanceiroDashboard";

const App = () => (
  <QueryClientProvider client={queryClient}>
    <Toaster position="top-center" />
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Auth */}
          <Route path="/auth" element={<Auth />} />
          
          {/* Portal do Cliente */}
          <Route path="/portal" element={<PortalLogin />} />
          <Route path="/portal/redefinir-senha" element={<PortalResetPassword />} />
          <Route path="/portal/obras" element={<ClientRoute><PortalProjectsList /></ClientRoute>} />
          <Route path="/portal/obra/:projectId" element={<ClientRoute><PortalProject /></ClientRoute>} />

          {/* Admin routes */}
          <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
          <Route path="/clientes" element={<ProtectedRoute><Clients /></ProtectedRoute>} />
          <Route path="/clientes/cadastro" element={<ProtectedRoute><ClientFormPage /></ProtectedRoute>} />
          <Route path="/clientes/:clientId" element={<ProtectedRoute><ClientDetails /></ProtectedRoute>} />
          <Route path="/obras" element={<ProtectedRoute><Projects /></ProtectedRoute>} />
          <Route path="/obras/nova" element={<ProtectedRoute><NewProject /></ProtectedRoute>} />
          <Route path="/obras/:projectId" element={<ProtectedRoute><ProjectDetails /></ProtectedRoute>} />
          <Route path="/obras/:projectId/etapas/adicionar" element={<ProtectedRoute><StageForm /></ProtectedRoute>} />
          <Route path="/obras/:projectId/etapas/:stageId/editar" element={<ProtectedRoute><EditStageForm /></ProtectedRoute>} />
          <Route path="/obras/:projectId/relatorio" element={<ProtectedRoute><ProjectReport /></ProtectedRoute>} />
          <Route path="/obras/:projectId/custos" element={<ProtectedRoute><ProjectCosts /></ProtectedRoute>} />
          <Route path="/obras/:projectId/receitas" element={<ProtectedRoute><ProjectRevenues /></ProtectedRoute>} />
          <Route path="/propostas" element={<ProtectedRoute><Proposals /></ProtectedRoute>} />
          <Route path="/propostas/nova" element={<ProtectedRoute><ProposalForm /></ProtectedRoute>} />
          <Route path="/propostas/:id" element={<ProtectedRoute><ProposalForm /></ProtectedRoute>} />
          <Route path="/contratos" element={<ProtectedRoute><Contracts /></ProtectedRoute>} />
          <Route path="/contratos/novo" element={<ProtectedRoute><ContractForm /></ProtectedRoute>} />
          <Route path="/contratos/:id" element={<ProtectedRoute><ContractForm /></ProtectedRoute>} />
          <Route path="/contratos/:id/financeiro" element={<ProtectedRoute><ContractFinancial /></ProtectedRoute>} />
          <Route path="/agenda" element={<ProtectedRoute><Agenda /></ProtectedRoute>} />
          <Route path="/fornecedores" element={<ProtectedRoute><Suppliers /></ProtectedRoute>} />
          <Route path="/fornecedores/:supplierId" element={<ProtectedRoute><SupplierDetail /></ProtectedRoute>} />
          <Route path="/perfil" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          <Route path="/notificacoes" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
          <Route path="/financeiro" element={<ProtectedRoute><Navigate to="/financeiro/visao-geral" replace /></ProtectedRoute>} />
          <Route path="/financeiro/visao-geral" element={<ProtectedRoute><VisaoGeral /></ProtectedRoute>} />
          <Route path="/financeiro/lancamentos" element={<ProtectedRoute><LancamentosGlobal /></ProtectedRoute>} />
          <Route path="/financeiro/recebiveis" element={<ProtectedRoute><Recebiveis /></ProtectedRoute>} />
          <Route path="/financeiro/conciliacao" element={<ProtectedRoute><Conciliacao /></ProtectedRoute>} />
          <Route path="/financeiro/rateio" element={<ProtectedRoute><Rateio /></ProtectedRoute>} />
          <Route path="/financeiro/nfe" element={<ProtectedRoute><NfeInbox /></ProtectedRoute>} />
          <Route path="/financeiro/configuracoes" element={<ProtectedRoute><Configuracoes /></ProtectedRoute>} />
          <Route path="/financeiro/categorias" element={<ProtectedRoute><Navigate to="/financeiro/configuracoes" replace /></ProtectedRoute>} />
          <Route path="/financeiro/contas" element={<ProtectedRoute><Navigate to="/financeiro/configuracoes" replace /></ProtectedRoute>} />
          <Route path="/obras/:projectId/lancamentos" element={<ProtectedRoute><Lancamentos /></ProtectedRoute>} />
          <Route path="/obras/:projectId/financeiro" element={<ProtectedRoute><FinanceiroDashboard /></ProtectedRoute>} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  </QueryClientProvider>
);

export default App;
