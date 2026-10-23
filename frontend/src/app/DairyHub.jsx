import { useState, useEffect, useRef } from 'react';
import { api } from './api.js';
import { toast } from './toast.js';
import { QuickOperationsPOS } from './dairy/QuickOperationsPOS.jsx';
import { TodayOverviewKPIs } from './dairy/TodayOverviewKPIs.jsx';
import { FarmerNetworkEnrollments } from './dairy/FarmerNetworkEnrollments.jsx';
import { FinancialsPayouts } from './dairy/FinancialsPayouts.jsx';
import { AnalyticsCompliance } from './dairy/AnalyticsCompliance.jsx';

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
  border: '1.5px solid #cbd5e1',
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

/**
 * FarmerQrScannerModal - Live camera and simulated QR Pass scanner for fast POS intake.
 */
function FarmerQrScannerModal({ onClose, onScan, activeFarmers = [] }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const onScanRef = useRef(onScan);
  const [manualInput, setManualInput] = useState('');
  const [scanStatus, setScanStatus] = useState('Initializing camera...');
  const [cameraError, setCameraError] = useState('');

  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  function handleTriggerScan(value) {
    if (!value || !value.trim()) return;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
    }
    onScanRef.current(value.trim());
  }

  useEffect(() => {
    let active = true;
    let detector = null;
    let scanInterval = null;

    async function initCamera() {
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error('Camera device access is not supported by your browser.');
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
          audio: false,
        });

        if (!active) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }

        setScanStatus('Scanning for Farmer QR Pass…');

        if ('BarcodeDetector' in window) {
          try {
            detector = new window.BarcodeDetector({ formats: ['qr_code'] });
            scanInterval = setInterval(async () => {
              if (videoRef.current && videoRef.current.readyState >= 2 && detector) {
                try {
                  const codes = await detector.detect(videoRef.current);
                  if (codes && codes.length > 0 && codes[0].rawValue) {
                    clearInterval(scanInterval);
                    handleTriggerScan(codes[0].rawValue);
                  }
                } catch {
                  // ignore frame decode err
                }
              }
            }, 300);
          } catch {
            // fallback
          }
        }
      } catch (err) {
        setCameraError(
          err.message || 'Unable to open camera. Please use manual search or simulated scan below.',
        );
        setScanStatus('Camera unavailable');
      }
    }

    initCamera();

    return () => {
      active = false;
      if (scanInterval) clearInterval(scanInterval);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  return (
    <div style={modalBackdropStyle} onClick={onClose}>
      <div
        className="modal-content card"
        onClick={(e) => e.stopPropagation()}
        style={{ ...modalDialogStyle, maxWidth: '520px', width: '100%', textAlign: 'center' }}
      >
        <div style={modalHeaderStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <span style={{ fontSize: '1.4rem' }}>📷</span>
            <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>
              Scan Farmer QR Pass
            </h2>
          </div>
          <button type="button" onClick={onClose} style={modalCloseBtnStyle}>
            ✕
          </button>
        </div>

        <p style={{ margin: '0 0 1rem', fontSize: '0.85rem', color: '#64748b' }}>
          Hold the Farmer's Digital Pass QR code in front of the camera to automatically identify
          and validate their enrollment.
        </p>

        {/* Video feed viewport */}
        <div
          style={{
            position: 'relative',
            width: '100%',
            height: '240px',
            background: '#0f172a',
            borderRadius: '0.75rem',
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '2px solid #334155',
            marginBottom: '1rem',
          }}
        >
          {cameraError ? (
            <div style={{ color: '#f87171', padding: '1rem', fontSize: '0.85rem' }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📷🚫</div>
              <div>{cameraError}</div>
            </div>
          ) : (
            <video
              ref={videoRef}
              muted
              playsInline
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          )}

          {/* Scanner targeting crosshair box */}
          {!cameraError && (
            <div
              style={{
                position: 'absolute',
                width: '160px',
                height: '160px',
                border: '2px solid #10b981',
                borderRadius: '12px',
                boxShadow: '0 0 0 4000px rgba(15, 23, 42, 0.45)',
                pointerEvents: 'none',
              }}
            />
          )}
        </div>

        <div
          style={{
            fontSize: '0.84rem',
            color: '#059669',
            fontWeight: 700,
            marginBottom: '1.25rem',
          }}
        >
          {scanStatus}
        </div>

        {/* Simulated quick scan selector */}
        {activeFarmers.length > 0 && (
          <div
            style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '0.75rem',
              padding: '1rem',
              textAlign: 'left',
              marginBottom: '1rem',
            }}
          >
            <div
              style={{
                fontSize: '0.78rem',
                fontWeight: 700,
                color: '#475569',
                marginBottom: '0.5rem',
              }}
            >
              ⚡ Simulated QR Scan (Select Active Farmer Pass):
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
              {activeFarmers.slice(0, 6).map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => {
                    const passPayload = JSON.stringify({
                      farmerIdNumber: f.farmerIdNumber,
                      farmerName: f.farmerName,
                      farmName: f.farmName,
                    });
                    handleTriggerScan(passPayload);
                  }}
                  style={{
                    background: '#ffffff',
                    border: '1.5px solid #cbd5e1',
                    borderRadius: '0.45rem',
                    padding: '0.35rem 0.65rem',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    color: '#0f172a',
                    cursor: 'pointer',
                  }}
                >
                  📱 {f.farmerName} ({f.farmerIdNumber})
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Manual code paste */}
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <input
            type="text"
            placeholder="Or paste QR payload / Farmer ID here…"
            value={manualInput}
            onChange={(e) => setManualInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleTriggerScan(manualInput);
              }
            }}
            style={{ ...modalInputStyle, flex: 1, marginTop: 0 }}
          />
          <button
            type="button"
            className="primary"
            disabled={!manualInput.trim()}
            onClick={() => handleTriggerScan(manualInput)}
            style={{ padding: '0.65rem 1.25rem', fontWeight: 700 }}
          >
            Submit
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Main DairyHub Component - Redesigned Dairy Owner Dashboard
 * Divided into 5 strict sections:
 * 1. Quick Operations (The "POS" View)
 * 2. Today's Overview (Real-Time KPIs)
 * 3. Farmer Network & Enrollments
 * 4. Financials & Payouts
 * 5. Analytics & Compliance
 */
export function DairyHub({ initialTab = 'all', user, workspace: _workspace }) {
  // Navigation / Section focus state
  // Can be 'all' (unified layout) or a focused section: 'pos' | 'today' | 'farmers' | 'financials' | 'analytics'
  const [activeSection, setActiveSection] = useState(() => {
    if (initialTab === 'farmers') return 'farmers';
    if (initialTab === 'intake') return 'pos';
    if (initialTab === 'analytics') return 'all';
    return 'all';
  });

  useEffect(() => {
    if (initialTab === 'farmers') setActiveSection('farmers');
    else if (initialTab === 'intake') setActiveSection('pos');
    else if (initialTab === 'analytics') setActiveSection('all');
  }, [initialTab]);

  // Global state
  const [areasList, setAreasList] = useState([]);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  // 1. Analytics state
  const [analytics, setAnalytics] = useState(null);

  // 2. Enrollments state
  const [enrollments, setEnrollments] = useState([]);

  // 3. Milk Intakes state
  const [intakes, setIntakes] = useState([]);

  // 4. Sales state
  const [sales, setSales] = useState([]);

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

  // =========================================================================
  // FAST DAILY MILK COLLECTION (POS FLOW) STATE
  // =========================================================================
  const effectiveDairyUserId = user?.id || enrollments[0]?.dairyUserId || 'dairy-admin-1';
  const [fastSearchFarmerId, setFastSearchFarmerId] = useState('');
  const [fastValidating, setFastValidating] = useState(false);
  const [fastValidationError, setFastValidationError] = useState('');
  const [validatedFarmer, setValidatedFarmer] = useState(null);
  const [showFastScanner, setShowFastScanner] = useState(false);

  // Fast Daily Intake Form fields
  const currentHour = new Date().getHours();
  const [fastShift, setFastShift] = useState(
    currentHour >= 5 && currentHour < 14 ? 'MORNING' : 'EVENING',
  );
  const [fastQuantity, setFastQuantity] = useState(25);
  const [fastFat, setFastFat] = useState(4.2);
  const [fastSnf, setFastSnf] = useState(8.6);
  const [fastMilkType, setFastMilkType] = useState('COW');
  const [fastSubmitting, setFastSubmitting] = useState(false);

  // Real-time calculation of dynamic total cost
  const fastTotalCost =
    (parseFloat(fastQuantity) || 0) * (parseFloat(validatedFarmer?.agreedRatePerLiter) || 0);

  // Validate farmer for fast daily collection
  async function handleValidateFarmerForIntake(farmerIdInput) {
    const raw = (farmerIdInput || fastSearchFarmerId).trim();
    if (!raw) {
      setFastValidationError('Please enter or scan a Farmer ID.');
      return;
    }

    let farmerId = raw;
    if (raw.startsWith('{') && raw.endsWith('}')) {
      try {
        const parsed = JSON.parse(raw);
        if (parsed.farmerIdNumber) farmerId = parsed.farmerIdNumber;
      } catch {
        // use raw
      }
    }

    setFastValidating(true);
    setFastValidationError('');
    try {
      const res = await api(
        `/milk-collection/validate-farmer?dairyUserId=${encodeURIComponent(effectiveDairyUserId)}&farmerIdNumber=${encodeURIComponent(farmerId)}`,
      );
      const dto = res.data || res;
      setValidatedFarmer(dto);
      setFastQuantity(dto.expectedDailyQuantity || 25);
      setFastFat(dto.baseFatPercentage || 4.2);
      setFastSnf(dto.baseSnfPercentage || 8.6);
      setFastMilkType(dto.milkType || 'COW');

      const h = new Date().getHours();
      setFastShift(h >= 5 && h < 14 ? 'MORNING' : 'EVENING');
      toast.success(`Farmer verified: ${dto.farmerName} (${dto.farmerIdNumber})`);
    } catch (err) {
      setFastValidationError(
        err.message || 'Farmer validation failed. Farmer may not be active or enrolled.',
      );
      setValidatedFarmer(null);
    } finally {
      setFastValidating(false);
    }
  }

  // Submit fast daily intake and immediately reset for next farmer in line
  async function handleSubmitFastIntake(e) {
    if (e) e.preventDefault();
    if (!validatedFarmer) return;

    const qty = parseFloat(fastQuantity);
    if (!qty || qty <= 0) {
      toast.error('Please enter a valid milk quantity in liters.');
      return;
    }

    setFastSubmitting(true);
    try {
      const payload = {
        dairyUserId: effectiveDairyUserId,
        enrollmentId: validatedFarmer.enrollmentId,
        farmerIdNumber: validatedFarmer.farmerIdNumber,
        farmerName: validatedFarmer.farmerName,
        collectionDate: new Date().toISOString().split('T')[0],
        shift: fastShift,
        milkType: fastMilkType,
        quantityLiters: qty,
        fatPercentage: parseFloat(fastFat) || 4.0,
        snfPercentage: parseFloat(fastSnf) || 8.5,
      };

      const res = await api('/milk-collection/intake', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      const totalCost = (
        qty * (validatedFarmer.agreedRatePerLiter || res.data?.ratePerLiter || 42)
      ).toFixed(2);
      toast.success(
        `✅ Fast Intake Logged! ${qty} L for ${validatedFarmer.farmerName} (₹${Number(totalCost).toLocaleString('en-IN')})`,
      );

      // Immediately reset scanner/search for the next farmer in line
      setValidatedFarmer(null);
      setFastSearchFarmerId('');
      setFastValidationError('');
      loadAllData();
    } catch (err) {
      toast.error(err.message || 'Failed to submit milk intake.');
    } finally {
      setFastSubmitting(false);
    }
  }

  // Direct 1-click Approve or Reject for enrollment requests
  async function handleDirectUpdateEnrollmentStatus(id, newStatus, farmerName) {
    if (newStatus === 'REJECTED') {
      if (
        !window.confirm(
          `Are you sure you want to decline the enrollment request from ${farmerName}?`,
        )
      ) {
        return;
      }
    }
    try {
      await api(`/dairy/enrollments/${id}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status: newStatus }),
      });
      toast.success(
        newStatus === 'ACTIVE'
          ? `🎉 Farmer ${farmerName} approved! They can now supply milk daily.`
          : `Enrollment request for ${farmerName} was rejected.`,
      );
      loadAllData();
    } catch (err) {
      toast.error(err.message || 'Failed to update enrollment status.');
    }
  }

  // Load initial data
  useEffect(() => {
    loadAllData();
  }, []);

  async function loadAllData() {
    setError('');
    setRefreshing(true);
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const [areasRes, analyticsRes, enrollRes, , intakesRes, salesRes] = await Promise.all([
        api('/dairy/areas').catch(() => ({ areas: [] })),
        api(`/dairy/analytics?date=${todayStr}`).catch(() => null),
        api('/dairy/enrollments').catch(() => ({ enrollments: [] })),
        api('/dairy/farmers').catch(() => ({ farmers: [] })),
        api('/dairy/inventory/intakes').catch(() => ({ intakes: [] })),
        api('/dairy/inventory/sales').catch(() => ({ sales: [] })),
      ]);

      setAreasList(areasRes?.areas || []);
      setAnalytics(analyticsRes || null);
      setEnrollments(enrollRes?.enrollments || []);
      setIntakes(intakesRes?.intakes || []);
      setSales(salesRes?.sales || []);
    } catch (err) {
      setError(err.message || 'Failed to load dairy data');
    } finally {
      setRefreshing(false);
    }
  }

  function showNotification(msg) {
    setSuccessMsg(msg);
    toast.success(msg);
    setTimeout(() => setSuccessMsg(''), 4500);
  }

  // --- Handlers for Enrollment ---
  function openAddFarmerModal(prefill = {}) {
    setEditingEnrollment(null);
    setEnrollForm({
      farmerIdNumber: prefill.farmerIdNumber || '',
      farmerName: prefill.farmerName || '',
      farmName: prefill.farmName || '',
      phone: prefill.phone || '',
      email: prefill.email || '',
      state: prefill.state || 'Maharashtra',
      district: prefill.district || 'Kolhapur',
      taluka: prefill.taluka || '',
      villageArea: prefill.villageArea || '',
      pincode: prefill.pincode || '',
      milkType: prefill.milkType || 'COW',
      expectedDailyQuantity: prefill.expectedDailyQuantity || 25,
      agreedRatePerLiter: prefill.agreedRatePerLiter || 42,
      baseFatPercentage: prefill.baseFatPercentage || 4.2,
      baseSnfPercentage: prefill.baseSnfPercentage || 8.6,
      paymentMethod: prefill.paymentMethod || 'BANK_TRANSFER',
      bankAccountNumber: prefill.bankAccountNumber || '',
      bankIfsc: prefill.bankIfsc || '',
      bankName: prefill.bankName || '',
      upiId: prefill.upiId || '',
      status: 'ACTIVE',
      joinRequestNotes: '',
    });
    setShowEnrollModal(true);
  }

  function openEditEnrollmentModal(enr) {
    setEditingEnrollment(enr);
    setEnrollForm({
      farmerIdNumber: enr.farmerIdNumber || '',
      farmerName: enr.farmerName || '',
      farmName: enr.farmName || '',
      phone: enr.phone || '',
      email: enr.email || '',
      state: enr.state || 'Maharashtra',
      district: enr.district || 'Kolhapur',
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
      status: enr.status || 'ACTIVE',
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
        showNotification(`Farmer ${enrollForm.farmerName} enrollment updated successfully.`);
      } else {
        await api('/dairy/enrollments', {
          method: 'POST',
          body: JSON.stringify(enrollForm),
        });
        showNotification(`Farmer ${enrollForm.farmerName} enrolled successfully.`);
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
    if (farmer) {
      setIntakeForm({
        farmerIdNumber: farmer.farmerIdNumber || '',
        farmerName: farmer.farmerName || '',
        farmName: farmer.farmName || '',
        villageArea: farmer.villageArea || '',
        collectionDate: new Date().toISOString().split('T')[0],
        shift: 'MORNING',
        milkType: farmer.milkType || 'COW',
        quantityLiters: farmer.expectedDailyQuantity || 20,
        fatPercentage: farmer.baseFatPercentage || 4.2,
        snfPercentage: farmer.baseSnfPercentage || 8.6,
        ratePerLiter: farmer.agreedRatePerLiter || 42,
        storageTank: 'Silo-1 (Raw Cow)',
        paymentStatus: 'PAID',
        qualityGrade: 'GRADE_A',
        notes: '',
      });
    } else {
      setIntakeForm({
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
    }
    setShowIntakeModal(true);
  }

  function handleIntakeFarmerSelect(farmerId) {
    const f = enrollments.find((e) => e.farmerIdNumber === farmerId);
    if (f) {
      setIntakeForm((prev) => ({
        ...prev,
        farmerIdNumber: f.farmerIdNumber,
        farmerName: f.farmerName,
        farmName: f.farmName,
        villageArea: f.villageArea,
        milkType: f.milkType || 'COW',
        ratePerLiter: f.agreedRatePerLiter || 42,
        fatPercentage: f.baseFatPercentage || 4.2,
        snfPercentage: f.baseSnfPercentage || 8.6,
        quantityLiters: f.expectedDailyQuantity || 20,
      }));
    }
  }

  async function handleSaveIntake(e) {
    e.preventDefault();
    setError('');
    try {
      await api('/dairy/inventory/intakes', {
        method: 'POST',
        body: JSON.stringify(intakeForm),
      });
      showNotification(
        `Milk collection of ${intakeForm.quantityLiters} L logged for ${intakeForm.farmerName}.`,
      );
      setShowIntakeModal(false);
      loadAllData();
    } catch (err) {
      setError(err.message || 'Failed to record milk intake');
    }
  }

  // --- Handlers for Milk Sales ---
  async function handleSaveSale(e) {
    e.preventDefault();
    setError('');
    try {
      await api('/dairy/inventory/sales', {
        method: 'POST',
        body: JSON.stringify(saleForm),
      });
      showNotification(`Sale of ${saleForm.quantityLiters} L logged for ${saleForm.buyerName}.`);
      setShowSaleModal(false);
      loadAllData();
    } catch (err) {
      setError(err.message || 'Failed to record milk sale');
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

  const pendingJoinRequestsCount = enrollments.filter(
    (e) => e.status === 'PENDING_APPROVAL',
  ).length;
  const pendingPayoutsCount = intakes.filter((i) => i.paymentStatus === 'PENDING').length;

  return (
    <div
      className="dairy-hub-container"
      style={{ maxWidth: '1240px', margin: '0 auto', paddingBottom: '3rem' }}
    >
      {/* ===================================================================== */}
      {/* TOP HEADER: BRANDING & GLOBAL QUICK CONTROLS                          */}
      {/* ===================================================================== */}
      <div
        className="card"
        style={{
          background: 'linear-gradient(135deg, #064e3b 0%, #065f46 100%)',
          color: '#ffffff',
          padding: '1.6rem 1.8rem',
          borderRadius: '1.25rem',
          marginBottom: '1.5rem',
          boxShadow: '0 10px 25px -5px rgba(6, 78, 59, 0.35)',
        }}
      >
        <div
          className="flex-between"
          style={{ alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <span style={{ fontSize: '1.9rem' }}>🥛</span>
              <div>
                <h1 style={{ margin: 0, color: '#ffffff', fontSize: '1.65rem', fontWeight: 800 }}>
                  Dairy Operations Command Center
                </h1>
                <p style={{ margin: '0.15rem 0 0', color: '#a7f3d0', fontSize: '0.88rem' }}>
                  Unified POS intake terminal, real-time daily metrics, supplier associations, and
                  withdrawal compliance.
                </p>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <button
              type="button"
              onClick={loadAllData}
              disabled={refreshing}
              style={{
                background: 'rgba(255, 255, 255, 0.15)',
                color: '#ffffff',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                fontWeight: 600,
                padding: '0.55rem 0.95rem',
                borderRadius: '0.6rem',
                cursor: refreshing ? 'not-allowed' : 'pointer',
                fontSize: '0.84rem',
              }}
            >
              {refreshing ? 'Syncing…' : '🔄 Refresh Data'}
            </button>

            <button
              type="button"
              onClick={() => setShowSaleModal(true)}
              style={{
                background: '#ffffff',
                color: '#064e3b',
                fontWeight: 800,
                border: 'none',
                padding: '0.58rem 1.15rem',
                borderRadius: '0.6rem',
                cursor: 'pointer',
                fontSize: '0.88rem',
                boxShadow: '0 4px 10px rgba(0, 0, 0, 0.12)',
              }}
            >
              💰 Record Milk Sale
            </button>

            <button
              type="button"
              onClick={() => openAddFarmerModal()}
              style={{
                background: '#10b981',
                color: '#ffffff',
                border: 'none',
                fontWeight: 700,
                padding: '0.58rem 1.15rem',
                borderRadius: '0.6rem',
                cursor: 'pointer',
                fontSize: '0.88rem',
                boxShadow: '0 4px 10px rgba(16, 185, 129, 0.25)',
              }}
            >
              ➕ Enroll Farmer
            </button>
          </div>
        </div>
      </div>

      {/* SUCCESS / ERROR ALERTS */}
      {successMsg && (
        <div
          className="card"
          style={{
            background: '#ecfdf5',
            border: '1.5px solid #6ee7b7',
            color: '#065f46',
            padding: '0.85rem 1.2rem',
            marginBottom: '1.25rem',
            borderRadius: '0.75rem',
            fontWeight: 600,
            fontSize: '0.9rem',
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
            padding: '0.85rem 1.2rem',
            marginBottom: '1.25rem',
            borderRadius: '0.75rem',
            fontSize: '0.9rem',
            fontWeight: 600,
          }}
        >
          ⚠️ {error}
        </div>
      )}

      {/* ===================================================================== */}
      {/* SECTION QUICK-JUMP / FILTER CONTROLLER                                */}
      {/* ===================================================================== */}
      <div
        style={{
          position: 'sticky',
          top: '1rem',
          zIndex: 900,
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          border: '1px solid #cbd5e1',
          borderRadius: '0.85rem',
          padding: '0.45rem 0.65rem',
          marginBottom: '1.75rem',
          display: 'flex',
          gap: '0.35rem',
          overflowX: 'auto',
          boxShadow: '0 6px 16px rgba(0, 0, 0, 0.05)',
        }}
      >
        <button
          type="button"
          onClick={() => setActiveSection('all')}
          style={{
            background: activeSection === 'all' ? '#064e3b' : 'transparent',
            color: activeSection === 'all' ? '#ffffff' : '#475569',
            border: 'none',
            borderRadius: '0.55rem',
            padding: '0.45rem 0.9rem',
            fontSize: '0.85rem',
            fontWeight: 700,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            transition: 'all 0.15s ease',
          }}
        >
          ✨ Unified Dashboard (All 5 Sections)
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveSection('pos');
            document.getElementById('quick-operations-pos')?.scrollIntoView({ behavior: 'smooth' });
          }}
          style={{
            background: activeSection === 'pos' ? '#059669' : 'transparent',
            color: activeSection === 'pos' ? '#ffffff' : '#475569',
            border: 'none',
            borderRadius: '0.55rem',
            padding: '0.45rem 0.9rem',
            fontSize: '0.85rem',
            fontWeight: 700,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            transition: 'all 0.15s ease',
          }}
        >
          ⚡ 1. Quick Operations (POS)
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveSection('today');
            document.getElementById('todays-overview-kpis')?.scrollIntoView({ behavior: 'smooth' });
          }}
          style={{
            background: activeSection === 'today' ? '#059669' : 'transparent',
            color: activeSection === 'today' ? '#ffffff' : '#475569',
            border: 'none',
            borderRadius: '0.55rem',
            padding: '0.45rem 0.9rem',
            fontSize: '0.85rem',
            fontWeight: 700,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            transition: 'all 0.15s ease',
          }}
        >
          📊 2. Today's Overview
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveSection('farmers');
            document
              .getElementById('farmer-network-enrollments')
              ?.scrollIntoView({ behavior: 'smooth' });
          }}
          style={{
            background: activeSection === 'farmers' ? '#059669' : 'transparent',
            color: activeSection === 'farmers' ? '#ffffff' : '#475569',
            border: 'none',
            borderRadius: '0.55rem',
            padding: '0.45rem 0.9rem',
            fontSize: '0.85rem',
            fontWeight: 700,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            transition: 'all 0.15s ease',
          }}
        >
          <span>👥 3. Farmer Network</span>
          {pendingJoinRequestsCount > 0 && (
            <span
              style={{
                background: '#ea580c',
                color: '#ffffff',
                fontSize: '0.7rem',
                fontWeight: 800,
                padding: '0.05rem 0.45rem',
                borderRadius: '999px',
              }}
            >
              {pendingJoinRequestsCount}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveSection('financials');
            document.getElementById('financials-payouts')?.scrollIntoView({ behavior: 'smooth' });
          }}
          style={{
            background: activeSection === 'financials' ? '#059669' : 'transparent',
            color: activeSection === 'financials' ? '#ffffff' : '#475569',
            border: 'none',
            borderRadius: '0.55rem',
            padding: '0.45rem 0.9rem',
            fontSize: '0.85rem',
            fontWeight: 700,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            transition: 'all 0.15s ease',
          }}
        >
          <span>💳 4. Financials &amp; Payouts</span>
          {pendingPayoutsCount > 0 && (
            <span
              style={{
                background: '#ef4444',
                color: '#ffffff',
                fontSize: '0.7rem',
                fontWeight: 800,
                padding: '0.05rem 0.45rem',
                borderRadius: '999px',
              }}
            >
              {pendingPayoutsCount}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveSection('analytics');
            document.getElementById('analytics-compliance')?.scrollIntoView({ behavior: 'smooth' });
          }}
          style={{
            background: activeSection === 'analytics' ? '#059669' : 'transparent',
            color: activeSection === 'analytics' ? '#ffffff' : '#475569',
            border: 'none',
            borderRadius: '0.55rem',
            padding: '0.45rem 0.9rem',
            fontSize: '0.85rem',
            fontWeight: 700,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            transition: 'all 0.15s ease',
          }}
        >
          🛡️ 5. Analytics &amp; Compliance
        </button>
      </div>

      {/* ===================================================================== */}
      {/* 5 STRICT SECTIONS (MODULAR SUB-COMPONENTS)                            */}
      {/* ===================================================================== */}

      {/* SECTION 1: QUICK OPERATIONS (THE "POS" VIEW) */}
      {(activeSection === 'all' || activeSection === 'pos') && (
        <QuickOperationsPOS
          validatedFarmer={validatedFarmer}
          fastSearchFarmerId={fastSearchFarmerId}
          setFastSearchFarmerId={setFastSearchFarmerId}
          fastValidating={fastValidating}
          fastValidationError={fastValidationError}
          handleValidateFarmerForIntake={handleValidateFarmerForIntake}
          setShowFastScanner={setShowFastScanner}
          fastShift={fastShift}
          setFastShift={setFastShift}
          fastQuantity={fastQuantity}
          setFastQuantity={setFastQuantity}
          fastFat={fastFat}
          setFastFat={setFastFat}
          fastSnf={fastSnf}
          setFastSnf={setFastSnf}
          fastMilkType={fastMilkType}
          setFastMilkType={setFastMilkType}
          fastSubmitting={fastSubmitting}
          fastTotalCost={fastTotalCost}
          handleSubmitFastIntake={handleSubmitFastIntake}
          onResetValidatedFarmer={() => {
            setValidatedFarmer(null);
            setFastSearchFarmerId('');
            setFastValidationError('');
          }}
          enrollments={enrollments}
          onOpenSaleModal={() => setShowSaleModal(true)}
          onOpenDetailedIntakeModal={() => openIntakeModal()}
        />
      )}

      {/* SECTION 2: TODAY'S OVERVIEW (REAL-TIME KPIS) */}
      {(activeSection === 'all' || activeSection === 'today') && (
        <TodayOverviewKPIs analytics={analytics} intakes={intakes} sales={sales} />
      )}

      {/* SECTION 3: FARMER NETWORK & ENROLLMENTS */}
      {(activeSection === 'all' || activeSection === 'farmers') && (
        <FarmerNetworkEnrollments
          enrollments={enrollments}
          areasList={areasList}
          onDirectUpdateStatus={handleDirectUpdateEnrollmentStatus}
          onOpenCertificateReview={openCertificateReviewModal}
          onOpenAddFarmerModal={openAddFarmerModal}
          onOpenEditEnrollmentModal={openEditEnrollmentModal}
          onInspectFarmerHealth={inspectFarmer}
          onSelectForFastIntake={(farmerId) => {
            setFastSearchFarmerId(farmerId);
            handleValidateFarmerForIntake(farmerId);
            document.getElementById('quick-operations-pos')?.scrollIntoView({ behavior: 'smooth' });
          }}
        />
      )}

      {/* SECTION 4: FINANCIALS & PAYOUTS */}
      {(activeSection === 'all' || activeSection === 'financials') && (
        <FinancialsPayouts
          intakes={intakes}
          sales={sales}
          enrollments={enrollments}
          onRefreshData={loadAllData}
        />
      )}

      {/* SECTION 5: ANALYTICS & COMPLIANCE */}
      {(activeSection === 'all' || activeSection === 'analytics') && (
        <AnalyticsCompliance
          analytics={analytics}
          intakes={intakes}
          sales={sales}
          onInspectFarmerHealth={inspectFarmer}
        />
      )}

      {/* ===================================================================== */}
      {/* PRESERVED MODAL 1: ENROLL FARMER / PROCESS JOIN REQUEST               */}
      {/* ===================================================================== */}
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
                    disabled={!!editingEnrollment}
                    style={modalInputStyle}
                  />
                </label>

                <label style={modalLabelStyle}>
                  Farmer Full Name *
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ramesh Patil"
                    value={enrollForm.farmerName}
                    onChange={(e) => setEnrollForm({ ...enrollForm, farmerName: e.target.value })}
                    style={modalInputStyle}
                  />
                </label>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '1rem',
                  marginTop: '0.5rem',
                }}
              >
                <label style={modalLabelStyle}>
                  Farm / Dairy Name *
                  <input
                    type="text"
                    required
                    placeholder="e.g. Patil Organic Dairy"
                    value={enrollForm.farmName}
                    onChange={(e) => setEnrollForm({ ...enrollForm, farmName: e.target.value })}
                    style={modalInputStyle}
                  />
                </label>

                <label style={modalLabelStyle}>
                  Phone Number
                  <input
                    type="tel"
                    placeholder="e.g. 9822112345"
                    value={enrollForm.phone}
                    onChange={(e) => setEnrollForm({ ...enrollForm, phone: e.target.value })}
                    style={modalInputStyle}
                  />
                </label>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr 1fr',
                  gap: '1rem',
                  marginTop: '0.5rem',
                }}
              >
                <label style={modalLabelStyle}>
                  Village / Route Area
                  <input
                    type="text"
                    placeholder="e.g. Sarnobatwadi Route 1"
                    value={enrollForm.villageArea}
                    onChange={(e) => setEnrollForm({ ...enrollForm, villageArea: e.target.value })}
                    style={modalInputStyle}
                  />
                </label>

                <label style={modalLabelStyle}>
                  Taluka
                  <input
                    type="text"
                    placeholder="e.g. Karveer"
                    value={enrollForm.taluka}
                    onChange={(e) => setEnrollForm({ ...enrollForm, taluka: e.target.value })}
                    style={modalInputStyle}
                  />
                </label>

                <label style={modalLabelStyle}>
                  District
                  <input
                    type="text"
                    placeholder="e.g. Kolhapur"
                    value={enrollForm.district}
                    onChange={(e) => setEnrollForm({ ...enrollForm, district: e.target.value })}
                    style={modalInputStyle}
                  />
                </label>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr 1fr',
                  gap: '1rem',
                  marginTop: '0.5rem',
                }}
              >
                <label style={modalLabelStyle}>
                  Primary Milk Type
                  <select
                    value={enrollForm.milkType}
                    onChange={(e) => setEnrollForm({ ...enrollForm, milkType: e.target.value })}
                    style={modalInputStyle}
                  >
                    <option value="COW">Cow</option>
                    <option value="BUFFALO">Buffalo</option>
                    <option value="MIXED">Mixed</option>
                  </select>
                </label>

                <label style={modalLabelStyle}>
                  Agreed Rate per Liter (₹) *
                  <input
                    type="number"
                    step="0.1"
                    min="1"
                    required
                    value={enrollForm.agreedRatePerLiter}
                    onChange={(e) =>
                      setEnrollForm({
                        ...enrollForm,
                        agreedRatePerLiter: parseFloat(e.target.value) || 0,
                      })
                    }
                    style={modalInputStyle}
                  />
                </label>

                <label style={modalLabelStyle}>
                  Expected Daily (Liters)
                  <input
                    type="number"
                    step="1"
                    min="1"
                    value={enrollForm.expectedDailyQuantity}
                    onChange={(e) =>
                      setEnrollForm({
                        ...enrollForm,
                        expectedDailyQuantity: parseFloat(e.target.value) || 0,
                      })
                    }
                    style={modalInputStyle}
                  />
                </label>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '1rem',
                  marginTop: '0.5rem',
                }}
              >
                <label style={modalLabelStyle}>
                  Base Fat % Standard
                  <input
                    type="number"
                    step="0.1"
                    min="1"
                    max="15"
                    value={enrollForm.baseFatPercentage}
                    onChange={(e) =>
                      setEnrollForm({
                        ...enrollForm,
                        baseFatPercentage: parseFloat(e.target.value) || 0,
                      })
                    }
                    style={modalInputStyle}
                  />
                </label>

                <label style={modalLabelStyle}>
                  Base SNF % Standard
                  <input
                    type="number"
                    step="0.1"
                    min="1"
                    max="15"
                    value={enrollForm.baseSnfPercentage}
                    onChange={(e) =>
                      setEnrollForm({
                        ...enrollForm,
                        baseSnfPercentage: parseFloat(e.target.value) || 0,
                      })
                    }
                    style={modalInputStyle}
                  />
                </label>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '1rem',
                  marginTop: '0.5rem',
                }}
              >
                <label style={modalLabelStyle}>
                  Payment Method
                  <select
                    value={enrollForm.paymentMethod}
                    onChange={(e) =>
                      setEnrollForm({ ...enrollForm, paymentMethod: e.target.value })
                    }
                    style={modalInputStyle}
                  >
                    <option value="BANK_TRANSFER">Bank Direct Deposit</option>
                    <option value="UPI">UPI Digital Payment</option>
                    <option value="CASH">Cash at Collection Point</option>
                    <option value="CHEQUE">Weekly Cheque</option>
                  </select>
                </label>

                <label style={modalLabelStyle}>
                  Status
                  <select
                    value={enrollForm.status}
                    onChange={(e) => setEnrollForm({ ...enrollForm, status: e.target.value })}
                    style={modalInputStyle}
                  >
                    <option value="ACTIVE">ACTIVE (Authorized to supply)</option>
                    <option value="PENDING_APPROVAL">PENDING_APPROVAL (Under review)</option>
                    <option value="SUSPENDED">SUSPENDED (Temporarily blocked)</option>
                    <option value="REJECTED">REJECTED (Disqualified)</option>
                  </select>
                </label>
              </div>

              {enrollForm.paymentMethod === 'BANK_TRANSFER' && (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr 1fr',
                    gap: '1rem',
                    marginTop: '0.5rem',
                    padding: '0.75rem',
                    background: '#f8fafc',
                    borderRadius: '0.5rem',
                  }}
                >
                  <label style={modalLabelStyle}>
                    Bank Account Number
                    <input
                      type="text"
                      placeholder="Account number"
                      value={enrollForm.bankAccountNumber}
                      onChange={(e) =>
                        setEnrollForm({ ...enrollForm, bankAccountNumber: e.target.value })
                      }
                      style={modalInputStyle}
                    />
                  </label>
                  <label style={modalLabelStyle}>
                    Bank IFSC Code
                    <input
                      type="text"
                      placeholder="e.g. SBIN0001234"
                      value={enrollForm.bankIfsc}
                      onChange={(e) => setEnrollForm({ ...enrollForm, bankIfsc: e.target.value })}
                      style={modalInputStyle}
                    />
                  </label>
                  <label style={modalLabelStyle}>
                    Bank Name
                    <input
                      type="text"
                      placeholder="e.g. State Bank of India"
                      value={enrollForm.bankName}
                      onChange={(e) => setEnrollForm({ ...enrollForm, bankName: e.target.value })}
                      style={modalInputStyle}
                    />
                  </label>
                </div>
              )}

              {enrollForm.paymentMethod === 'UPI' && (
                <div
                  style={{
                    marginTop: '0.5rem',
                    padding: '0.75rem',
                    background: '#f8fafc',
                    borderRadius: '0.5rem',
                  }}
                >
                  <label style={modalLabelStyle}>
                    UPI VPA Address
                    <input
                      type="text"
                      placeholder="e.g. ramesh@okaxis"
                      value={enrollForm.upiId}
                      onChange={(e) => setEnrollForm({ ...enrollForm, upiId: e.target.value })}
                      style={modalInputStyle}
                    />
                  </label>
                </div>
              )}

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: '0.75rem',
                  marginTop: '1.5rem',
                  borderTop: '1px solid #e2e8f0',
                  paddingTop: '1rem',
                }}
              >
                <button
                  type="button"
                  onClick={() => setShowEnrollModal(false)}
                  style={{
                    background: '#ffffff',
                    border: '1.5px solid #cbd5e1',
                    borderRadius: '0.65rem',
                    padding: '0.65rem 1.25rem',
                    cursor: 'pointer',
                    fontWeight: 600,
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="primary"
                  style={{
                    background: '#059669',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '0.65rem',
                    padding: '0.65rem 1.5rem',
                    cursor: 'pointer',
                    fontWeight: 700,
                  }}
                >
                  {editingEnrollment ? '💾 Save Changes' : '✓ Enroll Farmer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* PRESERVED MODAL 2: DETAILED INTAKE MODAL                              */}
      {/* ===================================================================== */}
      {showIntakeModal && (
        <div style={modalBackdropStyle} onClick={() => setShowIntakeModal(false)}>
          <div
            className="modal-content card"
            onClick={(e) => e.stopPropagation()}
            style={{ ...modalDialogStyle, maxWidth: '720px', width: '100%' }}
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
                    Log Daily Milk Intake
                  </h2>
                  <p style={{ margin: 0, fontSize: '0.82rem', color: '#64748b' }}>
                    Record procurement from supplier farmer with quality fat/SNF inspection
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowIntakeModal(false)}
                style={modalCloseBtnStyle}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveIntake}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={modalLabelStyle}>
                  Select Enrolled Supplier Farmer *
                  <select
                    value={intakeForm.farmerIdNumber}
                    onChange={(e) => handleIntakeFarmerSelect(e.target.value)}
                    style={modalInputStyle}
                    required
                  >
                    <option value="">-- Choose registered farmer --</option>
                    {enrollments.map((e) => (
                      <option key={e.id} value={e.farmerIdNumber}>
                        {e.farmerName} ({e.farmerIdNumber}) - {e.villageArea || e.district} [
                        {e.status}]
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
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
                  Shift *
                  <select
                    value={intakeForm.shift}
                    onChange={(e) => setIntakeForm({ ...intakeForm, shift: e.target.value })}
                    style={modalInputStyle}
                  >
                    <option value="MORNING">Morning (AM)</option>
                    <option value="EVENING">Evening (PM)</option>
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
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr 1fr',
                  gap: '1rem',
                  marginTop: '0.75rem',
                }}
              >
                <label style={modalLabelStyle}>
                  Volume (Liters) *
                  <input
                    type="number"
                    step="0.5"
                    min="0.5"
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
                  FAT %
                  <input
                    type="number"
                    step="0.1"
                    min="1"
                    max="15"
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
                  SNF %
                  <input
                    type="number"
                    step="0.1"
                    min="1"
                    max="15"
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
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr 1fr',
                  gap: '1rem',
                  marginTop: '0.75rem',
                }}
              >
                <label style={modalLabelStyle}>
                  Rate per Liter (₹) *
                  <input
                    type="number"
                    step="0.1"
                    min="1"
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
                  Store into Silo / Tank
                  <select
                    value={intakeForm.storageTank}
                    onChange={(e) => setIntakeForm({ ...intakeForm, storageTank: e.target.value })}
                    style={modalInputStyle}
                  >
                    <option value="Silo-1 (Raw Cow)">Silo-1 (Raw Cow)</option>
                    <option value="Silo-2 (Buffalo Premium)">Silo-2 (Buffalo Premium)</option>
                    <option value="Tank A (Chilled Bulk)">Tank A (Chilled Bulk)</option>
                    <option value="Tank B (Reserve Buffer)">Tank B (Reserve Buffer)</option>
                  </select>
                </label>

                <label style={modalLabelStyle}>
                  Payment Status
                  <select
                    value={intakeForm.paymentStatus}
                    onChange={(e) =>
                      setIntakeForm({ ...intakeForm, paymentStatus: e.target.value })
                    }
                    style={modalInputStyle}
                  >
                    <option value="PAID">PAID</option>
                    <option value="PENDING">PENDING</option>
                  </select>
                </label>
              </div>

              {/* Dynamic Calculation Banner */}
              <div
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '0.65rem',
                  padding: '1rem',
                  marginTop: '1.25rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>
                    TOTAL BATCH LIABILITY
                  </div>
                  <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#059669' }}>
                    ₹
                    {(
                      (parseFloat(intakeForm.quantityLiters) || 0) *
                      (parseFloat(intakeForm.ratePerLiter) || 0)
                    ).toLocaleString('en-IN', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </div>
                </div>
                <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                  {intakeForm.quantityLiters} L × ₹{intakeForm.ratePerLiter}/L
                </div>
              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: '0.75rem',
                  marginTop: '1.5rem',
                  borderTop: '1px solid #e2e8f0',
                  paddingTop: '1rem',
                }}
              >
                <button
                  type="button"
                  onClick={() => setShowIntakeModal(false)}
                  style={{
                    background: '#ffffff',
                    border: '1.5px solid #cbd5e1',
                    borderRadius: '0.65rem',
                    padding: '0.65rem 1.25rem',
                    cursor: 'pointer',
                    fontWeight: 600,
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="primary"
                  style={{
                    background: '#059669',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '0.65rem',
                    padding: '0.65rem 1.5rem',
                    cursor: 'pointer',
                    fontWeight: 700,
                  }}
                >
                  ✓ Record Intake
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* PRESERVED MODAL 3: RECORD MILK SALE MODAL                             */}
      {/* ===================================================================== */}
      {showSaleModal && (
        <div style={modalBackdropStyle} onClick={() => setShowSaleModal(false)}>
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
                    background: '#fef08a',
                    color: '#854d0e',
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
                    Record Outbound Milk Sale
                  </h2>
                  <p style={{ margin: 0, fontSize: '0.82rem', color: '#64748b' }}>
                    Log milk dispensed to wholesale distributors, commercial vendors, or local
                    retail consumers
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowSaleModal(false)}
                style={modalCloseBtnStyle}
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
                    placeholder="e.g. Sahyadri Dairy Parlor / Mr. Joshi"
                    value={saleForm.buyerName}
                    onChange={(e) => setSaleForm({ ...saleForm, buyerName: e.target.value })}
                    style={modalInputStyle}
                  />
                </label>

                <label style={modalLabelStyle}>
                  Buyer Category *
                  <select
                    value={saleForm.buyerType}
                    onChange={(e) => setSaleForm({ ...saleForm, buyerType: e.target.value })}
                    style={modalInputStyle}
                  >
                    <option value="RETAIL_CONSUMER">Retail Consumer (Counter)</option>
                    <option value="COMMERCIAL_SHOP">Commercial Shop / Tea Stall</option>
                    <option value="WHOLESALE_DISTRIBUTOR">Wholesale Distributor</option>
                    <option value="PROCESSING_PLANT">Dairy Processing Plant</option>
                  </select>
                </label>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr 1fr',
                  gap: '1rem',
                  marginTop: '0.75rem',
                }}
              >
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
                    <option value="MIXED">Mixed Milk</option>
                  </select>
                </label>

                <label style={modalLabelStyle}>
                  Dispense From Silo/Tank
                  <select
                    value={saleForm.dispensedFromTank}
                    onChange={(e) =>
                      setSaleForm({ ...saleForm, dispensedFromTank: e.target.value })
                    }
                    style={modalInputStyle}
                  >
                    <option value="Tank A (Chilled Bulk)">Tank A (Chilled Bulk)</option>
                    <option value="Silo-1 (Raw Cow)">Silo-1 (Raw Cow)</option>
                    <option value="Silo-2 (Buffalo Premium)">Silo-2 (Buffalo Premium)</option>
                    <option value="Tank B (Reserve Buffer)">Tank B (Reserve Buffer)</option>
                  </select>
                </label>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '1rem',
                  marginTop: '0.75rem',
                }}
              >
                <label style={modalLabelStyle}>
                  Volume Sold (Liters) *
                  <input
                    type="number"
                    step="0.5"
                    min="0.5"
                    required
                    value={saleForm.quantityLiters}
                    onChange={(e) =>
                      setSaleForm({ ...saleForm, quantityLiters: parseFloat(e.target.value) || 0 })
                    }
                    style={modalInputStyle}
                  />
                </label>

                <label style={modalLabelStyle}>
                  Selling Price per Liter (₹) *
                  <input
                    type="number"
                    step="0.5"
                    min="1"
                    required
                    value={saleForm.pricePerLiter}
                    onChange={(e) =>
                      setSaleForm({ ...saleForm, pricePerLiter: parseFloat(e.target.value) || 0 })
                    }
                    style={modalInputStyle}
                  />
                </label>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '1rem',
                  marginTop: '0.75rem',
                }}
              >
                <label style={modalLabelStyle}>
                  Payment Method
                  <select
                    value={saleForm.paymentMethod}
                    onChange={(e) => setSaleForm({ ...saleForm, paymentMethod: e.target.value })}
                    style={modalInputStyle}
                  >
                    <option value="UPI">UPI Digital (PhonePe / GPay)</option>
                    <option value="CASH">Cash at Counter</option>
                    <option value="BANK_TRANSFER">Bank IMPS / NEFT</option>
                    <option value="INVOICE_CREDIT">30-Day Credit Invoice</option>
                  </select>
                </label>

                <label style={modalLabelStyle}>
                  Payment Status
                  <select
                    value={saleForm.paymentStatus}
                    onChange={(e) => setSaleForm({ ...saleForm, paymentStatus: e.target.value })}
                    style={modalInputStyle}
                  >
                    <option value="PAID">PAID (Settled Immediately)</option>
                    <option value="PENDING">PENDING (Receivable Outstanding)</option>
                    <option value="PARTIAL">PARTIAL (Partial advance)</option>
                  </select>
                </label>
              </div>

              {/* Dynamic Sale Revenue Banner */}
              <div
                style={{
                  background: '#fefce8',
                  border: '1.5px solid #fef08a',
                  borderRadius: '0.65rem',
                  padding: '1rem',
                  marginTop: '1.25rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#854d0e' }}>
                    TOTAL SALE REVENUE
                  </div>
                  <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#a16207' }}>
                    ₹
                    {(
                      (parseFloat(saleForm.quantityLiters) || 0) *
                      (parseFloat(saleForm.pricePerLiter) || 0)
                    ).toLocaleString('en-IN', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </div>
                </div>
                <div style={{ fontSize: '0.8rem', color: '#713f12' }}>
                  {saleForm.quantityLiters} L × ₹{saleForm.pricePerLiter}/L
                </div>
              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: '0.75rem',
                  marginTop: '1.5rem',
                  borderTop: '1px solid #e2e8f0',
                  paddingTop: '1rem',
                }}
              >
                <button
                  type="button"
                  onClick={() => setShowSaleModal(false)}
                  style={{
                    background: '#ffffff',
                    border: '1.5px solid #cbd5e1',
                    borderRadius: '0.65rem',
                    padding: '0.65rem 1.25rem',
                    cursor: 'pointer',
                    fontWeight: 600,
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="primary"
                  style={{
                    background: '#2563eb',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '0.65rem',
                    padding: '0.65rem 1.5rem',
                    cursor: 'pointer',
                    fontWeight: 700,
                  }}
                >
                  ✓ Confirm &amp; Dispatch Sale
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* PRESERVED MODAL 4: INSPECT FARMER LIVESTOCK HEALTH & WITHDRAWALS      */}
      {/* ===================================================================== */}
      {inspectingFarmerHealth && (
        <div style={modalBackdropStyle} onClick={() => setInspectingFarmerHealth(null)}>
          <div
            className="modal-content card"
            onClick={(e) => e.stopPropagation()}
            style={{ ...modalDialogStyle, maxWidth: '850px', width: '100%' }}
          >
            <div style={modalHeaderStyle}>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.35rem', color: '#0f172a', fontWeight: 800 }}>
                  🔍 Herd Health &amp; Withdrawal Inspection
                </h2>
                <p style={{ margin: '0.2rem 0 0', fontSize: '0.85rem', color: '#64748b' }}>
                  Farmer: <strong>{inspectingFarmerHealth.farmer?.name}</strong> (
                  <code>{inspectingFarmerHealth.farmer?.farmerIdNumber}</code>) · Farm:{' '}
                  <strong>{inspectingFarmerHealth.farm?.name}</strong>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setInspectingFarmerHealth(null)}
                style={modalCloseBtnStyle}
              >
                ✕
              </button>
            </div>

            {/* Health Compliance Summary Badges */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                gap: '0.75rem',
                marginBottom: '1.25rem',
              }}
            >
              <div
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '0.5rem',
                  padding: '0.75rem',
                }}
              >
                <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700 }}>
                  TOTAL HERD
                </div>
                <div style={{ fontSize: '1.3rem', fontWeight: 800 }}>
                  {inspectingFarmerHealth.summary?.totalAnimals || 0} Animals
                </div>
              </div>

              <div
                style={{
                  background: '#ecfdf5',
                  border: '1px solid #a7f3d0',
                  borderRadius: '0.5rem',
                  padding: '0.75rem',
                }}
              >
                <div style={{ fontSize: '0.72rem', color: '#047857', fontWeight: 700 }}>
                  ELIGIBLE FOR MILK
                </div>
                <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#065f46' }}>
                  {inspectingFarmerHealth.summary?.eligibleAnimals || 0}
                </div>
              </div>

              <div
                style={{
                  background: '#fffbeb',
                  border: '1px solid #fde68a',
                  borderRadius: '0.5rem',
                  padding: '0.75rem',
                }}
              >
                <div style={{ fontSize: '0.72rem', color: '#92400e', fontWeight: 700 }}>
                  UNDER WITHDRAWAL
                </div>
                <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#b45309' }}>
                  {inspectingFarmerHealth.summary?.underWithdrawal || 0}
                </div>
              </div>

              <div
                style={{
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: '0.5rem',
                  padding: '0.75rem',
                }}
              >
                <div style={{ fontSize: '0.72rem', color: '#b91c1c', fontWeight: 700 }}>
                  UNDER TREATMENT
                </div>
                <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#dc2626' }}>
                  {inspectingFarmerHealth.summary?.underTreatment || 0}
                </div>
              </div>
            </div>

            {/* List of Herd Animals with Withdrawal status */}
            <div style={{ overflowX: 'auto', maxHeight: '350px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                  <tr
                    style={{
                      borderBottom: '2px solid #e2e8f0',
                      color: '#64748b',
                      textAlign: 'left',
                    }}
                  >
                    <th style={{ padding: '0.5rem' }}>Tag / Name</th>
                    <th style={{ padding: '0.5rem' }}>Species / Breed</th>
                    <th style={{ padding: '0.5rem' }}>Current Milk Status</th>
                    <th style={{ padding: '0.5rem' }}>Active Drug / Treatment</th>
                    <th style={{ padding: '0.5rem', textAlign: 'right' }}>Audit Trail</th>
                  </tr>
                </thead>
                <tbody>
                  {inspectingFarmerHealth.animals?.map((a) => (
                    <tr key={a.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '0.65rem 0.5rem' }}>
                        <strong>{a.name || a.tagNumber}</strong>
                        <div style={{ fontSize: '0.74rem', color: '#64748b' }}>
                          Tag: <code>{a.tagNumber}</code>
                        </div>
                      </td>

                      <td style={{ padding: '0.65rem 0.5rem', color: '#475569' }}>
                        {a.species} · {a.breed}
                      </td>

                      <td style={{ padding: '0.65rem 0.5rem' }}>
                        <span
                          style={{
                            background:
                              a.milkStatus?.status === 'ELIGIBLE_FOR_MILK'
                                ? '#ecfdf5'
                                : a.milkStatus?.status === 'UNDER_WITHDRAWAL'
                                  ? '#fffbeb'
                                  : '#fef2f2',
                            color:
                              a.milkStatus?.status === 'ELIGIBLE_FOR_MILK'
                                ? '#065f46'
                                : a.milkStatus?.status === 'UNDER_WITHDRAWAL'
                                  ? '#92400e'
                                  : '#b91c1c',
                            padding: '0.15rem 0.5rem',
                            borderRadius: '0.35rem',
                            fontSize: '0.74rem',
                            fontWeight: 700,
                          }}
                        >
                          {a.milkStatus?.label || 'UNKNOWN'}
                        </span>
                      </td>

                      <td
                        style={{ padding: '0.65rem 0.5rem', fontSize: '0.8rem', color: '#475569' }}
                      >
                        {a.milkStatus?.drug ? (
                          <div>
                            <strong>{a.milkStatus.drug}</strong>
                            <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                              Route: {a.milkStatus.route}
                            </div>
                          </div>
                        ) : (
                          <span style={{ color: '#94a3b8' }}>None (Clean)</span>
                        )}
                      </td>

                      <td style={{ padding: '0.65rem 0.5rem', textAlign: 'right' }}>
                        <button
                          type="button"
                          onClick={() => openAnimalTimeline(a)}
                          style={{
                            background: '#f1f5f9',
                            border: '1px solid #cbd5e1',
                            borderRadius: '0.45rem',
                            padding: '0.3rem 0.65rem',
                            fontSize: '0.76rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          View Passport ↗
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                marginTop: '1.25rem',
                borderTop: '1px solid #e2e8f0',
                paddingTop: '0.75rem',
              }}
            >
              <button
                type="button"
                onClick={() => setInspectingFarmerHealth(null)}
                style={{
                  background: '#059669',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '0.5rem',
                  padding: '0.55rem 1.25rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Close Inspection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* PRESERVED MODAL 5: REVIEW CERTIFICATE & JOIN REQUEST                  */}
      {/* ===================================================================== */}
      {reviewingRequest && (
        <div style={modalBackdropStyle} onClick={() => setReviewingRequest(null)}>
          <div
            className="modal-content card"
            onClick={(e) => e.stopPropagation()}
            style={{ ...modalDialogStyle, maxWidth: '780px', width: '100%' }}
          >
            <div style={modalHeaderStyle}>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.35rem', color: '#0f172a', fontWeight: 800 }}>
                  📜 Review Farmer Verification &amp; Supply Certificate
                </h2>
                <p style={{ margin: '0.2rem 0 0', fontSize: '0.85rem', color: '#64748b' }}>
                  Verify livestock health clearance before approving farmer for daily milk
                  procurement
                </p>
              </div>
              <button
                type="button"
                onClick={() => setReviewingRequest(null)}
                style={modalCloseBtnStyle}
              >
                ✕
              </button>
            </div>

            {loadingCertDetails ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
                <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>⏳</div>
                Verifying digital certificate clearance and herd history…
              </div>
            ) : (
              <div>
                {/* Farmer & Application Summary */}
                <div
                  style={{
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '0.75rem',
                    padding: '1rem',
                    marginBottom: '1rem',
                  }}
                >
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700 }}>
                        FARMER &amp; FARM
                      </div>
                      <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>
                        {reviewingRequest.farmerName}
                      </div>
                      <div style={{ fontSize: '0.85rem', color: '#475569' }}>
                        {reviewingRequest.farmName} (
                        {reviewingRequest.villageArea || reviewingRequest.district})
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700 }}>
                        EXPECTED SUPPLY
                      </div>
                      <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#059669' }}>
                        {reviewingRequest.expectedDailyQuantity} L / Day (
                        {reviewingRequest.milkType})
                      </div>
                      <div style={{ fontSize: '0.85rem', color: '#475569' }}>
                        Contract Proposed Rate: ₹{reviewingRequest.agreedRatePerLiter}/L
                      </div>
                    </div>
                  </div>
                </div>

                {/* Certificate Verification Details */}
                {reviewCertDetails ? (
                  <div
                    style={{
                      background: '#ecfdf5',
                      border: '1.5px solid #a7f3d0',
                      borderRadius: '0.75rem',
                      padding: '1rem',
                      marginBottom: '1rem',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        marginBottom: '0.5rem',
                      }}
                    >
                      <span style={{ fontSize: '1.3rem' }}>🛡️</span>
                      <div>
                        <strong style={{ color: '#065f46', fontSize: '0.98rem' }}>
                          Valid Certificate / Clearance Verified
                        </strong>
                        <div style={{ fontSize: '0.76rem', color: '#047857' }}>
                          Certificate #
                          {reviewCertDetails.certificateNumber ||
                            reviewingRequest.certificateNumber}
                        </div>
                      </div>
                    </div>
                    <div style={{ fontSize: '0.84rem', color: '#065f46', lineHeight: 1.5 }}>
                      Status: <strong>{reviewCertDetails.status || 'ACTIVE'}</strong> · Clearance
                      Date: <strong>{reviewCertDetails.issueDate || 'Recent'}</strong>
                    </div>
                  </div>
                ) : (
                  <div
                    style={{
                      background: '#fffbeb',
                      border: '1px solid #fde68a',
                      borderRadius: '0.75rem',
                      padding: '1rem',
                      marginBottom: '1rem',
                      color: '#92400e',
                      fontSize: '0.88rem',
                    }}
                  >
                    ℹ️ No digital blockchain clearance attached. Reviewing standard cooperative
                    application.
                  </div>
                )}

                {/* Action Form: Finalize Base Rate & Notes */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 2fr',
                    gap: '1rem',
                    marginBottom: '1rem',
                  }}
                >
                  <label style={modalLabelStyle}>
                    Agreed Purchase Rate (₹/L)
                    <input
                      type="number"
                      step="0.5"
                      min="1"
                      value={reviewAgreedRate}
                      onChange={(e) => setReviewAgreedRate(e.target.value)}
                      style={modalInputStyle}
                    />
                  </label>

                  <label style={modalLabelStyle}>
                    Approval / Rejection Notes
                    <input
                      type="text"
                      placeholder="e.g. Approved. Milk collection starts from tomorrow morning."
                      value={reviewNotes}
                      onChange={(e) => setReviewNotes(e.target.value)}
                      style={modalInputStyle}
                    />
                  </label>
                </div>

                {/* Action Buttons */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'flex-end',
                    gap: '0.75rem',
                    marginTop: '1.5rem',
                    borderTop: '1px solid #e2e8f0',
                    paddingTop: '1rem',
                  }}
                >
                  <button
                    type="button"
                    disabled={reviewActionSubmitting}
                    onClick={handleRejectJoinRequest}
                    style={{
                      background: '#ffffff',
                      border: '1.5px solid #fca5a5',
                      color: '#dc2626',
                      borderRadius: '0.65rem',
                      padding: '0.65rem 1.25rem',
                      fontWeight: 700,
                      cursor: reviewActionSubmitting ? 'not-allowed' : 'pointer',
                    }}
                  >
                    Decline Request
                  </button>

                  <button
                    type="button"
                    disabled={reviewActionSubmitting}
                    onClick={handleAcceptJoinRequest}
                    style={{
                      background: '#059669',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '0.65rem',
                      padding: '0.65rem 1.5rem',
                      fontWeight: 700,
                      cursor: reviewActionSubmitting ? 'not-allowed' : 'pointer',
                      boxShadow: '0 4px 10px rgba(5, 150, 105, 0.25)',
                    }}
                  >
                    {reviewActionSubmitting ? 'Approving…' : '✓ Approve & Authorize Supply'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* PRESERVED MODAL 6: LIVE CAMERA QR SCANNER MODAL                       */}
      {/* ===================================================================== */}
      {showFastScanner && (
        <FarmerQrScannerModal
          onClose={() => setShowFastScanner(false)}
          onScan={(scannedVal) => {
            setShowFastScanner(false);
            setFastSearchFarmerId(scannedVal);
            handleValidateFarmerForIntake(scannedVal);
          }}
          activeFarmers={enrollments.filter((e) => e.status === 'ACTIVE')}
        />
      )}
    </div>
  );
}
