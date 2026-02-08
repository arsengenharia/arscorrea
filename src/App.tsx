
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
          <Route path="*" element={<NotFound />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  </QueryClientProvider>
);

export default App;
