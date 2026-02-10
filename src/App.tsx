import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/sonner";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Clients from "./pages/Clients";
import ClientsList from "./components/clients/ClientsList";
import ClientFormPage from "./pages/ClientForm";
import Projects from "./pages/Projects";
import { ProjectDetails } from "./pages/ProjectDetails";
import NotFound from "./pages/NotFound";
import { queryClient } from "./lib/query-client";
import StageForm from "./pages/StageForm";
import EditStageForm from "./pages/EditStageForm";
import Auth from "./pages/Auth";
import { AuthProvider } from "./components/auth/AuthProvider";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";
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
import ClientDetails from "./pages/ClientDetails";

const App = () => (
  <QueryClientProvider client={queryClient}>
    <Toaster position="top-center" />
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/auth" element={<Auth />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Index />
              </ProtectedRoute>
            }
          />
          <Route
            path="/clientes"
            element={
              <ProtectedRoute>
                <Clients />
              </ProtectedRoute>
            }
          />
          <Route
            path="/clientes/cadastro"
            element={
              <ProtectedRoute>
                <ClientFormPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/clientes/lista"
            element={
              <ProtectedRoute>
                <ClientsList />
              </ProtectedRoute>
            }
          />
          <Route
            path="/clientes/:clientId"
            element={
              <ProtectedRoute>
                <ClientDetails />
              </ProtectedRoute>
            }
          />
          <Route
            path="/obras"
            element={
              <ProtectedRoute>
                <Projects />
              </ProtectedRoute>
            }
          />
          <Route
            path="/obras/:projectId"
            element={
              <ProtectedRoute>
                <ProjectDetails />
              </ProtectedRoute>
            }
          />
          <Route
            path="/obras/:projectId/etapas/adicionar"
            element={
              <ProtectedRoute>
                <StageForm />
              </ProtectedRoute>
            }
          />
          <Route
            path="/obras/:projectId/etapas/:stageId/editar"
            element={
              <ProtectedRoute>
                <EditStageForm />
              </ProtectedRoute>
            }
          />
          <Route
            path="/obras/:projectId/relatorio"
            element={
              <ProtectedRoute>
                <ProjectReport />
              </ProtectedRoute>
            }
          />
          <Route
            path="/obras/:projectId/custos"
            element={
              <ProtectedRoute>
                <ProjectCosts />
              </ProtectedRoute>
            }
          />
          <Route
            path="/obras/:projectId/receitas"
            element={
              <ProtectedRoute>
                <ProjectRevenues />
              </ProtectedRoute>
            }
          />
          <Route
            path="/propostas"
            element={
              <ProtectedRoute>
                <Proposals />
              </ProtectedRoute>
            }
          />
          <Route
            path="/propostas/nova"
            element={
              <ProtectedRoute>
                <ProposalForm />
              </ProtectedRoute>
            }
          />
          <Route
            path="/propostas/:id"
            element={
              <ProtectedRoute>
                <ProposalForm />
              </ProtectedRoute>
            }
          />
          <Route
            path="/contratos"
            element={
              <ProtectedRoute>
                <Contracts />
              </ProtectedRoute>
            }
          />
          <Route
            path="/contratos/novo"
            element={
              <ProtectedRoute>
                <ContractForm />
              </ProtectedRoute>
            }
          />
          <Route
            path="/contratos/:id"
            element={
              <ProtectedRoute>
                <ContractForm />
              </ProtectedRoute>
            }
          />
          <Route
            path="/contratos/:id/financeiro"
            element={
              <ProtectedRoute>
                <ContractFinancial />
              </ProtectedRoute>
            }
          />
          <Route
            path="/agenda"
            element={
              <ProtectedRoute>
                <Agenda />
              </ProtectedRoute>
            }
          />
          <Route
            path="/fornecedores"
            element={
              <ProtectedRoute>
                <Suppliers />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  </QueryClientProvider>
);

export default App;
