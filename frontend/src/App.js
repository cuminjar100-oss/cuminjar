import React from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/context/AuthContext";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import Vaults from "@/pages/Vaults";
import VaultDetail from "@/pages/VaultDetail";
import RecordEntry from "@/pages/RecordEntry";
import EntryForm from "@/pages/EntryForm";
import EntryDetail from "@/pages/EntryDetail";
import ProtectedRoute from "@/components/ProtectedRoute";
import InstallPrompt from "@/components/InstallPrompt";

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/" element={<ProtectedRoute><Vaults /></ProtectedRoute>} />
            <Route path="/vaults/:id" element={<ProtectedRoute><VaultDetail /></ProtectedRoute>} />
            <Route path="/vaults/:vaultId/record" element={<ProtectedRoute><RecordEntry /></ProtectedRoute>} />
            <Route path="/vaults/:vaultId/new" element={<ProtectedRoute><EntryForm mode="create" /></ProtectedRoute>} />
            <Route path="/entries/:id" element={<ProtectedRoute><EntryDetail /></ProtectedRoute>} />
            <Route path="/entries/:id/edit" element={<ProtectedRoute><EntryForm mode="edit" /></ProtectedRoute>} />
          </Routes>
          <InstallPrompt />
        </AuthProvider>
      </BrowserRouter>
    </div>
  );
}

export default App;
