import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, X, CheckCircle, Clock, AlertCircle, Play, MapPin, Calendar, FileText, Camera, AlertTriangle, User } from 'lucide-react';
import { deploymentAPI, customersAPI } from '../services/api';

function DeploymentTasks() {
  const [tasks, setTasks] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [technicians, setTechnicians] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [taskDetails, setTaskDetails] = useState(null);
  const [filters, setFilters] = useState({
    status: '',
    technician_id: '',
  });
  const [formData, setFormData] = useState({
    customer_id: '',
    technician_id: '',
    scheduled_date: '',
    notes: '',
  });
  const [completionNotes, setCompletionNotes] = useState('');

  // Get current user
  const currentUser = JSON.parse(localStorage.getItem('user'));
  const isTechnician = currentUser?.role === 'Technician';
  const isPlanner = currentUser?.role === 'Planner';
  const isAdmin = currentUser?.role === 'Admin';

  useEffect(() => {
    fetchTasks();
    fetchCustomers();
    fetchTechnicians();
  }, [filters]);

  // Auto-filter for technicians to show their own tasks
  useEffect(() => {
    if (isTechnician && currentUser?.user_id) {
      findTechnicianForUser();
    }
  }, [technicians, isTechnician]);

  const findTechnicianForUser = () => {
    if (technicians.length > 0) {
      const tech = technicians.find(t => 
        t.name.toLowerCase().includes(currentUser.username.toLowerCase()) ||
        currentUser.username.toLowerCase().includes(t.name.toLowerCase())
      );
      
      if (tech && !filters.technician_id) {
        setFilters(prev => ({ ...prev, technician_id: tech.technician_id.toString() }));
      }
    }
  };

  const fetchTasks = async () => {
  try {
    setLoading(true);
    
    if (isTechnician && currentUser?.user_id) {
      // Use new endpoint for technicians
      const response = await deploymentAPI.getMyTasks(currentUser.user_id);
      const transformedTasks = response.data.map(item => ({
        ...item.task,
        customer: item.customer
      }));
      setTasks(transformedTasks);
    } else {
      // Planner/Admin: regular endpoint
      // Filter out empty string values
      const cleanFilters = {};
      if (filters.status) cleanFilters.status = filters.status;
      if (filters.technician_id) cleanFilters.technician_id = filters.technician_id;
      
      const response = await deploymentAPI.getTasks(cleanFilters);
      setTasks(response.data);
    }
  } catch (error) {
    console.error('Error fetching tasks:', error);
    if (error.response?.status === 404 && isTechnician) {
      alert('Your technician profile is not linked. Please contact admin.');
    }
    setTasks([]);
  } finally {
    setLoading(false);
  }
};

  const fetchCustomers = async () => {
    try {
      const response = await customersAPI.getAll();
      setCustomers(response.data);
    } catch (error) {
      console.error('Error fetching customers:', error);
      setCustomers([]);
    }
  };

  const fetchTechnicians = async () => {
    try {
      const response = await deploymentAPI.getTechnicians();
      setTechnicians(response.data);
    } catch (error) {
      console.error('Error fetching technicians:', error);
      setTechnicians([]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const taskData = {
        customer_id: parseInt(formData.customer_id),
        technician_id: formData.technician_id ? parseInt(formData.technician_id) : null,
        scheduled_date: formData.scheduled_date || null,
        notes: formData.notes || null,
      };

      await deploymentAPI.createTask(taskData);
      alert('Deployment task created successfully');
      setShowModal(false);
      resetForm();
      fetchTasks();
      fetchCustomers();
    } catch (error) {
      console.error('Error creating task:', error);
      alert(error.response?.data?.detail || 'Error creating task');
    }
  };

  const handleUpdateStatus = async (taskId, newStatus) => {
    try {
      await deploymentAPI.updateTask(taskId, { status: newStatus });
      alert(`Task status updated to ${newStatus}`);
      fetchTasks();
      
      if (showDetailsModal && selectedTask?.task_id === taskId) {
        const response = await deploymentAPI.getTask(taskId);
        setTaskDetails(response.data);
        setSelectedTask({ ...selectedTask, status: newStatus });
      }
    } catch (error) {
      console.error('Error updating task:', error);
      alert('Error updating task status');
    }
  };

  const handleViewDetails = async (task) => {
    try {
      const response = await deploymentAPI.getTask(task.task_id);
      setTaskDetails(response.data);
      setSelectedTask(task);
      setShowDetailsModal(true);
    } catch (error) {
      console.error('Error fetching task details:', error);
      alert('Error loading task details');
    }
  };

  const handleOpenNotesModal = (task) => {
    setSelectedTask(task);
    setShowNotesModal(true);
  };

  const handleAddNotes = async () => {
    if (!completionNotes.trim()) {
      alert('Please enter notes');
      return;
    }

    try {
      await deploymentAPI.addNotes(selectedTask.task_id, completionNotes);
      alert('Notes added successfully');
      setShowNotesModal(false);
      setCompletionNotes('');
      fetchTasks();
      
      if (showDetailsModal) {
        const response = await deploymentAPI.getTask(selectedTask.task_id);
        setTaskDetails(response.data);
      }
    } catch (error) {
      console.error('Error adding notes:', error);
      alert('Error adding notes');
    }
  };

  const handleOpenCompleteModal = (task) => {
    setSelectedTask(task);
    setCompletionNotes('');
    setShowCompleteModal(true);
  };

  const handleCompleteTask = async () => {
    if (!completionNotes.trim()) {
      alert('Please provide completion notes describing the installation work done');
      return;
    }

    try {
      // Add notes first
      await deploymentAPI.addNotes(selectedTask.task_id, completionNotes);
      // Then mark as completed
      await deploymentAPI.updateTask(selectedTask.task_id, { status: 'Completed' });
      
      alert('✅ Task marked as completed! Customer is now Active.');
      setShowCompleteModal(false);
      setShowDetailsModal(false);
      setCompletionNotes('');
      fetchTasks();
    } catch (error) {
      console.error('Error completing task:', error);
      alert('Error completing task');
    }
  };

  const handleDelete = async (taskId) => {
    if (!window.confirm('Are you sure you want to delete this task?')) return;
    try {
      await deploymentAPI.deleteTask(taskId);
      alert('Task deleted successfully');
      fetchTasks();
    } catch (error) {
      console.error('Error deleting task:', error);
      alert('Error deleting task');
    }
  };

  const resetForm = () => {
    setFormData({
      customer_id: '',
      technician_id: '',
      scheduled_date: '',
      notes: '',
    });
  };

  const getStatusBadge = (status) => {
    const badges = {
      Scheduled: 'badge-info',
      InProgress: 'badge-warning',
      Completed: 'badge-success',
      Failed: 'badge-danger',
    };
    return `badge ${badges[status] || 'badge-info'}`;
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'Scheduled':
        return <Clock size={16} />;
      case 'InProgress':
        return <Play size={16} />;
      case 'Completed':
        return <CheckCircle size={16} />;
      case 'Failed':
        return <AlertCircle size={16} />;
      default:
        return <Clock size={16} />;
    }
  };

  // Categorize tasks for technicians
  const getTodaysTasks = () => {
    const today = new Date().toDateString();
    return tasks.filter(task => {
      if (!task.scheduled_date) return false;
      return new Date(task.scheduled_date).toDateString() === today;
    });
  };

  const getUpcomingTasks = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return tasks.filter(task => {
      if (!task.scheduled_date) return false;
      const taskDate = new Date(task.scheduled_date);
      taskDate.setHours(0, 0, 0, 0);
      return taskDate > today;
    });
  };

  const getInProgressTasks = () => {
    return tasks.filter(task => task.status === 'InProgress');
  };

  const getCompletedTasks = () => {
    return tasks.filter(task => task.status === 'Completed');
  };

  return (
    <div>
      <div className="page-header">
        <h2>
          {isTechnician ? (
            <>
              <User size={28} style={{ marginRight: '12px', verticalAlign: 'middle' }} />
              My Installation Tasks
            </>
          ) : (
            'Deployment Tasks'
          )}
        </h2>
        <p>
          {isTechnician 
            ? 'Manage your field installation tasks and update work progress' 
            : 'Manage field installation and deployment tasks'}
        </p>
      </div>

      {/* Technician Dashboard Stats */}
      {isTechnician && (
        <div className="stats-grid" style={{ marginBottom: '2rem' }}>
          <div className="stat-card">
            <div className="stat-header">
              <div>
                <div className="stat-value">{getTodaysTasks().length}</div>
                <div className="stat-label">Today's Tasks</div>
              </div>
              <div className="stat-icon orange">
                <Calendar size={24} />
              </div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-header">
              <div>
                <div className="stat-value">{getInProgressTasks().length}</div>
                <div className="stat-label">In Progress</div>
              </div>
              <div className="stat-icon blue">
                <Play size={24} />
              </div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-header">
              <div>
                <div className="stat-value">{getUpcomingTasks().length}</div>
                <div className="stat-label">Upcoming</div>
              </div>
              <div className="stat-icon purple">
                <Clock size={24} />
              </div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-header">
              <div>
                <div className="stat-value">{getCompletedTasks().length}</div>
                <div className="stat-label">Completed</div>
              </div>
              <div className="stat-icon green">
                <CheckCircle size={24} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Show info message for technicians with no tasks */}
      {isTechnician && tasks.length === 0 && !loading && (
        <div style={{ 
          padding: '2rem', 
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          borderRadius: '12px',
          marginBottom: '2rem',
          color: 'white',
          textAlign: 'center'
        }}>
          <AlertCircle size={48} style={{ margin: '0 auto 1rem' }} />
          <h3 style={{ marginBottom: '0.5rem' }}>No Tasks Assigned Yet</h3>
          <p style={{ opacity: 0.9 }}>
            Tasks will appear here when a planner assigns deployment work to you.
            Check back soon or contact your supervisor.
          </p>
        </div>
      )}

      {/* Filters */}
      <div className="filters">
        <div className="filters-row">
          <div className="form-group">
            <label>Status</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            >
              <option value="">All Status</option>
              <option value="Scheduled">Scheduled</option>
              <option value="InProgress">In Progress</option>
              <option value="Completed">Completed</option>
              <option value="Failed">Failed</option>
            </select>
          </div>

          {!isTechnician && (
            <div className="form-group">
              <label>Technician</label>
              <select
                value={filters.technician_id}
                onChange={(e) => setFilters({ ...filters, technician_id: e.target.value })}
              >
                <option value="">All Technicians</option>
                {technicians.map((tech) => (
                  <option key={tech.technician_id} value={tech.technician_id}>
                    {tech.name} - {tech.region}
                  </option>
                ))}
              </select>
            </div>
          )}

          {!isTechnician && (
            <button
              className="btn btn-primary"
              onClick={() => {
                resetForm();
                setShowModal(true);
              }}
              style={{ marginTop: '20px' }}
            >
              <Plus size={16} style={{ marginRight: '8px' }} />
              Create Task
            </button>
          )}
        </div>
      </div>

      {/* Tasks Table */}
      <div className="data-table">
        <div className="table-header">
          <h3>
            {isTechnician ? 'My Tasks' : 'All Tasks'} ({tasks.length})
          </h3>
        </div>

        {loading ? (
          <div className="loading">Loading tasks...</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Task ID</th>
                <th>Customer</th>
                <th>Address</th>
                {!isTechnician && <th>Technician</th>}
                <th>Status</th>
                <th>Scheduled Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {tasks.length === 0 ? (
                <tr>
                  <td colSpan={isTechnician ? "6" : "7"} style={{ textAlign: 'center', padding: '2rem' }}>
                    {isTechnician 
                      ? 'No tasks assigned to you yet'
                      : 'No deployment tasks found'}
                  </td>
                </tr>
              ) : (
                tasks.map((task) => {
                  const isToday = task.scheduled_date && 
                    new Date(task.scheduled_date).toDateString() === new Date().toDateString();
                  
                  return (
                    <tr key={task.task_id} style={isToday && isTechnician ? { background: '#fef3c7' } : {}}>
                      <td>
                        <strong>#{task.task_id}</strong>
                        {isToday && isTechnician && (
                          <span style={{ 
                            marginLeft: '8px', 
                            padding: '2px 8px', 
                            background: '#f59e0b', 
                            color: 'white', 
                            borderRadius: '4px',
                            fontSize: '0.75rem',
                            fontWeight: '600'
                          }}>
                            TODAY
                          </span>
                        )}
                      </td>
                      <td><strong>{task.customer_name || `Customer #${task.customer_id}`}</strong></td>
                      <td style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                        <MapPin size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
                        {task.customer_address || '-'}
                      </td>
                      {!isTechnician && <td>{task.technician_name || 'Unassigned'}</td>}
                      <td>
                        <span 
                          className={getStatusBadge(task.status)} 
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                        >
                          {getStatusIcon(task.status)}
                          {task.status}
                        </span>
                      </td>
                      <td>
                        {task.scheduled_date 
                          ? new Date(task.scheduled_date).toLocaleDateString() 
                          : 'Not scheduled'}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                          <button
                            className="btn btn-secondary"
                            style={{ padding: '6px 12px', fontSize: '12px' }}
                            onClick={() => handleViewDetails(task)}
                          >
                            View Details
                          </button>
                          
                          {isTechnician && task.status === 'Scheduled' && (
                            <button
                              className="btn btn-warning"
                              style={{ padding: '6px 12px', fontSize: '12px' }}
                              onClick={() => handleUpdateStatus(task.task_id, 'InProgress')}
                            >
                              <Play size={14} style={{ marginRight: '4px' }} />
                              Start
                            </button>
                          )}
                          
                          {isTechnician && task.status === 'InProgress' && (
                            <>
                              <button
                                className="btn btn-primary"
                                style={{ padding: '6px 12px', fontSize: '12px' }}
                                onClick={() => handleOpenNotesModal(task)}
                              >
                                <FileText size={14} style={{ marginRight: '4px' }} />
                                Add Notes
                              </button>
                              <button
                                className="btn btn-success"
                                style={{ padding: '6px 12px', fontSize: '12px' }}
                                onClick={() => handleOpenCompleteModal(task)}
                              >
                                <CheckCircle size={14} style={{ marginRight: '4px' }} />
                                Complete
                              </button>
                            </>
                          )}
                          
                          {!isTechnician && task.status === 'Scheduled' && (
                            <button
                              className="btn btn-warning"
                              style={{ padding: '6px 12px', fontSize: '12px' }}
                              onClick={() => handleUpdateStatus(task.task_id, 'InProgress')}
                            >
                              Start
                            </button>
                          )}
                          
                          {!isTechnician && task.status === 'InProgress' && (
                            <button
                              className="btn btn-success"
                              style={{ padding: '6px 12px', fontSize: '12px' }}
                              onClick={() => handleOpenCompleteModal(task)}
                            >
                              Complete
                            </button>
                          )}
                          
                          {!isTechnician && (
                            <button
                              className="btn btn-danger"
                              style={{ padding: '6px 12px' }}
                              onClick={() => handleDelete(task.task_id)}
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Create Task Modal (Planner/Admin only) */}
      {showModal && !isTechnician && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Create Deployment Task</h3>
              <button className="close-btn" onClick={() => setShowModal(false)}>
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Customer *</label>
                <select
                  value={formData.customer_id}
                  onChange={(e) => setFormData({ ...formData, customer_id: e.target.value })}
                  required
                >
                  <option value="">Select Customer...</option>
                  {customers.map((customer) => (
                    <option key={customer.customer_id} value={customer.customer_id}>
                      {customer.name} - {customer.address} [{customer.status}]
                    </option>
                  ))}
                </select>
                <small style={{ color: '#6b7280', display: 'block', marginTop: '4px' }}>
                  {customers.length} customer(s) available
                </small>
              </div>

              <div className="form-group">
                <label>Assign Technician</label>
                <select
                  value={formData.technician_id}
                  onChange={(e) => setFormData({ ...formData, technician_id: e.target.value })}
                >
                  <option value="">Select Technician (Optional)...</option>
                  {technicians.map((tech) => (
                    <option key={tech.technician_id} value={tech.technician_id}>
                      {tech.name} - {tech.region}
                    </option>
                  ))}
                </select>
                <small style={{ color: '#6b7280', display: 'block', marginTop: '4px' }}>
                  Can be assigned later if not selected now
                </small>
              </div>

              <div className="form-group">
                <label>Scheduled Date</label>
                <input
                  type="date"
                  value={formData.scheduled_date}
                  onChange={(e) => setFormData({ ...formData, scheduled_date: e.target.value })}
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>

              <div className="form-group">
                <label>Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Add any notes or instructions for the technician..."
                  rows={3}
                />
              </div>

              <div className="form-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Create Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Task Details Modal */}
      {showDetailsModal && taskDetails && (
        <div className="modal-overlay" onClick={() => setShowDetailsModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '800px' }}>
            <div className="modal-header">
              <h3>Task Details - #{selectedTask.task_id}</h3>
              <button className="close-btn" onClick={() => setShowDetailsModal(false)}>
                <X size={24} />
              </button>
            </div>

            <div>
              {/* Status Section */}
              <div style={{ marginBottom: '1.5rem' }}>
                <h4 style={{ marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <AlertCircle size={20} />
                  Current Status
                </h4>
                <span className={getStatusBadge(taskDetails.task.status)} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '1rem', padding: '8px 16px' }}>
                  {getStatusIcon(taskDetails.task.status)}
                  {taskDetails.task.status}
                </span>
              </div>

              {/* Customer Information */}
              <div style={{ marginBottom: '1.5rem', padding: '1rem', background: '#f9fafb', borderRadius: '8px' }}>
                <h4 style={{ marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <User size={20} />
                  Customer Information
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.875rem' }}>
                  <div><strong>Name:</strong> {taskDetails.customer.name}</div>
                  <div><strong>Plan:</strong> {taskDetails.customer.plan}</div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <strong>Address:</strong> <MapPin size={14} style={{ verticalAlign: 'middle', marginLeft: '4px' }} /> {taskDetails.customer.address}
                  </div>
                  <div><strong>Connection:</strong> {taskDetails.customer.connection_type}</div>
                  <div><strong>Status:</strong> 
                    <span className={`badge ${taskDetails.customer.status === 'Active' ? 'badge-success' : 'badge-warning'}`} style={{ marginLeft: '8px' }}>
                      {taskDetails.customer.status}
                    </span>
                  </div>
                </div>
              </div>

              {/* Technician Info */}
              {taskDetails.technician && (
                <div style={{ marginBottom: '1.5rem', padding: '1rem', background: '#eff6ff', borderRadius: '8px' }}>
                  <h4 style={{ marginBottom: '0.75rem' }}>👨‍🔧 Assigned Technician</h4>
                  <div style={{ fontSize: '0.875rem' }}>
                    <div><strong>Name:</strong> {taskDetails.technician.name}</div>
                    <div><strong>Contact:</strong> {taskDetails.technician.contact}</div>
                    <div><strong>Region:</strong> {taskDetails.technician.region}</div>
                  </div>
                </div>
              )}

              {/* Assets Section */}
              {taskDetails.assets && taskDetails.assets.length > 0 ? (
                <div style={{ marginBottom: '1.5rem', padding: '1rem', background: '#d1fae5', borderRadius: '8px' }}>
                  <h4 style={{ marginBottom: '0.75rem', color: '#065f46' }}>✅ Equipment to Install</h4>
                  {taskDetails.assets.map((asset) => (
                    <div key={asset.asset_id} style={{ 
                      background: 'white', 
                      padding: '0.75rem', 
                      borderRadius: '4px', 
                      marginBottom: '0.5rem',
                      border: '2px solid #10b981'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <strong style={{ color: '#065f46' }}>{asset.asset_type}:</strong> {asset.model}
                          <div style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: '4px' }}>
                            Serial Number: <strong>{asset.serial_number}</strong>
                          </div>
                        </div>
                        <span className="badge badge-success">{asset.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ marginBottom: '1.5rem', padding: '1rem', background: '#fef3c7', borderRadius: '8px', border: '2px solid #f59e0b' }}>
                  <h4 style={{ color: '#92400e', marginBottom: '0.5rem' }}>⚠️ No Equipment Assigned</h4>
                  <p style={{ fontSize: '0.875rem', color: '#92400e', margin: 0 }}>
                    Assets (ONT, Router) need to be assigned to this customer before installation.
                    Contact the planner to assign equipment.
                  </p>
                </div>
              )}

              {/* Network Connection */}
              {taskDetails.splitter ? (
                <div style={{ marginBottom: '1.5rem', padding: '1rem', background: '#f0f9ff', borderRadius: '8px' }}>
                  <h4 style={{ marginBottom: '0.75rem' }}>🔌 Network Connection Path</h4>
                  <div style={{ fontSize: '0.875rem' }}>
                    {taskDetails.fdh && <div><strong>FDH:</strong> {taskDetails.fdh.name} - {taskDetails.fdh.location}</div>}
                    <div><strong>Splitter:</strong> {taskDetails.splitter.model} - {taskDetails.splitter.location}</div>
                    <div><strong>Port Number:</strong> Port {taskDetails.customer.assigned_port}</div>
                    {taskDetails.customer.fiber_length_meters && (
                      <div><strong>Fiber Drop Length:</strong> {taskDetails.customer.fiber_length_meters}m</div>
                    )}
                  </div>
                </div>
              ) : (
                <div style={{ marginBottom: '1.5rem', padding: '1rem', background: '#fee2e2', borderRadius: '8px', border: '2px solid #ef4444' }}>
                  <h4 style={{ color: '#991b1b', marginBottom: '0.5rem' }}>❌ No Network Path Assigned</h4>
                  <p style={{ fontSize: '0.875rem', color: '#991b1b', margin: 0 }}>
                    This customer has not been assigned to a network path (FDH/Splitter).
                  </p>
                </div>
              )}

              {/* Schedule Info */}
              {taskDetails.task.scheduled_date && (
                <div style={{ marginBottom: '1.5rem', padding: '1rem', background: '#faf5ff', borderRadius: '8px' }}>
                  <h4 style={{ marginBottom: '0.5rem' }}>📅 Scheduled Date</h4>
                  <div style={{ fontSize: '1rem', fontWeight: '600', color: '#6b21a8' }}>
                    {new Date(taskDetails.task.scheduled_date).toLocaleDateString('en-US', { 
                      weekday: 'long', 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}
                  </div>
                </div>
              )}

              {/* Installation Notes */}
              {taskDetails.task.notes && (
                <div style={{ marginBottom: '1.5rem' }}>
                  <h4 style={{ marginBottom: '0.5rem' }}>📝 Installation Notes</h4>
                  <div style={{ background: '#f9fafb', padding: '1rem', borderRadius: '4px', whiteSpace: 'pre-wrap', fontSize: '0.875rem' }}>
                    {taskDetails.task.notes}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="form-actions">
                {isTechnician && (
                  <>
                    {taskDetails.task.status === 'Scheduled' && (
                      <button
                        className="btn btn-warning"
                        onClick={() => {
                          handleUpdateStatus(selectedTask.task_id, 'InProgress');
                        }}
                        style={{ flex: 1 }}
                      >
                        <Play size={16} style={{ marginRight: '8px' }} />
                        Start Installation
                      </button>
                    )}
                    {taskDetails.task.status === 'InProgress' && (
                      <>
                        <button
                          className="btn btn-secondary"
                          onClick={() => {
                            setShowDetailsModal(false);
                            handleOpenNotesModal(selectedTask);
                          }}
                        >
                          <FileText size={16} style={{ marginRight: '8px' }} />
                          Add Progress Notes
                        </button>
                        <button
                          className="btn btn-success"
                          onClick={() => {
                            setShowDetailsModal(false);
                            handleOpenCompleteModal(selectedTask);
                          }}
                          style={{ flex: 1 }}
                        >
                          <CheckCircle size={16} style={{ marginRight: '8px' }} />
                          Mark as Completed
                        </button>
                      </>
                    )}
                    {taskDetails.task.status === 'Completed' && (
                      <div style={{ 
                        padding: '1rem', 
                        background: '#d1fae5', 
                        borderRadius: '8px',
                        textAlign: 'center',
                        color: '#065f46',
                        fontWeight: '600'
                      }}>
                        ✅ Installation Completed Successfully!
                      </div>
                    )}
                  </>
                )}
                
                {!isTechnician && (
                  <>
                    {taskDetails.task.status === 'Scheduled' && (
                      <button
                        className="btn btn-warning"
                        onClick={() => {
                          handleUpdateStatus(selectedTask.task_id, 'InProgress');
                        }}
                      >
                        <Play size={16} style={{ marginRight: '8px' }} />
                        Start Task
                      </button>
                    )}
                    {taskDetails.task.status === 'InProgress' && (
                      <button
                        className="btn btn-success"
                        onClick={() => {
                          setShowDetailsModal(false);
                          handleOpenCompleteModal(selectedTask);
                        }}
                      >
                        <CheckCircle size={16} style={{ marginRight: '8px' }} />
                        Mark as Completed
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Notes Modal (For Technicians) */}
      {showNotesModal && (
        <div className="modal-overlay" onClick={() => setShowNotesModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>
                <FileText size={24} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
                Add Progress Notes
              </h3>
              <button className="close-btn" onClick={() => setShowNotesModal(false)}>
                <X size={24} />
              </button>
            </div>

            <div>
              <p style={{ marginBottom: '1rem', color: '#6b7280' }}>
                Document your installation progress, issues encountered, or any important observations.
              </p>

              <div className="form-group">
                <label>Installation Notes *</label>
                <textarea
                  value={completionNotes}
                  onChange={(e) => setCompletionNotes(e.target.value)}
                  placeholder="Example: Installed ONT in living room, ran fiber cable through conduit, signal strength good at -25dBm..."
                  rows={6}
                  style={{ width: '100%' }}
                />
              </div>

              <div className="form-actions">
                <button 
                  className="btn btn-secondary" 
                  onClick={() => {
                    setShowNotesModal(false);
                    setCompletionNotes('');
                  }}
                >
                  Cancel
                </button>
                <button 
                  className="btn btn-primary" 
                  onClick={handleAddNotes}
                  disabled={!completionNotes.trim()}
                >
                  <CheckCircle size={16} style={{ marginRight: '8px' }} />
                  Save Notes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Complete Task Modal (For Technicians) */}
      {showCompleteModal && (
        <div className="modal-overlay" onClick={() => setShowCompleteModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>
                <CheckCircle size={24} style={{ marginRight: '8px', verticalAlign: 'middle', color: '#10b981' }} />
                Complete Installation Task
              </h3>
              <button className="close-btn" onClick={() => setShowCompleteModal(false)}>
                <X size={24} />
              </button>
            </div>

            <div>
              <div style={{ 
                padding: '1rem', 
                background: '#fef3c7', 
                borderRadius: '8px',
                marginBottom: '1.5rem',
                border: '2px solid #f59e0b'
              }}>
                <strong style={{ color: '#92400e', display: 'block', marginBottom: '0.5rem' }}>
                  ⚠️ Important: Completion Notes Required
                </strong>
                <p style={{ fontSize: '0.875rem', color: '#92400e', margin: 0 }}>
                  Please provide detailed notes about the installation work completed before marking this task as done.
                  This helps with quality assurance and future reference.
                </p>
              </div>

              <div style={{ 
                padding: '1rem', 
                background: '#d1fae5', 
                borderRadius: '8px',
                marginBottom: '1.5rem'
              }}>
                <strong style={{ color: '#065f46', display: 'block', marginBottom: '0.5rem' }}>
                  📋 What to Include in Your Notes:
                </strong>
                <ul style={{ fontSize: '0.875rem', color: '#065f46', marginLeft: '1.5rem', marginTop: '0.5rem' }}>
                  <li>Equipment installed (ONT, Router locations)</li>
                  <li>Fiber connection status and signal strength</li>
                  <li>Testing results (internet connectivity, speed)</li>
                  <li>Any issues encountered and how resolved</li>
                  <li>Customer feedback or special requests</li>
                </ul>
              </div>

              <div className="form-group">
                <label>Completion Summary *</label>
                <textarea
                  value={completionNotes}
                  onChange={(e) => setCompletionNotes(e.target.value)}
                  placeholder="Example: Successfully installed ONT-SN-1001 in living room and R1-WN1200 in hallway. Fiber connected to port 9 on splitter, signal strength -23dBm (excellent). Speed test showed 95/95 Mbps. Customer tested all services - internet, voice working perfectly. No issues. Installation complete."
                  rows={8}
                  style={{ width: '100%' }}
                />
                <small style={{ color: '#6b7280', display: 'block', marginTop: '4px' }}>
                  Minimum 20 characters required
                </small>
              </div>

              <div className="form-actions">
                <button 
                  className="btn btn-secondary" 
                  onClick={() => {
                    setShowCompleteModal(false);
                    setCompletionNotes('');
                  }}
                >
                  Cancel
                </button>
                <button 
                  className="btn btn-success" 
                  onClick={handleCompleteTask}
                  disabled={!completionNotes.trim() || completionNotes.trim().length < 20}
                  style={{ flex: 1 }}
                >
                  <CheckCircle size={16} style={{ marginRight: '8px' }} />
                  ✓ Mark Task as Completed
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default DeploymentTasks;