import { useState, useEffect } from 'react';
import Modal from '../components/Modal';
import { fetchHospitalsList, addHospitalRecord, updateHospitalRecord, deleteHospitalRecord } from '../api';

const INITIAL_FORM = {
  name: '',
  city: '',
  state: '',
  pincode: '',
  lat: '',
  long: '',
  specialties: '',
  cost_estimate_min: '',
  cost_estimate_max: '',
  facilities: '',
  bed_count: '',
  accreditation_status: 'NABH Accredited',
  patient_volume: '',
  rating: '4.5',
};

// Timers are tracked so navigation away doesn't leave dangling setState calls.
const MESSAGE_TTL_MS = 3000;

function AdminPage({ user, onOpenAuth }) {
  const [hospitals, setHospitals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [message, setMessage] = useState('');

  const loadHospitals = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await fetchHospitalsList();
      setHospitals(data);
    } catch (err) {
      setLoadError(err.message || 'Could not reach the server.');
    } finally {
      setLoading(false);
    }
  };

  // eslint-disable-next-line react/set-state-in-effect -- async data fetch on mount; setState fires after await, not synchronously
  useEffect(() => {
    loadHospitals();
  }, []);

  const showTimedMessage = (text) => {
    setMessage(text);
    setTimeout(() => setMessage(''), MESSAGE_TTL_MS);
  };

  const isAdmin = user && user.role === 'admin';

  if (!isAdmin) {
    return (
      <div className="section" style={{ textAlign: 'center', padding: 50 }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: 6 }}>Admin Access Required</h2>
        <p style={{ color: 'var(--text-subtle)', maxWidth: 450, margin: '0 auto 18px', fontSize: '0.875rem' }}>
          You must be logged in as an Administrator to manage hospital records in the database.
        </p>
        <button className="btn btn-primary" onClick={onOpenAuth}>
          Log In as Admin
        </button>
      </div>
    );
  }

  const handleOpenAdd = () => {
    setEditingId(null);
    setFormData({ ...INITIAL_FORM, state: hospitals[0]?.state || '' });
    setShowForm(true);
  };

  const handleEdit = (h) => {
    setEditingId(h.id);
    setFormData({
      name: h.name ?? '',
      city: h.city ?? '',
      state: h.state ?? '',
      pincode: h.pincode ?? '',
      lat: h.lat != null ? String(h.lat) : '',
      long: h.long != null ? String(h.long) : '',
      specialties: Array.isArray(h.specialties) ? h.specialties.join(', ') : (h.specialties ?? ''),
      cost_estimate_min: String(h.cost_estimate_min ?? ''),
      cost_estimate_max: String(h.cost_estimate_max ?? ''),
      facilities: Array.isArray(h.facilities) ? h.facilities.join(', ') : (h.facilities ?? ''),
      bed_count: String(h.bed_count ?? ''),
      accreditation_status: h.accreditation_status ?? 'Not Accredited',
      patient_volume: String(h.patient_volume ?? ''),
      rating: String(h.rating ?? '4.5'),
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this hospital record?')) return;
    try {
      await deleteHospitalRecord(id);
      showTimedMessage('Hospital deleted successfully.');
      loadHospitals();
    } catch (err) {
      showTimedMessage(err.message || 'Delete failed.');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      name: formData.name.trim(),
      city: formData.city.trim(),
      state: formData.state.trim(),
      pincode: formData.pincode.trim(),
      lat: formData.lat ? parseFloat(formData.lat) : null,
      long: formData.long ? parseFloat(formData.long) : null,
      specialties: formData.specialties.split(',').map(s => s.trim()).filter(Boolean),
      facilities: formData.facilities.split(',').map(f => f.trim()).filter(Boolean),
      cost_estimate_min: parseInt(formData.cost_estimate_min, 10) || 0,
      cost_estimate_max: parseInt(formData.cost_estimate_max, 10) || 0,
      bed_count: parseInt(formData.bed_count, 10) || 0,
      accreditation_status: formData.accreditation_status,
      patient_volume: parseInt(formData.patient_volume, 10) || 0,
      rating: parseFloat(formData.rating) || 4.5,
    };

    if (payload.cost_estimate_min > payload.cost_estimate_max) {
      showTimedMessage('Min cost cannot be greater than max cost.');
      return;
    }

    try {
      if (editingId) {
        await updateHospitalRecord(editingId, payload);
        showTimedMessage('Hospital record updated.');
      } else {
        await addHospitalRecord(payload);
        showTimedMessage('Hospital record created.');
      }
      setShowForm(false);
      loadHospitals();
    } catch (err) {
      showTimedMessage(err.message || 'Save failed.');
    }
  };

  const totalHospitals = hospitals.length;
  const totalBeds = hospitals.reduce((acc, h) => acc + (Number(h.bed_count) || 0), 0);
  const accreditedCount = hospitals.filter(h => String(h.accreditation_status || '').includes('Accredited')).length;

  return (
    <div className="admin-page">
      <div className="section">
        <div className="section-header">
          <div>
            <h1 className="section-title">Administrator Portal</h1>
            <p className="section-subtitle">Manage {totalHospitals} healthcare facility records in the database</p>
          </div>
          <button className="btn btn-primary" onClick={handleOpenAdd}>
            + Add Hospital
          </button>
        </div>

        {loadError && (
          <div style={{ padding: 10, background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: 6, color: '#fca5a5', marginBottom: 20, fontSize: '0.875rem' }}>
            {loadError}{' '}
            <button className="btn btn-secondary btn-sm" onClick={loadHospitals}>Retry</button>
          </div>
        )}

        {message && (
          <div style={{ padding: 10, background: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: 6, color: '#6ee7b7', marginBottom: 20, fontSize: '0.875rem' }}>
            {message}
          </div>
        )}

        <div className="admin-stats-grid">
          <div className="stat-card">
            <span className="stat-num">{totalHospitals}</span>
            <span className="stat-title">Total Hospitals</span>
          </div>
          <div className="stat-card">
            <span className="stat-num">{totalBeds.toLocaleString()}</span>
            <span className="stat-title">Total Beds</span>
          </div>
          <div className="stat-card">
            <span className="stat-num">{totalHospitals ? Math.round((accreditedCount / totalHospitals) * 100) : 0}%</span>
            <span className="stat-title">Accredited</span>
          </div>
        </div>

        <div className="comparison-table-wrapper">
          <table className="admin-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Location</th>
                <th>Rating</th>
                <th>Specialties</th>
                <th>Fees Range</th>
                <th>Beds</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: 30 }}>
                    <span className="spinner" /> Loading records...
                  </td>
                </tr>
              ) : hospitals.map(h => (
                <tr key={h.id}>
                  <td>#{h.id}</td>
                  <td style={{ fontWeight: 600, color: 'var(--text-main)' }}>{h.name}</td>
                  <td>{h.city}{h.state ? `, ${h.state}` : ''}</td>
                  <td style={{ color: '#f59e0b', fontWeight: 600 }}>★ {h.rating || 'N/A'}</td>
                  <td>{Array.isArray(h.specialties) ? h.specialties.join(', ') : h.specialties}</td>
                  <td className="cost-range">₹{Number(h.cost_estimate_min).toLocaleString()} - ₹{Number(h.cost_estimate_max).toLocaleString()}</td>
                  <td>{h.bed_count}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn btn-secondary btn-sm" onClick={() => handleEdit(h)}>
                        Edit
                      </button>
                      <button className="btn btn-danger btn-sm" onClick={() => handleDelete(h.id)}>
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        title={editingId ? 'Edit Hospital Record' : 'Add New Hospital'}
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={() => document.getElementById('admin-form-submit')?.click()}>
              {editingId ? 'Save Changes' : 'Create Record'}
            </button>
          </>
        }
      >
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label className="form-label">Hospital Name *</label>
            <input
              type="text"
              className="form-input"
              value={formData.name}
              onChange={(e) => setFormData(f => ({ ...f, name: e.target.value }))}
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            <div>
              <label className="form-label">City *</label>
              <input
                type="text"
                className="form-input"
                value={formData.city}
                onChange={(e) => setFormData(f => ({ ...f, city: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className="form-label">State *</label>
              <input
                type="text"
                className="form-input"
                value={formData.state}
                onChange={(e) => setFormData(f => ({ ...f, state: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className="form-label">Star Rating (1-5)</label>
              <input
                type="number"
                step="0.1"
                min="1"
                max="5"
                className="form-input"
                value={formData.rating}
                onChange={(e) => setFormData(f => ({ ...f, rating: e.target.value }))}
              />
            </div>
          </div>

          <div>
            <label className="form-label">Specialties (comma-separated) *</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. kidney, cardiac, pulmonology"
              value={formData.specialties}
              onChange={(e) => setFormData(f => ({ ...f, specialties: e.target.value }))}
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label className="form-label">Min Cost (₹) *</label>
              <input
                type="number"
                className="form-input"
                value={formData.cost_estimate_min}
                onChange={(e) => setFormData(f => ({ ...f, cost_estimate_min: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className="form-label">Max Cost (₹) *</label>
              <input
                type="number"
                className="form-input"
                value={formData.cost_estimate_max}
                onChange={(e) => setFormData(f => ({ ...f, cost_estimate_max: e.target.value }))}
                required
              />
            </div>
          </div>

          <div>
            <label className="form-label">Facilities (comma-separated)</label>
            <input
              type="text"
              className="form-input"
              placeholder="ICU, Robotic Surgery, Dialysis Unit"
              value={formData.facilities}
              onChange={(e) => setFormData(f => ({ ...f, facilities: e.target.value }))}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label className="form-label">Bed Count *</label>
              <input
                type="number"
                className="form-input"
                value={formData.bed_count}
                onChange={(e) => setFormData(f => ({ ...f, bed_count: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className="form-label">Accreditation Status</label>
              <select
                className="form-select"
                value={formData.accreditation_status}
                onChange={(e) => setFormData(f => ({ ...f, accreditation_status: e.target.value }))}
              >
                <option value="NABH Accredited">NABH Accredited</option>
                <option value="State Govt Certified">State Govt Certified</option>
                <option value="Not Accredited">Not Accredited</option>
              </select>
            </div>
          </div>

          <button id="admin-form-submit" type="submit" style={{ display: 'none' }} />
        </form>
      </Modal>
    </div>
  );
}

export default AdminPage;
