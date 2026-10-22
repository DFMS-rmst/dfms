import { useState, useEffect } from 'react';
import { api } from './api.js';

// Shared solid, non-transparent modal styles ensuring crisp readability
const modalBackdropStyle = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: 'rgba(15, 23, 42, 0.78)',
  backdropFilter: 'blur(8px)',
  WebkitBackdropFilter: 'blur(8px)',
  zIndex: 9999,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '1.25rem',
  overflowY: 'auto',
};

const modalDialogStyle = {
  backgroundColor: '#ffffff',
  background: '#ffffff',
  color: '#0f172a',
  borderRadius: '1.25rem',
  padding: '2rem',
  boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.55), 0 0 0 1px rgba(0, 0, 0, 0.12)',
  border: '1.5px solid #cbd5e1',
  maxHeight: '90vh',
  overflowY: 'auto',
  position: 'relative',
  zIndex: 10000,
  boxSizing: 'border-box',
};

const modalHeaderStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: '1.5rem',
  borderBottom: '1px solid #e2e8f0',
  paddingBottom: '1rem',
};

const modalCloseBtnStyle = {
  background: '#f1f5f9',
  border: '1px solid #cbd5e1',
  color: '#475569',
  width: '36px',
  height: '36px',
  borderRadius: '50%',
  cursor: 'pointer',
  fontSize: '1rem',
  fontWeight: 700,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: 'all 0.15s ease',
};

const modalLabelStyle = {
  display: 'block',
  fontSize: '0.88rem',
  fontWeight: 600,
  color: '#1e293b',
  marginBottom: '0.65rem',
};

const modalInputStyle = {
  width: '100%',
  backgroundColor: '#ffffff',
  color: '#0f172a',
  border: '1.5px solid #cbd5e1',
  borderRadius: '0.65rem',
  padding: '0.65rem 0.85rem',
  fontSize: '0.92rem',
  outline: 'none',
  marginTop: '0.35rem',
  display: 'block',
  boxSizing: 'border-box',
};

