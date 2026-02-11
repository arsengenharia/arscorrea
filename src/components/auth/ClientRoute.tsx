import { Navigate } from "react-router-dom";
import { useAuth } from "./AuthProvider";

export function ClientRoute({ children }: { children: React.ReactNode }) {
  const { user, loading, role } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-lg">Carregando...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/portal" replace />;
  }

  if (role !== "client" && role !== "admin") {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
