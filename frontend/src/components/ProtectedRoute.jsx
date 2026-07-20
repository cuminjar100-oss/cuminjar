import React from "react";
import { useAuth } from "@/context/AuthContext";
import { Navigate, useLocation } from "react-router-dom";

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div data-testid="auth-loading" className="min-h-screen flex items-center justify-center bg-[#FDFBF7]">
        <div className="flex flex-col items-center gap-3 text-[#8C857B]">
          <div className="w-10 h-10 rounded-full border-4 border-[#D9A05B]/30 border-t-[#D96C4A] animate-spin" />
          <p className="font-display text-lg text-[#2C302B]">Setting the table…</p>
        </div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;
  return children;
}