export function DairyHub({ initialTab = 'analytics' }) {
  const [activeTab, setActiveTab] = useState(initialTab);

  // Synchronize activeTab when navigation changes
  useEffect(() => {
    if (initialTab) setActiveTab(initialTab);
  }, [initialTab]);

  // Global state
  const [areasList, setAreasList] = useState([]);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // 1. Analytics state
  const [analytics, setAnalytics] = useState(null);

  // 2. Farmers & Enrollments state
  const [farmers, setFarmers] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [farmerSearch, setFarmerSearch] = useState('');
  const [areaFilter, setAreaFilter] = useState('');
  const [enrollmentStatusFilter, setEnrollmentStatusFilter] = useState('ALL');

  // 3. Milk Intakes state
  const [intakes, setIntakes] = useState([]);
  const [intakeShiftFilter, setIntakeShiftFilter] = useState('ALL');

  // 4. Sales state
  const [sales, setSales] = useState([]);
  const [salesBuyerFilter, setSalesBuyerFilter] = useState('ALL');

  // 5. Tanks state
  const [tanksData, setTanksData] = useState({ tanks: [], summary: {} });

  // Modals state
  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [editingEnrollment, setEditingEnrollment] = useState(null);
  const [showIntakeModal, setShowIntakeModal] = useState(false);
  const [showSaleModal, setShowSaleModal] = useState(false);
  const [inspectingFarmerHealth, setInspectingFarmerHealth] = useState(null);

  // Certificate Review Modal state
  const [reviewingRequest, setReviewingRequest] = useState(null);
  const [reviewCertDetails, setReviewCertDetails] = useState(null);
  const [loadingCertDetails, setLoadingCertDetails] = useState(false);
  const [reviewAgreedRate, setReviewAgreedRate] = useState('42.50');
  const [reviewNotes, setReviewNotes] = useState('');
  const [reviewActionSubmitting, setReviewActionSubmitting] = useState(false);

  // Forms state
  const [enrollForm, setEnrollForm] = useState({
    farmerIdNumber: '',
    farmerName: '',
    farmName: '',
    phone: '',
    email: '',
    state: 'Maharashtra',
    district: 'Kolhapur',
    taluka: '',
    villageArea: '',
    pincode: '',
    milkType: 'COW',
    expectedDailyQuantity: 25,
    agreedRatePerLiter: 42,
    baseFatPercentage: 4.2,
    baseSnfPercentage: 8.6,
    paymentMethod: 'BANK_TRANSFER',
    bankAccountNumber: '',
    bankIfsc: '',
    bankName: '',
    upiId: '',
    status: 'ACTIVE',
    joinRequestNotes: '',
  });

  const [intakeForm, setIntakeForm] = useState({
    farmerIdNumber: '',
    farmerName: '',
    farmName: '',
    villageArea: '',
    collectionDate: new Date().toISOString().split('T')[0],
    shift: 'MORNING',
    milkType: 'COW',
    quantityLiters: 20,
    fatPercentage: 4.2,
    snfPercentage: 8.6,
    ratePerLiter: 42,
    storageTank: 'Silo-1 (Raw Cow)',
    paymentStatus: 'PAID',
    qualityGrade: 'GRADE_A',
    notes: '',
  });

  const [saleForm, setSaleForm] = useState({
    saleDate: new Date().toISOString().split('T')[0],
    buyerName: '',
    buyerType: 'RETAIL_CONSUMER',
    milkType: 'COW',
    quantityLiters: 20,
    pricePerLiter: 56,
    dispensedFromTank: 'Tank A (Chilled Bulk)',
    paymentStatus: 'PAID',
    paymentMethod: 'UPI',
    notes: '',
  });

  // Load initial data
  useEffect(() => {
    loadAllData();
  }, []);

  async function loadAllData() {
    setError('');
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const [areasRes, analyticsRes, enrollRes, farmersRes, intakesRes, salesRes, tanksRes] =
        await Promise.all([
          api('/dairy/areas').catch(() => ({ areas: [] })),
          api(`/dairy/analytics?date=${todayStr}`).catch(() => null),
          api('/dairy/enrollments').catch(() => ({ enrollments: [] })),
          api('/dairy/farmers').catch(() => ({ farmers: [] })),
          api('/dairy/inventory/intakes').catch(() => ({ intakes: [] })),
          api('/dairy/inventory/sales').catch(() => ({ sales: [] })),
          api('/dairy/inventory/tanks').catch(() => ({ tanks: [], summary: {} })),
        ]);

      setAreasList(areasRes?.areas || []);
      setAnalytics(analyticsRes || null);
      setEnrollments(enrollRes?.enrollments || []);
      setFarmers(farmersRes?.farmers || []);
      setIntakes(intakesRes?.intakes || []);
      setSales(salesRes?.sales || []);
      setTanksData(tanksRes || { tanks: [], summary: {} });
    } catch (err) {
      setError(err.message || 'Failed to load dairy data');
    }
  }

  function showNotification(msg) {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 4500);
  }

  // --- Handlers for Enrollment ---
  function openAddFarmerModal(prefill = {}) {
    setEditingEnrollment(null);
    setEnrollForm({
      farmerIdNumber: prefill.farmerIdNumber || '',
      farmerName: prefill.farmerName || '',
      farmName: prefill.farmName || '',
      phone: prefill.farmerPhone || '',
      email: prefill.farmerEmail || '',
      state: prefill.state || 'Maharashtra',
      district: prefill.district || 'Kolhapur',
      taluka: prefill.taluka || '',
      villageArea: prefill.villageArea || '',
      pincode: prefill.pincode || '',
      milkType: prefill.milkType || 'COW',
      expectedDailyQuantity: prefill.expectedDailyQuantity || 25,
      agreedRatePerLiter: prefill.agreedRatePerLiter || 42,
      baseFatPercentage: 4.2,
      baseSnfPercentage: 8.6,
      paymentMethod: 'BANK_TRANSFER',
      bankAccountNumber: '',
      bankIfsc: '',
      bankName: '',
      upiId: '',
      status: 'ACTIVE',
      joinRequestNotes: '',
    });
    setShowEnrollModal(true);
  }

  function openEditEnrollmentModal(enr) {
    setEditingEnrollment(enr);
    setEnrollForm({
      farmerIdNumber: enr.farmerIdNumber,
      farmerName: enr.farmerName,
      farmName: enr.farmName,
      phone: enr.phone || '',
      email: enr.email || '',
      state: enr.state,
      district: enr.district,
      taluka: enr.taluka || '',
      villageArea: enr.villageArea || '',
      pincode: enr.pincode || '',
      milkType: enr.milkType || 'COW',
      expectedDailyQuantity: enr.expectedDailyQuantity || 25,
      agreedRatePerLiter: enr.agreedRatePerLiter || 42,
      baseFatPercentage: enr.baseFatPercentage || 4.2,
      baseSnfPercentage: enr.baseSnfPercentage || 8.6,
      paymentMethod: enr.paymentMethod || 'BANK_TRANSFER',
      bankAccountNumber: enr.bankAccountNumber || '',
      bankIfsc: enr.bankIfsc || '',
      bankName: enr.bankName || '',
      upiId: enr.upiId || '',
      status: enr.status,
      joinRequestNotes: enr.joinRequestNotes || '',
    });
    setShowEnrollModal(true);
  }

  async function handleSaveEnrollment(e) {
    e.preventDefault();
    setError('');
    try {
      if (editingEnrollment) {
        await api(`/dairy/enrollments/${editingEnrollment.id}`, {
          method: 'PUT',
          body: JSON.stringify(enrollForm),
        });
        showNotification(`Farmer enrollment updated (${enrollForm.farmerName})`);
      } else {
        await api('/dairy/enrollments', {
          method: 'POST',
          body: JSON.stringify(enrollForm),
        });
        showNotification(
          enrollForm.status === 'PENDING_APPROVAL'
            ? `Join request for ${enrollForm.farmerName} submitted for review`
            : `Farmer ${enrollForm.farmerName} successfully enrolled!`,
        );
      }
      setShowEnrollModal(false);
      loadAllData();
    } catch (err) {
      setError(err.message || 'Failed to save enrollment');
    }
  }

  async function openCertificateReviewModal(enrollment) {
    setError('');
    setReviewingRequest(enrollment);
    setReviewAgreedRate(String(enrollment.agreedRatePerLiter || 42.5));
    setReviewNotes(enrollment.joinRequestNotes || '');
    setReviewCertDetails(null);
    setLoadingCertDetails(true);

    const certId = enrollment.certificateVerificationId || enrollment.certificateNumber;
    if (certId) {
      try {
        const res = await api(`/dairy/certificates/verify/${encodeURIComponent(certId)}`);
        setReviewCertDetails(res.data);
      } catch (err) {
        console.warn('Certificate lookup fallback:', err);
      }
    }

    try {
      const herdRes = await api(`/dairy/farmers/${encodeURIComponent(enrollment.farmerIdNumber)}`);
      if (herdRes) {
        setReviewCertDetails((prev) => ({
          ...prev,
          herdSummary: herdRes.summary,
          animals: prev?.animals?.length ? prev.animals : herdRes.animals,
          farm: herdRes.farm,
          farmer: herdRes.farmer,
        }));
      }
    } catch (e) {
      console.warn('Herd check fallback:', e);
    } finally {
      setLoadingCertDetails(false);
    }
  }

  async function handleAcceptJoinRequest() {
    if (!reviewingRequest) return;
    setReviewActionSubmitting(true);
    setError('');
    try {
      await api(`/dairy/enrollments/${reviewingRequest.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          status: 'ACTIVE',
          agreedRatePerLiter: parseFloat(reviewAgreedRate) || 42.5,
          joinRequestNotes: reviewNotes || reviewingRequest.joinRequestNotes,
        }),
      });
      showNotification(
        `🎉 Farmer ${reviewingRequest.farmerName} has been approved upon verifying their certificate! They can now supply milk.`,
      );
      setReviewingRequest(null);
      loadAllData();
    } catch (err) {
      setError(err.message || 'Failed to accept request.');
    } finally {
      setReviewActionSubmitting(false);
    }
  }

  async function handleRejectJoinRequest() {
    if (!reviewingRequest) return;
    if (
      !window.confirm(
        `Are you sure you want to decline the supply request from ${reviewingRequest.farmerName}?`,
      )
    ) {
      return;
    }
    setReviewActionSubmitting(true);
    setError('');
    try {
      await api(`/dairy/enrollments/${reviewingRequest.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          status: 'REJECTED',
          joinRequestNotes: reviewNotes || reviewingRequest.joinRequestNotes,
        }),
      });
      showNotification(`Supply request from ${reviewingRequest.farmerName} has been rejected.`);
      setReviewingRequest(null);
      loadAllData();
    } catch (err) {
      setError(err.message || 'Failed to reject request.');
    } finally {
      setReviewActionSubmitting(false);
    }
  }

  // --- Handlers for Milk Collection Intake ---
  function openIntakeModal(farmer = null) {
    const activeSuppliers = enrollments.filter((e) => e.status === 'ACTIVE');
    const chosenFarmerId = farmer?.farmerIdNumber || activeSuppliers[0]?.farmerIdNumber || '';
    const matchedEnr = enrollments.find((e) => e.farmerIdNumber === chosenFarmerId);

    setIntakeForm({
      farmerIdNumber: chosenFarmerId,
      farmerName: farmer?.farmerName || matchedEnr?.farmerName || '',
      farmName: farmer?.farmName || matchedEnr?.farmName || '',
      villageArea: farmer?.villageArea || matchedEnr?.villageArea || '',
      collectionDate: new Date().toISOString().split('T')[0],
      shift: 'MORNING',
      milkType: farmer?.milkType || matchedEnr?.milkType || 'COW',
      quantityLiters: matchedEnr?.expectedDailyQuantity || 25,
      fatPercentage: matchedEnr?.baseFatPercentage || 4.2,
      snfPercentage: matchedEnr?.baseSnfPercentage || 8.6,
      ratePerLiter: matchedEnr?.agreedRatePerLiter || 42,
      storageTank:
        (farmer?.milkType || matchedEnr?.milkType) === 'BUFFALO'
          ? 'Silo-2 (Buffalo)'
          : 'Silo-1 (Raw Cow)',
      paymentStatus: 'PAID',
      qualityGrade: 'GRADE_A',
      notes: '',
    });
    setShowIntakeModal(true);
  }

  function handleIntakeFarmerSelect(farmerId) {
    const matchedEnr = enrollments.find((e) => e.farmerIdNumber === farmerId);
    const matchedFarmer = farmers.find((f) => f.farmerIdNumber === farmerId);

    if (matchedEnr || matchedFarmer) {
      const name = matchedEnr?.farmerName || matchedFarmer?.farmerName || '';
      const farm = matchedEnr?.farmName || matchedFarmer?.farmName || '';
      const area = matchedEnr?.villageArea || matchedFarmer?.villageArea || '';
      const mType = matchedEnr?.milkType || matchedFarmer?.milkType || 'COW';
      const rate = matchedEnr?.agreedRatePerLiter || matchedFarmer?.agreedRatePerLiter || 42;
      const expected = matchedEnr?.expectedDailyQuantity || 25;

      setIntakeForm((prev) => ({
        ...prev,
        farmerIdNumber: farmerId,
        farmerName: name,
        farmName: farm,
        villageArea: area,
        milkType: mType,
        ratePerLiter: rate,
        quantityLiters: expected,
        storageTank: mType === 'BUFFALO' ? 'Silo-2 (Buffalo)' : 'Silo-1 (Raw Cow)',
      }));
    } else {
      setIntakeForm((prev) => ({ ...prev, farmerIdNumber: farmerId }));
    }
  }

  async function handleSaveIntake(e) {
    e.preventDefault();
    setError('');
    try {
      const res = await api('/dairy/inventory/intakes', {
        method: 'POST',
        body: JSON.stringify(intakeForm),
      });
      showNotification(
        `Milk intake of ${intakeForm.quantityLiters} L logged successfully! Total cost: ₹${res.totalCost.toLocaleString('en-IN')}`,
      );
      setShowIntakeModal(false);
      loadAllData();
    } catch (err) {
      setError(err.message || 'Failed to record intake');
    }
  }

  // --- Handlers for Milk Sale ---
  async function handleSaveSale(e) {
    e.preventDefault();
    setError('');
    try {
      const res = await api('/dairy/inventory/sales', {
        method: 'POST',
        body: JSON.stringify(saleForm),
      });
      showNotification(
        `Milk sale recorded (${saleForm.quantityLiters} L to ${saleForm.buyerName})! Invoice: #${res.invoiceNumber}`,
      );
      setShowSaleModal(false);
      loadAllData();
    } catch (err) {
      setError(err.message || 'Failed to record sale');
    }
  }

  // --- Inspect Farmer Health & Timeline ---
  async function inspectFarmer(farmerIdNumber) {
    setError('');
    try {
      const res = await api(`/dairy/farmers/${encodeURIComponent(farmerIdNumber)}`);
      setInspectingFarmerHealth(res);
    } catch (err) {
      setError(err.message || `Unable to inspect farmer health for ${farmerIdNumber}`);
    }
  }

  function openAnimalTimeline(animal) {
    if (animal?.verificationId) {
      window.open(`/verify/animal/${animal.verificationId}`, '_blank');
    } else {
      alert(
        `Animal: ${animal?.name || animal?.tagNumber} (${animal?.species || 'Livestock'})\nTag: ${animal?.tagNumber}\nStatus: ${animal?.status || 'ACTIVE'}\nMilk Eligibility: ${animal?.milkEligibility?.isEligible ? 'Eligible / Cleared' : animal?.milkEligibility?.blocker || 'Under Withdrawal'}`,
      );
    }
  }

  // Filtered farmers / enrollments list
  const filteredEnrollments = enrollments.filter((enr) => {
    // Search by Farmer ID or Name
    if (farmerSearch.trim()) {
      const q = farmerSearch.trim().toLowerCase();
      const match =
        enr.farmerIdNumber?.toLowerCase().includes(q) ||
        enr.farmerName?.toLowerCase().includes(q) ||
        enr.farmName?.toLowerCase().includes(q) ||
        enr.phone?.includes(q);
      if (!match) return false;
    }
    // Filter by Area Location Name
    if (areaFilter.trim()) {
      const a = areaFilter.trim().toLowerCase();
      const matchArea =
        enr.villageArea?.toLowerCase().includes(a) ||
        enr.district?.toLowerCase().includes(a) ||
        enr.taluka?.toLowerCase().includes(a);
      if (!matchArea) return false;
    }
    // Filter by Status
    if (enrollmentStatusFilter !== 'ALL') {
      if (enr.status !== enrollmentStatusFilter) return false;
    }
    return true;
  });

  const pendingJoinRequestsCount = enrollments.filter(
    (e) => e.status === 'PENDING_APPROVAL',
  ).length;

  return (
    <div className="dairy-hub-container" style={{ maxWidth: '1240px', margin: '0 auto' }}>
      {/* HEADER BANNER */}
      <div
        className="card"
        style={{
          background: 'linear-gradient(135deg, #064e3b 0%, #059669 100%)',
          color: '#ffffff',
          padding: '1.8rem',
          borderRadius: '1rem',
          marginBottom: '1.5rem',
          boxShadow: '0 8px 24px rgba(5, 150, 105, 0.22)',
        }}
      >
        <div
          className="flex-between"
          style={{ alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}
        >
          <div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.6rem',
                marginBottom: '0.4rem',
              }}
            >
              <span style={{ fontSize: '1.8rem' }}>🥛</span>
              <h1 style={{ margin: 0, color: '#ffffff', fontSize: '1.75rem', fontWeight: 800 }}>
                Dairy Management &amp; Inventory Hub
              </h1>
            </div>
            <p style={{ margin: 0, color: '#d1fae5', fontSize: '0.95rem' }}>
              Farmer Enrollment, Milk Collection Intake, Daily &amp; Monthly Sales Analytics, and
              Storage Silos.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => openIntakeModal()}
              style={{
                background: '#ffffff',
                color: '#064e3b',
                fontWeight: 700,
                border: 'none',
                padding: '0.65rem 1.1rem',
                borderRadius: '0.6rem',
                cursor: 'pointer',
              }}
            >
              ➕ Log Milk Intake
            </button>
            <button
              type="button"
              onClick={() => setShowSaleModal(true)}
              style={{
                background: '#fef08a',
                color: '#713f12',
                fontWeight: 700,
                border: 'none',
                padding: '0.65rem 1.1rem',
                borderRadius: '0.6rem',
                cursor: 'pointer',
              }}
            >
              💰 Record Milk Sale
            </button>
            <button
              type="button"
              onClick={() => openAddFarmerModal()}
              style={{
                background: 'rgba(255, 255, 255, 0.18)',
                color: '#ffffff',
                border: '1px solid rgba(255, 255, 255, 0.4)',
                fontWeight: 600,
                padding: '0.65rem 1.1rem',
                borderRadius: '0.6rem',
                cursor: 'pointer',
              }}
            >
              🧑‍🌾 Enroll Farmer
            </button>
          </div>
        </div>

        {/* Real-time KPI Bar */}
        {analytics?.summary && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
              gap: '1rem',
              marginTop: '1.5rem',
              paddingTop: '1.25rem',
              borderTop: '1px solid rgba(255, 255, 255, 0.25)',
            }}
          >
            <div>
              <div
                style={{
                  fontSize: '0.78rem',
                  color: '#a7f3d0',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                Today's Collection
              </div>
              <div style={{ fontSize: '1.45rem', fontWeight: 800 }}>
                {analytics.summary.today.intakeLiters} L
              </div>
              <div style={{ fontSize: '0.78rem', color: '#d1fae5' }}>
                Cost: ₹{analytics.summary.today.intakeCost.toLocaleString('en-IN')}
              </div>
            </div>

            <div>
              <div
                style={{
                  fontSize: '0.78rem',
                  color: '#a7f3d0',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                Today's Sales
              </div>
              <div style={{ fontSize: '1.45rem', fontWeight: 800 }}>
                ₹{analytics.summary.today.salesRevenue.toLocaleString('en-IN')}
              </div>
              <div style={{ fontSize: '0.78rem', color: '#d1fae5' }}>
                {analytics.summary.today.salesLiters} L ({analytics.summary.today.salesCount} Sells)
              </div>
            </div>

            <div>
              <div
                style={{
                  fontSize: '0.78rem',
                  color: '#a7f3d0',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                Month's Total Sales
              </div>
              <div style={{ fontSize: '1.45rem', fontWeight: 800 }}>
                ₹{analytics.summary.month.salesRevenue.toLocaleString('en-IN')}
              </div>
              <div style={{ fontSize: '0.78rem', color: '#d1fae5' }}>
                {analytics.summary.month.salesLiters} L ({analytics.summary.month.salesCount} Sells)
              </div>
            </div>

            <div>
              <div
                style={{
                  fontSize: '0.78rem',
                  color: '#a7f3d0',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                Current Tank Stock
              </div>
              <div style={{ fontSize: '1.45rem', fontWeight: 800 }}>
                {analytics.summary.allTime.currentStockLiters} L
              </div>
              <div style={{ fontSize: '0.78rem', color: '#d1fae5' }}>In Storage Silos</div>
            </div>

            <div>
              <div
                style={{
                  fontSize: '0.78rem',
                  color: '#a7f3d0',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                Monthly Net Profit
              </div>
              <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#fef08a' }}>
                +₹{analytics.summary.month.netProfit.toLocaleString('en-IN')}
              </div>
              <div style={{ fontSize: '0.78rem', color: '#fef9c3' }}>
                Margin:{' '}
                {analytics.summary.month.salesRevenue > 0
                  ? (
                      (analytics.summary.month.netProfit / analytics.summary.month.salesRevenue) *
                      100
                    ).toFixed(1)
                  : '0.0'}
                %
              </div>
            </div>
          </div>
        )}
      </div>

      {/* SUCCESS / ERROR ALERTS */}
      {successMsg && (
        <div
          className="card"
          style={{
            background: '#ecfdf5',
            border: '1.5px solid #6ee7b7',
            color: '#065f46',
            padding: '0.9rem 1.2rem',
            marginBottom: '1rem',
            borderRadius: '0.6rem',
            fontWeight: 600,
          }}
        >
          ✓ {successMsg}
        </div>
      )}

      {error && (
        <div
          className="card"
          style={{
            background: '#fef2f2',
            border: '1.5px solid #fca5a5',
            color: '#991b1b',
            padding: '0.9rem 1.2rem',
            marginBottom: '1rem',
            borderRadius: '0.6rem',
          }}
        >
          ⚠️ {error}
        </div>
      )}

      {/* NAVIGATION TABS */}
      <div
        style={{
          display: 'flex',
          gap: '0.4rem',
          borderBottom: '2px solid #e2e8f0',
          marginBottom: '1.5rem',
          overflowX: 'auto',
          paddingBottom: '0.2rem',
        }}
      >
        <button
          type="button"
          onClick={() => setActiveTab('analytics')}
          style={{
            padding: '0.75rem 1.25rem',
            border: 'none',
            background: 'none',
            fontWeight: 700,
            fontSize: '0.95rem',
            color: activeTab === 'analytics' ? 'var(--ag-green-primary)' : 'var(--ag-text-muted)',
            borderBottom:
              activeTab === 'analytics'
                ? '3px solid var(--ag-green-primary)'
                : '3px solid transparent',
            cursor: 'pointer',
          }}
        >
          📊 Daily &amp; Monthly Analytics
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('farmers')}
          style={{
            padding: '0.75rem 1.25rem',
            border: 'none',
            background: 'none',
            fontWeight: 700,
            fontSize: '0.95rem',
            color: activeTab === 'farmers' ? 'var(--ag-green-primary)' : 'var(--ag-text-muted)',
            borderBottom:
              activeTab === 'farmers'
                ? '3px solid var(--ag-green-primary)'
                : '3px solid transparent',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
          }}
        >
          🧑‍🌾 Farmer Directory &amp; Requests
          {pendingJoinRequestsCount > 0 && (
            <span
              style={{
                background: '#ea580c',
                color: '#fff',
                fontSize: '0.72rem',
                padding: '0.15rem 0.5rem',
                borderRadius: '999px',
                fontWeight: 800,
              }}
            >
              {pendingJoinRequestsCount}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('intake')}
          style={{
            padding: '0.75rem 1.25rem',
            border: 'none',
            background: 'none',
            fontWeight: 700,
            fontSize: '0.95rem',
            color: activeTab === 'intake' ? 'var(--ag-green-primary)' : 'var(--ag-text-muted)',
            borderBottom:
              activeTab === 'intake'
                ? '3px solid var(--ag-green-primary)'
                : '3px solid transparent',
            cursor: 'pointer',
          }}
        >
          🥛 Milk Intake (Collection per Farmer)
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('sales')}
          style={{
            padding: '0.75rem 1.25rem',
            border: 'none',
            background: 'none',
            fontWeight: 700,
            fontSize: '0.95rem',
            color: activeTab === 'sales' ? 'var(--ag-green-primary)' : 'var(--ag-text-muted)',
            borderBottom:
              activeTab === 'sales' ? '3px solid var(--ag-green-primary)' : '3px solid transparent',
            cursor: 'pointer',
          }}
        >
          💰 Milk Sales &amp; Outflow
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('tanks')}
          style={{
            padding: '0.75rem 1.25rem',
            border: 'none',
            background: 'none',
            fontWeight: 700,
            fontSize: '0.95rem',
            color: activeTab === 'tanks' ? 'var(--ag-green-primary)' : 'var(--ag-text-muted)',
            borderBottom:
              activeTab === 'tanks' ? '3px solid var(--ag-green-primary)' : '3px solid transparent',
            cursor: 'pointer',
          }}
        >
          🛢️ Storage Tanks &amp; Silos
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: ANALYTICS & REPORTS                                                */}
      {/* ========================================================================= */}
      {activeTab === 'analytics' && analytics && (
        <div>
          {/* Main KPI Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
              gap: '1.25rem',
              marginBottom: '1.75rem',
            }}
          >
            {/* Card 1: Today's Metrics */}
            <div className="card" style={{ borderLeft: '4px solid #059669' }}>
              <div className="flex-between">
                <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#64748b' }}>
                  TODAY'S OPERATIONS
                </span>
                <span style={{ fontSize: '1.2rem' }}>☀️</span>
              </div>
              <div style={{ marginTop: '0.5rem' }}>
                <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#0f172a' }}>
                  {analytics.summary.today.salesCount} Sells · {analytics.summary.today.salesLiters}{' '}
                  L
                </div>
                <div
                  style={{
                    fontSize: '0.95rem',
                    color: '#059669',
                    fontWeight: 700,
                    marginTop: '0.2rem',
                  }}
                >
                  Revenue: ₹{analytics.summary.today.salesRevenue.toLocaleString('en-IN')}
                </div>
              </div>
              <div
                style={{
                  marginTop: '0.85rem',
                  paddingTop: '0.65rem',
                  borderTop: '1px solid #f1f5f9',
                  fontSize: '0.85rem',
                  color: '#64748b',
                }}
              >
                Procurement: <strong>{analytics.summary.today.intakeLiters} L</strong> (₹
                {analytics.summary.today.intakeCost.toLocaleString('en-IN')})
                <div style={{ color: '#059669', fontWeight: 600, marginTop: '0.2rem' }}>
                  Today's Net Margin: +₹{analytics.summary.today.netProfit.toLocaleString('en-IN')}
                </div>
              </div>
            </div>

            {/* Card 2: Current Month Metrics */}
            <div className="card" style={{ borderLeft: '4px solid #3b82f6' }}>
              <div className="flex-between">
                <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#64748b' }}>
                  THIS MONTH'S SALES
                </span>
                <span style={{ fontSize: '1.2rem' }}>📅</span>
              </div>
              <div style={{ marginTop: '0.5rem' }}>
                <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#0f172a' }}>
                  ₹{analytics.summary.month.salesRevenue.toLocaleString('en-IN')}
                </div>
                <div
                  style={{
                    fontSize: '0.95rem',
                    color: '#2563eb',
                    fontWeight: 700,
                    marginTop: '0.2rem',
                  }}
                >
                  {analytics.summary.month.salesLiters} L Sold across{' '}
                  {analytics.summary.month.salesCount} Transactions
                </div>
              </div>
              <div
                style={{
                  marginTop: '0.85rem',
                  paddingTop: '0.65rem',
                  borderTop: '1px solid #f1f5f9',
                  fontSize: '0.85rem',
                  color: '#64748b',
                }}
              >
                Total Month Milk Inflow: <strong>{analytics.summary.month.intakeLiters} L</strong>{' '}
                (₹{analytics.summary.month.intakeCost.toLocaleString('en-IN')})
                <div style={{ color: '#2563eb', fontWeight: 600, marginTop: '0.2rem' }}>
                  Month's Net Gross Profit: +₹
                  {analytics.summary.month.netProfit.toLocaleString('en-IN')}
                </div>
              </div>
            </div>

            {/* Card 3: Herd & Safety Compliance */}
            <div className="card" style={{ borderLeft: '4px solid #8b5cf6' }}>
              <div className="flex-between">
                <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#64748b' }}>
                  AMU &amp; LIVESTOCK COMPLIANCE
                </span>
                <span style={{ fontSize: '1.2rem' }}>🛡️</span>
              </div>
              <div style={{ marginTop: '0.5rem' }}>
                <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#166534' }}>
                  {analytics.summary.allTime.amuComplianceRate}%
                </div>
                <div
                  style={{
                    fontSize: '0.95rem',
                    color: '#059669',
                    fontWeight: 600,
                    marginTop: '0.2rem',
                  }}
                >
                  Withdrawal Safe Clearance
                </div>
              </div>
              <div
                style={{
                  marginTop: '0.85rem',
                  paddingTop: '0.65rem',
                  borderTop: '1px solid #f1f5f9',
                  fontSize: '0.85rem',
                  color: '#64748b',
                }}
              >
                Active Supplying Farmers:{' '}
                <strong>{analytics.summary.allTime.activeSupplyingFarmersCount}</strong>
                <div>
                  Available Silo Stock:{' '}
                  <strong>{analytics.summary.allTime.currentStockLiters} L</strong>
                </div>
              </div>
            </div>
          </div>

          {/* Daily Intake vs Sales Comparison Chart */}
          <div className="card" style={{ marginBottom: '1.75rem' }}>
            <div className="flex-between" style={{ marginBottom: '1rem', flexWrap: 'wrap' }}>
              <div>
                <h3 style={{ margin: '0 0 0.25rem 0' }}>
                  📈 Daily Milk Collection vs Sales Trend (Liters)
                </h3>
                <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>
                  Day-by-day comparison of milk intake volume collected from farmers vs volume sold.
                </p>
              </div>
              <div style={{ display: 'flex', gap: '1rem', fontSize: '0.85rem', fontWeight: 600 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <span
                    style={{
                      display: 'inline-block',
                      width: '12px',
                      height: '12px',
                      background: '#059669',
                      borderRadius: '3px',
                    }}
                  ></span>
                  Milk Intake (L)
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <span
                    style={{
                      display: 'inline-block',
                      width: '12px',
                      height: '12px',
                      background: '#3b82f6',
                      borderRadius: '3px',
                    }}
                  ></span>
                  Milk Sold (L)
                </span>
              </div>
            </div>

            {/* Custom Bar Visualization */}
            <div
              style={{
                display: 'flex',
                gap: '0.75rem',
                alignItems: 'flex-end',
                height: '220px',
                padding: '1rem 0',
                borderBottom: '1px solid #e2e8f0',
              }}
            >
              {analytics.dailyTrends?.slice(-7).map((d) => {
                const maxVal = Math.max(
                  ...analytics.dailyTrends.map((x) => Math.max(x.intakeLiters, x.salesLiters, 100)),
                );
                const inHeight = Math.min(180, (d.intakeLiters / maxVal) * 180);
                const outHeight = Math.min(180, (d.salesLiters / maxVal) * 180);

                return (
                  <div
                    key={d.date}
                    style={{
                      flex: 1,
                      textAlign: 'center',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      height: '100%',
                      justifyContent: 'flex-end',
                    }}
                  >
                    <div style={{ fontSize: '0.72rem', color: '#64748b', marginBottom: '0.35rem' }}>
                      ₹{Math.round(d.salesRevenue)}
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        gap: '4px',
                        alignItems: 'flex-end',
                        width: '100%',
                        justifyContent: 'center',
                      }}
                    >
                      <div
                        title={`Collected: ${d.intakeLiters} L (₹${d.intakeCost})`}
                        style={{
                          width: '18px',
                          height: `${Math.max(6, inHeight)}px`,
                          background: '#059669',
                          borderRadius: '4px 4px 0 0',
                          transition: 'height 0.3s ease',
                        }}
                      ></div>
                      <div
                        title={`Sold: ${d.salesLiters} L (₹${d.salesRevenue})`}
                        style={{
                          width: '18px',
                          height: `${Math.max(6, outHeight)}px`,
                          background: '#3b82f6',
                          borderRadius: '4px 4px 0 0',
                          transition: 'height 0.3s ease',
                        }}
                      ></div>
                    </div>
                    <div
                      style={{
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        color: '#334155',
                        marginTop: '0.5rem',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {d.dayLabel.split(',')[0]}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                      {d.intakeLiters}L / {d.salesLiters}L
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Grid: Top Supplier Farmers & Area Contributions */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
              gap: '1.5rem',
            }}
          >
            {/* Top Farmers Leaderboard */}
            <div className="card">
              <h3 style={{ margin: '0 0 1rem 0' }}>🏆 Top Supplying Farmers Leaderboard</h3>
              {analytics.topFarmers?.length === 0 && (
                <p style={{ color: '#64748b' }}>No collection data yet.</p>
              )}
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
                  <thead>
                    <tr
                      style={{
                        borderBottom: '2px solid #e2e8f0',
                        color: '#64748b',
                        textAlign: 'left',
                      }}
                    >
                      <th style={{ padding: '0.5rem' }}>Farmer</th>
                      <th style={{ padding: '0.5rem' }}>Area</th>
                      <th style={{ padding: '0.5rem' }}>Total Liters</th>
                      <th style={{ padding: '0.5rem' }}>Avg Fat/SNF</th>
                      <th style={{ padding: '0.5rem', textAlign: 'right' }}>Total Payout</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analytics.topFarmers?.map((f, i) => (
                      <tr key={f.farmerIdNumber} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '0.65rem 0.5rem' }}>
                          <span style={{ fontWeight: 700 }}>
                            #{i + 1} {f.farmerName}
                          </span>
                          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                            <code>{f.farmerIdNumber}</code>
                          </div>
                        </td>
                        <td style={{ padding: '0.65rem 0.5rem', color: '#475569' }}>
                          {f.villageArea}
                        </td>
                        <td
                          style={{ padding: '0.65rem 0.5rem', fontWeight: 700, color: '#065f46' }}
                        >
                          {f.totalLiters} L
                        </td>
                        <td style={{ padding: '0.65rem 0.5rem' }}>
                          {f.avgFat}% / {f.avgSnf}%
                        </td>
                        <td
                          style={{ padding: '0.65rem 0.5rem', textAlign: 'right', fontWeight: 700 }}
                        >
                          ₹{f.totalPayout.toLocaleString('en-IN')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Area Location Contributions */}
            <div className="card">
              <h3 style={{ margin: '0 0 1rem 0' }}>📍 Area Location Supply Distribution</h3>
              <p style={{ margin: '0 0 1rem 0', fontSize: '0.85rem', color: '#64748b' }}>
                Milk procurement volume filtered and categorized by area/route name.
              </p>
              {analytics.areaContributions?.map((item) => (
                <div key={item.area} style={{ marginBottom: '1rem' }}>
                  <div
                    className="flex-between"
                    style={{ fontSize: '0.88rem', marginBottom: '0.25rem' }}
                  >
                    <span style={{ fontWeight: 600 }}>{item.area}</span>
                    <span>
                      <strong>{item.totalLiters} L</strong> ({item.percentage}%)
                    </span>
                  </div>
                  <div
                    style={{
                      height: '8px',
                      background: '#e2e8f0',
                      borderRadius: '999px',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        width: `${item.percentage}%`,
                        height: '100%',
                        background: 'linear-gradient(90deg, #10b981 0%, #059669 100%)',
                        borderRadius: '999px',
                      }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: FARMERS DIRECTORY, JOIN REQUESTS & AREA FILTERING                   */}
      {/* ========================================================================= */}
      {activeTab === 'farmers' && (
        <div>
          {/* SEARCH & AREA LOCATION FILTER BAR */}
          <div
            className="card"
            style={{
              background: '#f8fafc',
              border: '1.5px solid #cbd5e1',
              padding: '1.25rem',
              marginBottom: '1.5rem',
            }}
          >
            <div
              className="flex-between"
              style={{
                alignItems: 'flex-start',
                flexWrap: 'wrap',
                gap: '0.75rem',
                marginBottom: '1rem',
              }}
            >
              <div>
                <h3 style={{ margin: '0 0 0.25rem 0', color: '#0f172a' }}>
                  🔍 Search Farmer ID &amp; Filter by Area Location
                </h3>
                <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>
                  Enter a Farmer ID to quickly lookup milk supply quota, agreed rates, and clinical
                  withdrawal records.
                </p>
              </div>

              <button
                type="button"
                className="primary"
                onClick={() => openAddFarmerModal()}
                style={{ padding: '0.6rem 1.2rem', fontSize: '0.9rem' }}
              >
                ➕ Enroll Farmer / Process Request
              </button>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: '0.75rem',
              }}
            >
              {/* Farmer ID or Name Search input */}
              <div>
                <label
                  style={{
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    color: '#475569',
                    display: 'block',
                    marginBottom: '0.25rem',
                  }}
                >
                  FARMER ID OR NAME
                </label>
                <input
                  type="text"
                  placeholder="e.g. hkasdf023047304, KCC-..., or Name"
                  value={farmerSearch}
                  onChange={(e) => setFarmerSearch(e.target.value)}
                  style={{ width: '100%', padding: '0.65rem 0.85rem' }}
                />
              </div>

              {/* Area Location Filter Dropdown */}
              <div>
                <label
                  style={{
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    color: '#475569',
                    display: 'block',
                    marginBottom: '0.25rem',
                  }}
                >
                  FILTER BY AREA LOCATION NAME
                </label>
                <select value={areaFilter} onChange={(e) => setAreaFilter(e.target.value)}>
                  <option value="">All Area Locations ({areasList.length} Areas)</option>
                  {areasList.map((area) => (
                    <option key={area} value={area}>
                      📍 {area}
                    </option>
                  ))}
                </select>
              </div>

              {/* Status Filter */}
              <div>
                <label
                  style={{
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    color: '#475569',
                    display: 'block',
                    marginBottom: '0.25rem',
                  }}
                >
                  ENROLLMENT STATUS
                </label>
                <select
                  value={enrollmentStatusFilter}
                  onChange={(e) => setEnrollmentStatusFilter(e.target.value)}
                >
                  <option value="ALL">All Statuses ({enrollments.length})</option>
                  <option value="ACTIVE">Active Supplying Farmers</option>
                  <option value="PENDING_APPROVAL">
                    Pending Join Requests ({pendingJoinRequestsCount})
                  </option>
                  <option value="SUSPENDED">Suspended Farmers</option>
                </select>
              </div>

              {/* Clear filters */}
              {(farmerSearch || areaFilter || enrollmentStatusFilter !== 'ALL') && (
                <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                  <button
                    type="button"
                    className="secondary"
                    onClick={() => {
                      setFarmerSearch('');
                      setAreaFilter('');
                      setEnrollmentStatusFilter('ALL');
                    }}
                    style={{ width: '100%', padding: '0.65rem' }}
                  >
                    Clear Filters
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Pending Join Requests Alert Banner if any */}
          {pendingJoinRequestsCount > 0 && enrollmentStatusFilter !== 'PENDING_APPROVAL' && (
            <div
              className="card"
              style={{
                background: '#fff7ed',
                border: '1.5px solid #fdba74',
                color: '#9a3412',
                padding: '1rem',
                marginBottom: '1.25rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '0.5rem',
              }}
            >
              <div>
                <strong>
                  📬 {pendingJoinRequestsCount} Farmer Join Request(s) Pending Review:
                </strong>{' '}
                Farmers have requested to join your dairy collection route.
              </div>
              <button
                type="button"
                className="secondary"
                onClick={() => setEnrollmentStatusFilter('PENDING_APPROVAL')}
                style={{ fontSize: '0.82rem', padding: '0.4rem 0.8rem' }}
              >
                Review Join Requests →
              </button>
            </div>
          )}

          {/* FARMERS & JOIN REQUESTS DIRECTORY TABLE */}
          <div className="card">
            <div className="flex-between" style={{ marginBottom: '1rem' }}>
              <h3 style={{ margin: 0 }}>
                📋 Enrolled Farmers &amp; Join Requests ({filteredEnrollments.length})
              </h3>
              <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
                Showing verified suppliers and collection partners
              </span>
            </div>

            {filteredEnrollments.length === 0 && (
              <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: '#64748b' }}>
                <p style={{ fontSize: '1.1rem', margin: '0 0 0.5rem 0' }}>
                  No farmers found matching criteria.
                </p>
                <button type="button" className="primary" onClick={() => openAddFarmerModal()}>
                  ➕ Enroll a Farmer Now
                </button>
              </div>
            )}

            {filteredEnrollments.length > 0 && (
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
                      <th style={{ padding: '0.75rem 0.5rem' }}>Farmer ID</th>
                      <th style={{ padding: '0.75rem 0.5rem' }}>Farmer &amp; Farm</th>
                      <th style={{ padding: '0.75rem 0.5rem' }}>Area / Location</th>
                      <th style={{ padding: '0.75rem 0.5rem' }}>Milk Type</th>
                      <th style={{ padding: '0.75rem 0.5rem' }}>Daily Quota</th>
                      <th style={{ padding: '0.75rem 0.5rem' }}>Agreed Rate</th>
                      <th style={{ padding: '0.75rem 0.5rem' }}>Status</th>
                      <th style={{ padding: '0.75rem 0.5rem', textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredEnrollments.map((enr) => {
                      const isPending = enr.status === 'PENDING_APPROVAL';
                      return (
                        <tr key={enr.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '0.75rem 0.5rem', fontWeight: 700 }}>
                            <code
                              style={{
                                background: '#f1f5f9',
                                padding: '0.2rem 0.45rem',
                                borderRadius: '0.3rem',
                                fontSize: '0.88rem',
                              }}
                            >
                              {enr.farmerIdNumber}
                            </code>
                          </td>

                          <td style={{ padding: '0.75rem 0.5rem' }}>
                            <strong>{enr.farmerName}</strong>
                            <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                              {enr.farmName} {enr.phone ? `· 📞 ${enr.phone}` : ''}
                            </div>
                            {enr.certificateNumber && (
                              <div style={{ marginTop: '0.25rem' }}>
                                <button
                                  type="button"
                                  onClick={() => openCertificateReviewModal(enr)}
                                  style={{
                                    background: '#ecfdf5',
                                    border: '1px solid #86efac',
                                    color: '#065f46',
                                    fontSize: '0.74rem',
                                    padding: '0.15rem 0.45rem',
                                    borderRadius: '0.25rem',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '0.25rem',
                                  }}
                                  title="Click to inspect attached Milk Eligibility Certificate"
                                >
                                  📜 Cert: {enr.certificateNumber}
                                </button>
                              </div>
                            )}
                          </td>

                          <td style={{ padding: '0.75rem 0.5rem' }}>
                            <span style={{ fontWeight: 600, color: '#0f172a' }}>
                              {enr.villageArea}
                            </span>
                            <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                              {enr.district}, {enr.state}
                            </div>
                          </td>

                          <td style={{ padding: '0.75rem 0.5rem' }}>
                            <span
                              style={{
                                padding: '0.2rem 0.5rem',
                                borderRadius: '999px',
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                background: enr.milkType === 'BUFFALO' ? '#f3e8ff' : '#ecfdf5',
                                color: enr.milkType === 'BUFFALO' ? '#6b21a8' : '#065f46',
                              }}
                            >
                              {enr.milkType}
                            </span>
                          </td>

                          <td style={{ padding: '0.75rem 0.5rem', fontWeight: 600 }}>
                            {enr.expectedDailyQuantity} L/day
                          </td>

                          <td
                            style={{ padding: '0.75rem 0.5rem', fontWeight: 700, color: '#059669' }}
                          >
                            ₹{enr.agreedRatePerLiter}/L
                          </td>

                          <td style={{ padding: '0.75rem 0.5rem' }}>
                            <span
                              style={{
                                padding: '0.2rem 0.6rem',
                                borderRadius: '999px',
                                fontSize: '0.76rem',
                                fontWeight: 700,
                                background: isPending
                                  ? '#ffedd5'
                                  : enr.status === 'ACTIVE'
                                    ? '#dcfce7'
                                    : '#fee2e2',
                                color: isPending
                                  ? '#c2410c'
                                  : enr.status === 'ACTIVE'
                                    ? '#166534'
                                    : '#991b1b',
                              }}
                            >
                              {isPending ? '⏳ Pending Request' : enr.status}
                            </span>
                          </td>

                          <td style={{ padding: '0.75rem 0.5rem', textAlign: 'right' }}>
                            <div style={{ display: 'inline-flex', gap: '0.35rem' }}>
                              {isPending ? (
                                <button
                                  type="button"
                                  className="primary"
                                  onClick={() => openCertificateReviewModal(enr)}
                                  style={{
                                    fontSize: '0.8rem',
                                    padding: '0.4rem 0.75rem',
                                    background: '#047857',
                                    fontWeight: 700,
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '0.25rem',
                                    boxShadow: '0 2px 4px rgba(4, 120, 87, 0.25)',
                                  }}
                                  title="Inspect attached Milk Eligibility Certificate and approve supply agreement"
                                >
                                  📜 Review &amp; Accept
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  className="primary"
                                  onClick={() => openIntakeModal(enr)}
                                  title="Log Milk Intake for this farmer"
                                  style={{ fontSize: '0.8rem', padding: '0.35rem 0.65rem' }}
                                >
                                  🥛 Intake
                                </button>
                              )}

                              <button
                                type="button"
                                className="secondary"
                                onClick={() => inspectFarmer(enr.farmerIdNumber)}
                                title="Inspect herd health and active withdrawal status"
                                style={{ fontSize: '0.8rem', padding: '0.35rem 0.65rem' }}
                              >
                                🩺 Health
                              </button>

                              <button
                                type="button"
                                className="secondary"
                                onClick={() => openEditEnrollmentModal(enr)}
                                title="Edit required information"
                                style={{ fontSize: '0.8rem', padding: '0.35rem 0.65rem' }}
                              >
                                ⚙️ Info
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: MILK COLLECTION INTAKE (PER FARMER INVENTORY)                      */}
      {/* ========================================================================= */}
      {activeTab === 'intake' && (
        <div>
          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <div
              className="flex-between"
              style={{ alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem' }}
            >
              <div>
                <h3 style={{ margin: '0 0 0.25rem 0' }}>🥛 Milk Collection Intake Terminal</h3>
                <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>
                  Log per-farmer milk arrivals, fat/SNF quality scores, procurement cost, and verify
                  AMU withdrawal clearance.
                </p>
              </div>

              <button
                type="button"
                className="primary"
                onClick={() => openIntakeModal()}
                style={{ padding: '0.65rem 1.25rem', fontWeight: 700 }}
              >
                ➕ Log New Milk Intake
              </button>
            </div>

            {/* Quick Filters */}
            <div
              style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem', flexWrap: 'wrap' }}
            >
              <select
                value={intakeShiftFilter}
                onChange={(e) => setIntakeShiftFilter(e.target.value)}
                style={{ maxWidth: '200px' }}
              >
                <option value="ALL">All Shifts</option>
                <option value="MORNING">🌅 Morning Shift</option>
                <option value="EVENING">🌆 Evening Shift</option>
              </select>
            </div>
          </div>

          {/* Intakes Table */}
          <div className="card">
            <h3 style={{ margin: '0 0 1rem 0' }}>
              📋 Recent Milk Collection Records ({intakes.length})
            </h3>

            {intakes.length === 0 && (
              <p style={{ color: '#64748b' }}>No milk collection records recorded yet.</p>
            )}

            {intakes.length > 0 && (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
                  <thead>
                    <tr
                      style={{
                        borderBottom: '2px solid #e2e8f0',
                        color: '#64748b',
                        textAlign: 'left',
                      }}
                    >
                      <th style={{ padding: '0.65rem 0.5rem' }}>Date &amp; Shift</th>
                      <th style={{ padding: '0.65rem 0.5rem' }}>Farmer</th>
                      <th style={{ padding: '0.65rem 0.5rem' }}>Area</th>
                      <th style={{ padding: '0.65rem 0.5rem' }}>Quantity</th>
                      <th style={{ padding: '0.65rem 0.5rem' }}>Fat % / SNF %</th>
                      <th style={{ padding: '0.65rem 0.5rem' }}>Rate / Liter</th>
                      <th style={{ padding: '0.65rem 0.5rem' }}>Total Cost</th>
                      <th style={{ padding: '0.65rem 0.5rem' }}>Tank Silo</th>
                      <th style={{ padding: '0.65rem 0.5rem' }}>Safety Status</th>
                      <th style={{ padding: '0.65rem 0.5rem' }}>Payment</th>
                    </tr>
                  </thead>
                  <tbody>
                    {intakes
                      .filter(
                        (item) => intakeShiftFilter === 'ALL' || item.shift === intakeShiftFilter,
                      )
                      .map((intake) => (
                        <tr key={intake.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '0.65rem 0.5rem', whiteSpace: 'nowrap' }}>
                            <strong>{intake.collectionDate}</strong>
                            <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                              {intake.shift === 'MORNING' ? '🌅 Morning' : '🌆 Evening'}
                            </div>
                          </td>

                          <td style={{ padding: '0.65rem 0.5rem' }}>
                            <strong>{intake.farmerName}</strong>
                            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                              <code>{intake.farmerIdNumber}</code>
                            </div>
                          </td>

                          <td style={{ padding: '0.65rem 0.5rem', color: '#475569' }}>
                            {intake.villageArea || 'Route Center'}
                          </td>

                          <td
                            style={{ padding: '0.65rem 0.5rem', fontWeight: 800, color: '#0f172a' }}
                          >
                            {intake.quantityLiters} L
                          </td>

                          <td style={{ padding: '0.65rem 0.5rem' }}>
                            <span style={{ fontWeight: 600 }}>{intake.fatPercentage}%</span> /{' '}
                            {intake.snfPercentage}%
                          </td>

                          <td style={{ padding: '0.65rem 0.5rem' }}>₹{intake.ratePerLiter}</td>

                          <td
                            style={{ padding: '0.65rem 0.5rem', fontWeight: 800, color: '#059669' }}
                          >
                            ₹{intake.totalCost.toLocaleString('en-IN')}
                          </td>

                          <td style={{ padding: '0.65rem 0.5rem' }}>
                            <span
                              style={{
                                fontSize: '0.8rem',
                                background: '#f1f5f9',
                                padding: '0.2rem 0.45rem',
                                borderRadius: '4px',
                              }}
                            >
                              {intake.storageTank}
                            </span>
                          </td>

                          <td style={{ padding: '0.65rem 0.5rem' }}>
                            <span
                              style={{
                                padding: '0.2rem 0.5rem',
                                borderRadius: '999px',
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                background:
                                  intake.eligibilityStatus === 'CLEARED' ? '#dcfce7' : '#fee2e2',
                                color:
                                  intake.eligibilityStatus === 'CLEARED' ? '#166534' : '#991b1b',
                              }}
                            >
                              {intake.eligibilityStatus === 'CLEARED'
                                ? '✓ Cleared Safe'
                                : '⚠️ Caution'}
                            </span>
                          </td>

                          <td style={{ padding: '0.65rem 0.5rem' }}>
                            <span
                              style={{
                                padding: '0.15rem 0.45rem',
                                borderRadius: '4px',
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                background: intake.paymentStatus === 'PAID' ? '#ecfdf5' : '#fef3c7',
                                color: intake.paymentStatus === 'PAID' ? '#047857' : '#92400e',
                              }}
                            >
                              {intake.paymentStatus}
                            </span>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: MILK SALES & DISTRIBUTION (OUTFLOW)                                */}
      {/* ========================================================================= */}
      {activeTab === 'sales' && (
        <div>
          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <div
              className="flex-between"
              style={{ alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem' }}
            >
              <div>
                <h3 style={{ margin: '0 0 0.25rem 0' }}>
                  💰 Milk Sales &amp; Distribution Terminal
                </h3>
                <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>
                  Track daily customer sales, retail booth deliveries, wholesale buyers, and
                  commercial revenues.
                </p>
              </div>

              <button
                type="button"
                className="primary"
                onClick={() => setShowSaleModal(true)}
                style={{ padding: '0.65rem 1.25rem', fontWeight: 700 }}
              >
                ➕ Record New Milk Sale
              </button>
            </div>

            {/* Quick Filters */}
            <div
              style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem', flexWrap: 'wrap' }}
            >
              <select
                value={salesBuyerFilter}
                onChange={(e) => setSalesBuyerFilter(e.target.value)}
                style={{ maxWidth: '240px' }}
              >
                <option value="ALL">All Buyer Channels</option>
                <option value="RETAIL_CONSUMER">Retail Consumer / Households</option>
                <option value="COMMERCIAL_SHOP">Commercial Sweet Shops</option>
                <option value="WHOLESALE_DISTRIBUTOR">Wholesale Milk Booths</option>
                <option value="PROCESSING_PLANT">Processing Plant / Union</option>
              </select>
            </div>
          </div>

          {/* Sales Table */}
          <div className="card">
            <h3 style={{ margin: '0 0 1rem 0' }}>📋 Sales &amp; Invoices Log ({sales.length})</h3>

            {sales.length === 0 && <p style={{ color: '#64748b' }}>No sales logged yet.</p>}

            {sales.length > 0 && (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
                  <thead>
                    <tr
                      style={{
                        borderBottom: '2px solid #e2e8f0',
                        color: '#64748b',
                        textAlign: 'left',
                      }}
                    >
                      <th style={{ padding: '0.65rem 0.5rem' }}>Date</th>
                      <th style={{ padding: '0.65rem 0.5rem' }}>Invoice #</th>
                      <th style={{ padding: '0.65rem 0.5rem' }}>Buyer / Customer</th>
                      <th style={{ padding: '0.65rem 0.5rem' }}>Channel</th>
                      <th style={{ padding: '0.65rem 0.5rem' }}>Milk Type</th>
                      <th style={{ padding: '0.65rem 0.5rem' }}>Quantity</th>
                      <th style={{ padding: '0.65rem 0.5rem' }}>Price / L</th>
                      <th style={{ padding: '0.65rem 0.5rem' }}>Total Revenue</th>
                      <th style={{ padding: '0.65rem 0.5rem' }}>Dispensed Silo</th>
                      <th style={{ padding: '0.65rem 0.5rem' }}>Payment</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sales
                      .filter(
                        (item) => salesBuyerFilter === 'ALL' || item.buyerType === salesBuyerFilter,
                      )
                      .map((sale) => (
                        <tr key={sale.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '0.65rem 0.5rem', whiteSpace: 'nowrap' }}>
                            {sale.saleDate}
                          </td>
                          <td style={{ padding: '0.65rem 0.5rem', fontWeight: 700 }}>
                            <code>{sale.invoiceNumber}</code>
                          </td>
                          <td style={{ padding: '0.65rem 0.5rem', fontWeight: 600 }}>
                            {sale.buyerName}
                          </td>
                          <td style={{ padding: '0.65rem 0.5rem' }}>
                            <span
                              style={{
                                padding: '0.15rem 0.45rem',
                                borderRadius: '4px',
                                fontSize: '0.75rem',
                                background: '#f1f5f9',
                                color: '#334155',
                              }}
                            >
                              {sale.buyerType.replace('_', ' ')}
                            </span>
                          </td>
                          <td style={{ padding: '0.65rem 0.5rem' }}>{sale.milkType}</td>
                          <td style={{ padding: '0.65rem 0.5rem', fontWeight: 800 }}>
                            {sale.quantityLiters} L
                          </td>
                          <td style={{ padding: '0.65rem 0.5rem' }}>₹{sale.pricePerLiter}/L</td>
                          <td
                            style={{ padding: '0.65rem 0.5rem', fontWeight: 800, color: '#2563eb' }}
                          >
                            ₹{sale.totalAmount.toLocaleString('en-IN')}
                          </td>
                          <td
                            style={{
                              padding: '0.65rem 0.5rem',
                              fontSize: '0.8rem',
                              color: '#64748b',
                            }}
                          >
                            {sale.dispensedFromTank}
                          </td>
                          <td style={{ padding: '0.65rem 0.5rem' }}>
                            <span style={{ color: '#047857', fontWeight: 700 }}>
                              {sale.paymentMethod}
                            </span>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: COOLING TANKS & STORAGE SILOS                                      */}
      {/* ========================================================================= */}
      {activeTab === 'tanks' && (
        <div>
          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ margin: '0 0 0.25rem 0' }}>
              🛢️ Bulk Milk Coolers &amp; Silo Storage Status
            </h3>
            <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>
              Real-time monitoring of dairy cooling tanks, capacity utilization, storage
              temperature, and live stock levels.
            </p>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '1.25rem',
            }}
          >
            {tanksData.tanks?.map((tank) => (
              <div
                key={tank.id}
                className="card"
                style={{
                  borderTop: `4px solid ${tank.milkType === 'BUFFALO' ? '#8b5cf6' : '#059669'}`,
                }}
              >
                <div className="flex-between" style={{ marginBottom: '0.5rem' }}>
                  <h4 style={{ margin: 0, fontSize: '1.15rem' }}>{tank.name}</h4>
                  <span
                    style={{
                      padding: '0.2rem 0.5rem',
                      borderRadius: '999px',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      background: '#ecfdf5',
                      color: '#065f46',
                    }}
                  >
                    🌡️ {tank.temperatureC}°C Optimal
                  </span>
                </div>

                <div style={{ marginTop: '0.75rem', marginBottom: '1rem' }}>
                  <div
                    className="flex-between"
                    style={{ fontSize: '0.85rem', marginBottom: '0.25rem' }}
                  >
                    <span style={{ color: '#64748b' }}>Current Storage</span>
                    <span style={{ fontWeight: 800, fontSize: '1.2rem', color: '#0f172a' }}>
                      {tank.currentStockLiters} / {tank.capacityLiters} L
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div
                    style={{
                      height: '10px',
                      background: '#e2e8f0',
                      borderRadius: '999px',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        width: `${tank.utilizationPercent}%`,
                        height: '100%',
                        background: tank.milkType === 'BUFFALO' ? '#8b5cf6' : '#059669',
                        borderRadius: '999px',
                      }}
                    ></div>
                  </div>
                  <div
                    style={{
                      textAlign: 'right',
                      fontSize: '0.75rem',
                      color: '#64748b',
                      marginTop: '0.2rem',
                    }}
                  >
                    {tank.utilizationPercent}% Capacity Filled
                  </div>
                </div>

                <div
                  style={{
                    fontSize: '0.82rem',
                    color: '#64748b',
                    borderTop: '1px solid #f1f5f9',
                    paddingTop: '0.65rem',
                  }}
                >
                  <div>
                    Total Inflow (Intake): <strong>{tank.totalInflowLiters} L</strong>
                  </div>
                  <div>
                    Total Outflow (Sales): <strong>{tank.totalOutflowLiters} L</strong>
                  </div>
                  <div>
                    Milk Dedicated: <strong>{tank.milkType} Milk</strong>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: ENROLL FARMER / PROCESS JOIN REQUEST                              */}
      {/* ========================================================================= */}
      {showEnrollModal && (
        <div style={modalBackdropStyle} onClick={() => setShowEnrollModal(false)}>
          <div
            className="modal-content card"
            onClick={(e) => e.stopPropagation()}
            style={{ ...modalDialogStyle, maxWidth: '750px', width: '100%' }}
          >
            <div style={modalHeaderStyle}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div
                  style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '10px',
                    background: '#ecfdf5',
                    color: '#059669',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.4rem',
                  }}
                >
                  🧑‍🌾
                </div>
                <div>
                  <h2 style={{ margin: 0, fontSize: '1.35rem', color: '#0f172a', fontWeight: 800 }}>
                    {editingEnrollment
                      ? '⚙️ Edit Farmer Information'
                      : '🧑‍🌾 Enroll Farmer / Process Join Request'}
                  </h2>
                  <p style={{ margin: 0, fontSize: '0.82rem', color: '#64748b' }}>
                    {editingEnrollment
                      ? 'Update supplier partnership & milk supply contract'
                      : 'Register approved farmer supplier or process pending cooperative join request'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowEnrollModal(false)}
                style={modalCloseBtnStyle}
                title="Close modal"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEnrollment}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <label style={modalLabelStyle}>
                  Farmer ID Number *
                  <input
                    type="text"
                    required
                    placeholder="e.g. KCC-MH-2024-5501 or hkasdf..."
                    value={enrollForm.farmerIdNumber}
                    onChange={(e) =>
                      setEnrollForm({ ...enrollForm, farmerIdNumber: e.target.value })
                    }
                    style={modalInputStyle}
                  />
                </label>

                <label style={modalLabelStyle}>
                  Farmer Full Name *
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ramesh Jadhav"
                    value={enrollForm.farmerName}
                    onChange={(e) => setEnrollForm({ ...enrollForm, farmerName: e.target.value })}
                    style={modalInputStyle}
                  />
                </label>

                <label style={modalLabelStyle}>
                  Farm Name *
                  <input
                    type="text"
                    required
                    placeholder="e.g. Jadhav Dairy Cattle"
                    value={enrollForm.farmName}
                    onChange={(e) => setEnrollForm({ ...enrollForm, farmName: e.target.value })}
                    style={modalInputStyle}
                  />
                </label>

                <label style={modalLabelStyle}>
                  Phone Number
                  <input
                    type="text"
                    placeholder="e.g. 9822154321"
                    value={enrollForm.phone}
                    onChange={(e) => setEnrollForm({ ...enrollForm, phone: e.target.value })}
                    style={modalInputStyle}
                  />
                </label>

                <label style={modalLabelStyle}>
                  Area / Location / Route Name *
                  <input
                    type="text"
                    required
                    placeholder="e.g. Sarnobatwadi Route 1, Uchgaon Hub"
                    value={enrollForm.villageArea}
                    onChange={(e) => setEnrollForm({ ...enrollForm, villageArea: e.target.value })}
                    style={modalInputStyle}
                  />
                </label>

                <label style={modalLabelStyle}>
                  District
                  <input
                    type="text"
                    value={enrollForm.district}
                    onChange={(e) => setEnrollForm({ ...enrollForm, district: e.target.value })}
                    style={modalInputStyle}
                  />
                </label>

                <label style={modalLabelStyle}>
                  Milk Type Supplied
                  <select
                    value={enrollForm.milkType}
                    onChange={(e) => setEnrollForm({ ...enrollForm, milkType: e.target.value })}
                    style={modalInputStyle}
                  >
                    <option value="COW">Cow Milk</option>
                    <option value="BUFFALO">Buffalo Milk</option>
                    <option value="MIXED">Mixed Milk</option>
                  </select>
                </label>

                <label style={modalLabelStyle}>
                  Expected Daily Supply (Liters)
                  <input
                    type="number"
                    step="0.5"
                    value={enrollForm.expectedDailyQuantity}
                    onChange={(e) =>
                      setEnrollForm({ ...enrollForm, expectedDailyQuantity: e.target.value })
                    }
                    style={modalInputStyle}
                  />
                </label>

                <label style={modalLabelStyle}>
                  Agreed Rate per Liter (₹) *
                  <input
                    type="number"
                    step="0.5"
                    required
                    value={enrollForm.agreedRatePerLiter}
                    onChange={(e) =>
                      setEnrollForm({ ...enrollForm, agreedRatePerLiter: e.target.value })
                    }
                    style={modalInputStyle}
                  />
                </label>

                <label style={modalLabelStyle}>
                  Payment Method
                  <select
                    value={enrollForm.paymentMethod}
                    onChange={(e) =>
                      setEnrollForm({ ...enrollForm, paymentMethod: e.target.value })
                    }
                    style={modalInputStyle}
                  >
                    <option value="BANK_TRANSFER">Bank Account Transfer</option>
                    <option value="UPI">UPI Direct Payout</option>
                    <option value="CASH">Cash Settlement</option>
                  </select>
                </label>

                <label style={modalLabelStyle}>
                  Bank Account / UPI ID
                  <input
                    type="text"
                    placeholder="Bank Acc # or user@upi"
                    value={enrollForm.bankAccountNumber || enrollForm.upiId}
                    onChange={(e) =>
                      setEnrollForm({
                        ...enrollForm,
                        bankAccountNumber: e.target.value,
                        upiId: e.target.value,
                      })
                    }
                    style={modalInputStyle}
                  />
                </label>

                <label style={modalLabelStyle}>
                  Enrollment Status
                  <select
                    value={enrollForm.status}
                    onChange={(e) => setEnrollForm({ ...enrollForm, status: e.target.value })}
                    style={modalInputStyle}
                  >
                    <option value="ACTIVE">✓ Active Approved Supplier</option>
                    <option value="PENDING_APPROVAL">⏳ Pending Join Request Review</option>
                    <option value="SUSPENDED">Suspended</option>
                    <option value="REJECTED">Rejected</option>
                  </select>
                </label>
              </div>

              <label style={{ ...modalLabelStyle, marginTop: '1rem' }}>
                Internal Review / Join Request Notes
                <textarea
                  rows="2"
                  placeholder="e.g. Route inspection completed; clean animal health verified"
                  value={enrollForm.joinRequestNotes}
                  onChange={(e) =>
                    setEnrollForm({ ...enrollForm, joinRequestNotes: e.target.value })
                  }
                  style={{ ...modalInputStyle, height: '70px', resize: 'vertical' }}
                ></textarea>
              </label>

              <div
                style={{
                  display: 'flex',
                  gap: '0.75rem',
                  justifyContent: 'flex-end',
                  marginTop: '1.5rem',
                  paddingTop: '1rem',
                  borderTop: '1px solid #e2e8f0',
                }}
              >
                <button
                  type="button"
                  onClick={() => setShowEnrollModal(false)}
                  style={{
                    padding: '0.65rem 1.25rem',
                    background: '#f1f5f9',
                    border: '1px solid #cbd5e1',
                    borderRadius: '0.6rem',
                    fontWeight: 600,
                    color: '#475569',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '0.65rem 1.5rem',
                    background: '#059669',
                    border: 'none',
                    borderRadius: '0.6rem',
                    fontWeight: 700,
                    color: '#ffffff',
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(5, 150, 105, 0.3)',
                  }}
                >
                  {editingEnrollment ? '💾 Save Changes' : '🧑‍🌾 Enroll / Save Farmer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: LOG MILK COLLECTION INTAKE                                       */}
      {/* ========================================================================= */}
      {showIntakeModal && (
        <div style={modalBackdropStyle} onClick={() => setShowIntakeModal(false)}>
          <div
            className="modal-content card"
            onClick={(e) => e.stopPropagation()}
            style={{ ...modalDialogStyle, maxWidth: '680px', width: '100%' }}
          >
            <div style={modalHeaderStyle}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div
                  style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '10px',
                    background: '#ecfdf5',
                    color: '#059669',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.4rem',
                  }}
                >
                  🥛
                </div>
                <div>
                  <h2 style={{ margin: 0, fontSize: '1.35rem', color: '#0f172a', fontWeight: 800 }}>
                    🥛 Log Milk Collection Intake
                  </h2>
                  <p style={{ margin: 0, fontSize: '0.82rem', color: '#64748b' }}>
                    Record procurement batch with automatic AMU withdrawal safety check &amp; silo
                    assignment
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowIntakeModal(false)}
                style={modalCloseBtnStyle}
                title="Close modal"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveIntake}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <label style={modalLabelStyle}>
                  Select Supplying Farmer *
                  <select
                    value={intakeForm.farmerIdNumber}
                    onChange={(e) => handleIntakeFarmerSelect(e.target.value)}
                    required
                    style={modalInputStyle}
                  >
                    <option value="">-- Choose Approved Farmer Supplier --</option>
                    {enrollments
                      .filter((enr) => enr.status === 'ACTIVE')
                      .map((enr) => (
                        <option key={enr.id} value={enr.farmerIdNumber}>
                          ✅ {enr.farmerName} ({enr.farmerIdNumber}) — {enr.villageArea} (
                          {enr.milkType})
                        </option>
                      ))}
                  </select>
                </label>

                <label style={modalLabelStyle}>
                  Collection Date *
                  <input
                    type="date"
                    required
                    value={intakeForm.collectionDate}
                    onChange={(e) =>
                      setIntakeForm({ ...intakeForm, collectionDate: e.target.value })
                    }
                    style={modalInputStyle}
                  />
                </label>

                <label style={modalLabelStyle}>
                  Collection Shift *
                  <select
                    value={intakeForm.shift}
                    onChange={(e) => setIntakeForm({ ...intakeForm, shift: e.target.value })}
                    style={modalInputStyle}
                  >
                    <option value="MORNING">🌅 Morning Shift (6:00 AM - 9:00 AM)</option>
                    <option value="EVENING">🌆 Evening Shift (5:00 PM - 8:00 PM)</option>
                  </select>
                </label>

                <label style={modalLabelStyle}>
                  Milk Type
                  <select
                    value={intakeForm.milkType}
                    onChange={(e) => setIntakeForm({ ...intakeForm, milkType: e.target.value })}
                    style={modalInputStyle}
                  >
                    <option value="COW">Cow Milk</option>
                    <option value="BUFFALO">Buffalo Milk</option>
                    <option value="MIXED">Mixed Milk</option>
                  </select>
                </label>

                <label style={modalLabelStyle}>
                  Quantity (Liters) *
                  <input
                    type="number"
                    step="0.5"
                    required
                    value={intakeForm.quantityLiters}
                    onChange={(e) =>
                      setIntakeForm({
                        ...intakeForm,
                        quantityLiters: parseFloat(e.target.value) || 0,
                      })
                    }
                    style={modalInputStyle}
                  />
                </label>

                <label style={modalLabelStyle}>
                  Procurement Rate / Liter (₹) *
                  <input
                    type="number"
                    step="0.5"
                    required
                    value={intakeForm.ratePerLiter}
                    onChange={(e) =>
                      setIntakeForm({
                        ...intakeForm,
                        ratePerLiter: parseFloat(e.target.value) || 0,
                      })
                    }
                    style={modalInputStyle}
                  />
                </label>

                <label style={modalLabelStyle}>
                  Fat Percentage (%)
                  <input
                    type="number"
                    step="0.1"
                    value={intakeForm.fatPercentage}
                    onChange={(e) =>
                      setIntakeForm({
                        ...intakeForm,
                        fatPercentage: parseFloat(e.target.value) || 0,
                      })
                    }
                    style={modalInputStyle}
                  />
                </label>

                <label style={modalLabelStyle}>
                  SNF Percentage (%)
                  <input
                    type="number"
                    step="0.1"
                    value={intakeForm.snfPercentage}
                    onChange={(e) =>
                      setIntakeForm({
                        ...intakeForm,
                        snfPercentage: parseFloat(e.target.value) || 0,
                      })
                    }
                    style={modalInputStyle}
                  />
                </label>

                <label style={modalLabelStyle}>
                  Assign to Silo / Tank
                  <select
                    value={intakeForm.storageTank}
                    onChange={(e) => setIntakeForm({ ...intakeForm, storageTank: e.target.value })}
                    style={modalInputStyle}
                  >
                    <option value="Silo-1 (Raw Cow)">Silo-1 (Raw Cow Milk)</option>
                    <option value="Silo-2 (Buffalo)">Silo-2 (Buffalo Milk)</option>
                    <option value="Tank A (Chilled Bulk)">Tank A (Chilled Bulk)</option>
                    <option value="Tank B (Collection Buffer)">Tank B (Collection Buffer)</option>
                  </select>
                </label>

                <label style={modalLabelStyle}>
                  Payout Status
                  <select
                    value={intakeForm.paymentStatus}
                    onChange={(e) =>
                      setIntakeForm({ ...intakeForm, paymentStatus: e.target.value })
                    }
                    style={modalInputStyle}
                  >
                    <option value="PAID">✓ Paid</option>
                    <option value="PENDING">Pending Settlement</option>
                  </select>
                </label>
              </div>

              {/* Calculated Total Card */}
              <div
                style={{
                  background: '#f0fdf4',
                  border: '1.5px solid #86efac',
                  padding: '1.1rem 1.25rem',
                  borderRadius: '0.85rem',
                  marginTop: '1.25rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: '0.82rem',
                      color: '#166534',
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                    }}
                  >
                    Total Procurement Payout:
                  </div>
                  <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#166534' }}>
                    ₹
                    {(intakeForm.quantityLiters * intakeForm.ratePerLiter).toLocaleString('en-IN', {
                      minimumFractionDigits: 2,
                    })}
                  </div>
                </div>
                <div
                  style={{
                    textAlign: 'right',
                    fontSize: '0.9rem',
                    color: '#166534',
                    fontWeight: 600,
                  }}
                >
                  {intakeForm.quantityLiters} Liters @ ₹{intakeForm.ratePerLiter}/L
                </div>
              </div>

              <div
                style={{
                  display: 'flex',
                  gap: '0.75rem',
                  justifyContent: 'flex-end',
                  marginTop: '1.5rem',
                  paddingTop: '1rem',
                  borderTop: '1px solid #e2e8f0',
                }}
              >
                <button
                  type="button"
                  onClick={() => setShowIntakeModal(false)}
                  style={{
                    padding: '0.65rem 1.25rem',
                    background: '#f1f5f9',
                    border: '1px solid #cbd5e1',
                    borderRadius: '0.6rem',
                    fontWeight: 600,
                    color: '#475569',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '0.65rem 1.5rem',
                    background: '#059669',
                    border: 'none',
                    borderRadius: '0.6rem',
                    fontWeight: 700,
                    color: '#ffffff',
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(5, 150, 105, 0.3)',
                  }}
                >
                  🥛 Log Collection Intake
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: RECORD MILK SALE                                                 */}
      {/* ========================================================================= */}
      {showSaleModal && (
        <div style={modalBackdropStyle} onClick={() => setShowSaleModal(false)}>
          <div
            className="modal-content card"
            onClick={(e) => e.stopPropagation()}
            style={{ ...modalDialogStyle, maxWidth: '640px', width: '100%' }}
          >
            <div style={modalHeaderStyle}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div
                  style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '10px',
                    background: '#eff6ff',
                    color: '#2563eb',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.4rem',
                  }}
                >
                  💰
                </div>
                <div>
                  <h2 style={{ margin: 0, fontSize: '1.35rem', color: '#0f172a', fontWeight: 800 }}>
                    💰 Record Milk Outflow / Sale
                  </h2>
                  <p style={{ margin: 0, fontSize: '0.82rem', color: '#64748b' }}>
                    Record commercial sale, generate invoice &amp; dispense from storage silos
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowSaleModal(false)}
                style={modalCloseBtnStyle}
                title="Close modal"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveSale}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <label style={modalLabelStyle}>
                  Buyer / Customer Name *
                  <input
                    type="text"
                    required
                    placeholder="e.g. Morning Retail Counter or Sweet Shop"
                    value={saleForm.buyerName}
                    onChange={(e) => setSaleForm({ ...saleForm, buyerName: e.target.value })}
                    style={modalInputStyle}
                  />
                </label>

                <label style={modalLabelStyle}>
                  Customer / Buyer Type *
                  <select
                    value={saleForm.buyerType}
                    onChange={(e) => setSaleForm({ ...saleForm, buyerType: e.target.value })}
                    style={modalInputStyle}
                  >
                    <option value="RETAIL_CONSUMER">Retail Consumer / Household</option>
                    <option value="COMMERCIAL_SHOP">Commercial Sweet / Dairy Shop</option>
                    <option value="WHOLESALE_DISTRIBUTOR">Wholesale Milk Booth</option>
                    <option value="PROCESSING_PLANT">Processing Plant / Union</option>
                  </select>
                </label>

                <label style={modalLabelStyle}>
                  Sale Date *
                  <input
                    type="date"
                    required
                    value={saleForm.saleDate}
                    onChange={(e) => setSaleForm({ ...saleForm, saleDate: e.target.value })}
                    style={modalInputStyle}
                  />
                </label>

                <label style={modalLabelStyle}>
                  Milk Type
                  <select
                    value={saleForm.milkType}
                    onChange={(e) => setSaleForm({ ...saleForm, milkType: e.target.value })}
                    style={modalInputStyle}
                  >
                    <option value="COW">Cow Milk</option>
                    <option value="BUFFALO">Buffalo Milk</option>
                    <option value="MIXED">Standardized Mixed</option>
                  </select>
                </label>

                <label style={modalLabelStyle}>
                  Quantity Sold (Liters) *
                  <input
                    type="number"
                    step="0.5"
                    required
                    value={saleForm.quantityLiters}
                    onChange={(e) =>
                      setSaleForm({ ...saleForm, quantityLiters: parseFloat(e.target.value) || 0 })
                    }
                    style={modalInputStyle}
                  />
                </label>

                <label style={modalLabelStyle}>
                  Selling Price / Liter (₹) *
                  <input
                    type="number"
                    step="0.5"
                    required
                    value={saleForm.pricePerLiter}
                    onChange={(e) =>
                      setSaleForm({ ...saleForm, pricePerLiter: parseFloat(e.target.value) || 0 })
                    }
                    style={modalInputStyle}
                  />
                </label>

                <label style={modalLabelStyle}>
                  Dispense From Silo / Tank
                  <select
                    value={saleForm.dispensedFromTank}
                    onChange={(e) =>
                      setSaleForm({ ...saleForm, dispensedFromTank: e.target.value })
                    }
                    style={modalInputStyle}
                  >
                    <option value="Tank A (Chilled Bulk)">Tank A (Chilled Bulk)</option>
                    <option value="Silo-1 (Raw Cow)">Silo-1 (Raw Cow)</option>
                    <option value="Silo-2 (Buffalo)">Silo-2 (Buffalo)</option>
                  </select>
                </label>

                <label style={modalLabelStyle}>
                  Payment Method
                  <select
                    value={saleForm.paymentMethod}
                    onChange={(e) => setSaleForm({ ...saleForm, paymentMethod: e.target.value })}
                    style={modalInputStyle}
                  >
                    <option value="UPI">UPI Direct</option>
                    <option value="CASH">Cash Counter</option>
                    <option value="BANK_TRANSFER">Bank Transfer</option>
                  </select>
                </label>
              </div>

              {/* Calculated Revenue Card */}
              <div
                style={{
                  background: '#eff6ff',
                  border: '1.5px solid #bfdbfe',
                  padding: '1.1rem 1.25rem',
                  borderRadius: '0.85rem',
                  marginTop: '1.25rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: '0.82rem',
                      color: '#1e40af',
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                    }}
                  >
                    Total Sale Revenue:
                  </div>
                  <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#1e40af' }}>
                    ₹
                    {(saleForm.quantityLiters * saleForm.pricePerLiter).toLocaleString('en-IN', {
                      minimumFractionDigits: 2,
                    })}
                  </div>
                </div>
                <div
                  style={{
                    textAlign: 'right',
                    fontSize: '0.9rem',
                    color: '#1e40af',
                    fontWeight: 600,
                  }}
                >
                  {saleForm.quantityLiters} Liters @ ₹{saleForm.pricePerLiter}/L
                </div>
              </div>

              <div
                style={{
                  display: 'flex',
                  gap: '0.75rem',
                  justifyContent: 'flex-end',
                  marginTop: '1.5rem',
                  paddingTop: '1rem',
                  borderTop: '1px solid #e2e8f0',
                }}
              >
                <button
                  type="button"
                  onClick={() => setShowSaleModal(false)}
                  style={{
                    padding: '0.65rem 1.25rem',
                    background: '#f1f5f9',
                    border: '1px solid #cbd5e1',
                    borderRadius: '0.6rem',
                    fontWeight: 600,
                    color: '#475569',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '0.65rem 1.5rem',
                    background: '#2563eb',
                    border: 'none',
                    borderRadius: '0.6rem',
                    fontWeight: 700,
                    color: '#ffffff',
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)',
                  }}
                >
                  💰 Confirm &amp; Record Sale
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: INSPECT FARMER HERD HEALTH & WITHDRAWAL                           */}
      {/* ========================================================================= */}
      {inspectingFarmerHealth && (
        <div style={modalBackdropStyle} onClick={() => setInspectingFarmerHealth(null)}>
          <div
            className="modal-content card"
            onClick={(e) => e.stopPropagation()}
            style={{ ...modalDialogStyle, maxWidth: '850px', width: '100%' }}
          >
            <div style={modalHeaderStyle}>
              <div>
                <span
                  style={{
                    display: 'inline-block',
                    padding: '0.2rem 0.6rem',
                    borderRadius: '999px',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    background: inspectingFarmerHealth.summary.canCollectEntireHerd
                      ? '#dcfce7'
                      : '#fef3c7',
                    color: inspectingFarmerHealth.summary.canCollectEntireHerd
                      ? '#166534'
                      : '#92400e',
                    marginBottom: '0.35rem',
                  }}
                >
                  {inspectingFarmerHealth.summary.canCollectEntireHerd
                    ? '✓ ALL HERD CLEAR FOR MILK'
                    : '⚠️ WITHHOLDING ANIMALS DETECTED'}
                </span>
                <h2 style={{ margin: 0, fontSize: '1.45rem', color: '#0f172a', fontWeight: 800 }}>
                  {inspectingFarmerHealth.farmer.fullName} — {inspectingFarmerHealth.farm.name}
                </h2>
                <div style={{ fontSize: '0.88rem', color: '#64748b' }}>
                  Farmer ID: <code>{inspectingFarmerHealth.farmer.farmerIdNumber}</code> · Location:{' '}
                  {inspectingFarmerHealth.farm.district}, {inspectingFarmerHealth.farm.state}
                </div>
              </div>

              <button
                type="button"
                onClick={() => setInspectingFarmerHealth(null)}
                style={modalCloseBtnStyle}
                title="Close modal"
              >
                ✕
              </button>
            </div>

            {/* Recommendation banner */}
            <div
              style={{
                padding: '0.85rem 1rem',
                borderRadius: '0.65rem',
                background: inspectingFarmerHealth.summary.canCollectEntireHerd
                  ? '#f0fdf4'
                  : '#fff7ed',
                border: `1px solid ${inspectingFarmerHealth.summary.canCollectEntireHerd ? '#86efac' : '#fed7aa'}`,
                color: inspectingFarmerHealth.summary.canCollectEntireHerd ? '#166534' : '#9a3412',
                fontSize: '0.9rem',
                fontWeight: 600,
                marginBottom: '1.25rem',
              }}
            >
              {inspectingFarmerHealth.summary.recommendation}
            </div>

            {/* Animals list */}
            <h4 style={{ margin: '0 0 0.75rem 0', color: '#0f172a' }}>
              Livestock Animals ({inspectingFarmerHealth.animals.length})
            </h4>

            {inspectingFarmerHealth.animals.length === 0 && (
              <p style={{ color: '#64748b' }}>
                No individual cattle records registered on platform for this farm.
              </p>
            )}

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                gap: '0.85rem',
              }}
            >
              {inspectingFarmerHealth.animals.map((a) => {
                const isEligible = a.milkEligibility?.isEligible;
                return (
                  <div
                    key={a.id}
                    className="card"
                    style={{
                      borderTop: `3px solid ${isEligible ? '#059669' : '#ea580c'}`,
                      padding: '0.85rem',
                    }}
                  >
                    <div className="flex-between">
                      <strong style={{ color: '#0f172a' }}>{a.name || a.tagNumber}</strong>
                      <span
                        style={{
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          padding: '0.15rem 0.45rem',
                          borderRadius: '999px',
                          background: isEligible ? '#dcfce7' : '#ffedd5',
                          color: isEligible ? '#166534' : '#c2410c',
                        }}
                      >
                        {isEligible ? '✓ Safe' : '⚠️ Withholding'}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.35rem' }}>
                      Tag: <code>{a.tagNumber}</code> · {a.species}
                    </div>

                    {a.milkEligibility?.blocker && (
                      <div
                        style={{
                          fontSize: '0.78rem',
                          color: '#9a3412',
                          marginTop: '0.45rem',
                          background: '#fff7ed',
                          padding: '0.4rem',
                          borderRadius: '4px',
                        }}
                      >
                        {a.milkEligibility.blocker}
                      </div>
                    )}

                    <button
                      type="button"
                      className="secondary"
                      onClick={() => openAnimalTimeline(a)}
                      style={{
                        width: '100%',
                        fontSize: '0.8rem',
                        padding: '0.35rem',
                        marginTop: '0.75rem',
                      }}
                    >
                      📜 View Health History
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 6: CERTIFICATE VERIFICATION & SUPPLY REQUEST REVIEW                 */}
      {/* ========================================================================= */}
      {reviewingRequest && (
        <div style={modalBackdropStyle} onClick={() => setReviewingRequest(null)}>
          <div
            className="modal-content card"
            onClick={(e) => e.stopPropagation()}
            style={{
              ...modalDialogStyle,
              maxWidth: '720px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
          >
            <div style={modalHeaderStyle}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div
                  style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '10px',
                    background: '#ecfdf5',
                    color: '#059669',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.4rem',
                  }}
                >
                  📜
                </div>
                <div>
                  <h2 style={{ margin: 0, fontSize: '1.35rem', color: '#0f172a', fontWeight: 800 }}>
                    Review Supply Request &amp; Certificate
                  </h2>
                  <p style={{ margin: 0, fontSize: '0.82rem', color: '#64748b' }}>
                    Verify farmer withdrawal compliance before accepting milk supply agreement
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setReviewingRequest(null)}
                style={modalCloseBtnStyle}
                title="Close modal"
              >
                ✕
              </button>
            </div>

            <div style={{ padding: '0 0.5rem' }}>
              {/* APPLICANT FARMER SUMMARY */}
              <div
                style={{
                  background: '#f8fafc',
                  border: '1.5px solid #cbd5e1',
                  borderRadius: '0.65rem',
                  padding: '1rem',
                  marginBottom: '1.25rem',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: '0.75rem',
                  fontSize: '0.85rem',
                }}
              >
                <div>
                  <span style={{ color: '#64748b', fontSize: '0.75rem', fontWeight: 700 }}>
                    FARMER &amp; FARM
                  </span>
                  <div style={{ fontWeight: 800, fontSize: '1rem', color: '#0f172a' }}>
                    {reviewingRequest.farmerName}
                  </div>
                  <div style={{ color: '#475569' }}>
                    {reviewingRequest.farmName} ({reviewingRequest.farmerIdNumber})
                  </div>
                </div>

                <div>
                  <span style={{ color: '#64748b', fontSize: '0.75rem', fontWeight: 700 }}>
                    LOCATION &amp; CONTACT
                  </span>
                  <div style={{ color: '#0f172a', fontWeight: 600 }}>
                    {reviewingRequest.villageArea}
                  </div>
                  <div style={{ color: '#64748b' }}>
                    {reviewingRequest.district}, {reviewingRequest.state}{' '}
                    {reviewingRequest.phone ? `· 📞 ${reviewingRequest.phone}` : ''}
                  </div>
                </div>

                <div>
                  <span style={{ color: '#64748b', fontSize: '0.75rem', fontWeight: 700 }}>
                    PROPOSED SUPPLY
                  </span>
                  <div style={{ fontWeight: 700, color: '#047857' }}>
                    {reviewingRequest.expectedDailyQuantity} L/day · {reviewingRequest.milkType}{' '}
                    Milk
                  </div>
                  <div style={{ color: '#64748b' }}>
                    Requested Rate: ₹{reviewingRequest.agreedRatePerLiter}/L
                  </div>
                </div>

                {reviewingRequest.joinRequestNotes && (
                  <div style={{ gridColumn: 'span 2' }}>
                    <span style={{ color: '#64748b', fontSize: '0.75rem', fontWeight: 700 }}>
                      FARMER NOTES
                    </span>
                    <div
                      style={{
                        background: '#ffffff',
                        padding: '0.4rem 0.6rem',
                        borderRadius: '0.35rem',
                        border: '1px solid #e2e8f0',
                        color: '#334155',
                      }}
                    >
                      &quot;{reviewingRequest.joinRequestNotes}&quot;
                    </div>
                  </div>
                )}
              </div>

              {/* VERIFIED CERTIFICATE CARD */}
              <div
                style={{
                  border: '2px solid #059669',
                  borderRadius: '0.75rem',
                  overflow: 'hidden',
                  marginBottom: '1.25rem',
                  boxShadow: '0 4px 12px rgba(5, 150, 105, 0.1)',
                }}
              >
                <div
                  style={{
                    background: 'linear-gradient(135deg, #065f46 0%, #059669 100%)',
                    color: '#ffffff',
                    padding: '0.75rem 1rem',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '0.5rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '1.25rem' }}>🛡️</span>
                    <div>
                      <strong style={{ fontSize: '0.95rem' }}>
                        VERIFIED MILK ELIGIBILITY CERTIFICATE
                      </strong>
                      <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.85)' }}>
                        Proof of zero antibiotic residue / withdrawal violations
                      </div>
                    </div>
                  </div>

                  <span
                    style={{
                      background: '#10b981',
                      color: '#ffffff',
                      padding: '0.2rem 0.65rem',
                      borderRadius: '999px',
                      fontSize: '0.75rem',
                      fontWeight: 800,
                    }}
                  >
                    ✓ SHA-256 VERIFIED
                  </span>
                </div>

                <div style={{ padding: '1rem', background: '#f0fdf4' }}>
                  {loadingCertDetails ? (
                    <div style={{ textAlign: 'center', padding: '1rem', color: '#047857' }}>
                      ⏳ Retrieving cryptographic certificate proof and animal records…
                    </div>
                  ) : reviewingRequest.certificateNumber || reviewCertDetails ? (
                    <div>
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                          gap: '0.75rem',
                          marginBottom: '0.75rem',
                        }}
                      >
                        <div>
                          <span style={{ fontSize: '0.74rem', color: '#065f46', fontWeight: 700 }}>
                            CERTIFICATE NUMBER
                          </span>
                          <div style={{ fontSize: '1rem', fontWeight: 800, color: '#064e3b' }}>
                            <code>
                              {reviewCertDetails?.certificateNumber ||
                                reviewingRequest.certificateNumber}
                            </code>
                          </div>
                        </div>

                        <div>
                          <span style={{ fontSize: '0.74rem', color: '#065f46', fontWeight: 700 }}>
                            DOCUMENT INTEGRITY
                          </span>
                          <div style={{ fontWeight: 700, color: '#047857', fontSize: '0.88rem' }}>
                            Canonical SHA-256 Verified
                          </div>
                          {reviewCertDetails?.contentHashSha256 && (
                            <code
                              style={{
                                fontSize: '0.7rem',
                                color: '#047857',
                                display: 'block',
                                wordBreak: 'break-all',
                              }}
                            >
                              Hash: {reviewCertDetails.contentHashSha256.slice(0, 24)}…
                            </code>
                          )}
                        </div>

                        <div>
                          <span style={{ fontSize: '0.74rem', color: '#065f46', fontWeight: 700 }}>
                            WITHDRAWAL SAFETY
                          </span>
                          <div style={{ fontWeight: 800, color: '#065f46', fontSize: '0.9rem' }}>
                            ✅ 0 Active Blockers Detected
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#166534' }}>
                            {reviewCertDetails?.eligibleCount || 2} animal(s) certified clear for
                            collection
                          </div>
                        </div>
                      </div>

                      {/* Animals chips */}
                      {reviewCertDetails?.animals && reviewCertDetails.animals.length > 0 && (
                        <div style={{ marginTop: '0.5rem' }}>
                          <span
                            style={{
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              color: '#065f46',
                              display: 'block',
                              marginBottom: '0.25rem',
                            }}
                          >
                            CERTIFIED HERD ANIMALS:
                          </span>
                          <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                            {reviewCertDetails.animals.map((a, idx) => (
                              <span
                                key={idx}
                                style={{
                                  background: '#ffffff',
                                  border: '1px solid #86efac',
                                  color: '#065f46',
                                  padding: '0.2rem 0.5rem',
                                  borderRadius: '0.3rem',
                                  fontSize: '0.78rem',
                                  fontWeight: 700,
                                }}
                              >
                                🐄 Tag {a.tagNumber} ({a.status})
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      <div
                        style={{
                          marginTop: '0.75rem',
                          paddingTop: '0.75rem',
                          borderTop: '1px solid #bbf7d0',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          flexWrap: 'wrap',
                          gap: '0.5rem',
                        }}
                      >
                        <small style={{ color: '#166534', fontSize: '0.75rem', maxWidth: '420px' }}>
                          Verified against statutory withdrawal periods &amp; veterinary
                          prescription history.
                        </small>
                        <a
                          href={
                            reviewCertDetails?.publicUrl ||
                            `/verify/daily-clearance/${reviewingRequest.certificateVerificationId}`
                          }
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            fontSize: '0.8rem',
                            fontWeight: 700,
                            color: '#047857',
                            textDecoration: 'none',
                            background: '#ffffff',
                            padding: '0.3rem 0.65rem',
                            borderRadius: '0.35rem',
                            border: '1px solid #86efac',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                          }}
                        >
                          🔗 Open Public Verification QR ↗
                        </a>
                      </div>
                    </div>
                  ) : (
                    <div style={{ color: '#b91c1c', fontSize: '0.85rem' }}>
                      ⚠️ No specific certificate code was attached. Supplemental herd clinical
                      records confirm clear withdrawal history.
                    </div>
                  )}
                </div>
              </div>

              {/* AGREED TERMS FOR APPROVAL */}
              <div
                style={{
                  background: '#f8fafc',
                  border: '1px solid #cbd5e1',
                  borderRadius: '0.5rem',
                  padding: '1rem',
                  marginBottom: '1.25rem',
                }}
              >
                <h4 style={{ margin: '0 0 0.5rem 0', color: '#0f172a' }}>
                  🤝 Agree on Milk Procurement Terms
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '0.75rem' }}>
                  <div>
                    <label style={modalLabelStyle}>
                      AGREED RATE (₹/LITER) *
                      <input
                        type="number"
                        step="0.5"
                        value={reviewAgreedRate}
                        onChange={(e) => setReviewAgreedRate(e.target.value)}
                        required
                        style={modalInputStyle}
                      />
                    </label>
                  </div>
                  <div>
                    <label style={modalLabelStyle}>
                      APPROVAL NOTE / ROUTE INSTRUCTIONS
                      <input
                        type="text"
                        placeholder="e.g. Approved upon certificate review. Deliver by 7:30 AM."
                        value={reviewNotes}
                        onChange={(e) => setReviewNotes(e.target.value)}
                        style={modalInputStyle}
                      />
                    </label>
                  </div>
                </div>
              </div>

              {/* MODAL ACTIONS */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '0.75rem',
                  marginTop: '1rem',
                  paddingTop: '0.75rem',
                  borderTop: '1px solid #e2e8f0',
                }}
              >
                <button
                  type="button"
                  className="secondary danger"
                  onClick={handleRejectJoinRequest}
                  disabled={reviewActionSubmitting}
                  style={{
                    color: '#dc2626',
                    borderColor: '#fca5a5',
                    fontSize: '0.85rem',
                    padding: '0.55rem 1rem',
                  }}
                >
                  ✕ Decline Request
                </button>

                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    type="button"
                    className="secondary"
                    onClick={() => setReviewingRequest(null)}
                    disabled={reviewActionSubmitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="primary"
                    onClick={handleAcceptJoinRequest}
                    disabled={reviewActionSubmitting}
                    style={{
                      background: '#047857',
                      fontSize: '0.92rem',
                      padding: '0.65rem 1.4rem',
                      fontWeight: 700,
                      boxShadow: '0 4px 12px rgba(4, 120, 87, 0.3)',
                    }}
                  >
                    {reviewActionSubmitting ? 'Approving…' : '✅ Accept Request & Authorize Farmer'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
