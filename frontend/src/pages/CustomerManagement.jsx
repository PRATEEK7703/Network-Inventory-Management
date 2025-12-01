import { useState, useEffect } from 'react';
import { Users, Trash2, Power, PowerOff, Eye, Search, Filter } from 'lucide-react';
import { customersAPI, deploymentAPI } from '../services/api';

function CustomerManagement() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('all'); // all, active, pending, inactive
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchCustomers();
  }, [filter]);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const response = await customersAPI.getAll({ 
        status: filter !== 'all' ? filter.charAt(0).toUpperCase() + filter.slice(1) : null 
      });
      setCustomers(response.data);
    } catch (error) {
      console.error('Error fetching customers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (customerId, customerName) => {
    if (!window.confirm(`Are you sure you want to DELETE customer "${customerName}"? This will:\n- Remove customer from database\n- Reclaim all assigned assets\n- Delete deployment tasks\n\nThis action CANNOT be undone!`)) {
      return;
    }

    try {
      await customersAPI.deactivate(customerId);
      alert('Customer deleted successfully! Assets have been reclaimed.');
      fetchCustomers();
    } catch (error) {
      console.error('Error deleting customer:', error);
      alert('Error deleting customer: ' + (error.response?.data?.detail || error.message));
    }
  };

  const handleDeactivate = async (customerId, customerName) => {
    const reason = prompt(`Deactivate customer "${customerName}"\n\nPlease provide a reason:`);
    if (!reason) return;

    try {
      await customersAPI.deactivate(customerId);
      alert(`Customer deactivated successfully!\nReason: ${reason}\nAssets have been reclaimed and are now available.`);
      fetchCustomers();
    } catch (error) {
      console.error('Error deactivating customer:', error);
      alert('Error deactivating customer: ' + (error.response?.data?.detail || error.message));
    }
  };

  const handleActivate = async (customerId, customerName) => {
    if (!window.confirm(`Reactivate customer "${customerName}"?\n\nStatus will be set to PENDING.\nYou will need to create a new deployment task.`)) {
      return;
    }

    try {
      const response = await fetch(`http://localhost:8000/customers/${customerId}/activate`, {
        method: 'POST'
      });
      const data = await response.json();
      alert(data.message + '\n' + data.note);
      fetchCustomers();
    } catch (error) {
      console.error('Error activating customer:', error);
      alert('Error activating customer');
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      Active: 'badge-success',
      Pending: 'badge-warning',
      Inactive: 'badge-secondary',
    };
    return `badge ${badges[status] || 'badge-info'}`;
  };

  const filteredCustomers = customers.filter(customer =>
    customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.neighborhood.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div>
      <div className="page-header">
        <h2>
          <Users size={28} style={{ marginRight: '12px', verticalAlign: 'middle' }} />
          Customer Management
        </h2>
        <p>Manage customer lifecycle - View, Deactivate, Reactivate, and Delete</p>
      </div>

      {/* Filter Tabs */}
      <div style={{ marginBottom: '1.5rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            className={`btn ${filter === 'all' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setFilter('all')}
          >
            All Customers
          </button>
          <button
            className={`btn ${filter === 'active' ? 'btn-success' : 'btn-secondary'}`}
            onClick={() => setFilter('active')}
          >
            Active
          </button>
          <button
            className={`btn ${filter === 'pending' ? 'btn-warning' : 'btn-secondary'}`}
            onClick={() => setFilter('pending')}
          >
            Pending
          </button>
          <button
            className={`btn ${filter === 'inactive' ? 'btn-secondary' : 'btn-secondary'}`}
            onClick={() => setFilter('inactive')}
          >
            Inactive
          </button>
        </div>

        <div style={{ flex: 1, minWidth: '250px' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <div style={{ position: 'relative' }}>
              <Search size={20} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#6b7280' }} />
              <input
                type="text"
                placeholder="Search by name, address, or neighborhood..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ paddingLeft: '40px' }}
              />
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="loading">Loading customers...</div>
      ) : filteredCustomers.length === 0 ? (
        <div className="empty-state">
          <Users size={64} style={{ marginBottom: '1rem', opacity: 0.3 }} />
          <h3>No customers found</h3>
          <p>
            {searchTerm ? 'Try different search terms' : 
             filter !== 'all' ? `No ${filter} customers` : 
             'Start by creating customers through the onboarding process'}
          </p>
        </div>
      ) : (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Address</th>
                <th>Neighborhood</th>
                <th>Plan</th>
                <th>Status</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredCustomers.map(customer => (
                <tr key={customer.customer_id}>
                  <td>#{customer.customer_id}</td>
                  <td><strong>{customer.name}</strong></td>
                  <td>{customer.address}</td>
                  <td>{customer.neighborhood}</td>
                  <td>{customer.plan}</td>
                  <td>
                    <span className={getStatusBadge(customer.status)}>
                      {customer.status}
                    </span>
                  </td>
                  <td>{new Date(customer.created_at).toLocaleDateString()}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      {customer.status === 'Active' && (
                        <button
                          className="btn btn-sm btn-warning"
                          onClick={() => handleDeactivate(customer.customer_id, customer.name)}
                          title="Deactivate customer and reclaim assets"
                        >
                          <PowerOff size={16} />
                        </button>
                      )}
                      
                      {customer.status === 'Inactive' && (
                        <button
                          className="btn btn-sm btn-success"
                          onClick={() => handleActivate(customer.customer_id, customer.name)}
                          title="Reactivate customer (will set to Pending)"
                        >
                          <Power size={16} />
                        </button>
                      )}
                      
                      <button
                        className="btn btn-sm btn-danger"
                        onClick={() => handleDelete(customer.customer_id, customer.name)}
                        title="Permanently delete customer"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div style={{ marginTop: '2rem', padding: '1rem', background: '#f3f4f6', borderRadius: '8px' }}>
        <h4 style={{ marginBottom: '0.5rem' }}>Customer Lifecycle:</h4>
        <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
          <strong>Pending</strong> → Customer created, waiting for deployment task completion<br/>
          <strong>Active</strong> → Service active, deployment completed<br/>
          <strong>Inactive</strong> → Service disconnected, assets reclaimed
        </div>
      </div>
    </div>
  );
}

export default CustomerManagement;