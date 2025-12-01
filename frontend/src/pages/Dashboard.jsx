import { useState, useEffect } from 'react';
import { Package, Users, GitBranch, Activity, CheckCircle, Clock, AlertCircle, Play } from 'lucide-react';
import { dashboardAPI } from '../services/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

function Dashboard() {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const user = JSON.parse(localStorage.getItem('user'));

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      let response;
      
      switch (user.role) {
        case 'Admin':
          response = await dashboardAPI.getAdmin(user.user_id);
          break;
        case 'Planner':
          response = await dashboardAPI.getPlanner(user.user_id);
          break;
        case 'Technician':
          response = await dashboardAPI.getTechnician(user.user_id);
          break;
        case 'SupportAgent':
          response = await dashboardAPI.getSupport(user.user_id);
          break;
        default:
          response = await dashboardAPI.getAdmin(user.user_id);
      }
      
      setDashboardData(response.data);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'Scheduled':
        return <Clock size={14} />;
      case 'InProgress':
        return <Play size={14} />;
      case 'Completed':
        return <CheckCircle size={14} />;
      case 'Failed':
        return <AlertCircle size={14} />;
      default:
        return <Clock size={14} />;
    }
  };

  if (loading) {
    return <div className="loading">Loading dashboard...</div>;
  }

  if (!dashboardData) {
    return <div className="error">Failed to load dashboard data</div>;
  }

  // Admin Dashboard
  if (user.role === 'Admin') {
    return (
      <div>
        <div className="page-header">
          <h2>Admin Dashboard</h2>
          <p>Complete system overview and administration</p>
        </div>

        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-header">
              <div>
                <div className="stat-value">{dashboardData.stats.total_assets}</div>
                <div className="stat-label">Total Assets</div>
              </div>
              <div className="stat-icon blue">
                <Package size={24} />
              </div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-header">
              <div>
                <div className="stat-value">{dashboardData.stats.total_customers}</div>
                <div className="stat-label">Total Customers</div>
              </div>
              <div className="stat-icon green">
                <Users size={24} />
              </div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-header">
              <div>
                <div className="stat-value">{dashboardData.stats.pending_tasks}</div>
                <div className="stat-label">Pending Tasks</div>
              </div>
              <div className="stat-icon orange">
                <Clock size={24} />
              </div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-header">
              <div>
                <div className="stat-value">{dashboardData.stats.faulty_assets}</div>
                <div className="stat-label">Faulty Assets</div>
              </div>
              <div className="stat-icon purple">
                <AlertCircle size={24} />
              </div>
            </div>
          </div>
        </div>

        <div className="card" style={{ marginBottom: '2rem' }}>
          <h3 style={{ marginBottom: '1rem' }}>User Activity (Last 7 Days)</h3>
          {dashboardData.user_activity_summary && dashboardData.user_activity_summary.length > 0 ? (
            <table style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th>User</th>
                  <th>Role</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {dashboardData.user_activity_summary.slice(0, 10).map((user) => (
                  <tr key={user.user_id}>
                    <td><strong>{user.username}</strong></td>
                    <td><span className="badge badge-info">{user.role}</span></td>
                    <td>{user.actions_this_week}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p style={{ color: '#6b7280' }}>No user activity recorded</p>
          )}
        </div>

        <div className="card">
          <h3 style={{ marginBottom: '1rem' }}>Recent Audit Logs</h3>
          {dashboardData.recent_audit_logs && dashboardData.recent_audit_logs.length > 0 ? (
            <table style={{ width: '100%', fontSize: '0.875rem' }}>
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Action</th>
                  <th>Description</th>
                </tr>
              </thead>
              <tbody>
                {dashboardData.recent_audit_logs.slice(0, 10).map((log) => (
                  <tr key={log.log_id}>
                    <td>{new Date(log.timestamp).toLocaleTimeString()}</td>
                    <td><span className="badge badge-info">{log.action_type}</span></td>
                    <td style={{ maxWidth: '400px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {log.description}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p style={{ color: '#6b7280' }}>No audit logs available</p>
          )}
        </div>
      </div>
    );
  }

  // Planner Dashboard
  if (user.role === 'Planner') {
    return (
      <div>
        <div className="page-header">
          <h2>Planner Dashboard</h2>
          <p>Network planning and resource allocation</p>
        </div>

        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-header">
              <div>
                <div className="stat-value">{dashboardData.stats.available_assets}</div>
                <div className="stat-label">Available Assets</div>
              </div>
              <div className="stat-icon green">
                <Activity size={24} />
              </div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-header">
              <div>
                <div className="stat-value">{dashboardData.stats.pending_customers}</div>
                <div className="stat-label">Pending Customers</div>
              </div>
              <div className="stat-icon orange">
                <Users size={24} />
              </div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-header">
              <div>
                <div className="stat-value">{dashboardData.available_ports_summary.total_available}</div>
                <div className="stat-label">Available Ports</div>
              </div>
              <div className="stat-icon blue">
                <GitBranch size={24} />
              </div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-header">
              <div>
                <div className="stat-value">{dashboardData.stats.active_customers}</div>
                <div className="stat-label">Active Customers</div>
              </div>
              <div className="stat-icon purple">
                <CheckCircle size={24} />
              </div>
            </div>
          </div>
        </div>

        <div className="card" style={{ marginBottom: '2rem' }}>
          <h3 style={{ marginBottom: '1rem' }}>Recent Onboardings (Last 7 Days)</h3>
          {dashboardData.recent_onboardings && dashboardData.recent_onboardings.length > 0 ? (
            <table style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Address</th>
                  <th>Plan</th>
                  <th>Status</th>
                  <th>Onboarded</th>
                </tr>
              </thead>
              <tbody>
                {dashboardData.recent_onboardings.map((customer) => (
                  <tr key={customer.customer_id}>
                    <td><strong>{customer.name}</strong></td>
                    <td>{customer.address}</td>
                    <td>{customer.plan}</td>
                    <td>
                      <span className={`badge ${customer.status === 'Active' ? 'badge-success' : 'badge-warning'}`}>
                        {customer.status}
                      </span>
                    </td>
                    <td>{new Date(customer.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p style={{ color: '#6b7280' }}>No recent onboardings</p>
          )}
        </div>

        <div className="card">
          <h3 style={{ marginBottom: '1rem' }}>FDH Utilization</h3>
          {dashboardData.fdh_utilization && dashboardData.fdh_utilization.length > 0 ? (
            <table style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th>FDH</th>
                  <th>Location</th>
                  <th>Total Capacity</th>
                  <th>Used Ports</th>
                  <th>Utilization</th>
                </tr>
              </thead>
              <tbody>
                {dashboardData.fdh_utilization.map((fdh) => (
                  <tr key={fdh.fdh_id}>
                    <td><strong>{fdh.name}</strong></td>
                    <td>{fdh.location}</td>
                    <td>{fdh.total_capacity} ports</td>
                    <td>{fdh.used_ports} ports</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ 
                          flex: 1, 
                          height: '8px', 
                          background: '#e5e7eb', 
                          borderRadius: '4px',
                          overflow: 'hidden'
                        }}>
                          <div style={{ 
                            width: `${fdh.utilization_percent}%`, 
                            height: '100%', 
                            background: fdh.utilization_percent > 80 ? '#ef4444' : fdh.utilization_percent > 50 ? '#f59e0b' : '#10b981',
                            transition: 'width 0.3s ease'
                          }}></div>
                        </div>
                        <span style={{ fontSize: '0.875rem', fontWeight: '600' }}>
                          {fdh.utilization_percent}%
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p style={{ color: '#6b7280' }}>No FDH data available</p>
          )}
        </div>
      </div>
    );
  }

  // Technician Dashboard
  if (user.role === 'Technician') {
    return (
      <div>
        <div className="page-header">
          <h2>Technician Dashboard</h2>
          <p>Your installation and deployment tasks</p>
        </div>

        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-header">
              <div>
                <div className="stat-value">{dashboardData.stats.total_assigned_tasks || 0}</div>
                <div className="stat-label">Total Assigned</div>
              </div>
              <div className="stat-icon blue">
                <Activity size={24} />
              </div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-header">
              <div>
                <div className="stat-value">{dashboardData.stats.in_progress || 0}</div>
                <div className="stat-label">In Progress</div>
              </div>
              <div className="stat-icon orange">
                <Play size={24} />
              </div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-header">
              <div>
                <div className="stat-value">{dashboardData.stats.scheduled || 0}</div>
                <div className="stat-label">Scheduled</div>
              </div>
              <div className="stat-icon purple">
                <Clock size={24} />
              </div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-header">
              <div>
                <div className="stat-value">{dashboardData.stats.completed_this_week || 0}</div>
                <div className="stat-label">Completed This Week</div>
              </div>
              <div className="stat-icon green">
                <CheckCircle size={24} />
              </div>
            </div>
          </div>
        </div>

        <div className="card" style={{ marginBottom: '2rem' }}>
          <h3 style={{ marginBottom: '1rem' }}>My Assigned Tasks</h3>
          {dashboardData.my_tasks && dashboardData.my_tasks.length > 0 ? (
            <table style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th>Task ID</th>
                  <th>Customer ID</th>
                  <th>Status</th>
                  <th>Scheduled Date</th>
                </tr>
              </thead>
              <tbody>
                {dashboardData.my_tasks.map((task) => (
                  <tr key={task.task_id}>
                    <td><strong>#{task.task_id}</strong></td>
                    <td>Customer #{task.customer_id}</td>
                    <td>
                      <span className={`badge ${
                        task.status === 'Completed' ? 'badge-success' :
                        task.status === 'InProgress' ? 'badge-warning' :
                        'badge-info'
                      }`} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        {getStatusIcon(task.status)}
                        {task.status}
                      </span>
                    </td>
                    <td>{task.scheduled_date ? new Date(task.scheduled_date).toLocaleDateString() : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p style={{ color: '#6b7280' }}>No tasks currently assigned to you</p>
          )}
        </div>

        {dashboardData.pending_tasks && dashboardData.pending_tasks.length > 0 && (
          <div className="card" style={{ marginBottom: '2rem' }}>
            <h3 style={{ marginBottom: '1rem' }}>Available Tasks (Unassigned)</h3>
            <p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '1rem' }}>
              These tasks are not yet assigned to any technician. Contact your planner to get them assigned.
            </p>
            <table style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th>Task ID</th>
                  <th>Customer ID</th>
                  <th>Status</th>
                  <th>Scheduled Date</th>
                </tr>
              </thead>
              <tbody>
                {dashboardData.pending_tasks.map((task) => (
                  <tr key={task.task_id}>
                    <td><strong>#{task.task_id}</strong></td>
                    <td>Customer #{task.customer_id}</td>
                    <td>
                      <span className="badge badge-info" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        {getStatusIcon(task.status)}
                        {task.status}
                      </span>
                    </td>
                    <td>{task.scheduled_date ? new Date(task.scheduled_date).toLocaleDateString() : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="card">
          <h3 style={{ marginBottom: '1rem' }}>Recent Completions</h3>
          {dashboardData.recent_completions && dashboardData.recent_completions.length > 0 ? (
            <table style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th>Task ID</th>
                  <th>Customer ID</th>
                  <th>Completed</th>
                </tr>
              </thead>
              <tbody>
                {dashboardData.recent_completions.map((task) => (
                  <tr key={task.task_id}>
                    <td><strong>#{task.task_id}</strong></td>
                    <td>Customer #{task.customer_id}</td>
                    <td>{new Date(task.updated_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p style={{ color: '#6b7280' }}>No completed tasks yet</p>
          )}
        </div>
      </div>
    );
  }

  // Support Agent Dashboard
  if (user.role === 'SupportAgent') {
    return (
      <div>
        <div className="page-header">
          <h2>Support Dashboard</h2>
          <p>Customer support and management</p>
        </div>

        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-header">
              <div>
                <div className="stat-value">{dashboardData.stats.total_customers}</div>
                <div className="stat-label">Total Customers</div>
              </div>
              <div className="stat-icon blue">
                <Users size={24} />
              </div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-header">
              <div>
                <div className="stat-value">{dashboardData.stats.active_customers}</div>
                <div className="stat-label">Active Customers</div>
              </div>
              <div className="stat-icon green">
                <CheckCircle size={24} />
              </div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-header">
              <div>
                <div className="stat-value">{dashboardData.stats.pending_customers}</div>
                <div className="stat-label">Pending Customers</div>
              </div>
              <div className="stat-icon orange">
                <Clock size={24} />
              </div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-header">
              <div>
                <div className="stat-value">{dashboardData.stats.inactive_customers}</div>
                <div className="stat-label">Inactive Customers</div>
              </div>
              <div className="stat-icon purple">
                <AlertCircle size={24} />
              </div>
            </div>
          </div>
        </div>

        <div className="card" style={{ marginBottom: '2rem' }}>
          <h3 style={{ marginBottom: '1rem' }}>Pending Customers</h3>
          {dashboardData.pending_customers && dashboardData.pending_customers.length > 0 ? (
            <table style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Address</th>
                  <th>Plan</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {dashboardData.pending_customers.map((customer) => (
                  <tr key={customer.customer_id}>
                    <td><strong>{customer.name}</strong></td>
                    <td>{customer.address}</td>
                    <td>{customer.plan}</td>
                    <td><span className="badge badge-warning">{customer.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p style={{ color: '#6b7280' }}>No pending customers</p>
          )}
        </div>

        <div className="card">
          <h3 style={{ marginBottom: '1rem' }}>Active Customers (Recent 20)</h3>
          {dashboardData.active_customers && dashboardData.active_customers.length > 0 ? (
            <table style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Address</th>
                  <th>Plan</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {dashboardData.active_customers.map((customer) => (
                  <tr key={customer.customer_id}>
                    <td><strong>{customer.name}</strong></td>
                    <td>{customer.address}</td>
                    <td>{customer.plan}</td>
                    <td><span className="badge badge-success">{customer.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p style={{ color: '#6b7280' }}>No active customers</p>
          )}
        </div>
      </div>
    );
  }

  return <div>Unknown role</div>;
}

export default Dashboard;