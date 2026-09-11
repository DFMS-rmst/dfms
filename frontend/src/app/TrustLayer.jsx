import { useEffect, useState } from 'react';
import { api, download, publicApi } from './api.js';

const label = (x) => x?.replaceAll('_', ' ');
export function Certificates({ farms, isAdmin, canAnchor = false, canRevoke = false }) {
  const [farmId, setFarmId] = useState(farms[0]?.id || '');
  const [items, setItems] = useState([]);
  const [selected, setSelected] = useState(null);
  async function load() {
    setItems(
      (await api(`/certificates${!isAdmin && farmId ? `?farmId=${farmId}` : ''}`)).certificates,
    );
  }
  useEffect(() => {
    load();
  }, [farmId, isAdmin]); // eslint-disable-line react-hooks/exhaustive-deps
  async function open(id) {
    setSelected(await api(`/certificates/${id}`));
  }
  async function anchor(id) {
    await api(`/certificates/${id}/blockchain/anchor`, { method: 'POST' });
    await open(id);
  }
  async function revoke(id) {
    const reason = window.prompt('Administrative revocation reason');
    if (!reason) return;
    await api(`/certificates/${id}/revoke`, {
      method: 'POST',
      body: JSON.stringify({ code: 'ADMINISTRATIVE_CORRECTION', reason }),
    });
    await open(id);
    await load();
  }
  return (
    <section>
      <h1>Milk Eligibility Certificates</h1>
      {!isAdmin && (
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
      <p className="notice">
        Certificates are based on recorded treatment history and configured withdrawal rules—not
        laboratory residue testing.
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
            <strong>Blockchain integrity:</strong> {label(selected.blockchainIntegrity)}
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
            {canAnchor && (
              <button onClick={() => anchor(selected.certificate.id)}>Anchor / retry proof</button>
            )}
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
              <strong>Blockchain Integrity:</strong> {label(data.blockchainIntegrity)}
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
    ? [
        'organization-amu',
        'withdrawal-eligibility',
        'certificates',
        'veterinary-activity',
        'audit',
        'blockchain',
      ]
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
      {data && (
        <div className="grid">
          <Tile n={data.animals} t="Animals" />
          <Tile n={data.activeTreatmentRequests ?? data.pendingRequests} t="Active requests" />
          <Tile n={data.openCases} t="Open cases" />
          <Tile n={data.activeTreatments} t="Treatments" />
          <Tile n={data.eligibility?.UNDER_WITHDRAWAL || 0} t="Under withdrawal" />
          <Tile n={data.eligibility?.ELIGIBLE_FOR_MILK || 0} t="Eligible animals" />
          <Tile n={data.certificates?.ACTIVE || 0} t="Active certificates" />
          <Tile n={data.amu?.totalAdministrations || 0} t="AMU administrations" />
        </div>
      )}
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
