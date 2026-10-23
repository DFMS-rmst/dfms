import { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { api } from './api.js';
import { toast } from './toast.js';

export function FarmerMilkSales({ farm, user }) {
  const [dairies, setDairies] = useState([]);
  const [myRequests, setMyRequests] = useState([]);
  const [availableCertificates, setAvailableCertificates] = useState([]);
  const [salesHistory, setSalesHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [dairySearchQuery, setDairySearchQuery] = useState('');
  const [showFarmerPassModal, setShowFarmerPassModal] = useState(false);

  // Modals state
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [showSellMilkModal, setShowSellMilkModal] = useState(false);
  const [selectedDairyForSale, setSelectedDairyForSale] = useState(null);

  // Form states - Request
  const [requestForm, setRequestForm] = useState({
    dairyUserId: '',
    milkType: 'COW',
    expectedDailyQuantity: '25',
    agreedRatePerLiter: '42.50',
    paymentMethod: 'BANK_TRANSFER',
    bankAccountNumber: '',
    bankIfsc: '',
    bankName: '',
    upiId: '',
    joinRequestNotes: '',
    certificateNumber: '',
    certificateVerificationId: '',
  });

  // Form states - Sell Milk
  const [saleForm, setSaleForm] = useState({
    dairyUserId: '',
    collectionDate: new Date().toISOString().split('T')[0],
    shift: 'MORNING',
    milkType: 'COW',
    quantityLiters: '25',
    fatPercentage: '4.2',
    snfPercentage: '8.6',
    ratePerLiter: '42.50',
    notes: 'Morning fresh milk supply with verified withdrawal clearance.',
  });

  const [activeTab, setActiveTab] = useState('dairies'); // 'dairies' | 'sales'
  const [submitting, setSubmitting] = useState(false);

  async function loadData() {
    setLoading(true);
    setError('');
    try {
      const [dairiesRes, requestsRes, certsRes, salesRes] = await Promise.all([
        api('/dairy/dairies'),
        api('/dairy/farmer/my-requests'),
        api(`/dairy/farmer/available-certificates${farm?.id ? `?farmId=${farm.id}` : ''}`),
        api('/dairy/farmer/sales-history'),
      ]);

      const fetchedDairies = dairiesRes.dairies || [];
      const fetchedRequests = requestsRes.requests || [];
      const fetchedCerts = certsRes.certificates || [];
      const fetchedSales = salesRes.sales || [];

      setDairies(fetchedDairies);
      setMyRequests(fetchedRequests);
      setAvailableCertificates(fetchedCerts);
      setSalesHistory(fetchedSales);

      // Pre-select default certificate if available
      if (fetchedCerts.length > 0 && !requestForm.certificateNumber) {
        const defaultCert = fetchedCerts[0];
        setRequestForm((prev) => ({
          ...prev,
          certificateNumber: defaultCert.certificateNumber,
          certificateVerificationId: defaultCert.verificationId,
        }));
      }

      // Pre-select target dairy if available
      if (fetchedDairies.length > 0 && !requestForm.dairyUserId) {
        setRequestForm((prev) => ({
          ...prev,
          dairyUserId: fetchedDairies[0].userId,
        }));
      }
    } catch (err) {
      setError(err.message || 'Failed to load dairy supply data.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [farm?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const activeEnrollments = myRequests.filter((r) => r.status === 'ACTIVE');
  const pendingEnrollments = myRequests.filter((r) => r.status === 'PENDING_APPROVAL');

  const totalLitersSold = salesHistory.reduce((sum, s) => sum + (Number(s.quantityLiters) || 0), 0);
  const totalPayout = salesHistory.reduce((sum, s) => sum + (Number(s.totalCost) || 0), 0);

  function openRequestModal(dairy = null) {
    setError('');
    setSuccessMessage('');
    const targetUserId = dairy ? dairy.userId : dairies[0]?.userId || '';
    setRequestForm((prev) => ({
      ...prev,
      dairyUserId: targetUserId,
      certificateNumber:
        prev.certificateNumber || availableCertificates[0]?.certificateNumber || '',
      certificateVerificationId:
        prev.certificateVerificationId || availableCertificates[0]?.verificationId || '',
    }));
    setShowRequestModal(true);
  }

  function openSellMilkModal(enrollment = null) {
    setError('');
    setSuccessMessage('');
    const targetEnr = enrollment || activeEnrollments[0];
    if (!targetEnr) {
      setError('You need an approved supply agreement with a dairy before you can sell milk.');
      return;
    }
    setSelectedDairyForSale(targetEnr);
    setSaleForm({
      dairyUserId: targetEnr.dairyUserId,
      collectionDate: new Date().toISOString().split('T')[0],
      shift: new Date().getHours() >= 14 ? 'EVENING' : 'MORNING',
      milkType: targetEnr.milkType || 'COW',
      quantityLiters: String(targetEnr.expectedDailyQuantity || 25),
      fatPercentage: String(targetEnr.baseFatPercentage || 4.2),
      snfPercentage: String(targetEnr.baseSnfPercentage || 8.6),
      ratePerLiter: String(targetEnr.agreedRatePerLiter || 42.5),
      notes: `Milk collection from certified eligible cows at ${farm?.name || 'Farm'}.`,
    });
    setShowSellMilkModal(true);
  }

  async function handleSendJoinRequest(e) {
    e.preventDefault();
    if (!requestForm.dairyUserId) {
      setError('Please select a target dairy.');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      const res = await api('/enrollments', {
        method: 'POST',
        body: JSON.stringify({
          ...requestForm,
          expectedDailyQuantity: parseFloat(requestForm.expectedDailyQuantity) || 25,
          agreedRatePerLiter: parseFloat(requestForm.agreedRatePerLiter) || 42.5,
          farmName: farm?.name || user?.fullName || 'My Farm',
          farmerName: user?.fullName || 'Registered Farmer',
          state: farm?.state || 'Maharashtra',
          district: farm?.district || 'Kolhapur',
          taluka: farm?.taluka || null,
          villageArea: farm?.name ? `${farm.name} Route` : 'Local Area',
          pincode: farm?.pincode || null,
        }),
      });

      toast.success('Join request sent to dairy successfully! (Status: Pending Approval)');
      setSuccessMessage(
        res?.message ||
          'Join request submitted to dairy! The dairy operator will review and approve your association.',
      );
      setShowRequestModal(false);
      await loadData();
    } catch (err) {
      toast.error(err.message || 'Failed to submit join request.');
      setError(err.message || 'Failed to submit join request.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSellMilkSubmit(e) {
    e.preventDefault();
    const qty = parseFloat(saleForm.quantityLiters);
    if (!qty || qty <= 0) {
      setError('Please enter a valid milk quantity in liters.');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      const res = await api('/dairy/farmer/sell-milk', {
        method: 'POST',
        body: JSON.stringify({
          ...saleForm,
          farmName: farm?.name || 'Registered Farm',
          farmerName: user?.fullName || 'Registered Farmer',
        }),
      });

      toast.success(`Successfully recorded milk supply of ${qty}L!`);
      setSuccessMessage(
        res.data?.message ||
          `Successfully recorded milk supply of ${qty}L! Total payout: ₹${res.data?.totalCost || (qty * parseFloat(saleForm.ratePerLiter)).toFixed(2)}.`,
      );
      setShowSellMilkModal(false);
      await loadData();
      setActiveTab('sales');
    } catch (err) {
      setError(err.message || 'Failed to submit milk sale.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="farmer-milk-sales-section" style={{ padding: '0.5rem 0' }}>
      {/* HEADER BANNER */}
      <div
        className="card"
        style={{
          background: 'linear-gradient(135deg, #064e3b 0%, #047857 60%, #059669 100%)',
          color: '#ffffff',
          padding: '1.75rem',
          borderRadius: '1rem',
          marginBottom: '1.5rem',
          boxShadow: '0 10px 25px -5px rgba(5, 150, 105, 0.3)',
        }}
      >
        <div
          className="flex-between"
          style={{ alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}
        >
          <div>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                background: 'rgba(255,255,255,0.2)',
                padding: '0.25rem 0.75rem',
                borderRadius: '999px',
                fontSize: '0.78rem',
                fontWeight: 700,
                marginBottom: '0.75rem',
              }}
            >
              🥛 DAIRY SUPPLY &amp; REVENUE PORTAL
            </div>
            <h1 style={{ color: '#ffffff', margin: '0 0 0.5rem 0', fontSize: '1.85rem' }}>
              Sell Milk to Verified Dairies
            </h1>
            <p
              style={{
                margin: 0,
                color: 'rgba(255,255,255,0.9)',
                maxWidth: '680px',
                fontSize: '0.95rem',
              }}
            >
              Connect your farm with local cooperatives and commercial dairies. Submit your
              certified withdrawal-free Milk Eligibility Certificate, get accepted, and record daily
              milk supplies.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => setShowFarmerPassModal(true)}
              style={{
                background: '#fef08a',
                color: '#713f12',
                border: 'none',
                fontWeight: 700,
                fontSize: '0.95rem',
                padding: '0.7rem 1.3rem',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
              }}
            >
              🎫 My Farmer QR Pass
            </button>
            <button
              type="button"
              className="primary"
              onClick={() => openRequestModal()}
              style={{
                background: '#ffffff',
                color: '#065f46',
                border: 'none',
                fontWeight: 700,
                fontSize: '0.95rem',
                padding: '0.7rem 1.3rem',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              }}
            >
              ➕ Connect with a Dairy
            </button>
            <button
              type="button"
              onClick={() => openSellMilkModal()}
              disabled={activeEnrollments.length === 0}
              style={{
                background: activeEnrollments.length > 0 ? '#10b981' : 'rgba(255,255,255,0.3)',
                color: '#ffffff',
                border: '1.5px solid rgba(255,255,255,0.5)',
                fontWeight: 700,
                fontSize: '0.95rem',
                padding: '0.7rem 1.3rem',
                cursor: activeEnrollments.length > 0 ? 'pointer' : 'not-allowed',
              }}
            >
              🥛 Sell Milk Now
            </button>
          </div>
        </div>

        {/* METRICS ROW */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '1rem',
            marginTop: '1.5rem',
            paddingTop: '1.25rem',
            borderTop: '1px solid rgba(255,255,255,0.2)',
          }}
        >
          <div>
            <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.8)' }}>
              AUTHORIZED DAIRIES
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800 }}>{activeEnrollments.length}</div>
            <small style={{ color: 'rgba(255,255,255,0.7)' }}>Active supply partners</small>
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.8)' }}>
              PENDING REQUESTS
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800 }}>{pendingEnrollments.length}</div>
            <small style={{ color: 'rgba(255,255,255,0.7)' }}>Awaiting certificate review</small>
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.8)' }}>
              TOTAL MILK DELIVERED
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800 }}>
              {totalLitersSold.toFixed(1)} L
            </div>
            <small style={{ color: 'rgba(255,255,255,0.7)' }}>To verified dairies</small>
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.8)' }}>
              TOTAL PAYOUT DUE
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800 }}>₹{totalPayout.toFixed(2)}</div>
            <small style={{ color: 'rgba(255,255,255,0.7)' }}>Cumulative earnings</small>
          </div>
        </div>
      </div>

      {/* ALERTS / NOTICES */}
      {error && (
        <div className="card error" style={{ marginBottom: '1rem' }}>
          <strong>⚠️ Notice:</strong> {error}
        </div>
      )}
      {successMessage && (
        <div
          className="card"
          style={{
            marginBottom: '1rem',
            background: '#ecfdf5',
            borderColor: '#6ee7b7',
            color: '#065f46',
            fontWeight: 600,
          }}
        >
          ✅ {successMessage}
        </div>
      )}

      {/* TABS */}
      <div
        style={{
          display: 'flex',
          gap: '0.5rem',
          borderBottom: '2px solid #e2e8f0',
          marginBottom: '1.5rem',
        }}
      >
        <button
          type="button"
          onClick={() => setActiveTab('dairies')}
          style={{
            padding: '0.75rem 1.25rem',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'dairies' ? '3px solid #059669' : '3px solid transparent',
            color: activeTab === 'dairies' ? '#059669' : '#64748b',
            fontWeight: 700,
            fontSize: '0.95rem',
            cursor: 'pointer',
          }}
        >
          🏢 Connected Dairies &amp; Join Requests ({myRequests.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('sales')}
          style={{
            padding: '0.75rem 1.25rem',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'sales' ? '3px solid #059669' : '3px solid transparent',
            color: activeTab === 'sales' ? '#059669' : '#64748b',
            fontWeight: 700,
            fontSize: '0.95rem',
            cursor: 'pointer',
          }}
        >
          📋 Milk Supply &amp; Sales Ledger ({salesHistory.length})
        </button>
      </div>

      {/* TAB 1: CONNECTED DAIRIES & JOIN REQUESTS */}
      {activeTab === 'dairies' && (
        <div>
          {/* SECTION: MY REQUESTS & ENROLLMENTS */}
          <div style={{ marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1.25rem', margin: '0 0 0.5rem 0' }}>
              My Dairy Connections &amp; Applications
            </h2>
            <p style={{ color: '#64748b', fontSize: '0.9rem', margin: '0 0 1rem 0' }}>
              Track whether your milk supply request has been reviewed and accepted by the dairy
              operator.
            </p>

            {myRequests.length === 0 && !loading && (
              <div
                className="card"
                style={{
                  textAlign: 'center',
                  padding: '2.5rem 1.5rem',
                  background: '#f8fafc',
                  border: '1.5px dashed #cbd5e1',
                }}
              >
                <span style={{ fontSize: '2.5rem' }}>🏢</span>
                <h3 style={{ margin: '0.75rem 0 0.25rem 0' }}>No Dairy Supply Agreements Yet</h3>
                <p style={{ color: '#64748b', maxWidth: '500px', margin: '0 auto 1.25rem auto' }}>
                  You have not submitted a supply request to any dairy yet. Choose a verified dairy
                  below and send a request with your Milk Eligibility Certificate to start selling
                  milk.
                </p>
                <button type="button" className="primary" onClick={() => openRequestModal()}>
                  ➕ Send Request to a Dairy Now
                </button>
              </div>
            )}

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                gap: '1rem',
              }}
            >
              {myRequests.map((req) => {
                const isActive = req.status === 'ACTIVE';
                const isPending = req.status === 'PENDING_APPROVAL';
                return (
                  <div
                    key={req.id}
                    className="card"
                    style={{
                      border: isActive
                        ? '2px solid #10b981'
                        : isPending
                          ? '2px solid #f59e0b'
                          : '1px solid #cbd5e1',
                      background: isActive ? '#f0fdf4' : isPending ? '#fffbeb' : '#ffffff',
                      padding: '1.25rem',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      borderRadius: '0.75rem',
                    }}
                  >
                    <div>
                      <div
                        className="flex-between"
                        style={{ alignItems: 'flex-start', marginBottom: '0.5rem' }}
                      >
                        <div>
                          <span
                            style={{
                              display: 'inline-block',
                              padding: '0.2rem 0.55rem',
                              borderRadius: '999px',
                              fontSize: '0.75rem',
                              fontWeight: 800,
                              background: isActive ? '#dcfce7' : isPending ? '#fef3c7' : '#fee2e2',
                              color: isActive ? '#166534' : isPending ? '#92400e' : '#991b1b',
                              marginBottom: '0.35rem',
                            }}
                          >
                            {isActive
                              ? '✅ AUTHORIZED SUPPLIER'
                              : isPending
                                ? '⏳ PENDING CERTIFICATE REVIEW'
                                : `❌ ${req.status}`}
                          </span>
                          <h3 style={{ margin: 0, color: '#0f172a' }}>{req.dairyName}</h3>
                          <div style={{ fontSize: '0.82rem', color: '#64748b' }}>
                            {req.district}, {req.state} · Route: {req.villageArea}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <span style={{ fontSize: '1.2rem', fontWeight: 800, color: '#059669' }}>
                            ₹{req.agreedRatePerLiter}
                          </span>
                          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>per Liter</div>
                        </div>
                      </div>

                      <div
                        style={{
                          background: 'rgba(255,255,255,0.7)',
                          padding: '0.75rem',
                          borderRadius: '0.5rem',
                          margin: '0.75rem 0',
                          fontSize: '0.85rem',
                          display: 'grid',
                          gridTemplateColumns: '1fr 1fr',
                          gap: '0.5rem',
                        }}
                      >
                        <div>
                          <strong style={{ color: '#475569' }}>Milk Type:</strong> {req.milkType}
                        </div>
                        <div>
                          <strong style={{ color: '#475569' }}>Daily Quota:</strong>{' '}
                          {req.expectedDailyQuantity} L/day
                        </div>
                        <div style={{ gridColumn: 'span 2' }}>
                          <strong style={{ color: '#475569' }}>Certificate Attached:</strong>{' '}
                          {req.certificateNumber ? (
                            <code
                              style={{
                                background: '#e0f2fe',
                                color: '#0369a1',
                                padding: '0.15rem 0.35rem',
                                borderRadius: '0.25rem',
                                fontWeight: 700,
                              }}
                            >
                              📜 {req.certificateNumber}
                            </code>
                          ) : (
                            <span style={{ color: '#94a3b8' }}>None attached</span>
                          )}
                        </div>
                      </div>

                      {isPending && (
                        <p
                          style={{
                            margin: '0.5rem 0',
                            fontSize: '0.82rem',
                            color: '#92400e',
                            background: '#fef3c7',
                            padding: '0.5rem',
                            borderRadius: '0.35rem',
                          }}
                        >
                          ⏳ <strong>Review in progress:</strong> The dairy operator is reviewing
                          your attached Milk Eligibility Certificate. Once verified and accepted,
                          you will be able to sell milk immediately.
                        </p>
                      )}

                      {isActive && (
                        <p
                          style={{
                            margin: '0.5rem 0',
                            fontSize: '0.82rem',
                            color: '#166534',
                            background: '#dcfce7',
                            padding: '0.5rem',
                            borderRadius: '0.35rem',
                          }}
                        >
                          🎉 <strong>Agreement Active:</strong> Your certificate was accepted! You
                          are authorized to deliver milk at the agreed rate of ₹
                          {req.agreedRatePerLiter}/L.
                        </p>
                      )}
                    </div>

                    <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem' }}>
                      {isActive ? (
                        <button
                          type="button"
                          className="primary"
                          onClick={() => openSellMilkModal(req)}
                          style={{ width: '100%', padding: '0.6rem' }}
                        >
                          🥛 Sell Milk to this Dairy
                        </button>
                      ) : isPending ? (
                        <button
                          type="button"
                          className="secondary"
                          disabled
                          style={{ width: '100%', padding: '0.6rem', opacity: 0.7 }}
                        >
                          ⏳ Waiting for Dairy Acceptance
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="secondary"
                          onClick={() => openRequestModal()}
                          style={{ width: '100%', padding: '0.6rem' }}
                        >
                          🔄 Re-apply with Updated Certificate
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* SECTION: BROWSE AVAILABLE DAIRIES */}
          <div>
            <h2 style={{ fontSize: '1.25rem', margin: '0 0 0.5rem 0' }}>
              Available Registered Dairies &amp; Milk Centers
            </h2>
            <p style={{ color: '#64748b', fontSize: '0.9rem', margin: '0 0 1rem 0' }}>
              Select a dairy operating in your district to apply for a daily collection agreement.
            </p>

            {/* Search Bar for Dairies */}
            <div
              style={{
                display: 'flex',
                gap: '0.75rem',
                alignItems: 'center',
                marginBottom: '1.25rem',
                flexWrap: 'wrap',
              }}
            >
              <div style={{ position: 'relative', flex: 1, maxWidth: '420px' }}>
                <input
                  type="text"
                  placeholder="🔍 Search dairy by name, area, or district..."
                  value={dairySearchQuery}
                  onChange={(e) => setDairySearchQuery(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    borderRadius: '0.5rem',
                    border: '1.5px solid #cbd5e1',
                    fontSize: '0.9rem',
                    backgroundColor: '#ffffff',
                    color: '#0f172a',
                  }}
                />
              </div>
              {dairySearchQuery && (
                <button
                  type="button"
                  className="secondary"
                  onClick={() => setDairySearchQuery('')}
                  style={{ padding: '0.6rem 0.9rem', fontSize: '0.85rem' }}
                >
                  Clear
                </button>
              )}
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                gap: '1rem',
              }}
            >
              {dairies
                .filter((dairy) => {
                  if (!dairySearchQuery.trim()) return true;
                  const q = dairySearchQuery.toLowerCase();
                  return (
                    dairy.dairyName?.toLowerCase().includes(q) ||
                    dairy.district?.toLowerCase().includes(q) ||
                    dairy.operationalArea?.toLowerCase().includes(q) ||
                    dairy.state?.toLowerCase().includes(q)
                  );
                })
                .map((dairy) => {
                const existingReq = myRequests.find((r) => r.dairyUserId === dairy.userId);
                return (
                  <div
                    key={dairy.id || dairy.userId}
                    className="card"
                    style={{
                      border: '1.5px solid #cbd5e1',
                      borderRadius: '0.75rem',
                      padding: '1.25rem',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                    }}
                  >
                    <div>
                      <div
                        className="flex-between"
                        style={{ alignItems: 'flex-start', marginBottom: '0.5rem' }}
                      >
                        <div>
                          <h3 style={{ margin: '0 0 0.2rem 0', color: '#0f172a' }}>
                            {dairy.dairyName}
                          </h3>
                          <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                            FSSAI: {dairy.fssaiLicenseNumber}
                          </div>
                        </div>
                        <span
                          style={{
                            background: '#ecfdf5',
                            color: '#065f46',
                            padding: '0.2rem 0.5rem',
                            borderRadius: '999px',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                          }}
                        >
                          VERIFIED
                        </span>
                      </div>

                      <div style={{ fontSize: '0.85rem', color: '#334155', margin: '0.75rem 0' }}>
                        <div>
                          📍 <strong>Location:</strong> {dairy.operationalArea}, {dairy.district},{' '}
                          {dairy.state}
                        </div>
                        {dairy.dailyCapacityLiters > 0 && (
                          <div style={{ marginTop: '0.25rem' }}>
                            🏭 <strong>Capacity:</strong>{' '}
                            {Number(dairy.dailyCapacityLiters).toLocaleString()} Liters/day
                          </div>
                        )}
                        {dairy.contactEmail && (
                          <div style={{ marginTop: '0.25rem' }}>
                            ✉️ <strong>Contact:</strong> {dairy.contactEmail}
                          </div>
                        )}
                      </div>
                    </div>

                    <div style={{ marginTop: '1rem' }}>
                      {existingReq?.status === 'ACTIVE' ? (
                        <button
                          type="button"
                          className="primary"
                          onClick={() => openSellMilkModal(existingReq)}
                          style={{ width: '100%', padding: '0.6rem' }}
                        >
                          🥛 Sell Milk (Connected)
                        </button>
                      ) : existingReq?.status === 'PENDING_APPROVAL' ? (
                        <button
                          type="button"
                          className="secondary"
                          disabled
                          style={{ width: '100%', padding: '0.6rem', opacity: 0.7 }}
                        >
                          ⏳ Application Pending
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="primary"
                          onClick={() => openRequestModal(dairy)}
                          style={{ width: '100%', padding: '0.6rem' }}
                        >
                          📤 Send Supply Request
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: MILK SALES LEDGER */}
      {activeTab === 'sales' && (
        <div className="card">
          <div className="flex-between" style={{ marginBottom: '1rem' }}>
            <div>
              <h3 style={{ margin: 0 }}>📋 Recorded Milk Sales &amp; Intake Receipts</h3>
              <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem', color: '#64748b' }}>
                All milk lots supplied to connected dairies with certified withdrawal clearance
              </p>
            </div>
            {activeEnrollments.length > 0 && (
              <button
                type="button"
                className="primary"
                onClick={() => openSellMilkModal()}
                style={{ fontSize: '0.9rem', padding: '0.5rem 1rem' }}
              >
                ➕ Record New Supply
              </button>
            )}
          </div>

          {salesHistory.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: '#64748b' }}>
              <p style={{ fontSize: '1.1rem', margin: '0 0 0.5rem 0' }}>
                No milk sales recorded yet.
              </p>
              <p style={{ fontSize: '0.85rem', maxWidth: '400px', margin: '0 auto 1rem auto' }}>
                Once your request is approved by a dairy, use the &quot;Sell Milk Now&quot; button
                to log your daily milk supply.
              </p>
              {activeEnrollments.length > 0 && (
                <button type="button" className="primary" onClick={() => openSellMilkModal()}>
                  🥛 Log First Milk Sale
                </button>
              )}
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                <thead>
                  <tr
                    style={{
                      borderBottom: '2px solid #e2e8f0',
                      color: '#64748b',
                      textAlign: 'left',
                    }}
                  >
                    <th style={{ padding: '0.75rem 0.5rem' }}>Date &amp; Shift</th>
                    <th style={{ padding: '0.75rem 0.5rem' }}>Dairy Partner</th>
                    <th style={{ padding: '0.75rem 0.5rem' }}>Milk Type</th>
                    <th style={{ padding: '0.75rem 0.5rem' }}>Quantity</th>
                    <th style={{ padding: '0.75rem 0.5rem' }}>Fat / SNF %</th>
                    <th style={{ padding: '0.75rem 0.5rem' }}>Rate / Liter</th>
                    <th style={{ padding: '0.75rem 0.5rem' }}>Total Payout</th>
                    <th style={{ padding: '0.75rem 0.5rem' }}>Safety Status</th>
                  </tr>
                </thead>
                <tbody>
                  {salesHistory.map((s) => (
                    <tr key={s.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '0.75rem 0.5rem' }}>
                        <strong>{s.collectionDate}</strong>
                        <div style={{ fontSize: '0.78rem', color: '#64748b' }}>{s.shift} SHIFT</div>
                      </td>
                      <td style={{ padding: '0.75rem 0.5rem' }}>
                        <strong>{s.dairyName || 'Authorized Dairy'}</strong>
                        <div style={{ fontSize: '0.78rem', color: '#64748b' }}>{s.villageArea}</div>
                      </td>
                      <td style={{ padding: '0.75rem 0.5rem' }}>
                        <span
                          style={{
                            padding: '0.2rem 0.5rem',
                            borderRadius: '999px',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            background: s.milkType === 'BUFFALO' ? '#f3e8ff' : '#ecfdf5',
                            color: s.milkType === 'BUFFALO' ? '#6b21a8' : '#065f46',
                          }}
                        >
                          {s.milkType}
                        </span>
                      </td>
                      <td
                        style={{ padding: '0.75rem 0.5rem', fontWeight: 700, fontSize: '0.95rem' }}
                      >
                        {s.quantityLiters} Liters
                      </td>
                      <td style={{ padding: '0.75rem 0.5rem', fontSize: '0.85rem' }}>
                        {s.fatPercentage}% / {s.snfPercentage}%
                      </td>
                      <td style={{ padding: '0.75rem 0.5rem', fontWeight: 600 }}>
                        ₹{s.ratePerLiter}/L
                      </td>
                      <td
                        style={{
                          padding: '0.75rem 0.5rem',
                          fontWeight: 800,
                          color: '#059669',
                          fontSize: '0.95rem',
                        }}
                      >
                        ₹{s.totalCost.toFixed(2)}
                      </td>
                      <td style={{ padding: '0.75rem 0.5rem' }}>
                        <span
                          style={{
                            background: '#dcfce7',
                            color: '#166534',
                            padding: '0.2rem 0.5rem',
                            borderRadius: '999px',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                          }}
                        >
                          ✓ CLEARED
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* MODAL 1: SEND JOIN REQUEST TO DAIRY */}
      {showRequestModal && (
        <div
          className="modal-backdrop"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem',
          }}
        >
          <div
            className="modal-card"
            style={{
              background: '#ffffff',
              borderRadius: '1rem',
              maxWidth: '560px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '1.75rem',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
            }}
          >
            <div className="flex-between" style={{ marginBottom: '1rem' }}>
              <div>
                <h2 style={{ margin: 0, color: '#0f172a' }}>📤 Send Supply Request to Dairy</h2>
                <small style={{ color: '#64748b' }}>
                  Submit your farm details &amp; Milk Eligibility Certificate
                </small>
              </div>
              <button
                type="button"
                className="secondary"
                onClick={() => setShowRequestModal(false)}
                style={{ padding: '0.35rem 0.65rem' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSendJoinRequest}>
              {/* Select Dairy */}
              <div style={{ marginBottom: '1rem' }}>
                <label
                  style={{
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    display: 'block',
                    marginBottom: '0.3rem',
                  }}
                >
                  SELECT TARGET DAIRY
                </label>
                <select
                  value={requestForm.dairyUserId}
                  onChange={(e) => setRequestForm({ ...requestForm, dairyUserId: e.target.value })}
                  required
                  style={{ width: '100%', padding: '0.65rem' }}
                >
                  <option value="">-- Choose a Dairy --</option>
                  {dairies.map((d) => (
                    <option key={d.id || d.userId} value={d.userId}>
                      🏢 {d.dairyName} ({d.district}, {d.operationalArea})
                    </option>
                  ))}
                </select>
              </div>

              {/* Certificate selector */}
              <div
                style={{
                  background: '#f0fdf4',
                  border: '1.5px solid #86efac',
                  padding: '1rem',
                  borderRadius: '0.5rem',
                  marginBottom: '1rem',
                }}
              >
                <label
                  style={{
                    fontWeight: 800,
                    fontSize: '0.88rem',
                    color: '#065f46',
                    display: 'block',
                    marginBottom: '0.3rem',
                  }}
                >
                  📜 ATTACH MILK ELIGIBILITY CERTIFICATE (REQUIRED)
                </label>
                <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.8rem', color: '#166534' }}>
                  The dairy operator requires an active statutory Milk Eligibility Certificate or
                  Today&apos;s Daily Clearance to confirm zero antibiotic withdrawal violations
                  before accepting your request.
                </p>

                {availableCertificates.length === 0 ? (
                  <div style={{ color: '#b91c1c', fontSize: '0.85rem' }}>
                    ⚠️ No active certificates found for this farm. Please run today&apos;s milk
                    eligibility clearance or generate a certificate first!
                  </div>
                ) : (
                  <select
                    value={requestForm.certificateVerificationId}
                    onChange={(e) => {
                      const selected = availableCertificates.find(
                        (c) => c.verificationId === e.target.value,
                      );
                      setRequestForm({
                        ...requestForm,
                        certificateVerificationId: e.target.value,
                        certificateNumber: selected?.certificateNumber || '',
                      });
                    }}
                    required
                    style={{ width: '100%', padding: '0.65rem' }}
                  >
                    {availableCertificates.map((cert) => (
                      <option key={cert.id} value={cert.verificationId}>
                        ✅ {cert.label}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Milk Type and Quota */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '0.75rem',
                  marginBottom: '1rem',
                }}
              >
                <div>
                  <label
                    style={{
                      fontWeight: 700,
                      fontSize: '0.85rem',
                      display: 'block',
                      marginBottom: '0.3rem',
                    }}
                  >
                    MILK TYPE
                  </label>
                  <select
                    value={requestForm.milkType}
                    onChange={(e) => setRequestForm({ ...requestForm, milkType: e.target.value })}
                    style={{ width: '100%', padding: '0.65rem' }}
                  >
                    <option value="COW">Cow Milk</option>
                    <option value="BUFFALO">Buffalo Milk</option>
                    <option value="MIXED">Mixed Milk</option>
                  </select>
                </div>
                <div>
                  <label
                    style={{
                      fontWeight: 700,
                      fontSize: '0.85rem',
                      display: 'block',
                      marginBottom: '0.3rem',
                    }}
                  >
                    DAILY QUOTA (L/DAY)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    value={requestForm.expectedDailyQuantity}
                    onChange={(e) =>
                      setRequestForm({ ...requestForm, expectedDailyQuantity: e.target.value })
                    }
                    required
                    style={{ width: '100%', padding: '0.65rem' }}
                  />
                </div>
              </div>

              {/* Rate and Payment */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '0.75rem',
                  marginBottom: '1rem',
                }}
              >
                <div>
                  <label
                    style={{
                      fontWeight: 700,
                      fontSize: '0.85rem',
                      display: 'block',
                      marginBottom: '0.3rem',
                    }}
                  >
                    PROPOSED RATE (₹/L)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    value={requestForm.agreedRatePerLiter}
                    onChange={(e) =>
                      setRequestForm({ ...requestForm, agreedRatePerLiter: e.target.value })
                    }
                    required
                    style={{ width: '100%', padding: '0.65rem' }}
                  />
                </div>
                <div>
                  <label
                    style={{
                      fontWeight: 700,
                      fontSize: '0.85rem',
                      display: 'block',
                      marginBottom: '0.3rem',
                    }}
                  >
                    PAYMENT PREFERENCE
                  </label>
                  <select
                    value={requestForm.paymentMethod}
                    onChange={(e) =>
                      setRequestForm({ ...requestForm, paymentMethod: e.target.value })
                    }
                    style={{ width: '100%', padding: '0.65rem' }}
                  >
                    <option value="BANK_TRANSFER">Bank Account (NEFT/IMPS)</option>
                    <option value="UPI">UPI ID</option>
                  </select>
                </div>
              </div>

              {/* Payment Details */}
              {requestForm.paymentMethod === 'UPI' ? (
                <div style={{ marginBottom: '1rem' }}>
                  <label
                    style={{
                      fontWeight: 700,
                      fontSize: '0.85rem',
                      display: 'block',
                      marginBottom: '0.3rem',
                    }}
                  >
                    UPI ID
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. yourname@oksbi"
                    value={requestForm.upiId}
                    onChange={(e) => setRequestForm({ ...requestForm, upiId: e.target.value })}
                    style={{ width: '100%', padding: '0.65rem' }}
                  />
                </div>
              ) : (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '0.75rem',
                    marginBottom: '1rem',
                  }}
                >
                  <div>
                    <label
                      style={{
                        fontWeight: 700,
                        fontSize: '0.85rem',
                        display: 'block',
                        marginBottom: '0.3rem',
                      }}
                    >
                      BANK ACCOUNT NUMBER
                    </label>
                    <input
                      type="text"
                      placeholder="Account number"
                      value={requestForm.bankAccountNumber}
                      onChange={(e) =>
                        setRequestForm({ ...requestForm, bankAccountNumber: e.target.value })
                      }
                      style={{ width: '100%', padding: '0.65rem' }}
                    />
                  </div>
                  <div>
                    <label
                      style={{
                        fontWeight: 700,
                        fontSize: '0.85rem',
                        display: 'block',
                        marginBottom: '0.3rem',
                      }}
                    >
                      BANK IFSC CODE
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. SBIN0001234"
                      value={requestForm.bankIfsc}
                      onChange={(e) => setRequestForm({ ...requestForm, bankIfsc: e.target.value })}
                      style={{ width: '100%', padding: '0.65rem' }}
                    />
                  </div>
                </div>
              )}

              {/* Notes */}
              <div style={{ marginBottom: '1.25rem' }}>
                <label
                  style={{
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    display: 'block',
                    marginBottom: '0.3rem',
                  }}
                >
                  APPLICATION NOTES FOR DAIRY OPERATOR
                </label>
                <textarea
                  rows="2"
                  placeholder="e.g. Regular morning supply from healthy, vaccinated cattle herd."
                  value={requestForm.joinRequestNotes}
                  onChange={(e) =>
                    setRequestForm({ ...requestForm, joinRequestNotes: e.target.value })
                  }
                  style={{ width: '100%', padding: '0.65rem' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="secondary"
                  onClick={() => setShowRequestModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="primary"
                  disabled={submitting || availableCertificates.length === 0}
                >
                  {submitting ? 'Submitting Request…' : '🚀 Send Request to Dairy'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: SELL MILK TO DAIRY */}
      {showSellMilkModal && (
        <div
          className="modal-backdrop"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem',
          }}
        >
          <div
            className="modal-card"
            style={{
              background: '#ffffff',
              borderRadius: '1rem',
              maxWidth: '520px',
              width: '100%',
              padding: '1.75rem',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
            }}
          >
            <div className="flex-between" style={{ marginBottom: '1rem' }}>
              <div>
                <h2 style={{ margin: 0, color: '#0f172a' }}>🥛 Sell Milk to Dairy</h2>
                <small style={{ color: '#64748b' }}>
                  Log daily milk collection lot to your authorized dairy
                </small>
              </div>
              <button
                type="button"
                className="secondary"
                onClick={() => setShowSellMilkModal(false)}
                style={{ padding: '0.35rem 0.65rem' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSellMilkSubmit}>
              {/* Target Dairy Display */}
              <div
                style={{
                  background: '#f8fafc',
                  border: '1px solid #cbd5e1',
                  borderRadius: '0.5rem',
                  padding: '0.75rem',
                  marginBottom: '1rem',
                }}
              >
                <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 700 }}>
                  DELIVERY DESTINATION
                </div>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>
                  🏢 {selectedDairyForSale?.dairyName || 'Authorized Dairy'}
                </div>
                <div style={{ fontSize: '0.8rem', color: '#059669', fontWeight: 700 }}>
                  Agreed Rate: ₹{saleForm.ratePerLiter} / Liter
                </div>
              </div>

              {/* Date and Shift */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '0.75rem',
                  marginBottom: '1rem',
                }}
              >
                <div>
                  <label
                    style={{
                      fontWeight: 700,
                      fontSize: '0.85rem',
                      display: 'block',
                      marginBottom: '0.3rem',
                    }}
                  >
                    COLLECTION DATE
                  </label>
                  <input
                    type="date"
                    value={saleForm.collectionDate}
                    onChange={(e) => setSaleForm({ ...saleForm, collectionDate: e.target.value })}
                    required
                    style={{ width: '100%', padding: '0.65rem' }}
                  />
                </div>
                <div>
                  <label
                    style={{
                      fontWeight: 700,
                      fontSize: '0.85rem',
                      display: 'block',
                      marginBottom: '0.3rem',
                    }}
                  >
                    COLLECTION SHIFT
                  </label>
                  <select
                    value={saleForm.shift}
                    onChange={(e) => setSaleForm({ ...saleForm, shift: e.target.value })}
                    style={{ width: '100%', padding: '0.65rem' }}
                  >
                    <option value="MORNING">🌅 Morning Shift</option>
                    <option value="EVENING">🌆 Evening Shift</option>
                  </select>
                </div>
              </div>

              {/* Milk Type and Quantity */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '0.75rem',
                  marginBottom: '1rem',
                }}
              >
                <div>
                  <label
                    style={{
                      fontWeight: 700,
                      fontSize: '0.85rem',
                      display: 'block',
                      marginBottom: '0.3rem',
                    }}
                  >
                    MILK TYPE
                  </label>
                  <select
                    value={saleForm.milkType}
                    onChange={(e) => setSaleForm({ ...saleForm, milkType: e.target.value })}
                    style={{ width: '100%', padding: '0.65rem' }}
                  >
                    <option value="COW">Cow Milk</option>
                    <option value="BUFFALO">Buffalo Milk</option>
                    <option value="MIXED">Mixed Milk</option>
                  </select>
                </div>
                <div>
                  <label
                    style={{
                      fontWeight: 700,
                      fontSize: '0.85rem',
                      display: 'block',
                      marginBottom: '0.3rem',
                    }}
                  >
                    QUANTITY (LITERS)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="1"
                    value={saleForm.quantityLiters}
                    onChange={(e) => setSaleForm({ ...saleForm, quantityLiters: e.target.value })}
                    required
                    style={{ width: '100%', padding: '0.65rem', fontWeight: 700 }}
                  />
                </div>
              </div>

              {/* Quality Fat & SNF */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '0.75rem',
                  marginBottom: '1rem',
                }}
              >
                <div>
                  <label
                    style={{
                      fontWeight: 700,
                      fontSize: '0.85rem',
                      display: 'block',
                      marginBottom: '0.3rem',
                    }}
                  >
                    FAT %
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={saleForm.fatPercentage}
                    onChange={(e) => setSaleForm({ ...saleForm, fatPercentage: e.target.value })}
                    style={{ width: '100%', padding: '0.65rem' }}
                  />
                </div>
                <div>
                  <label
                    style={{
                      fontWeight: 700,
                      fontSize: '0.85rem',
                      display: 'block',
                      marginBottom: '0.3rem',
                    }}
                  >
                    SNF %
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={saleForm.snfPercentage}
                    onChange={(e) => setSaleForm({ ...saleForm, snfPercentage: e.target.value })}
                    style={{ width: '100%', padding: '0.65rem' }}
                  />
                </div>
              </div>

              {/* Dynamic Payout Box */}
              <div
                style={{
                  background: '#ecfdf5',
                  border: '1.5px solid #a7f3d0',
                  borderRadius: '0.5rem',
                  padding: '1rem',
                  marginBottom: '1.25rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <div style={{ fontSize: '0.8rem', color: '#065f46', fontWeight: 700 }}>
                    TOTAL SALE VALUE
                  </div>
                  <div style={{ fontSize: '0.82rem', color: '#047857' }}>
                    {parseFloat(saleForm.quantityLiters) || 0} Liters × ₹{saleForm.ratePerLiter}/L
                  </div>
                </div>
                <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#047857' }}>
                  ₹
                  {(
                    (parseFloat(saleForm.quantityLiters) || 0) *
                    (parseFloat(saleForm.ratePerLiter) || 0)
                  ).toFixed(2)}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="secondary"
                  onClick={() => setShowSellMilkModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="primary" disabled={submitting}>
                  {submitting ? 'Recording Sale…' : '🥛 Confirm Milk Supply'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* FARMER DIGITAL QR PASS MODAL */}
      {showFarmerPassModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.78)',
            backdropFilter: 'blur(6px)',
            zIndex: 99999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.25rem',
          }}
          onClick={() => setShowFarmerPassModal(false)}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '1.25rem',
              padding: '2rem',
              maxWidth: '460px',
              width: '100%',
              boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.4)',
              textAlign: 'center',
              border: '1px solid #cbd5e1',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '1.25rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '1.5rem' }}>🎫</span>
                <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#0f172a' }}>
                  Farmer Daily QR Pass
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowFarmerPassModal(false)}
                style={{
                  background: '#f1f5f9',
                  border: 'none',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  cursor: 'pointer',
                  fontWeight: 700,
                  color: '#475569',
                }}
              >
                ✕
              </button>
            </div>

            <div
              style={{
                background: '#f8fafc',
                border: '1.5px solid #e2e8f0',
                borderRadius: '1rem',
                padding: '1.5rem',
                marginBottom: '1.25rem',
              }}
            >
              <div
                style={{
                  background: '#ffffff',
                  padding: '1rem',
                  borderRadius: '0.75rem',
                  display: 'inline-block',
                  border: '1px solid #cbd5e1',
                  boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
                }}
              >
                <QRCodeSVG
                  value={
                    myRequests[0]?.farmerIdNumber ||
                    `FMR-${user?.id ? user.id.slice(-6).toUpperCase() : 'PASS'}`
                  }
                  size={180}
                  level="H"
                  includeMargin={true}
                />
              </div>

              <div style={{ marginTop: '1rem' }}>
                <div
                  style={{
                    fontSize: '0.75rem',
                    color: '#64748b',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    fontWeight: 700,
                  }}
                >
                  Farmer ID Number
                </div>
                <code
                  style={{
                    fontSize: '1.35rem',
                    fontWeight: 800,
                    color: '#0f172a',
                    letterSpacing: '0.05em',
                  }}
                >
                  {myRequests[0]?.farmerIdNumber ||
                    `FMR-${user?.id ? user.id.slice(-6).toUpperCase() : 'PASS'}`}
                </code>
              </div>

              <div style={{ marginTop: '0.75rem', fontSize: '0.92rem', color: '#334155' }}>
                <strong>{user?.fullName || 'Registered Farmer'}</strong>
                <div>
                  {farm?.name || 'Local Dairy Farm'} · {farm?.district || 'Kolhapur'},{' '}
                  {farm?.state || 'Maharashtra'}
                </div>
              </div>
            </div>

            <p style={{ fontSize: '0.82rem', color: '#64748b', margin: '0 0 1.25rem 0' }}>
              Present this QR Code or Farmer ID at the dairy collection counter. The operator will
              scan or enter your ID for instant 5-second milk drop-off.
            </p>

            <button
              type="button"
              className="primary"
              style={{ width: '100%', padding: '0.75rem', fontWeight: 700 }}
              onClick={() => setShowFarmerPassModal(false)}
            >
              Done
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
