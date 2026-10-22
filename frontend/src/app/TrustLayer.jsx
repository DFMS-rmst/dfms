import { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { api, download, publicApi } from './api.js';
import { toast } from './toast.js';
import { MyClinicalAnalytics } from './MyClinicalAnalytics.jsx';
import { OrganizationWideAnalytics } from './OrganizationWideAnalytics.jsx';

const label = (x) => x?.replaceAll('_', ' ');

export function Certificates({ farms, isAdmin, _canAnchor = false, canRevoke = false }) {
  const [farmId, setFarmId] = useState(farms[0]?.id || '');
  const [items, setItems] = useState([]);
  const [selected, setSelected] = useState(null);

  // Farmer Today's Clearance QR state
  const [todayClearance, setTodayClearance] = useState(() => {
    try {
      const saved = sessionStorage.getItem('dfms_active_clearance');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [loadingClearance, setLoadingClearance] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [downloading, setDownloading] = useState(false);

  // Load today's clearance for farmer
  async function loadFarmerClearance(targetFarmId) {
    if (!targetFarmId || isAdmin) return;
    setLoadingClearance(true);
    try {
      const res = await api(`/farms/${targetFarmId}/eligibility/today`).catch(() =>
        api(`/daily-clearances/today?farmId=${targetFarmId}`),
      );
      const evalData = res?.evaluation || res;
      const clr = res?.clearance || evalData?.clearance || null;
      const clrInfo = {
        clearanceNumber: res?.clearanceNumber || clr?.clearanceNumber || null,
        verificationId: res?.verificationId || clr?.verificationId || null,
        evaluationId: res?.evaluationId || evalData?.id || null,
        status: res?.status || evalData?.status || 'CURRENT',
        eligibleCount: res?.eligibleCount ?? evalData?.eligibleCount ?? 0,
        blockedCount: res?.blockedCount ?? evalData?.blockedCount ?? 0,
        applicableCount: res?.applicableCount ?? evalData?.applicableCount ?? 0,
        businessDate: res?.businessDate || evalData?.businessDate || new Date().toISOString(),
        clearance: clr,
      };
      setTodayClearance(clrInfo);
      if (clrInfo.clearanceNumber || clrInfo.verificationId) {
        sessionStorage.setItem('dfms_active_clearance', JSON.stringify(clrInfo));
      }
    } catch (err) {
      console.warn('Could not load today clearance for farm:', err.message);
    } finally {
      setLoadingClearance(false);
    }
  }

  // Load admin certificates table
  async function loadAdminCertificates() {
    if (!isAdmin) return;
    try {
      const res = await api('/certificates');
      setItems(res.certificates || []);
    } catch (err) {
      toast.error(err.message || 'Failed to load certificates');
    }
  }

  useEffect(() => {
    if (isAdmin) {
      loadAdminCertificates();
    } else if (farmId) {
      loadFarmerClearance(farmId);
    }
  }, [farmId, isAdmin]); // eslint-disable-line react-hooks/exhaustive-deps

  // Listen for clearance-updated events from AMU section
  useEffect(() => {
    function onClearanceUpdated(e) {
      if (e.detail) {
        setTodayClearance(e.detail);
      }
    }
    window.addEventListener('clearance-updated', onClearanceUpdated);
    return () => window.removeEventListener('clearance-updated', onClearanceUpdated);
  }, []);

  async function generateTodayClearance() {
    if (!farmId) return;
    setGenerating(true);
    try {
      const res = await api('/daily-clearances/run-today', {
        method: 'POST',
        body: JSON.stringify({ farmId }),
      });
      const evalData = res.evaluation;
      const clr = evalData?.clearance;
      const clrInfo = {
        clearanceNumber: clr?.clearanceNumber || null,
        verificationId: clr?.verificationId || null,
        evaluationId: evalData?.id || null,
        status: evalData?.status || 'CURRENT',
        eligibleCount: evalData?.eligibleCount ?? 0,
        blockedCount: evalData?.blockedCount ?? 0,
        applicableCount: evalData?.applicableCount ?? 0,
        businessDate: evalData?.businessDate || new Date().toISOString(),
        clearance: clr,
      };
      setTodayClearance(clrInfo);
      sessionStorage.setItem('dfms_active_clearance', JSON.stringify(clrInfo));
      toast.success("Today's milk collection clearance generated successfully!");
    } catch (err) {
      toast.error(err.message || 'Failed to generate clearance');
    } finally {
      setGenerating(false);
    }
  }

  async function handleDownloadPdf() {
    if (!todayClearance?.evaluationId || !todayClearance?.clearanceNumber) {
      toast.info('No positive clearance document available for download.');
      return;
    }
    setDownloading(true);
    try {
      await download(
        `/daily-clearances/${todayClearance.evaluationId}/pdf`,
        `${todayClearance.clearanceNumber}.pdf`,
      );
      toast.success('Clearance PDF with QR downloaded successfully!');
    } catch (err) {
      toast.error(err.message || 'Download failed');
    } finally {
      setDownloading(false);
    }
  }

  async function open(id) {
    setSelected(await api(`/certificates/${id}`));
  }

  async function revoke(id) {
    const reason = window.prompt('Administrative revocation reason');
    if (!reason) return;
    try {
      await api(`/certificates/${id}/revoke`, {
        method: 'POST',
        body: JSON.stringify({ code: 'ADMINISTRATIVE_CORRECTION', reason }),
      });
      toast.success('Certificate revoked successfully.');
      await open(id);
      await loadAdminCertificates();
    } catch (err) {
      toast.error(err.message || 'Failed to revoke certificate');
    }
  }

  // --- FARMER VIEW: TODAY'S CLEARANCE QR (No data table) ---
  if (!isAdmin) {
    const verificationUrl = todayClearance?.verificationId
      ? `${window.location.origin}/verify/daily-clearance/${todayClearance.verificationId}`
      : todayClearance?.clearanceNumber
        ? `${window.location.origin}/verify/daily-clearance/${todayClearance.clearanceNumber}`
        : '';

    return (
      <section className="todays-clearance-qr-section">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.75rem' }}>Today&apos;s Clearance QR</h1>
            <p style={{ margin: '0.3rem 0 0', color: '#64748b', fontSize: '0.9rem' }}>
              Instant verification QR code for daily milk collection & dairy dispatch.
            </p>
          </div>
          {farms.length > 1 && (
            <label style={{ margin: 0 }}>
              Farm
              <select value={farmId} onChange={(e) => setFarmId(e.target.value)}>
                {farms.map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.name}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>

        {loadingClearance && !todayClearance && (
          <p style={{ color: '#64748b' }}>Checking today&apos;s clearance status…</p>
        )}

        {todayClearance?.clearanceNumber || todayClearance?.verificationId ? (
          <article
            className="card clearance-qr-card"
            style={{
              maxWidth: 640,
              margin: '0 auto',
              padding: '2rem',
              borderRadius: '1.25rem',
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              boxShadow: '0 4px 16px rgba(0, 0, 0, 0.05)',
              textAlign: 'center',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <span className="badge" style={{ backgroundColor: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0', fontSize: '0.85rem', padding: '0.35rem 0.75rem' }}>
                STATUS: {label(todayClearance.status || 'CURRENT')}
              </span>
              <span className="badge" style={{ backgroundColor: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', fontSize: '0.85rem', padding: '0.35rem 0.75rem' }}>
                ELIGIBLE: {todayClearance.eligibleCount ?? 0} ANIMALS
              </span>
            </div>

            <h2 style={{ fontSize: '1.5rem', margin: '0.5rem 0 0.25rem', color: '#1e293b', wordBreak: 'break-all' }}>
              {todayClearance.clearanceNumber || 'Clearance Verified'}
            </h2>
            <p style={{ color: '#64748b', fontSize: '0.85rem', margin: '0 0 1.5rem' }}>
              Business Date: {String(todayClearance.businessDate || '').slice(0, 10)}
            </p>

            {/* QR Code Container */}
            <div
              style={{
                display: 'inline-flex',
                padding: '1.25rem',
                borderRadius: '1rem',
                background: '#ffffff',
                border: '2px solid #e2e8f0',
                boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                marginBottom: '1.5rem',
              }}
            >
              <QRCodeSVG
                value={verificationUrl || 'DFMS-CLEARANCE'}
                size={220}
                level="H"
                includeMargin={true}
              />
            </div>

            <div style={{ background: '#f8fafc', padding: '0.85rem 1rem', borderRadius: '0.75rem', border: '1px solid #e2e8f0', marginBottom: '1.5rem', wordBreak: 'break-all', fontSize: '0.82rem', color: '#475569' }}>
              <strong>Verification ID:</strong> {todayClearance.verificationId || 'N/A'}
              <br />
              <strong>Verification URL:</strong>{' '}
              <a href={verificationUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#2563eb' }}>
                {verificationUrl}
              </a>
            </div>

            <p className="notice" style={{ fontSize: '0.82rem', textAlign: 'left', margin: '0 0 1.5rem' }}>
              This clearance certificate is derived from recorded veterinary treatment history and configured withdrawal reference rules. It does not replace laboratory residue testing.
            </p>

            <div className="actions" style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="primary-btn"
                disabled={downloading}
                onClick={handleDownloadPdf}
                style={{ borderRadius: '0.75rem', padding: '0.65rem 1.25rem', fontWeight: 600 }}
              >
                📄 {downloading ? 'Downloading…' : 'Download PDF with QR'}
              </button>

              <button
                type="button"
                onClick={() => {
                  if (verificationUrl) {
                    navigator.clipboard.writeText(verificationUrl);
                    toast.success('Verification URL copied to clipboard!');
                  }
                }}
                style={{ borderRadius: '0.75rem', padding: '0.65rem 1.25rem' }}
              >
                📋 Copy Link
              </button>

              <button
                type="button"
                disabled={generating}
                onClick={generateTodayClearance}
                style={{ borderRadius: '0.75rem', padding: '0.65rem 1.25rem' }}
              >
                🔄 {generating ? 'Re-evaluating…' : 'Refresh Clearance'}
              </button>
            </div>
          </article>
        ) : (
          <article
            className="card"
            style={{
              maxWidth: 580,
              margin: '2rem auto',
              padding: '2rem',
              textAlign: 'center',
              borderRadius: '1.25rem',
            }}
          >
            <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>🥛</div>
            <h3 style={{ margin: '0 0 0.5rem', color: '#1e293b' }}>
              No Clearance QR Generated For Today Yet
            </h3>
            <p style={{ color: '#64748b', fontSize: '0.9rem', margin: '0 0 1.5rem' }}>
              Run today&apos;s milk eligibility evaluation to compute withdrawal clearances and render your dispatch QR code.
            </p>
            <button
              type="button"
              className="primary-btn"
              disabled={generating}
              onClick={generateTodayClearance}
              style={{ borderRadius: '0.75rem', padding: '0.75rem 1.5rem', fontWeight: 600 }}
            >
              ⚡ {generating ? 'Generating Clearance…' : "Generate Today's Clearance QR"}
            </button>
          </article>
        )}
      </section>
    );
  }

  // --- ADMIN VIEW: PLATFORM CERTIFICATES & AUDIT ---
  return (
    <section>
      <h1>Platform Milk Eligibility Certificates</h1>
      <p className="notice">
        Certificates are based on recorded treatment history and configured withdrawal rules—not laboratory residue testing.
      </p>
      <div className="grid">
        {items.map((x) => (
          <button className="card farm" key={x.id} onClick={() => open(x.id)}>
            <span className="badge">{label(x.status)}</span>
            <h3>{x.certificateNumber}</h3>
            <p>
              {x.animal.tagNumber} · {x.animal.farm.name}
            </p>
            <small>Eligible from {new Date(x.eligibleFrom).toLocaleString()}</small>
          </button>
        ))}
      </div>
      {selected && (
        <article className="card">
          <h2>{selected.certificate.certificateNumber}</h2>
          <p>
            <strong>Certificate status:</strong> {label(selected.certificate.status)}
          </p>
          <p>
            <strong>Document integrity:</strong> {label(selected.documentIntegrity || 'VERIFIED')}{' '}
            (Canonical SHA-256)
          </p>
          <img className="qr" src={selected.qrDataUrl} alt="Certificate verification QR code" />
          <p>{selected.certificate.disclaimer}</p>
          <div className="actions">
            <button
              onClick={() =>
                download(
                  `/certificates/${selected.certificate.id}/pdf`,
                  `${selected.certificate.certificateNumber}.pdf`,
                )
              }
            >
              Download PDF
            </button>
            {canRevoke && selected.certificate.status === 'ACTIVE' && (
              <button className="danger" onClick={() => revoke(selected.certificate.id)}>
                Revoke certificate
              </button>
            )}
          </div>
        </article>
      )}
    </section>
  );
}

export function PublicVerification({ verificationId }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    publicApi(`/public/certificates/${verificationId}`)
      .then(setData)
      .catch((x) => setError(x.message));
  }, [verificationId]);
  return (
    <main className="auth-page">
      <article className="card verification">
        <p className="eyebrow">Public verification</p>
        <h1>Milk Eligibility Certificate</h1>
        {error && <p className="error">{error}</p>}
        {data && (
          <>
            <h2>{data.certificateNumber}</h2>
            <p>
              <strong>Certificate Status:</strong> {label(data.certificateStatus)}
            </p>
            <p>
              <strong>Eligibility:</strong> ELIGIBLE FROM{' '}
              {new Date(data.eligibleFrom).toLocaleString()}
            </p>
            <p>
              <strong>Document Integrity:</strong> {label(data.documentIntegrity || 'VERIFIED')}{' '}
              (Canonical SHA-256)
            </p>
            <p>
              Animal {data.animalTag} · {data.species} · {data.farmName}
            </p>
            <p className="notice">{data.disclaimer}</p>
          </>
        )}
      </article>
    </main>
  );
}

export function DashboardReports({ farms, workspace }) {
  const admin = workspace.kind === 'ADMIN';
  const vet = workspace.kind === 'VETERINARIAN';
  const [farmId, setFarmId] = useState(farms[0]?.id || '');
  const [data, setData] = useState(null);
  const endpoint = admin
    ? '/dashboards/admin'
    : vet
      ? '/dashboards/veterinarian'
      : `/dashboards/farm?farmId=${farmId}`;

  useEffect(() => {
    if (admin || vet || farmId) api(endpoint).then(setData);
  }, [endpoint, farmId, admin, vet]);

  const reports = admin
    ? ['organization-amu', 'withdrawal-eligibility', 'veterinary-activity', 'audit']
    : vet
      ? ['animal-treatment-history', 'withdrawal-eligibility', 'veterinary-activity']
      : [
          'farm-amu',
          'animal-treatment-history',
          'withdrawal-eligibility',
          'certificates',
          'veterinary-activity',
        ];

  return (
    <section>
      <h1>{admin ? 'Platform' : vet ? 'Veterinarian' : 'Farm'} Dashboard & Reports</h1>
      {!admin && !vet && (
        <label>
          Farm
          <select value={farmId} onChange={(e) => setFarmId(e.target.value)}>
            {farms.map((x) => (
              <option key={x.id} value={x.id}>
                {x.name}
              </option>
            ))}
          </select>
        </label>
      )}

      {/* KPI Overview Tiles */}
      {data && (
        <div className="grid">
          <Tile n={data.animals} t="Animals" />
          <Tile n={data.activeTreatmentRequests ?? data.pendingRequests} t="Active requests" />
          <Tile n={data.openCases} t="Open cases" />
          <Tile n={data.activeTreatments} t="Treatments" />
          <Tile n={data.eligibility?.UNDER_WITHDRAWAL || 0} t="Under withdrawal" />
          <Tile n={data.eligibility?.ELIGIBLE_FOR_MILK || 0} t="Eligible animals" />
          {!admin && !vet && <Tile n={data.certificates?.ACTIVE || 0} t="Active certificates" />}
          <Tile n={data.amu?.totalAdministrations || 0} t="AMU administrations" />
        </div>
      )}

      {/* Admin Macro-level Organization Wide Analytics Section */}
      {admin && <OrganizationWideAnalytics />}

      {/* Veterinarian Clinical Analytics Section */}
      {vet && <MyClinicalAnalytics />}

      <h2>Core reports</h2>
      <div className="actions">
        {reports.map((r) => (
          <button
            key={r}
            onClick={() =>
              download(
                `/reports/${r}?format=csv${farmId && !admin ? `&farmId=${farmId}` : ''}`,
                `${r}.csv`,
              )
            }
          >
            {label(r)} CSV
          </button>
        ))}
      </div>
    </section>
  );
}

function Tile({ n, t }) {
  return (
    <article className="card">
      <small>{t}</small>
      <h3>{n ?? 0}</h3>
    </article>
  );
}
