import { useState, useEffect } from 'react';
import { Search, Download, Filter, Eye } from 'lucide-react';
import { auditAPI, authAPI } from '../services/api';

function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [users, setUsers] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    user_id: '',
    action_type: '',
    start_date: '',
    end_date: '',
  });
  const [pagination, setPagination] = useState({
    skip: 0,
    limit: 50,
    total: 0,
  });

  useEffect(() => {
    fetchLogs();
    fetchUsers();
    fetchSummary();
  }, [filters, pagination.skip]);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const params = {
        ...filters,
        skip: pagination.skip,
        limit: pagination.limit,
      };
      const response = await auditAPI.getLogs(params);
      setLogs(response.data.logs);
      setPagination(prev => ({ ...prev, total: response.data.total }));
    } catch (error) {
      console.error('Error fetching audit logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await authAPI.getUsers();
      setUsers(response.data);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchSummary = async () => {
    try {
      const response = await auditAPI.getSummary(7);
      setSummary(response.data);
    } catch (error) {
      console.error('Error fetching summary:', error);
    }
  };

  const handleExport = async () => {
    try {
      const response = await auditAPI.exportLogs(filters);
      const dataStr = JSON.stringify(response.data, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `audit-logs-${new Date().toISOString()}.json`;
      link.click();
    } catch (error) {
      console.error('Error exporting logs:', error);
      alert('Error exporting logs');
    }
  };

  const handlePageChange = (direction) => {
    if (direction === 'next' && pagination.skip + pagination.limit < pagination.total) {
      setPagination(prev => ({ ...prev, skip: prev.skip + prev.limit }));
    } else if (direction === 'prev' && pagination.skip > 0) {
      setPagination(prev => ({ ...prev, skip: Math.max(0, prev.skip - prev.limit) }));
    }
  };

  const getActionTypeBadge = (actionType) => {
    const badges = {
      LOGIN: 'badge-success',
      LOGOUT: 'badge-info',
      CREATE: 'badge-success',
      UPDATE: 'badge-warning',
      DELETE: 'badge-danger',
      ASSIGN: 'badge-info',
      DEACTIVATE: 'badge-warning',
    };
    return `badge ${badges[actionType] || 'badge-info'}`;
  };

  return (
    <div>
      <div className="page-header">
        <h2>Audit Logs</h2>
        <p>Track all system activities and user actions</p>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="stats-grid" style={{ marginBottom: '2rem' }}>
          <div className="stat-card">
            <div className="stat-header">
              <div>
                <div className="stat-value">{summary.total_logs}</div>
                <div className="stat-label">Total Logs (Last 7 Days)</div>
              </div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-header">
              <div>
                <div className="stat-value">{summary.most_active_users?.length || 0}</div>
                <div className="stat-label">Active Users</div>
              </div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-header">
              <div>
                <div className="stat-value">
                  {Object.keys(summary.actions_by_type || {}).length}
                </div>
                <div className="stat-label">Action Types</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Most Active Users */}
      {summary && summary.most_active_users && summary.most_active_users.length > 0 && (
        <div className="card" style={{ marginBottom: '2rem' }}>
          <h3 style={{ marginBottom: '1rem' }}>Most Active Users (Last 7 Days)</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            {summary.most_active_users.slice(0, 5).map((user) => (
              <div key={user.user_id} style={{ 
                padding: '1rem', 
                background: '#f9fafb', 
                borderRadius: '8px',
                border: '1px solid #e5e7eb'
              }}>
                <div style={{ fontWeight: '600', marginBottom: '0.25rem' }}>{user.username}</div>
                <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>{user.action_count} actions</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="filters">
        <div className="filters-row">
          <div className="form-group">
            <label>User</label>
            <select
              value={filters.user_id}
              onChange={(e) => setFilters({ ...filters, user_id: e.target.value })}
            >
              <option value="">All Users</option>
              {users.map((user) => (
                <option key={user.user_id} value={user.user_id}>
                  {user.username} ({user.role})
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Action Type</label>
            <select
              value={filters.action_type}
              onChange={(e) => setFilters({ ...filters, action_type: e.target.value })}
            >
              <option value="">All Actions</option>
              <option value="LOGIN">Login</option>
              <option value="LOGOUT">Logout</option>
              <option value="CREATE">Create</option>
              <option value="UPDATE">Update</option>
              <option value="DELETE">Delete</option>
              <option value="ASSIGN">Assign</option>
              <option value="DEACTIVATE">Deactivate</option>
            </select>
          </div>

          <div className="form-group">
            <label>Start Date</label>
            <input
              type="date"
              value={filters.start_date}
              onChange={(e) => setFilters({ ...filters, start_date: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label>End Date</label>
            <input
              type="date"
              value={filters.end_date}
              onChange={(e) => setFilters({ ...filters, end_date: e.target.value })}
            />
          </div>

          <button
            className="btn btn-primary"
            onClick={handleExport}
            style={{ marginTop: '20px' }}
          >
            <Download size={16} style={{ marginRight: '8px' }} />
            Export
          </button>
        </div>
      </div>

      {/* Logs Table */}
      <div className="data-table">
        <div className="table-header">
          <h3>Audit Logs ({pagination.total})</h3>
          <div>
            Showing {pagination.skip + 1} - {Math.min(pagination.skip + pagination.limit, pagination.total)} of {pagination.total}
          </div>
        </div>

        {loading ? (
          <div className="loading">Loading logs...</div>
        ) : (
          <>
            <table>
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>User</th>
                  <th>Role</th>
                  <th>Action Type</th>
                  <th>Description</th>
                </tr>
              </thead>
              <tbody>
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan="5" style={{ textAlign: 'center', padding: '2rem' }}>
                      No audit logs found
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log.log_id}>
                      <td>{new Date(log.timestamp).toLocaleString()}</td>
                      <td><strong>{log.username}</strong></td>
                      <td>
                        <span className="badge badge-info">{log.user_role}</span>
                      </td>
                      <td>
                        <span className={getActionTypeBadge(log.action_type)}>
                          {log.action_type}
                        </span>
                      </td>
                      <td style={{ maxWidth: '400px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {log.description}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            {/* Pagination */}
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              padding: '1rem',
              borderTop: '1px solid #e5e7eb'
            }}>
              <button
                className="btn btn-secondary"
                onClick={() => handlePageChange('prev')}
                disabled={pagination.skip === 0}
              >
                Previous
              </button>
              <div style={{ color: '#6b7280' }}>
                Page {Math.floor(pagination.skip / pagination.limit) + 1} of {Math.ceil(pagination.total / pagination.limit)}
              </div>
              <button
                className="btn btn-secondary"
                onClick={() => handlePageChange('next')}
                disabled={pagination.skip + pagination.limit >= pagination.total}
              >
                Next
              </button>
            </div>
          </>
        )}
      </div>

      {/* Action Distribution */}
      {summary && summary.actions_by_type && (
        <div className="card" style={{ marginTop: '2rem' }}>
          <h3 style={{ marginBottom: '1rem' }}>Action Distribution (Last 7 Days)</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem' }}>
            {Object.entries(summary.actions_by_type).map(([action, count]) => (
              <div key={action} style={{ textAlign: 'center', padding: '1rem', background: '#f9fafb', borderRadius: '8px' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#1f2937' }}>{count}</div>
                <div className={getActionTypeBadge(action)} style={{ marginTop: '0.5rem', display: 'inline-block' }}>
                  {action}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default AuditLogs;