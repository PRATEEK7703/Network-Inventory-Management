import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom';
import { Network, Package, GitBranch, Home, LogOut, UserPlus, ClipboardList, RefreshCw, Shield, Users } from 'lucide-react';
import Dashboard from './pages/Dashboard';
import AssetInventory from './pages/AssetInventory';
import TopologyViewer from './pages/TopologyViewer';
import CustomerOnboarding from './pages/CustomerOnboarding';
import DeploymentTasks from './pages/DeploymentTasks';
import AssetLifecycle from './pages/AssetLifecycle';
import AuditLogs from './pages/AuditLogs';
import Login from './pages/Login';
import CustomerManagement from './pages/CustomerManagement';
import { authAPI } from './services/api';
import AIAssistant from './pages/AIAssistant';
import './App.css';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  const handleLogin = (userInfo) => {
    setUser(userInfo);
  };

  const handleLogout = async () => {
    try {
      if (user && user.user_id) {
        await authAPI.logout(user.user_id);
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('user');
      setUser(null);
    }
  };

  if (loading) {
    return (
      <div className="loading" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        Loading...
      </div>
    );
  }

  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  // Role-based navigation visibility
  const canAccessAssetLifecycle = ['Admin', 'Planner'].includes(user.role);
  const canAccessAuditLogs = user.role === 'Admin';
  const canAccessOnboarding = ['Admin', 'Planner'].includes(user.role);
  const canAccessDeployment = ['Admin', 'Planner', 'Technician'].includes(user.role);
  const canAccessCustomerManagement = ['Admin', 'Planner', 'SupportAgent'].includes(user.role);

  return (
    <Router>
      <div className="app">
        <nav className="navbar">
          <div className="navbar-container">
            <div className="nav-brand">
              <Network size={32} />
              <div>
                <h1>Network Inventory</h1>
                <div className="nav-brand-info">
                  {user.username} • {user.role}
                </div>
              </div>
            </div>
            
            <div className="nav-links">
              <Link to="/" className="nav-link" title="Dashboard">
                <Home size={20} />
                <span>Dashboard</span>
              </Link>
              
              <Link to="/assets" className="nav-link" title="Assets">
                <Package size={20} />
                <span>Assets</span>
              </Link>
              
              <Link to="/topology" className="nav-link" title="Topology">
                <GitBranch size={20} />
                <span>Topology</span>
              </Link>
              
              {canAccessOnboarding && (
                <Link to="/onboarding" className="nav-link" title="Customer Onboarding">
                  <UserPlus size={20} />
                  <span>Onboarding</span>
                </Link>
              )}
              
              {canAccessDeployment && (
                <Link to="/deployment" className="nav-link" title="Deployment Tasks">
                  <ClipboardList size={20} />
                  <span>Deployment</span>
                </Link>
              )}
              
              {canAccessCustomerManagement && (
                <Link to="/customers" className="nav-link" title="Customer Management">
                  <Users size={20} />
                  <span>Customers</span>
                </Link>
              )}
              
              {canAccessAssetLifecycle && (
                <Link to="/lifecycle" className="nav-link" title="Asset Lifecycle">
                  <RefreshCw size={20} />
                  <span>Lifecycle</span>
                </Link>
              )}
              
              {canAccessAuditLogs && (
                <Link to="/audit" className="nav-link" title="Audit Logs">
                  <Shield size={20} />
                  <span>Audit</span>
                </Link>
              )}
              
              <button 
                onClick={handleLogout} 
                className="nav-link logout-btn" 
                title="Logout"
              >
                <LogOut size={20} />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </nav>

        <main className="main-content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/assets" element={<AssetInventory />} />
            <Route path="/topology" element={<TopologyViewer />} />
            
            {canAccessOnboarding && (
              <Route path="/onboarding" element={<CustomerOnboarding />} />
            )}
            
            {canAccessDeployment && (
              <Route path="/deployment" element={<DeploymentTasks />} />
            )}
            
            {canAccessCustomerManagement && (
              <Route path="/customers" element={<CustomerManagement />} />
            )}
            
            {canAccessAssetLifecycle && (
              <Route path="/lifecycle" element={<AssetLifecycle />} />
            )}
            
            {canAccessAuditLogs && (
              <Route path="/audit" element={<AuditLogs />} />
            )}
            
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>

        {user && <AIAssistant />}
        
        <footer>
          Network Inventory & Deployment Management System v2.0 | All Sprints Complete
        </footer>
      </div>
    </Router>
  );
}

export default App;