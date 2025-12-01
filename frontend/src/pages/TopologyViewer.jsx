import { useState, useEffect } from 'react';
import { Search, Network, Server, GitBranch, User, Wifi, Radio } from 'lucide-react';
import { topologyAPI,customersAPI } from '../services/api';

function TopologyViewer() {
  const [viewType, setViewType] = useState('customer');
  const [customers, setCustomers] = useState([]);
  const [fdhs, setFdhs] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [topology, setTopology] = useState(null);
  const [searchSerial, setSearchSerial] = useState('');
  const [searchResult, setSearchResult] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchCustomers();
    fetchFDHs();
  }, []);

  const fetchCustomers = async () => {
    try {
      const response = await customersAPI.getAll();
      setCustomers(response.data);
    } catch (error) {
      console.error('Error fetching customers:', error);
    }
  };

  const fetchFDHs = async () => {
    try {
      const response = await topologyAPI.getFDHs();
      setFdhs(response.data);
    } catch (error) {
      console.error('Error fetching FDHs:', error);
    }
  };

  const handleViewTopology = async () => {
    if (!selectedId) return;
    
    try {
      setLoading(true);
      setSearchResult(null);
      let response;
      
      if (viewType === 'customer') {
        response = await topologyAPI.getCustomer(selectedId);
      } else {
        response = await topologyAPI.getFDH(selectedId);
      }
      
      setTopology(response.data);
    } catch (error) {
      console.error('Error fetching topology:', error);
      alert('Error fetching topology');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchDevice = async () => {
    if (!searchSerial.trim()) return;
    
    try {
      setLoading(true);
      setTopology(null);
      const response = await topologyAPI.searchDevice(searchSerial.trim());
      setSearchResult(response.data);
    } catch (error) {
      console.error('Error searching device:', error);
      alert('Device not found');
      setSearchResult(null);
    } finally {
      setLoading(false);
    }
  };

  const renderCustomerTopology = () => {
    if (!topology || !topology.customer) return null;

    return (
      <div className="topology-tree">
        {/* Headend */}
        {topology.headend && (
          <div className="tree-node" style={{ borderLeftColor: '#8b5cf6' }}>
            <div className="tree-node-header">
              <Server size={20} color="#8b5cf6" />
              <div>
                <strong>Headend: {topology.headend.name}</strong>
                <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                  {topology.headend.location} | {topology.headend.region}
                </div>
              </div>
            </div>

            {/* FDH */}
            {topology.fdh && (
              <div className="tree-children">
                <div className="tree-node" style={{ borderLeftColor: '#3b82f6' }}>
                  <div className="tree-node-header">
                    <Network size={20} color="#3b82f6" />
                    <div>
                      <strong>FDH: {topology.fdh.name}</strong>
                      <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                        {topology.fdh.location} | {topology.fdh.region}
                      </div>
                    </div>
                  </div>

                  {/* Splitter */}
                  {topology.splitter && (
                    <div className="tree-children">
                      <div className="tree-node" style={{ borderLeftColor: '#10b981' }}>
                        <div className="tree-node-header">
                          <GitBranch size={20} color="#10b981" />
                          <div>
                            <strong>Splitter: {topology.splitter.model}</strong>
                            <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                              Port {topology.splitter.port} | Capacity: {topology.splitter.used}/{topology.splitter.capacity}
                            </div>
                          </div>
                        </div>

                        {/* Customer */}
                        <div className="tree-children">
                          <div className="tree-node" style={{ borderLeftColor: '#f59e0b' }}>
                            <div className="tree-node-header">
                              <User size={20} color="#f59e0b" />
                              <div>
                                <strong>Customer: {topology.customer.name}</strong>
                                <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                                  {topology.customer.address}
                                  <span className={`badge ${
                                    topology.customer.status === 'Active' ? 'badge-success' :
                                    topology.customer.status === 'Pending' ? 'badge-warning' :
                                    'badge-danger'
                                  }`} style={{ marginLeft: '8px' }}>
                                    {topology.customer.status}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Assets */}
                            <div className="tree-children">
                              {topology.ont && (
                                <div className="tree-node" style={{ borderLeftColor: '#ec4899' }}>
                                  <div className="tree-node-header">
                                    <Radio size={18} color="#ec4899" />
                                    <div>
                                      <strong>ONT: {topology.ont.model}</strong>
                                      <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                                        SN: {topology.ont.serial}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              )}
                              {topology.router && (
                                <div className="tree-node" style={{ borderLeftColor: '#06b6d4' }}>
                                  <div className="tree-node-header">
                                    <Wifi size={18} color="#06b6d4" />
                                    <div>
                                      <strong>Router: {topology.router.model}</strong>
                                      <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                                        SN: {topology.router.serial}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderFDHTopology = () => {
    if (!topology || !topology.fdh) return null;

    return (
      <div className="topology-tree">
        <div className="tree-node" style={{ borderLeftColor: '#3b82f6' }}>
          <div className="tree-node-header">
            <Network size={24} color="#3b82f6" />
            <div>
              <strong>FDH: {topology.fdh.name}</strong>
              <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                {topology.fdh.location} | {topology.fdh.region} | Max Ports: {topology.fdh.max_ports}
              </div>
              <div style={{ fontSize: '0.875rem', color: '#059669', marginTop: '4px' }}>
                Total Customers: {topology.total_customers}
              </div>
            </div>
          </div>

          <div className="tree-children">
            {topology.splitters && topology.splitters.length > 0 ? (
              topology.splitters.map((splitter, idx) => (
                <div key={idx} className="tree-node" style={{ borderLeftColor: '#10b981' }}>
                  <div className="tree-node-header">
                    <GitBranch size={20} color="#10b981" />
                    <div>
                      <strong>Splitter {idx + 1}: {splitter.model}</strong>
                      <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                        Location: {splitter.location} | Capacity: {splitter.used_ports}/{splitter.port_capacity}
                      </div>
                    </div>
                  </div>

                  {splitter.customers && splitter.customers.length > 0 && (
                    <div className="tree-children">
                      {splitter.customers.map((customer) => (
                        <div key={customer.id} className="tree-node" style={{ borderLeftColor: '#f59e0b' }}>
                          <div className="tree-node-header">
                            <User size={18} color="#f59e0b" />
                            <div>
                              <strong>{customer.name}</strong>
                              <span className={`badge ${
                                customer.status === 'Active' ? 'badge-success' :
                                customer.status === 'Pending' ? 'badge-warning' :
                                'badge-danger'
                              }`} style={{ marginLeft: '8px' }}>
                                {customer.status}
                              </span>
                              <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                                Port: {customer.port}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div style={{ padding: '1rem', color: '#6b7280' }}>No splitters found</div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderSearchResult = () => {
    if (!searchResult) return null;

    return (
      <div className="topology-tree">
        <div className="tree-node" style={{ borderLeftColor: '#8b5cf6' }}>
          <div className="tree-node-header">
            <Server size={20} color="#8b5cf6" />
            <div>
              <strong>Device Found: {searchResult.asset.type}</strong>
              <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                Serial: {searchResult.asset.serial} | Model: {searchResult.asset.model}
                <span className={`badge ${
                  searchResult.asset.status === 'Available' ? 'badge-success' :
                  searchResult.asset.status === 'Assigned' ? 'badge-info' :
                  'badge-danger'
                }`} style={{ marginLeft: '8px' }}>
                  {searchResult.asset.status}
                </span>
              </div>
              <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                Location: {searchResult.asset.location || 'N/A'}
              </div>
            </div>
          </div>

          {searchResult.customer_topology && (
            <div className="tree-children">
              <div style={{ padding: '1rem', background: '#f9fafb', borderRadius: '8px' }}>
                <strong>Connected to Customer:</strong>
                <div style={{ marginTop: '8px' }}>
                  Customer: {searchResult.customer_topology.customer.name}
                </div>
                {searchResult.customer_topology.splitter && (
                  <div>Splitter: Port {searchResult.customer_topology.splitter.port}</div>
                )}
              </div>
            </div>
          )}

          {searchResult.history && searchResult.history.length > 0 && (
            <div className="tree-children">
              <div style={{ padding: '1rem', background: '#f9fafb', borderRadius: '8px' }}>
                <strong>Assignment History:</strong>
                <ul style={{ marginTop: '8px', paddingLeft: '20px' }}>
                  {searchResult.history.map((h, idx) => (
                    <li key={idx}>
                      Customer ID: {h.customer_id} | Assigned: {new Date(h.assigned_on).toLocaleDateString()}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div>
      <div className="page-header">
        <h2>Network Topology Viewer</h2>
        <p>Visualize network hierarchy and connections</p>
      </div>

      <div className="card">
        <h3 style={{ marginBottom: '1rem' }}>View Topology</h3>
        
        <div className="filters-row" style={{ marginBottom: '1rem' }}>
          <div className="form-group">
            <label>View Type</label>
            <select value={viewType} onChange={(e) => {
              setViewType(e.target.value);
              setSelectedId('');
              setTopology(null);
            }}>
              <option value="customer">Customer Topology</option>
              <option value="fdh">FDH Topology</option>
            </select>
          </div>

          <div className="form-group">
            <label>Select {viewType === 'customer' ? 'Customer' : 'FDH'}</label>
            <select 
              value={selectedId} 
              onChange={(e) => setSelectedId(e.target.value)}
            >
              <option value="">Select...</option>
              {viewType === 'customer' ? (
                customers.map((c) => (
                  <option key={c.customer_id} value={c.customer_id}>
                    {c.name} - {c.address}
                  </option>
                ))
              ) : (
                fdhs.map((f) => (
                  <option key={f.fdh_id} value={f.fdh_id}>
                    {f.name} - {f.location}
                  </option>
                ))
              )}
            </select>
          </div>

          <button 
            className="btn btn-primary"
            onClick={handleViewTopology}
            disabled={!selectedId || loading}
            style={{ marginTop: '20px' }}
          >
            View Topology
          </button>
        </div>

        <hr style={{ margin: '1.5rem 0', border: 'none', borderTop: '1px solid #e5e7eb' }} />

        <h3 style={{ marginBottom: '1rem' }}>Search Device by Serial Number</h3>
        <div className="filters-row">
          <div className="form-group">
            <label>Serial Number</label>
            <input
              type="text"
              placeholder="e.g., ONT-SN-1001"
              value={searchSerial}
              onChange={(e) => setSearchSerial(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearchDevice()}
            />
          </div>

          <button 
            className="btn btn-primary"
            onClick={handleSearchDevice}
            disabled={!searchSerial.trim() || loading}
            style={{ marginTop: '20px' }}
          >
            <Search size={16} style={{ marginRight: '8px' }} />
            Search Device
          </button>
        </div>
      </div>

      {loading && <div className="loading">Loading topology...</div>}

      {!loading && topology && (
        <div className="topology-container">
          <h3 style={{ marginBottom: '1.5rem' }}>
            {viewType === 'customer' ? 'Customer Network Path' : 'FDH Network Structure'}
          </h3>
          {viewType === 'customer' ? renderCustomerTopology() : renderFDHTopology()}
        </div>
      )}

      {!loading && searchResult && (
        <div className="topology-container">
          <h3 style={{ marginBottom: '1.5rem' }}>Device Search Result</h3>
          {renderSearchResult()}
        </div>
      )}

      {!loading && !topology && !searchResult && (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <Network size={64} color="#d1d5db" style={{ margin: '0 auto 1rem' }} />
          <p style={{ color: '#6b7280' }}>
            Select a customer or FDH to view topology, or search for a device by serial number
          </p>
        </div>
      )}
    </div>
  );
}

export default TopologyViewer;