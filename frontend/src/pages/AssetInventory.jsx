import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, X, History } from 'lucide-react';
import { assetsAPI } from '../services/api';

function AssetInventory() {
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingAsset, setEditingAsset] = useState(null);
  const [filters, setFilters] = useState({
    asset_type: '',
    status: '',
    location: '',
  });
  const [formData, setFormData] = useState({
    asset_type: 'ONT',
    model: '',
    serial_number: '',
    status: 'Available',
    location: '',
  });

  useEffect(() => {
    fetchAssets();
  }, [filters]);

  const fetchAssets = async () => {
    try {
      setLoading(true);
      const response = await assetsAPI.getAll(filters);
      setAssets(response.data);
    } catch (error) {
      console.error('Error fetching assets:', error);
      alert('Error fetching assets');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingAsset) {
        await assetsAPI.update(editingAsset.asset_id, formData);
        alert('Asset updated successfully');
      } else {
        await assetsAPI.create(formData);
        alert('Asset created successfully');
      }
      setShowModal(false);
      resetForm();
      fetchAssets();
    } catch (error) {
      console.error('Error saving asset:', error);
      alert(error.response?.data?.detail || 'Error saving asset');
    }
  };

  const handleEdit = (asset) => {
    setEditingAsset(asset);
    setFormData({
      asset_type: asset.asset_type,
      model: asset.model,
      serial_number: asset.serial_number,
      status: asset.status,
      location: asset.location || '',
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this asset?')) return;
    try {
      await assetsAPI.delete(id);
      alert('Asset deleted successfully');
      fetchAssets();
    } catch (error) {
      console.error('Error deleting asset:', error);
      alert('Error deleting asset');
    }
  };

  const resetForm = () => {
    setEditingAsset(null);
    setFormData({
      asset_type: 'ONT',
      model: '',
      serial_number: '',
      status: 'Available',
      location: '',
    });
  };

  const getStatusBadge = (status) => {
    const badges = {
      Available: 'badge-success',
      Assigned: 'badge-info',
      Faulty: 'badge-danger',
      Retired: 'badge-warning',
    };
    return `badge ${badges[status] || 'badge-info'}`;
  };

  return (
    <div>
      <div className="page-header">
        <h2>Asset Inventory</h2>
        <p>Manage network hardware assets</p>
      </div>

      <div className="filters">
        <div className="filters-row">
          <div className="form-group">
            <label>Asset Type</label>
            <select
              value={filters.asset_type}
              onChange={(e) => setFilters({ ...filters, asset_type: e.target.value })}
            >
              <option value="">All Types</option>
              <option value="ONT">ONT</option>
              <option value="Router">Router</option>
              <option value="Splitter">Splitter</option>
              <option value="FDH">FDH</option>
              <option value="Switch">Switch</option>
              <option value="CPE">CPE</option>
              <option value="FiberRoll">Fiber Roll</option>
            </select>
          </div>

          <div className="form-group">
            <label>Status</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            >
              <option value="">All Status</option>
              <option value="Available">Available</option>
              <option value="Assigned">Assigned</option>
              <option value="Faulty">Faulty</option>
              <option value="Retired">Retired</option>
            </select>
          </div>

          <div className="form-group">
            <label>Location</label>
            <input
              type="text"
              placeholder="Filter by location"
              value={filters.location}
              onChange={(e) => setFilters({ ...filters, location: e.target.value })}
            />
          </div>

          <button
            className="btn btn-primary"
            onClick={() => {
              resetForm();
              setShowModal(true);
            }}
            style={{ marginTop: '20px' }}
          >
            <Plus size={16} style={{ marginRight: '8px' }} />
            Add Asset
          </button>
        </div>
      </div>

      <div className="data-table">
        <div className="table-header">
          <h3>Assets ({assets.length})</h3>
        </div>
        
        {loading ? (
          <div className="loading">Loading assets...</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Serial Number</th>
                <th>Type</th>
                <th>Model</th>
                <th>Status</th>
                <th>Location</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {assets.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '2rem' }}>
                    No assets found
                  </td>
                </tr>
              ) : (
                assets.map((asset) => (
                  <tr key={asset.asset_id}>
                    <td><strong>{asset.serial_number}</strong></td>
                    <td>{asset.asset_type}</td>
                    <td>{asset.model}</td>
                    <td>
                      <span className={getStatusBadge(asset.status)}>{asset.status}</span>
                    </td>
                    <td>{asset.location || '-'}</td>
                    <td>
                      <button
                        className="btn btn-secondary"
                        style={{ marginRight: '8px', padding: '6px 12px' }}
                        onClick={() => handleEdit(asset)}
                      >
                        <Edit size={14} />
                      </button>
                      <button
                        className="btn btn-danger"
                        style={{ padding: '6px 12px' }}
                        onClick={() => handleDelete(asset.asset_id)}
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingAsset ? 'Edit Asset' : 'Add New Asset'}</h3>
              <button className="close-btn" onClick={() => setShowModal(false)}>
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Asset Type *</label>
                <select
                  value={formData.asset_type}
                  onChange={(e) => setFormData({ ...formData, asset_type: e.target.value })}
                  required
                  disabled={editingAsset !== null}
                >
                  <option value="ONT">ONT</option>
                  <option value="Router">Router</option>
                  <option value="Splitter">Splitter</option>
                  <option value="FDH">FDH</option>
                  <option value="Switch">Switch</option>
                  <option value="CPE">CPE</option>
                  <option value="FiberRoll">Fiber Roll</option>
                </select>
              </div>

              <div className="form-group">
                <label>Model *</label>
                <input
                  type="text"
                  value={formData.model}
                  onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                  required
                  placeholder="e.g., ONT-X9100"
                />
              </div>

              <div className="form-group">
                <label>Serial Number *</label>
                <input
                  type="text"
                  value={formData.serial_number}
                  onChange={(e) => setFormData({ ...formData, serial_number: e.target.value })}
                  required
                  disabled={editingAsset !== null}
                  placeholder="e.g., ONT-SN-1001"
                />
              </div>

              <div className="form-group">
                <label>Status *</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  required
                >
                  <option value="Available">Available</option>
                  <option value="Assigned">Assigned</option>
                  <option value="Faulty">Faulty</option>
                  <option value="Retired">Retired</option>
                </select>
              </div>

              <div className="form-group">
                <label>Location</label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="e.g., Central Store"
                />
              </div>

              <div className="form-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingAsset ? 'Update' : 'Create'} Asset
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default AssetInventory;