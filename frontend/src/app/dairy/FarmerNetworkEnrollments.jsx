import { useState } from 'react';

/**
 * Section 3: Farmer Network & Enrollments
 * Manages the "One-Time Associations" (Phase 1 flow):
 * - Pending Requests: Notification-style widget for PENDING_APPROVAL with quick Approve/Reject
 * - Active Directory: Searchable list of ACTIVE farmers with base rates, expected daily quantity, contact info
 * - Suspended/Inactive: Log of farmers temporarily blocked from supplying milk with reactivation action
 */
export function FarmerNetworkEnrollments({
  enrollments = [],
  areasList = [],
  onDirectUpdateStatus,
  onOpenCertificateReview,
  onOpenAddFarmerModal,
  onOpenEditEnrollmentModal,
  onInspectFarmerHealth,
  onSelectForFastIntake,
}) {
  const [subTab, setSubTab] = useState('PENDING'); // 'PENDING' | 'ACTIVE' | 'SUSPENDED'
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedArea, setSelectedArea] = useState('ALL');

  const pendingRequests = enrollments.filter((e) => e.status === 'PENDING_APPROVAL');
  const activeFarmers = enrollments.filter((e) => e.status === 'ACTIVE');
  const inactiveFarmers = enrollments.filter(
    (e) => e.status === 'SUSPENDED' || e.status === 'REJECTED',
  );

  // Filtered active farmers
  const filteredActive = activeFarmers.filter((f) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      f.farmerName?.toLowerCase().includes(q) ||
      f.farmerIdNumber?.toLowerCase().includes(q) ||
      f.farmName?.toLowerCase().includes(q) ||
      f.phone?.toLowerCase().includes(q) ||
      f.villageArea?.toLowerCase().includes(q);

    const matchesArea =
      selectedArea === 'ALL' || f.villageArea === selectedArea || f.district === selectedArea;

    return matchesSearch && matchesArea;
  });

  // Filtered inactive farmers
  const filteredInactive = inactiveFarmers.filter((f) => {
    const q = searchQuery.toLowerCase().trim();
    return (
      !q ||
      f.farmerName?.toLowerCase().includes(q) ||
      f.farmerIdNumber?.toLowerCase().includes(q) ||
      f.farmName?.toLowerCase().includes(q)
    );
  });

  return (
    <section
      id="farmer-network-enrollments"
      style={{
        background: '#ffffff',
        borderRadius: '1.25rem',
        padding: '1.75rem',
        border: '1px solid #e2e8f0',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.04)',
        marginBottom: '2rem',
      }}
    >
      {/* Header bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
          borderBottom: '1px solid #e2e8f0',
          paddingBottom: '1.25rem',
          marginBottom: '1.5rem',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>
              3. Farmer Network &amp; Enrollments
            </h2>
            <span
              style={{
                fontSize: '0.72rem',
                fontWeight: 800,
                color: '#2563eb',
                background: '#eff6ff',
                padding: '0.15rem 0.5rem',
                borderRadius: '999px',
                border: '1px solid #bfdbfe',
              }}
            >
              PHASE 1 ASSOCIATIONS
            </span>
          </div>
          <p style={{ margin: '0.2rem 0 0', fontSize: '0.85rem', color: '#64748b' }}>
            Manage farmer supply contracts, approve pending join requests, and maintain active
            procurement terms.
          </p>
        </div>

        <button
          type="button"
          onClick={() => onOpenAddFarmerModal()}
          style={{
            background: '#059669',
            color: '#ffffff',
            border: 'none',
            borderRadius: '0.65rem',
            padding: '0.65rem 1.25rem',
            fontSize: '0.9rem',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.45rem',
            boxShadow: '0 4px 12px rgba(5, 150, 105, 0.25)',
          }}
        >
          <span>➕ Enroll New Farmer</span>
        </button>
      </div>

      {/* Sub-Navigation Pill Tabs */}
      <div
        style={{
          display: 'flex',
          gap: '0.5rem',
          borderBottom: '2px solid #f1f5f9',
          paddingBottom: '0.5rem',
          marginBottom: '1.5rem',
          overflowX: 'auto',
        }}
      >
        {/* Tab 1: Pending Requests */}
        <button
          type="button"
          onClick={() => setSubTab('PENDING')}
          style={{
            background: subTab === 'PENDING' ? '#eff6ff' : 'transparent',
            color: subTab === 'PENDING' ? '#1d4ed8' : '#64748b',
            border: 'none',
            borderBottom: subTab === 'PENDING' ? '2.5px solid #2563eb' : '2.5px solid transparent',
            padding: '0.55rem 1rem',
            fontWeight: 700,
            fontSize: '0.9rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            borderRadius: '0.5rem 0.5rem 0 0',
          }}
        >
          <span>Pending Requests</span>
          <span
            style={{
              background: pendingRequests.length > 0 ? '#ef4444' : '#e2e8f0',
              color: pendingRequests.length > 0 ? '#ffffff' : '#64748b',
              fontSize: '0.72rem',
              fontWeight: 800,
              padding: '0.1rem 0.5rem',
              borderRadius: '999px',
            }}
          >
            {pendingRequests.length}
          </span>
        </button>

        {/* Tab 2: Active Directory */}
        <button
          type="button"
          onClick={() => setSubTab('ACTIVE')}
          style={{
            background: subTab === 'ACTIVE' ? '#ecfdf5' : 'transparent',
            color: subTab === 'ACTIVE' ? '#047857' : '#64748b',
            border: 'none',
            borderBottom: subTab === 'ACTIVE' ? '2.5px solid #059669' : '2.5px solid transparent',
            padding: '0.55rem 1rem',
            fontWeight: 700,
            fontSize: '0.9rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            borderRadius: '0.5rem 0.5rem 0 0',
          }}
        >
          <span>Active Directory</span>
          <span
            style={{
              background: '#dcfce7',
              color: '#15803d',
              fontSize: '0.72rem',
              fontWeight: 800,
              padding: '0.1rem 0.5rem',
              borderRadius: '999px',
            }}
          >
            {activeFarmers.length}
          </span>
        </button>

        {/* Tab 3: Suspended / Inactive */}
        <button
          type="button"
          onClick={() => setSubTab('SUSPENDED')}
          style={{
            background: subTab === 'SUSPENDED' ? '#fef2f2' : 'transparent',
            color: subTab === 'SUSPENDED' ? '#b91c1c' : '#64748b',
            border: 'none',
            borderBottom:
              subTab === 'SUSPENDED' ? '2.5px solid #dc2626' : '2.5px solid transparent',
            padding: '0.55rem 1rem',
            fontWeight: 700,
            fontSize: '0.9rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            borderRadius: '0.5rem 0.5rem 0 0',
          }}
        >
          <span>Suspended / Inactive</span>
          <span
            style={{
              background: '#f1f5f9',
              color: '#64748b',
              fontSize: '0.72rem',
              fontWeight: 800,
              padding: '0.1rem 0.5rem',
              borderRadius: '999px',
            }}
          >
            {inactiveFarmers.length}
          </span>
        </button>
      </div>

      {/* ===================================================================== */}
      {/* VIEW 1: PENDING REQUESTS (NOTIFICATION-STYLE WIDGET)                  */}
      {/* ===================================================================== */}
      {subTab === 'PENDING' && (
        <div>
          {pendingRequests.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: '2.5rem 1rem',
                background: '#f8fafc',
                borderRadius: '0.75rem',
                border: '1.5px dashed #cbd5e1',
              }}
            >
              <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🎉</div>
              <h3 style={{ margin: '0 0 0.35rem', color: '#0f172a', fontSize: '1.1rem' }}>
                No Pending Farmer Requests
              </h3>
              <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>
                All farmer supply requests have been processed. New farmer applications will appear
                here with instant review actions.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {pendingRequests.map((req) => (
                <div
                  key={req.id}
                  style={{
                    background: '#fffbeb',
                    border: '1.5px solid #fde68a',
                    borderRadius: '0.85rem',
                    padding: '1.25rem',
                    boxShadow: '0 4px 14px rgba(217, 119, 6, 0.08)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '1rem',
                  }}
                >
                  <div style={{ flex: 1, minWidth: '280px' }}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        marginBottom: '0.35rem',
                      }}
                    >
                      <span style={{ fontSize: '1.1rem' }}>📬</span>
                      <strong style={{ fontSize: '1.05rem', color: '#0f172a' }}>
                        {req.farmerName}
                      </strong>
                      <span
                        style={{
                          background: '#fef3c7',
                          color: '#92400e',
                          fontSize: '0.7rem',
                          fontWeight: 800,
                          padding: '0.1rem 0.45rem',
                          borderRadius: '0.3rem',
                          border: '1px solid #fcd34d',
                        }}
                      >
                        PENDING APPROVAL
                      </span>
                    </div>

                    <div style={{ fontSize: '0.85rem', color: '#475569', lineHeight: 1.5 }}>
                      <div>
                        Farm: <strong>{req.farmName || 'Independent Dairy Farm'}</strong> · ID:{' '}
                        <code>{req.farmerIdNumber}</code>
                      </div>
                      <div>
                        Location:{' '}
                        <strong>{req.villageArea || req.district || 'Maharashtra'}</strong> · Phone:{' '}
                        <strong>{req.phone || 'N/A'}</strong>
                      </div>
                      <div style={{ marginTop: '0.25rem', color: '#1e293b' }}>
                        Proposed Daily Supply: <strong>{req.expectedDailyQuantity} L/day</strong> (
                        {req.milkType}) · Requested Rate:{' '}
                        <strong>₹{req.agreedRatePerLiter}/L</strong>
                      </div>
                      {req.joinRequestNotes && (
                        <div
                          style={{
                            marginTop: '0.4rem',
                            fontStyle: 'italic',
                            color: '#78350f',
                            fontSize: '0.82rem',
                          }}
                        >
                          "{req.joinRequestNotes}"
                        </div>
                      )}
                    </div>

                    {/* Attached Certificate / Clearance Badge */}
                    {(req.certificateVerificationId || req.certificateNumber) && (
                      <div style={{ marginTop: '0.65rem' }}>
                        <button
                          type="button"
                          onClick={() => onOpenCertificateReview(req)}
                          style={{
                            background: '#dbeafe',
                            border: '1px solid #93c5fd',
                            color: '#1e40af',
                            borderRadius: '0.45rem',
                            padding: '0.25rem 0.65rem',
                            fontSize: '0.78rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                          }}
                        >
                          <span>
                            📜 Verified Clearance Attached (
                            {req.certificateNumber || 'Daily Clearance'})
                          </span>
                          <span style={{ textDecoration: 'underline' }}>Review Details →</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Quick Action Buttons */}
                  <div style={{ display: 'flex', gap: '0.65rem', alignItems: 'center' }}>
                    <button
                      type="button"
                      onClick={() => onDirectUpdateStatus(req.id, 'ACTIVE', req.farmerName)}
                      style={{
                        background: '#059669',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '0.6rem',
                        padding: '0.65rem 1.15rem',
                        fontSize: '0.88rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        boxShadow: '0 4px 10px rgba(5, 150, 105, 0.25)',
                      }}
                    >
                      <span>✓</span>
                      <span>Approve</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onDirectUpdateStatus(req.id, 'REJECTED', req.farmerName)}
                      style={{
                        background: '#ffffff',
                        color: '#dc2626',
                        border: '1.5px solid #fca5a5',
                        borderRadius: '0.6rem',
                        padding: '0.65rem 1rem',
                        fontSize: '0.88rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      Decline
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ===================================================================== */}
      {/* VIEW 2: ACTIVE DIRECTORY                                              */}
      {/* ===================================================================== */}
      {subTab === 'ACTIVE' && (
        <div>
          {/* Search & Area Filter Bar */}
          <div
            style={{
              display: 'flex',
              gap: '0.75rem',
              marginBottom: '1.25rem',
              flexWrap: 'wrap',
            }}
          >
            <div style={{ flex: 1, minWidth: '240px' }}>
              <input
                type="text"
                placeholder="Search active farmers by name, ID, farm, or phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.65rem 0.85rem',
                  borderRadius: '0.6rem',
                  border: '1.5px solid #cbd5e1',
                  fontSize: '0.88rem',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div style={{ minWidth: '180px' }}>
              <select
                value={selectedArea}
                onChange={(e) => setSelectedArea(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.65rem 0.85rem',
                  borderRadius: '0.6rem',
                  border: '1.5px solid #cbd5e1',
                  fontSize: '0.88rem',
                  outline: 'none',
                  background: '#ffffff',
                  boxSizing: 'border-box',
                }}
              >
                <option value="ALL">All Supply Routes / Areas</option>
                {areasList.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {filteredActive.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: '2rem 1rem',
                color: '#64748b',
                background: '#f8fafc',
                borderRadius: '0.75rem',
              }}
            >
              No active farmers match your search criteria.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table
                style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  fontSize: '0.88rem',
                  textAlign: 'left',
                }}
              >
                <thead>
                  <tr
                    style={{
                      borderBottom: '2px solid #e2e8f0',
                      color: '#64748b',
                      fontSize: '0.78rem',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                    }}
                  >
                    <th style={{ padding: '0.65rem 0.75rem' }}>Farmer &amp; ID</th>
                    <th style={{ padding: '0.65rem 0.75rem' }}>Farm &amp; Route</th>
                    <th style={{ padding: '0.65rem 0.75rem' }}>Agreed Base Rate</th>
                    <th style={{ padding: '0.65rem 0.75rem' }}>Expected Daily Qty</th>
                    <th style={{ padding: '0.65rem 0.75rem' }}>Contact Info</th>
                    <th style={{ padding: '0.65rem 0.75rem', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredActive.map((f) => (
                    <tr
                      key={f.id}
                      style={{
                        borderBottom: '1px solid #f1f5f9',
                        transition: 'background-color 0.15s ease',
                      }}
                      onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#f8fafc')}
                      onMouseOut={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      {/* Farmer & ID */}
                      <td style={{ padding: '0.75rem' }}>
                        <div style={{ fontWeight: 700, color: '#0f172a' }}>{f.farmerName}</div>
                        <div style={{ fontSize: '0.76rem', color: '#64748b' }}>
                          <code>{f.farmerIdNumber}</code>
                        </div>
                      </td>

                      {/* Farm & Route */}
                      <td style={{ padding: '0.75rem' }}>
                        <div style={{ color: '#334155', fontWeight: 600 }}>
                          {f.farmName || 'Independent Farm'}
                        </div>
                        <div style={{ fontSize: '0.76rem', color: '#64748b' }}>
                          {f.villageArea || f.district || 'Local Route'}
                        </div>
                      </td>

                      {/* Agreed Base Rate */}
                      <td style={{ padding: '0.75rem' }}>
                        <span
                          style={{
                            background: '#ecfdf5',
                            color: '#065f46',
                            fontWeight: 800,
                            padding: '0.2rem 0.55rem',
                            borderRadius: '0.35rem',
                          }}
                        >
                          ₹{Number(f.agreedRatePerLiter || 42).toFixed(2)}/L
                        </span>
                        <div
                          style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '0.15rem' }}
                        >
                          Base FAT: {f.baseFatPercentage}% / SNF: {f.baseSnfPercentage}%
                        </div>
                      </td>

                      {/* Expected Daily Qty */}
                      <td style={{ padding: '0.75rem' }}>
                        <div style={{ fontWeight: 700, color: '#0f172a' }}>
                          {f.expectedDailyQuantity || 20} Liters
                        </div>
                        <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                          {f.milkType || 'COW'} Milk
                        </div>
                      </td>

                      {/* Contact Info */}
                      <td style={{ padding: '0.75rem', color: '#475569' }}>
                        <div>📞 {f.phone || 'N/A'}</div>
                        {f.email && (
                          <div style={{ fontSize: '0.74rem', color: '#64748b' }}>✉️ {f.email}</div>
                        )}
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end' }}>
                          {onSelectForFastIntake && (
                            <button
                              type="button"
                              onClick={() => onSelectForFastIntake(f.farmerIdNumber)}
                              style={{
                                background: '#ecfdf5',
                                border: '1px solid #a7f3d0',
                                color: '#047857',
                                borderRadius: '0.45rem',
                                padding: '0.35rem 0.65rem',
                                fontSize: '0.78rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                              }}
                              title="Instant Fast Intake Check-in"
                            >
                              ⚡ POS
                            </button>
                          )}

                          {onInspectFarmerHealth && (
                            <button
                              type="button"
                              onClick={() => onInspectFarmerHealth(f.farmerIdNumber)}
                              style={{
                                background: '#eff6ff',
                                border: '1px solid #bfdbfe',
                                color: '#1d4ed8',
                                borderRadius: '0.45rem',
                                padding: '0.35rem 0.65rem',
                                fontSize: '0.78rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                              }}
                              title="Inspect Livestock Health & Withdrawals"
                            >
                              🐾 Health
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => onOpenEditEnrollmentModal(f)}
                            style={{
                              background: '#f1f5f9',
                              border: '1px solid #cbd5e1',
                              color: '#334155',
                              borderRadius: '0.45rem',
                              padding: '0.35rem 0.65rem',
                              fontSize: '0.78rem',
                              fontWeight: 600,
                              cursor: 'pointer',
                            }}
                          >
                            Edit
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ===================================================================== */}
      {/* VIEW 3: SUSPENDED / INACTIVE LOG                                      */}
      {/* ===================================================================== */}
      {subTab === 'SUSPENDED' && (
        <div>
          {filteredInactive.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: '2rem 1rem',
                color: '#64748b',
                background: '#f8fafc',
                borderRadius: '0.75rem',
              }}
            >
              No suspended or inactive farmers on record.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {filteredInactive.map((f) => (
                <div
                  key={f.id}
                  style={{
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '0.75rem',
                    padding: '1rem 1.25rem',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '1rem',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <strong style={{ fontSize: '0.98rem', color: '#0f172a' }}>
                        {f.farmerName}
                      </strong>
                      <span
                        style={{
                          background: f.status === 'SUSPENDED' ? '#fee2e2' : '#f1f5f9',
                          color: f.status === 'SUSPENDED' ? '#b91c1c' : '#475569',
                          fontSize: '0.7rem',
                          fontWeight: 800,
                          padding: '0.1rem 0.45rem',
                          borderRadius: '0.3rem',
                        }}
                      >
                        {f.status}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.82rem', color: '#64748b', marginTop: '0.2rem' }}>
                      ID: <code>{f.farmerIdNumber}</code> · Farm: {f.farmName} · Area:{' '}
                      {f.villageArea || f.district}
                    </div>
                    {f.joinRequestNotes && (
                      <div
                        style={{
                          fontSize: '0.8rem',
                          color: '#64748b',
                          fontStyle: 'italic',
                          marginTop: '0.2rem',
                        }}
                      >
                        Note: {f.joinRequestNotes}
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      type="button"
                      onClick={() => onDirectUpdateStatus(f.id, 'ACTIVE', f.farmerName)}
                      style={{
                        background: '#059669',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '0.55rem',
                        padding: '0.45rem 0.95rem',
                        fontSize: '0.82rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      Restore to Active
                    </button>
                    <button
                      type="button"
                      onClick={() => onOpenEditEnrollmentModal(f)}
                      style={{
                        background: '#ffffff',
                        border: '1px solid #cbd5e1',
                        color: '#475569',
                        borderRadius: '0.55rem',
                        padding: '0.45rem 0.85rem',
                        fontSize: '0.82rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      Review
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
