/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { Toaster } from "sonner";
import AdminDashboard from "./components/AdminDashboard";
import ClientView from "./components/ClientView";
import Login from "./components/Login";
import { auth, onAuthStateChanged } from "./firebase";

export default function App() {
  const [isAdmin, setIsAdmin] = useState(() => {
    return localStorage.getItem("gymflow_admin") === "true";
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setIsAdmin(true);
        localStorage.setItem("gymflow_admin", "true");
      } else {
        setIsAdmin(false);
        localStorage.removeItem("gymflow_admin");
      }
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = () => {
    // This will be handled by onAuthStateChanged if login is successful
  };

  const handleLogout = async () => {
    setIsAdmin(false);
    localStorage.removeItem("gymflow_admin");
    await auth.signOut();
  };

  return (
    <Router>
      <div className="min-h-screen bg-gym-bg text-gym-text">
        <Toaster position="top-center" richColors theme="light" />
        <Routes>
          <Route 
            path="/admin/*" 
            element={isAdmin ? <AdminDashboard onLogout={handleLogout} /> : <Navigate to="/login" />} 
          />
          <Route 
            path="/login" 
            element={isAdmin ? <Navigate to="/admin" /> : <Login onLogin={handleLogin} />} 
          />
          <Route path="/view/:shareSlug" element={<ClientView />} />
          <Route path="/" element={<Navigate to="/login" />} />
        </Routes>
      </div>
    </Router>
  );
}
