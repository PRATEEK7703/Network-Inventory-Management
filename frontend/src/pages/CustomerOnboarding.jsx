import { useState, useEffect } from 'react';
import { UserPlus, CheckCircle, AlertCircle } from 'lucide-react';
import { customersAPI, topologyAPI, assetsAPI } from '../services/api';

function CustomerOnboarding() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [fdhs, setFdhs] = useState([]);
  const [splitters, setSplitters] = useState([]);
  const [availablePorts, setAvailablePorts] = useState([]);
  const [availableONTs, setAvailableONTs] = useState([]);
  const [availableRouters, setAvailableRouters] = useState([]);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    address: '',
    neighborhood: '',
    plan: '100 Mbps Fiber',
    connection_type: 'Wired',
    fdh_id: '',
    splitter_id: '',
    assigned_port: '',
    ont_id: '',
    router_id: '',
    fiber_length_meters: '',
  });

  useEffect(() => {
    fetchFDHs();
    fetchAvailableAssets();
  }, []);

  useEffect(() => {
    if (formData.fdh_id) {
      fetchSplitters(formData.fdh_id);
    }
  }, [formData.fdh_id]);

  useEffect(() => {
    if (formData.splitter_id) {
      fetchAvailablePorts(formData.splitter_id);
    }
  }, [formData.splitter_id]);

  const fetchFDHs = async () => {
    try {
      const response = await topologyAPI.getFDHs();
      setFdhs(response.data);
    } catch (error) {
      console.error('Error fetching FDHs:', error);
    }
  };

  const fetchSplitters = async (fdhId) => {
    try {
      const response = await topologyAPI.getSplitters(fdhId);
      setSplitters(response.data);
      setFormData(prev => ({ ...prev, splitter_id: '', assigned_port: '' }));
    } catch (error) {
      console.error('Error fetching splitters:', error);
    }
  };

  const fetchAvailablePorts = async (splitterId) => {
    try {
      const response = await customersAPI.getAvailablePorts(splitterId);
      setAvailablePorts(response.data.available_ports);
      setFormData(prev => ({ ...prev, assigned_port: '' }));
    } catch (error) {
      console.error('Error fetching available ports:', error);
    }
  };

  const fetchAvailableAssets = async () => {
    try {
      const [ontsRes, routersRes] = await Promise.all([
        assetsAPI.getAll({ asset_type: 'ONT', status: 'Available' }),
        assetsAPI.getAll({ asset_type: 'Router', status: 'Available' }),
      ]);
      setAvailableONTs(ontsRes.data);
      setAvailableRouters(routersRes.data);
    } catch (error) {
      console.error('Error fetching available assets:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const onboardingData = {
        name: formData.name,
        address: formData.address,
        neighborhood: formData.neighborhood,
        plan: formData.plan,
        connection_type: formData.connection_type,
        splitter_id: parseInt(formData.splitter_id),
        assigned_port: parseInt(formData.assigned_port),
        ont_id: formData.ont_id ? parseInt(formData.ont_id) : null,
        router_id: formData.router_id ? parseInt(formData.router_id) : null,
        fiber_length_meters: formData.fiber_length_meters ? parseFloat(formData.fiber_length_meters) : null,
      };

      const response = await customersAPI.onboard(onboardingData);
      setSuccessMessage(`Customer ${response.data.name} onboarded successfully! Customer ID: ${response.data.customer_id}`);
      setStep(4);
      
      // Reset form after 3 seconds
      setTimeout(() => {
        resetForm();
      }, 3000);
    } catch (error) {
      console.error('Error onboarding customer:', error);
      setErrorMessage(error.response?.data?.detail || 'Error onboarding customer');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      address: '',
      neighborhood: '',
      plan: '100 Mbps Fiber',
      connection_type: 'Wired',
      fdh_id: '',
      splitter_id: '',
      assigned_port: '',
      ont_id: '',
      router_id: '',
      fiber_length_meters: '',
    });
    setStep(1);
    setSuccessMessage('');
    setErrorMessage('');
    fetchAvailableAssets();
  };

  const canProceed = () => {
    switch (step) {
      case 1:
        return formData.name && formData.address && formData.neighborhood;
      case 2:
        return formData.fdh_id && formData.splitter_id && formData.assigned_port;
      case 3:
        // CHANGED: Assets are now MANDATORY
        return formData.ont_id && formData.router_id;
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (canProceed()) {
      setStep(step + 1);
    }
  };

  const handlePrevious = () => {
    setStep(step - 1);
  };

  return (
    <div>
      <div className="page-header">
        <h2>Customer Onboarding</h2>
        <p>Register new customer and assign network resources</p>
      </div>

      {successMessage && (
        <div className="success" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <CheckCircle size={20} />
          {successMessage}
        </div>
      )}

      {errorMessage && (
        <div className="error" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <AlertCircle size={20} />
          {errorMessage}
        </div>
      )}

      {step !== 4 && (
        <div className="card">
          {/* Progress Steps */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem' }}>
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                style={{
                  flex: 1,
                  textAlign: 'center',
                  padding: '1rem',
                  background: s === step ? '#2563eb' : s < step ? '#10b981' : '#e5e7eb',
                  color: s <= step ? 'white' : '#6b7280',
                  borderRadius: '8px',
                  marginRight: s < 3 ? '1rem' : 0,
                  fontWeight: '600',
                }}
              >
                Step {s}: {s === 1 ? 'Customer Info' : s === 2 ? 'Network Assignment' : 'Asset Assignment'}
              </div>
            ))}
          </div>

          <form onSubmit={handleSubmit}>
            {/* Step 1: Customer Information */}
            {step === 1 && (
              <div>
                <h3 style={{ marginBottom: '1rem' }}>Customer Information</h3>

                <div className="form-group">
                  <label>Customer Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Enter customer name"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Address *</label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="Enter full address"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Neighborhood *</label>
                  <input
                    type="text"
                    value={formData.neighborhood}
                    onChange={(e) => setFormData({ ...formData, neighborhood: e.target.value })}
                    placeholder="Enter neighborhood"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Plan *</label>
                  <select
                    value={formData.plan}
                    onChange={(e) => setFormData({ ...formData, plan: e.target.value })}
                    required
                  >
                    <option value="50 Mbps Fiber">50 Mbps Fiber</option>
                    <option value="100 Mbps Fiber">100 Mbps Fiber</option>
                    <option value="200 Mbps Fiber">200 Mbps Fiber</option>
                    <option value="500 Mbps Fiber">500 Mbps Fiber</option>
                    <option value="1 Gbps Fiber">1 Gbps Fiber</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Connection Type *</label>
                  <select
                    value={formData.connection_type}
                    onChange={(e) => setFormData({ ...formData, connection_type: e.target.value })}
                    required
                  >
                    <option value="Wired">Wired</option>
                    <option value="Wireless">Wireless</option>
                  </select>
                </div>
              </div>
            )}

            {/* Step 2: Network Assignment */}
            {step === 2 && (
              <div>
                <h3 style={{ marginBottom: '1rem' }}>Network Assignment</h3>

                <div className="form-group">
                  <label>Select FDH *</label>
                  <select
                    value={formData.fdh_id}
                    onChange={(e) => setFormData({ ...formData, fdh_id: e.target.value })}
                    required
                  >
                    <option value="">Select FDH...</option>
                    {fdhs.map((fdh) => (
                      <option key={fdh.fdh_id} value={fdh.fdh_id}>
                        {fdh.name} - {fdh.location}
                      </option>
                    ))}
                  </select>
                </div>

                {formData.fdh_id && (
                  <div className="form-group">
                    <label>Select Splitter *</label>
                    <select
                      value={formData.splitter_id}
                      onChange={(e) => setFormData({ ...formData, splitter_id: e.target.value })}
                      required
                    >
                      <option value="">Select Splitter...</option>
                      {splitters.map((splitter) => (
                        <option key={splitter.splitter_id} value={splitter.splitter_id}>
                          {splitter.model} - {splitter.location} ({splitter.used_ports}/{splitter.port_capacity} ports used)
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {formData.splitter_id && (
                  <div className="form-group">
                    <label>Select Port *</label>
                    <select
                      value={formData.assigned_port}
                      onChange={(e) => setFormData({ ...formData, assigned_port: e.target.value })}
                      required
                    >
                      <option value="">Select Port...</option>
                      {availablePorts.map((port) => (
                        <option key={port} value={port}>
                          Port {port}
                        </option>
                      ))}
                    </select>
                    {availablePorts.length === 0 && (
                      <small style={{ color: '#ef4444' }}>No available ports in this splitter</small>
                    )}
                  </div>
                )}

                <div className="form-group">
                  <label>Fiber Drop Length (meters)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.fiber_length_meters}
                    onChange={(e) => setFormData({ ...formData, fiber_length_meters: e.target.value })}
                    placeholder="Enter fiber length in meters"
                  />
                </div>
              </div>
            )}

            {/* Step 3: Asset Assignment - NOW MANDATORY */}
            {step === 3 && (
              <div>
                <h3 style={{ marginBottom: '1rem' }}>Asset Assignment</h3>
                <div style={{ 
                  padding: '1rem', 
                  background: '#fef3c7', 
                  borderRadius: '8px', 
                  marginBottom: '1rem',
                  border: '2px solid #f59e0b'
                }}>
                  <strong style={{ color: '#92400e', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <AlertCircle size={20} />
                    ⚠️ Asset Assignment is MANDATORY
                  </strong>
                  <p style={{ fontSize: '0.875rem', marginTop: '0.5rem', color: '#92400e' }}>
                    You must assign both ONT and Router to complete the customer onboarding process.
                    If no assets are available, please add them to inventory first.
                  </p>
                </div>

                {availableONTs.length === 0 && (
                  <div className="error" style={{ marginBottom: '1rem' }}>
                    <AlertCircle size={16} />
                    No ONTs available! Please add ONTs to inventory before onboarding customers.
                  </div>
                )}

                {availableRouters.length === 0 && (
                  <div className="error" style={{ marginBottom: '1rem' }}>
                    <AlertCircle size={16} />
                    No Routers available! Please add Routers to inventory before onboarding customers.
                  </div>
                )}

                <div className="form-group">
                  <label>Select ONT *</label>
                  <select
                    value={formData.ont_id}
                    onChange={(e) => setFormData({ ...formData, ont_id: e.target.value })}
                    required
                  >
                    <option value="">Select ONT (Required)...</option>
                    {availableONTs.map((ont) => (
                      <option key={ont.asset_id} value={ont.asset_id}>
                        {ont.model} - {ont.serial_number} ({ont.location || 'No location'})
                      </option>
                    ))}
                  </select>
                  <small style={{ color: '#6b7280', display: 'block', marginTop: '4px' }}>
                    {availableONTs.length} available ONT(s)
                  </small>
                </div>

                <div className="form-group">
                  <label>Select Router *</label>
                  <select
                    value={formData.router_id}
                    onChange={(e) => setFormData({ ...formData, router_id: e.target.value })}
                    required
                  >
                    <option value="">Select Router (Required)...</option>
                    {availableRouters.map((router) => (
                      <option key={router.asset_id} value={router.asset_id}>
                        {router.model} - {router.serial_number} ({router.location || 'No location'})
                      </option>
                    ))}
                  </select>
                  <small style={{ color: '#6b7280', display: 'block', marginTop: '4px' }}>
                    {availableRouters.length} available Router(s)
                  </small>
                </div>

                {formData.ont_id && formData.router_id && (
                  <div style={{ padding: '1rem', background: '#d1fae5', borderRadius: '8px', marginTop: '1rem' }}>
                    <strong style={{ color: '#065f46', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <CheckCircle size={20} />
                      ✓ Assets Selected:
                    </strong>
                    <ul style={{ marginTop: '0.5rem', marginLeft: '1.5rem', color: '#065f46' }}>
                      <li>ONT: {availableONTs.find(o => o.asset_id == formData.ont_id)?.serial_number}</li>
                      <li>Router: {availableRouters.find(r => r.asset_id == formData.router_id)?.serial_number}</li>
                    </ul>
                  </div>
                )}

                {(!formData.ont_id || !formData.router_id) && (
                  <div style={{ padding: '1rem', background: '#fee2e2', borderRadius: '8px', marginTop: '1rem' }}>
                    <strong style={{ color: '#991b1b' }}>⚠️ Missing Required Assets</strong>
                    <p style={{ fontSize: '0.875rem', marginTop: '0.5rem', color: '#991b1b' }}>
                      Please select both ONT and Router to proceed with onboarding.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="form-actions" style={{ marginTop: '2rem' }}>
              {step > 1 && (
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handlePrevious}
                  disabled={loading}
                >
                  Previous
                </button>
              )}
              
              {step < 3 ? (
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleNext}
                  disabled={!canProceed()}
                >
                  Next Step →
                </button>
              ) : (
                <button
                  type="submit"
                  className="btn btn-success"
                  disabled={loading || !canProceed()}
                >
                  {loading ? 'Onboarding Customer...' : '✓ Complete Onboarding'}
                </button>
              )}
            </div>

            {/* Helper text under submit button */}
            {step === 3 && !canProceed() && (
              <div style={{ textAlign: 'center', marginTop: '1rem', color: '#dc2626', fontSize: '0.875rem' }}>
                Both ONT and Router must be selected to complete onboarding
              </div>
            )}
          </form>
        </div>
      )}

      {step === 4 && (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <CheckCircle size={64} color="#10b981" style={{ margin: '0 auto 1rem' }} />
          <h3 style={{ color: '#10b981', marginBottom: '1rem' }}>Onboarding Complete!</h3>
          <p style={{ color: '#6b7280', marginBottom: '2rem' }}>
            Customer has been successfully onboarded to the network with all required assets assigned.
          </p>
          <div style={{ padding: '1rem', background: '#f9fafb', borderRadius: '8px', marginBottom: '2rem' }}>
            <strong>Assets Assigned:</strong>
            <div style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: '#374151' }}>
              ✓ ONT: {availableONTs.find(o => o.asset_id == formData.ont_id)?.serial_number || 'Assigned'}<br />
              ✓ Router: {availableRouters.find(r => r.asset_id == formData.router_id)?.serial_number || 'Assigned'}
            </div>
          </div>
          <button className="btn btn-primary" onClick={resetForm}>
            <UserPlus size={16} style={{ marginRight: '8px' }} />
            Onboard Another Customer
          </button>
        </div>
      )}
    </div>
  );
}

export default CustomerOnboarding;