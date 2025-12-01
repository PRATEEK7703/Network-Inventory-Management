import { useState, useEffect } from 'react';
import { RefreshCw, Trash2, AlertTriangle, History, X } from 'lucide-react';
import { lifecycleAPI, customersAPI, assetsAPI } from '../services/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

function AssetLifecycle() {
  const [activeTab, setActiveTab] = useState('utilization');
  const [utilization, setUtilization] = useState({});
  const [inactiveCustomers, setInactiveCustomers] = useState([]);
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [assetLifecycle, setAssetLifecycle] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('');
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [assets, setAssets] = useState([]);
  
  const [formData, setFormData] = useState({
    newCustomerId: '',
    newAssetId: '',
    retireReason: '',
  });

  const COLORS = ['#10b981', '#3b82f6', '#ef4444', '#6b7280'];

  useEffect(() => {
    fetchUtilizationStats();
    fetchInactiveCustomers();
  }, []);

  const fetchUtilizationStats = async () => {
    try {
      const response = await lifecycleAPI.getUtilizationStats();
      setUtilization(response.data);
    } catch (error) {
      console.error('Error fetching utilization stats:', error);
    }
  };

  const fetchInactiveCustomers = async () => {
    try {
      const response = await lifecycleAPI.getInactiveCustomers();
      setInactiveCustomers(response.data);
    } catch (error) {
      console.error('Error fetching inactive customers:', error);
    }
  };

  const fetchAssetLifecycle = async (assetId) => {
    try {
      setLoading(true);
      const response = await lifecycleAPI.getAssetLifecycle(assetId);
      setAssetLifecycle(response.data);
      setShowModal(true);
      setModalType('lifecycle');
    } catch (error) {
      console.error('Error fetching asset lifecycle:', error);
      alert('Error loading asset lifecycle');
    } finally {
      setLoading(false);
    }
  };

  const handleReclaimAssets = async (customerId) => {
    if (!window.confirm('Are you sure you want to reclaim all assets from this customer?')) return;
    
    try {
      const response = await lifecycleAPI.reclaimAssets(customerId);
      alert(`Successfully reclaimed ${response.data.total_reclaimed} assets`);
      fetchInactiveCustomers();
    } catch (error) {
      console.error('Error reclaiming assets:', error);
      alert('Error reclaiming assets');
    }
  };

  const openReassignModal = async (asset) => {
    setSelectedAsset(asset);
    setModalType('reassign');
    setShowModal(true);
    
    // Fetch active customers
    try {
      const response = await customersAPI.getAll({ status: 'Active' });
      setCustomers(response.data);
    } catch (error) {
      console.error('Error fetching customers:', error);
    }
  };

  const openReplaceModal = async (asset) => {
    setSelectedAsset(asset);
    setModalType('replace');
    setShowModal(true);
    
    // Fetch available assets of same type
    try {
      const response = await assetsAPI.getAll({ 
        asset_type: asset.asset_type, 
        status: 'Available' 
      });
      setAssets(response.data);
    } catch (error) {
      console.error('Error fetching assets:', error);
    }
  };

  const handleReassign = async () => {
    if (!formData.newCustomerId) {
      alert('Please select a customer');
      return;
    }
    
    try {
      await lifecycleAPI.reassignAsset(selectedAsset.asset_id, parseInt(formData.newCustomerId));
      alert('Asset reassigned successfully');
      setShowModal(false);
      resetForm();
    } catch (error) {
      console.error('Error reassigning asset:', error);
      alert('Error reassigning asset');
    }
  };

  const handleReplace = async () => {
    if (!formData.newAssetId) {
      alert('Please select a replacement asset');
      return;
    }
    
    try {
      await lifecycleAPI.replaceFaultyAsset(selectedAsset.asset_id, parseInt(formData.newAssetId));
      alert('Asset replaced successfully');
      setShowModal(false);
      resetForm();
    } catch (error) {
      console.error('Error replacing asset:', error);
      alert('Error replacing asset');
    }
  };

  const handleRetire = async (asset) => {
    const reason = prompt('Enter reason for retirement:');
    if (!reason) return;
    
    try {
      await lifecycleAPI.retireAsset(asset.asset_id, reason);
      alert('Asset retired successfully');
    } catch (error) {
      console.error('Error retiring asset:', error);
      alert('Error retiring asset');
    }
  };

  const resetForm = () => {
    setFormData({
      newCustomerId: '',
      newAssetId: '',
      retireReason: '',
    });
    setSelectedAsset(null);
  };

  const getUtilizationChartData = () => {
    return Object.keys(utilization).map(type => ({
      name: type,
      Available: utilization[type].Available,
      Assigned: utilization[type].Assigned,
      Faulty: utilization[type].Faulty,
      Retired: utilization[type].Retired,
    }));
  };

  const getUtilizationPieData = (assetType) => {
    if (!utilization[assetType]) return [];
    
    return [
      { name: 'Available', value: utilization[assetType].Available },
      { name: 'Assigned', value: utilization[assetType].Assigned },
      { name: 'Faulty', value: utilization[assetType].Faulty },
      { name: 'Retired', value: utilization[assetType].Retired },
    ];
  };

  return (
    <div>
      <div className="page-header">
        <h2>Asset Lifecycle Management</h2>
        <p>Track, reassign, and manage asset lifecycle</p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
        <button
          className={`btn ${activeTab === 'utilization' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('utilization')}
        >
          Utilization Stats
        </button>
        <button
          className={`btn ${activeTab === 'inactive' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('inactive')}
        >
          Inactive Customers
        </button>
      </div>

      {/* Utilization Stats Tab */}
      {activeTab === 'utilization' && (
        <>
          <div className="card">
            <h3 style={{ marginBottom: '1rem' }}>Asset Utilization by Type</h3>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={getUtilizationChartData()}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="Available" fill="#10b981" />
                <Bar dataKey="Assigned" fill="#3b82f6" />
                <Bar dataKey="Faulty" fill="#ef4444" />
                <Bar dataKey="Retired" fill="#6b7280" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="stats-grid" style={{ marginTop: '2rem' }}>
            {Object.keys(utilization).map((assetType) => (
              <div key={assetType} className="card">
                <h4 style={{ marginBottom: '1rem' }}>{assetType}</h4>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: '2rem', fontWeight: '700', color: '#1f2937' }}>
                      {utilization[assetType].utilization_rate}%
                    </div>
                    <div style={{ color: '#6b7280', fontSize: '0.875rem' }}>
                      Utilization Rate
                    </div>
                    <div style={{ marginTop: '1rem', fontSize: '0.875rem' }}>
                      <div>Total: {utilization[assetType].total}</div>
                      <div>Assigned: {utilization[assetType].Assigned}</div>
                      <div>Available: {utilization[assetType].Available}</div>
                    </div>
                  </div>
                  <ResponsiveContainer width="45%" height={120}>
                    <PieChart>
                      <Pie
                        data={getUtilizationPieData(assetType)}
                        cx="50%"
                        cy="50%"
                        innerRadius={30}
                        outerRadius={50}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {getUtilizationPieData(assetType).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Inactive Customers Tab */}
      {activeTab === 'inactive' && (
        <div className="data-table">
          <div className="table-header">
            <h3>Inactive Customers with Assets ({inactiveCustomers.length})</h3>
          </div>

          <table>
            <thead>
              <tr>
                <th>Customer Name</th>
                <th>Address</th>
                <th>Status</th>
                <th>Assets Count</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {inactiveCustomers.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', padding: '2rem' }}>
                    No inactive customers found
                  </td>
                </tr>
              ) : (
                inactiveCustomers.map((item) => (
                  <tr key={item.customer.customer_id}>
                    <td><strong>{item.customer.name}</strong></td>
                    <td>{item.customer.address}</td>
                    <td>
                      <span className="badge badge-danger">{item.customer.status}</span>
                    </td>
                    <td>{item.assigned_assets_count}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        {item.assigned_assets.map((asset) => (
                          <div key={asset.asset_id} style={{ marginBottom: '4px' }}>
                            <button
                              className="btn btn-secondary"
                              style={{ padding: '4px 8px', fontSize: '12px', marginRight: '4px' }}
                              onClick={() => fetchAssetLifecycle(asset.asset_id)}
                              title="View Lifecycle"
                            >
                              <History size={14} />
                            </button>
                            <button
                              className="btn btn-primary"
                              style={{ padding: '4px 8px', fontSize: '12px', marginRight: '4px' }}
                              onClick={() => openReassignModal(asset)}
                              title="Reassign"
                            >
                              <RefreshCw size={14} />
                            </button>
                            {asset.status === 'Faulty' && (
                              <button
                                className="btn btn-warning"
                                style={{ padding: '4px 8px', fontSize: '12px', marginRight: '4px' }}
                                onClick={() => openReplaceModal(asset)}
                                title="Replace"
                              >
                                <AlertTriangle size={14} />
                              </button>
                            )}
                          </div>
                        ))}
                        <button
                          className="btn btn-success"
                          style={{ padding: '6px 12px', fontSize: '12px' }}
                          onClick={() => handleReclaimAssets(item.customer.customer_id)}
                        >
                          Reclaim All
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Modals */}
      {showModal && modalType === 'lifecycle' && assetLifecycle && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Asset Lifecycle - {assetLifecycle.asset.serial_number}</h3>
              <button className="close-btn" onClick={() => setShowModal(false)}>
                <X size={24} />
              </button>
            </div>

            <div>
              <div style={{ marginBottom: '1.5rem' }}>
                <h4>Asset Information</h4>
                <p><strong>Type:</strong> {assetLifecycle.asset.asset_type}</p>
                <p><strong>Model:</strong> {assetLifecycle.asset.model}</p>
                <p><strong>Status:</strong> <span className={`badge badge-${assetLifecycle.asset.status === 'Available' ? 'success' : 'info'}`}>{assetLifecycle.asset.status}</span></p>
                <p><strong>Total Assignments:</strong> {assetLifecycle.total_assignments}</p>
              </div>

              <div>
                <h4 style={{ marginBottom: '1rem' }}>Assignment History</h4>
                {assetLifecycle.assignment_history.length === 0 ? (
                  <p style={{ color: '#6b7280' }}>No assignment history</p>
                ) : (
                  <table style={{ width: '100%', fontSize: '0.875rem' }}>
                    <thead>
                      <tr>
                        <th>Customer</th>
                        <th>Assigned On</th>
                        <th>Duration</th>
                      </tr>
                    </thead>
                    <tbody>
                      {assetLifecycle.assignment_history.map((history, idx) => (
                        <tr key={idx}>
                          <td>{history.customer_name}</td>
                          <td>{new Date(history.assigned_on).toLocaleDateString()}</td>
                          <td>{history.duration_days} days</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {showModal && modalType === 'reassign' && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Reassign Asset</h3>
              <button className="close-btn" onClick={() => setShowModal(false)}>
                <X size={24} />
              </button>
            </div>

            <div>
              <p style={{ marginBottom: '1rem' }}>
                Reassigning: <strong>{selectedAsset?.serial_number}</strong>
              </p>

              <div className="form-group">
                <label>Select New Customer *</label>
                <select
                  value={formData.newCustomerId}
                  onChange={(e) => setFormData({ ...formData, newCustomerId: e.target.value })}
                  required
                >
                  <option value="">Select Customer...</option>
                  {customers.map((customer) => (
                    <option key={customer.customer_id} value={customer.customer_id}>
                      {customer.name} - {customer.address}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-actions">
                <button className="btn btn-secondary" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button className="btn btn-primary" onClick={handleReassign}>
                  Reassign Asset
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showModal && modalType === 'replace' && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Replace Faulty Asset</h3>
              <button className="close-btn" onClick={() => setShowModal(false)}>
                <X size={24} />
              </button>
            </div>

            <div>
              <p style={{ marginBottom: '1rem' }}>
                Replacing: <strong>{selectedAsset?.serial_number}</strong>
              </p>

              <div className="form-group">
                <label>Select Replacement Asset *</label>
                <select
                  value={formData.newAssetId}
                  onChange={(e) => setFormData({ ...formData, newAssetId: e.target.value })}
                  required
                >
                  <option value="">Select Asset...</option>
                  {assets.map((asset) => (
                    <option key={asset.asset_id} value={asset.asset_id}>
                      {asset.model} - {asset.serial_number}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-actions">
                <button className="btn btn-secondary" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button className="btn btn-primary" onClick={handleReplace}>
                  Replace Asset
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AssetLifecycle;