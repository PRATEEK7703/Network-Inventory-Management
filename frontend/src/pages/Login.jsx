import { useState } from 'react';
import { Network } from 'lucide-react';
import { authAPI } from '../services/api';
import './Login.css';

function Login({ onLogin }) {
  const [credentials, setCredentials] = useState({
    username: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await authAPI.login(credentials);
      const userInfo = {
        user_id: response.data.user_id,
        username: response.data.username,
        role: response.data.role,
        loggedIn: true,
      };
      localStorage.setItem('user', JSON.stringify(userInfo));
      onLogin(userInfo);
    } catch (err) {
      console.error('Login error:', err);
      setError(err.response?.data?.detail || 'Invalid username or password');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = (username, password) => {
    setCredentials({ username, password });
    setTimeout(() => {
      const event = new Event('submit', { bubbles: true, cancelable: true });
      document.getElementById('login-form').dispatchEvent(event);
    }, 100);
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <Network size={48} color="#667eea" />
          <h1>Network Inventory</h1>
          <p>Deployment Management System</p>
        </div>

        <form id="login-form" onSubmit={handleSubmit} className="login-form">
          {error && <div className="error">{error}</div>}

          <div className="form-group">
            <label>Username</label>
            <input
              type="text"
              value={credentials.username}
              onChange={(e) => setCredentials({ ...credentials, username: e.target.value })}
              placeholder="Enter username"
              required
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              value={credentials.password}
              onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
              placeholder="Enter password"
              required
              disabled={loading}
            />
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <div className="demo-accounts">
          <p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.5rem' }}>
            Demo Accounts (Click to login):
          </p>
          <div className="demo-buttons">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => handleQuickLogin('admin', 'admin123')}
              disabled={loading}
            >
              Admin
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => handleQuickLogin('planner', 'planner123')}
              disabled={loading}
            >
              Planner
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => handleQuickLogin('tech1', 'tech123')}
              disabled={loading}
            >
              Technician
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => handleQuickLogin('support', 'support123')}
              disabled={loading}
            >
              Support
            </button>
          </div>
        </div>

        <div style={{ marginTop: '1.5rem', fontSize: '0.75rem', color: '#9ca3af', textAlign: 'center' }}>
          Sprint 0-6 Complete | Full Featured System
        </div>
      </div>
    </div>
  );
}

export default Login;