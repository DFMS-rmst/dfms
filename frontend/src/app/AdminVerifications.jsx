import { useState, useEffect } from 'react';
import { api } from './api.js';
import { toast } from './toast.js';

export function AdminVerifications() {
  const [data, setData] = useState({ veterinarians: [], farmers: [], dairyOwners: [] });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('PENDING');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [previewDoc, setPreviewDoc] = useState(null);

  async function loadVerifications() {
    setLoading(true);
    try {
      const res = await api(`/admin/verifications?type=${activeTab}&status=${statusFilter}`);
      setData(res);
      setError('');
    } catch (err) {
      setError(err.message || 'Failed to load verifications');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadVerifications();
  }, [activeTab, statusFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleReview(type, id, status) {
    setMessage('');
    setError('');
    try {
      await api(`/admin/verifications/${type}/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      toast.success(`Successfully marked applicant as ${status}`);
      setMessage(`Successfully marked applicant as ${status}`);
      await loadVerifications();
    } catch (err) {
      toast.error(err.message || 'Review action failed');
      setError(err.message || 'Review action failed');
    }
  }

  const allVets = data.veterinarians || [];
  const allFarmers = data.farmers || [];
  const allDairyOwners = data.dairyOwners || [];

  return (
    <section>
      <div className="flex-between" style={{ alignItems: 'flex-start', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ margin: '0 0 0.35rem 0' }}>User Verifications &amp; Approval</h1>
          <p style={{ margin: 0, color: 'var(--ag-text-muted)' }}>
            Review and validate registrations for Veterinarians, Farmers, and Dairy Owners before
            platform access.
          </p>
        </div>
        <button type="button" className="secondary" onClick={loadVerifications}>
          🔄 Refresh
        </button>
      </div>

      {message && (
        <div
          style={{
            padding: '0.85rem 1rem',
            background: '#ecfdf5',
            color: '#065f46',
            borderRadius: '0.75rem',
            marginBottom: '1rem',
            border: '1px solid #a7f3d0',
            fontWeight: 600,
          }}
        >
          ✅ {message}
        </div>
      )}

      {error && (
        <div className="auth-error-alert" style={{ marginBottom: '1rem' }}>
          <span className="alert-icon">⚠️</span>
          <span>{error}</span>
        </div>
      )}

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        {[
          ['ALL', `All Types (${allVets.length + allFarmers.length + allDairyOwners.length})`],
          ['VETERINARIAN', `🩺 Veterinarians (${allVets.length})`],
          ['FARMER', `🌾 Farmers (${allFarmers.length})`],
          ['DAIRY_OWNER', `🥛 Dairy Owners (${allDairyOwners.length})`],
        ].map(([val, label]) => (
          <button
            key={val}
            type="button"
            className={activeTab === val ? 'primary' : 'secondary'}
            onClick={() => setActiveTab(val)}
            style={{ fontSize: '0.88rem', padding: '0.45rem 0.9rem' }}
          >
            {label}
          </button>
        ))}

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <label
            htmlFor="statusFilter"
            style={{ fontSize: '0.85rem', fontWeight: 700, color: '#475569' }}
          >
            Status:
          </label>
          <select
            id="statusFilter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{
              padding: '0.4rem 0.75rem',
              borderRadius: '0.5rem',
              border: '1px solid #cbd5e1',
              fontSize: '0.85rem',
            }}
          >
            <option value="PENDING">Pending Approval</option>
            <option value="VERIFIED">Verified</option>
            <option value="REJECTED">Rejected</option>
            <option value="ALL">All Statuses</option>
          </select>
        </div>
      </div>

      {loading && <p>Loading applicant verifications…</p>}

      {!loading &&
        allVets.length === 0 &&
        allFarmers.length === 0 &&
        allDairyOwners.length === 0 && (
          <div className="card" style={{ textAlign: 'center', padding: '2.5rem' }}>
            <span style={{ fontSize: '2.5rem' }}>📋</span>
            <h3 style={{ margin: '0.75rem 0 0.35rem 0' }}>No verification requests found</h3>
            <p style={{ color: 'var(--ag-text-muted)' }}>
              There are no {statusFilter.toLowerCase()} applications for the selected criteria.
            </p>
          </div>
        )}

      <div style={{ display: 'grid', gap: '1.25rem' }}>
        {/* VETERINARIANS */}
        {(activeTab === 'ALL' || activeTab === 'VETERINARIAN') &&
          allVets.map((v) => (
            <article
              className="card review"
              key={`vet-${v.id}`}
              style={{ borderLeft: '4px solid #3b82f6' }}
            >
              <div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.6rem',
                    marginBottom: '0.35rem',
                  }}
                >
                  <span style={{ fontSize: '1.2rem' }}>🩺</span>
                  <h3 style={{ margin: 0 }}>{v.user?.fullName}</h3>
                  <span className="badge" style={{ background: '#dbeafe', color: '#1e40af' }}>
                    Veterinarian
                  </span>
                  <span
                    className="badge"
                    style={{
                      background:
                        v.status === 'VERIFIED'
                          ? '#dcfce7'
                          : v.status === 'REJECTED'
                            ? '#fee2e2'
                            : '#fef3c7',
                      color:
                        v.status === 'VERIFIED'
                          ? '#166534'
                          : v.status === 'REJECTED'
                            ? '#991b1b'
                            : '#92400e',
                    }}
                  >
                    {v.status}
                  </span>
                </div>
                <p style={{ margin: '0.2rem 0', fontSize: '0.88rem' }}>
                  <strong>Qualification:</strong> {v.qualification} | <strong>Experience:</strong>{' '}
                  {v.experienceYears != null ? `${v.experienceYears} Years` : 'Not specified'}
                </p>
                <p style={{ margin: '0.2rem 0', fontSize: '0.88rem' }}>
                  <strong>Council &amp; Reg:</strong> {v.registrationCouncil} —{' '}
                  <code>{v.registrationNumber}</code>
                </p>
                <p
                  style={{ margin: '0.2rem 0', fontSize: '0.85rem', color: 'var(--ag-text-muted)' }}
                >
                  <strong>Contact:</strong> {v.user?.email}{' '}
                  {v.user?.phone ? `· ${v.user.phone}` : ''} | <strong>Service:</strong>{' '}
                  {v.serviceAreas?.[0]?.state || 'India'}
                  {v.serviceAreas?.[0]?.district ? `, ${v.serviceAreas[0].district}` : ''}
                </p>

                {v.documentData && (
                  <div style={{ marginTop: '0.5rem' }}>
                    <button
                      type="button"
                      className="link"
                      onClick={() =>
                        setPreviewDoc({
                          name: v.documentName || 'Veterinary License',
                          data: v.documentData,
                        })
                      }
                    >
                      📎 View Submitted License Document ({v.documentName || 'Certificate'})
                    </button>
                  </div>
                )}
              </div>

              <div
                className="actions"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem',
                  minWidth: '160px',
                }}
              >
                {v.status !== 'VERIFIED' && (
                  <button
                    type="button"
                    onClick={() => handleReview('veterinarians', v.id, 'VERIFIED')}
                  >
                    ✓ Approve &amp; Activate
                  </button>
                )}
                {v.status !== 'REJECTED' && (
                  <button
                    type="button"
                    className="danger"
                    onClick={() => handleReview('veterinarians', v.id, 'REJECTED')}
                  >
                    ✕ Reject
                  </button>
                )}
              </div>
            </article>
          ))}

        {/* FARMERS */}
        {(activeTab === 'ALL' || activeTab === 'FARMER') &&
          allFarmers.map((f) => (
            <article
              className="card review"
              key={`farmer-${f.id}`}
              style={{ borderLeft: '4px solid #10b981' }}
            >
              <div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.6rem',
                    marginBottom: '0.35rem',
                  }}
                >
                  <span style={{ fontSize: '1.2rem' }}>🌾</span>
                  <h3 style={{ margin: 0 }}>{f.user?.fullName}</h3>
                  <span className="badge" style={{ background: '#d1fae5', color: '#065f46' }}>
                    Farmer
                  </span>
                  <span
                    className="badge"
                    style={{
                      background:
                        f.status === 'VERIFIED'
                          ? '#dcfce7'
                          : f.status === 'REJECTED'
                            ? '#fee2e2'
                            : '#fef3c7',
                      color:
                        f.status === 'VERIFIED'
                          ? '#166534'
                          : f.status === 'REJECTED'
                            ? '#991b1b'
                            : '#92400e',
                    }}
                  >
                    {f.status}
                  </span>
                </div>
                <p style={{ margin: '0.2rem 0', fontSize: '0.88rem' }}>
                  <strong>Farm Name:</strong> {f.farmName} | <strong>Farmer / KCC ID:</strong>{' '}
                  <code>{f.farmerIdNumber || 'N/A'}</code>
                </p>
                <p style={{ margin: '0.2rem 0', fontSize: '0.88rem' }}>
                  <strong>Location:</strong> {f.district}, {f.state}{' '}
                  {f.taluka ? `(${f.taluka})` : ''} {f.pincode ? `· ${f.pincode}` : ''} |{' '}
                  <strong>Livestock Count:</strong> {f.totalCattle || 0} Cattle
                </p>
                <p
                  style={{ margin: '0.2rem 0', fontSize: '0.85rem', color: 'var(--ag-text-muted)' }}
                >
                  <strong>Contact:</strong> {f.user?.email}{' '}
                  {f.user?.phone ? `· ${f.user.phone}` : ''}
                </p>

                {f.documentData && (
                  <div style={{ marginTop: '0.5rem' }}>
                    <button
                      type="button"
                      className="link"
                      onClick={() =>
                        setPreviewDoc({
                          name: f.documentName || 'Farmer Land/ID Document',
                          data: f.documentData,
                        })
                      }
                    >
                      📎 View Submitted Farmer Document ({f.documentName || 'Proof Document'})
                    </button>
                  </div>
                )}
              </div>

              <div
                className="actions"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem',
                  minWidth: '160px',
                }}
              >
                {f.status !== 'VERIFIED' && (
                  <button type="button" onClick={() => handleReview('farmers', f.id, 'VERIFIED')}>
                    ✓ Approve &amp; Activate
                  </button>
                )}
                {f.status !== 'REJECTED' && (
                  <button
                    type="button"
                    className="danger"
                    onClick={() => handleReview('farmers', f.id, 'REJECTED')}
                  >
                    ✕ Reject
                  </button>
                )}
              </div>
            </article>
          ))}

        {/* DAIRY OWNERS */}
        {(activeTab === 'ALL' || activeTab === 'DAIRY_OWNER') &&
          allDairyOwners.map((d) => (
            <article
              className="card review"
              key={`dairy-${d.id}`}
              style={{ borderLeft: '4px solid #8b5cf6' }}
            >
              <div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.6rem',
                    marginBottom: '0.35rem',
                  }}
                >
                  <span style={{ fontSize: '1.2rem' }}>🥛</span>
                  <h3 style={{ margin: 0 }}>{d.user?.fullName}</h3>
                  <span className="badge" style={{ background: '#ede9fe', color: '#5b21b6' }}>
                    Dairy Owner / Plant
                  </span>
                  <span
                    className="badge"
                    style={{
                      background:
                        d.status === 'VERIFIED'
                          ? '#dcfce7'
                          : d.status === 'REJECTED'
                            ? '#fee2e2'
                            : '#fef3c7',
                      color:
                        d.status === 'VERIFIED'
                          ? '#166534'
                          : d.status === 'REJECTED'
                            ? '#991b1b'
                            : '#92400e',
                    }}
                  >
                    {d.status}
                  </span>
                </div>
                <p style={{ margin: '0.2rem 0', fontSize: '0.88rem' }}>
                  <strong>Dairy Enterprise:</strong> {d.dairyName} | <strong>FSSAI License:</strong>{' '}
                  <code>{d.fssaiLicenseNumber}</code>
                </p>
                <p style={{ margin: '0.2rem 0', fontSize: '0.88rem' }}>
                  <strong>Operational Region:</strong> {d.district}, {d.state}{' '}
                  {d.operationalArea ? `(${d.operationalArea})` : ''} |{' '}
                  <strong>Daily Processing:</strong>{' '}
                  {d.dailyCapacityLiters
                    ? `${d.dailyCapacityLiters.toLocaleString()} L/day`
                    : 'N/A'}
                </p>
                <p
                  style={{ margin: '0.2rem 0', fontSize: '0.85rem', color: 'var(--ag-text-muted)' }}
                >
                  <strong>Contact:</strong> {d.user?.email}{' '}
                  {d.user?.phone ? `· ${d.user.phone}` : ''}
                </p>

                {d.documentData && (
                  <div style={{ marginTop: '0.5rem' }}>
                    <button
                      type="button"
                      className="link"
                      onClick={() =>
                        setPreviewDoc({
                          name: d.documentName || 'FSSAI License Document',
                          data: d.documentData,
                        })
                      }
                    >
                      📎 View Submitted FSSAI License ({d.documentName || 'License Proof'})
                    </button>
                  </div>
                )}
              </div>

              <div
                className="actions"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem',
                  minWidth: '160px',
                }}
              >
                {d.status !== 'VERIFIED' && (
                  <button
                    type="button"
                    onClick={() => handleReview('dairy-owners', d.id, 'VERIFIED')}
                  >
                    ✓ Approve &amp; Activate
                  </button>
                )}
                {d.status !== 'REJECTED' && (
                  <button
                    type="button"
                    className="danger"
                    onClick={() => handleReview('dairy-owners', d.id, 'REJECTED')}
                  >
                    ✕ Reject
                  </button>
                )}
              </div>
            </article>
          ))}
      </div>

      {/* Document Preview Modal */}
      {previewDoc && (
        <div className="modal-backdrop" onClick={() => setPreviewDoc(null)}>
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '800px', width: '90%', maxHeight: '85vh', overflow: 'auto' }}
          >
            <div className="flex-between" style={{ marginBottom: '1rem' }}>
              <h3 style={{ margin: 0 }}>📄 {previewDoc.name}</h3>
              <button type="button" className="modal-close-btn" onClick={() => setPreviewDoc(null)}>
                ✕
              </button>
            </div>
            {previewDoc.data.startsWith('data:image/') ? (
              <img
                src={previewDoc.data}
                alt={previewDoc.name}
                style={{
                  width: '100%',
                  maxHeight: '70vh',
                  objectFit: 'contain',
                  borderRadius: '0.5rem',
                }}
              />
            ) : previewDoc.data.startsWith('data:application/pdf') ? (
              <iframe
                src={previewDoc.data}
                title={previewDoc.name}
                style={{ width: '100%', height: '65vh', border: 'none', borderRadius: '0.5rem' }}
              />
            ) : (
              <div>
                <p>Preview for this document type is not supported directly inline.</p>
                <a href={previewDoc.data} download={previewDoc.name} className="button primary">
                  Download Document
                </a>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
