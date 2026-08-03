import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Dashboard from './pages/Dashboard';
import AthletesList from './pages/AthletesList';
import AthleteForm from './pages/AthleteForm';
import FinancialDashboard from './pages/FinancialDashboard';
import Scanner from './pages/Scanner';
import Login from './pages/Login';
import { supabase } from './supabaseClient';

function ProtectedRoute({ children, session }) {
  if (!session) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

function AppLayout({ children }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="app-layout">
      <Sidebar isOpen={isMobileMenuOpen} setIsOpen={setIsMobileMenuOpen} />
      <div className="main-content">
        <Header toggleMobileMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)} />
        <div className="page-container animate-fade-in">
          {children}
        </div>
      </div>
    </div>
  );
}

function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    }).catch(err => {
      console.error("Erreur de session:", err);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', color: 'white' }}>Chargement...</div>;
  }

  return (
    <Router>
      <Toaster position="top-right" toastOptions={{ style: { background: '#1e293b', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' } }} />
      <Routes>
        <Route path="/login" element={session ? <Navigate to="/dashboard" replace /> : <Login />} />
        
        {/* Public / Scanner route without sidebar */}
        <Route path="/scanner" element={<Scanner />} />
        
        {/* Admin routes with layout */}
        <Route path="/dashboard" element={<ProtectedRoute session={session}><AppLayout><Dashboard /></AppLayout></ProtectedRoute>} />
        <Route path="/athletes" element={<ProtectedRoute session={session}><AppLayout><AthletesList /></AppLayout></ProtectedRoute>} />
        <Route path="/athletes/new" element={<ProtectedRoute session={session}><AppLayout><AthleteForm /></AppLayout></ProtectedRoute>} />
        <Route path="/athletes/edit/:id" element={<ProtectedRoute session={session}><AppLayout><AthleteForm /></AppLayout></ProtectedRoute>} />
        <Route path="/finances" element={<ProtectedRoute session={session}><AppLayout><FinancialDashboard /></AppLayout></ProtectedRoute>} />
        
        <Route path="*" element={<Navigate to={session ? "/dashboard" : "/login"} replace />} />
      </Routes>
    </Router>
  );
}

export default App;
