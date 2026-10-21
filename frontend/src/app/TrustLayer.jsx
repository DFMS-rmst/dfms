import { useEffect, useState } from 'react';
import { api, download, publicApi } from './api.js';

const label = (x) => x?.replaceAll('_', ' ');

export function Certificates({ farms, isAdmin, _canAnchor = false, canRevoke = false }) {
  const [farmId, setFarmId] = useState(farms[0]?.id || '');
  const [activeTab, setActiveTab] = useState('INDIVIDUAL'); // 'INDIVIDUAL' | 'DAILY_CLEARANCE'
  const [items, setItems] = useState([]);
  const [dailyClearances, setDailyClearances] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function load() {
    setLoading(true);
    setError('');
    try {
      const query = !isAdmin && farmId ? `?farmId=${farmId}` : '';
      const certRes = await api(`/certificates${query}`);
      setItems(certRes.certificates || []);

      // Attempt to load daily clearances for the farm
      if (farmId) {
        try {
          const clearanceRes = await api(`/daily-clearance?farmId=${farmId}`);
          if (clearanceRes?.clearance) {
            setDailyClearances([clearanceRes.clearance]);
          }
        } catch {
          // Non-critical if no active daily clearance
        }
      }
    } catch (err) {
      setError(err.message || 'Unable to load certificates.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [farmId, isAdmin]);

  async function open(id) {
    setSelected(await api(`/certificates/${id}`));
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
      <h1>Milk Clearance & Eligibility Documents</h1>
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

      {/* Tabs between Individual Animal Certificates & Daily Farm Clearances */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', borderBottom: '1px solid #e5e7eb', paddingBottom: '0.5rem' }}>
        <button
          type="button"
          onClick={() => setActiveTab('INDIVIDUAL')}
          style={{
            padding: '0.5rem 1rem',
            borderRadius: '6px',
            border: 'none',
            background: activeTab === 'INDIVIDUAL' ? '#2563eb' : '#f1f5f9',
            color: activeTab === 'INDIVIDUAL' ? '#ffffff' : '#475569',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Individual Animal Certificates ({items.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('DAILY_CLEARANCE')}
          style={{
            padding: '0.5rem 1rem',
            borderRadius: '6px',
            border: 'none',
            background: activeTab === 'DAILY_CLEARANCE' ? '#2563eb' : '#f1f5f9',
            color: activeTab === 'DAILY_CLEARANCE' ? '#ffffff' : '#475569',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Daily Farm Clearances ({dailyClearances.length})
        </button>
      </div>

      <p className="notice">
        Certificates and clearances are based on recorded treatment history and configured withdrawal rules—not
        laboratory residue testing.
      </p>

      {error && <div style={{ padding: '0.75rem', background: '#fef2f2', color: '#991b1b', borderRadius: '6px', margin: '0.5rem 0' }}>{error}</div>}
      {loading && <p>Loading document records…</p>}

      {/* Tab 1: Individual Animal Certificates */}
      {activeTab === 'INDIVIDUAL' && !loading && (
        <>
          {items.length === 0 ? (
            <article className="card" style={{ textAlign: 'center', padding: '2.5rem 1rem', color: '#6b7280', background: '#f9fafb' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>📜</div>
              <h3 style={{ margin: '0 0 0.5rem 0', color: '#374151' }}>No Individual Certificates Issued Yet</h3>
              <p style={{ maxWidth: '560px', margin: '0 auto 1rem auto', fontSize: '0.9rem', lineHeight: 1.5 }}>
                An individual Milk Eligibility Certificate is generated when an animal that received medical treatment completes its mandatory withdrawal period and is verified as eligible.
              </p>
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
                <button type="button" onClick={() => setActiveTab('DAILY_CLEARANCE')} style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}>
                  View Daily Farm Clearances →
                </button>
              </div>
            </article>
          ) : (
            <div className="grid">
              {items.map((x) => {
                const isSuperseded = x.status === 'SUPERSEDED' || x.status === 'REVOKED';
                return (
                  <button
                    className="card farm"
                    key={x.id}
                    onClick={() => open(x.id)}
                    style={{
                      borderLeft: isSuperseded ? '4px solid #94a3b8' : '4px solid #22c55e',
                      opacity: isSuperseded ? 0.8 : 1,
                      textAlign: 'left',
                    }}
                  >
                    <span className={"badge " + (isSuperseded ? "danger" : "success")}>{label(x.status)}</span>
                    <h3>{x.certificateNumber}</h3>
                    <p>
                      Animal: <strong>{x.animal.tagNumber}</strong> · Farm: {x.animal.farm.name}
                    </p>
                    <small>Eligible from {new Date(x.eligibleFrom).toLocaleString()}</small>
                  </button>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Tab 2: Daily Farm Clearances */}
      {activeTab === 'DAILY_CLEARANCE' && !loading && (
        <>
          {dailyClearances.length === 0 ? (
            <article className="card" style={{ textAlign: 'center', padding: '2.5rem 1rem', color: '#6b7280', background: '#f9fafb' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>📋</div>
              <h3 style={{ margin: '0 0 0.5rem 0', color: '#374151' }}>No Daily Clearance Evaluated Yet</h3>
              <p style={{ maxWidth: '560px', margin: '0 auto', fontSize: '0.9rem', lineHeight: 1.5 }}>
                Daily Milk Collection Clearances are created on the "Today's Milk Eligibility" page when the farm evaluates morning or evening herd status before collection.
              </p>
            </article>
          ) : (
            <div className="grid">
              {dailyClearances.map((c) => (
                <article key={c.id} className="card" style={{ borderLeft: '4px solid #22c55e' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className="badge success">CURRENT CLEARANCE</span>
                    <small>{new Date(c.generatedAt).toLocaleString()}</small>
                  </div>
                  <h3>{c.clearanceNumber}</h3>
                  <p>
                    Clearance ID: <code>{c.verificationId}</code>
                  </p>
                  <p>
                    <strong>Summary:</strong> {c.canonicalPayload?.eligibleCount || 0} of {c.canonicalPayload?.applicableCount || 0} applicable animals eligible
                  </p>
                  <div className="actions" style={{ marginTop: '1rem' }}>
                    <button
                      type="button"
                      onClick={() => download(`/daily-clearance/${c.verificationId}/pdf`, `${c.clearanceNumber}.pdf`)}
                    >
                      Download Clearance PDF with QR
                    </button>
                    <a
                      href={`/verify/clearance/${c.verificationId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ padding: '0.4rem 0.8rem', textDecoration: 'none', background: '#f1f5f9', borderRadius: '6px', color: '#334155', fontWeight: 500, fontSize: '0.85rem' }}
                    >
                      Verify Clearance QR ↗
                    </a>
                  </div>
                </article>
              ))}
            </div>
          )}
        </>
      )}

      {/* Selected Certificate Modal / View */}
      {selected && (
        <article className="card" style={{ marginTop: '1.5rem', border: '2px solid #3b82f6' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2>{selected.certificate.certificateNumber}</h2>
            <button type="button" onClick={() => setSelected(null)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '1.2rem' }}>✕</button>
          </div>
          <p>
            <strong>Certificate status:</strong> <span className="badge">{label(selected.certificate.status)}</span>
          </p>
          <p>
            <strong>Document integrity:</strong> {label(selected.documentIntegrity || 'VERIFIED')} (Canonical SHA-256)
          </p>
          {selected.qrDataUrl && (
            <img className="qr" src={selected.qrDataUrl} alt="Certificate verification QR code" style={{ maxWidth: '180px', display: 'block', margin: '1rem 0' }} />
          )}
          <p className="notice">{selected.certificate.disclaimer}</p>
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

// Veterinarian Farm-Wise Traceability & Area Navigation
function VeterinarianTraceabilityDashboard({ authorizedFarms = [] }) {
  const [search, setSearch] = useState('');
  const [districtFilter, setDistrictFilter] = useState('ALL');
  const [selectedFarm, setSelectedFarm] = useState(null);
  const [treatmentFilter, setTreatmentFilter] = useState('ALL'); // 'ALL' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED'
  const [selectedAnimal, setSelectedAnimal] = useState(null);

  // Distinct districts from authorized farms
  const districts = ['ALL', ...new Set(authorizedFarms.map((f) => f.district).filter(Boolean))];

  // Filtered farms
  const filteredFarms = authorizedFarms.filter((f) => {
    const matchesDistrict = districtFilter === 'ALL' || f.district === districtFilter;
    const matchesSearch =
      !search ||
      f.name.toLowerCase().includes(search.toLowerCase()) ||
      f.id.toLowerCase().includes(search.toLowerCase());
    return matchesDistrict && matchesSearch;
  });

  // Current farm's treatments
  const currentFarm = selectedFarm ? authorizedFarms.find((f) => f.id === selectedFarm.id) : null;
  const treatments = currentFarm?.treatments || [];
  const filteredTreatments = treatments.filter((t) => {
    if (treatmentFilter === 'ALL') return true;
    if (treatmentFilter === 'ACTIVE') return t.status === 'ACTIVE' || t.status === 'PLANNED';
    if (treatmentFilter === 'COMPLETED') return t.status === 'COMPLETED';
    if (treatmentFilter === 'CANCELLED') return t.status === 'CANCELLED';
    return true;
  });

  return (
    <div style={{ marginTop: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <div>
          <h2 style={{ margin: 0 }}>Farm-Wise Clinical Traceability</h2>
          <p style={{ margin: '0.25rem 0 0 0', color: '#6b7280', fontSize: '0.875rem' }}>
            Trace treatments by geographical area, farm, and animal history
          </p>
        </div>
        {selectedFarm && (
          <button
            type="button"
            onClick={() => {
              setSelectedFarm(null);
              setSelectedAnimal(null);
            }}
            style={{ padding: '0.4rem 0.8rem', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#ffffff', cursor: 'pointer', fontWeight: 600 }}
          >
            ← Back to All Farms
          </button>
        )}
      </div>

      {/* Navigation Breadcrumb */}
      <div style={{ padding: '0.5rem 0.75rem', background: '#f1f5f9', borderRadius: '6px', fontSize: '0.85rem', color: '#475569', marginBottom: '1.25rem' }}>
        <span
          onClick={() => { setSelectedFarm(null); setSelectedAnimal(null); }}
          style={{ cursor: 'pointer', fontWeight: selectedFarm ? 500 : 700, color: selectedFarm ? '#2563eb' : '#0f172a' }}
        >
          Authorized Farms ({authorizedFarms.length})
        </span>
        {selectedFarm && (
          <>
            {' › '}
            <span
              onClick={() => setSelectedAnimal(null)}
              style={{ cursor: 'pointer', fontWeight: selectedAnimal ? 500 : 700, color: selectedAnimal ? '#2563eb' : '#0f172a' }}
            >
              {selectedFarm.name} ({selectedFarm.district})
            </span>
          </>
        )}
        {selectedAnimal && (
          <>
            {' › '}
            <span style={{ fontWeight: 700, color: '#0f172a' }}>
              Animal {selectedAnimal.tagNumber} ({selectedAnimal.name || 'Livestock'})
            </span>
          </>
        )}
      </div>

      {/* LEVEL 1: All Authorized Farms View */}
      {!selectedFarm && (
        <>
          {/* Area and Search Filters */}
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
            <input
              type="text"
              placeholder="Search farm by name or ID…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ flex: 1, minWidth: '220px', padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid #d1d5db' }}
            />
            <select
              value={districtFilter}
              onChange={(e) => setDistrictFilter(e.target.value)}
              style={{ padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid #d1d5db', background: '#ffffff' }}
            >
              {districts.map((d) => (
                <option key={d} value={d}>
                  {d === 'ALL' ? 'All Areas / Districts' : `District: ${d}`}
                </option>
              ))}
            </select>
          </div>

          {filteredFarms.length === 0 ? (
            <p style={{ padding: '1.5rem', background: '#f9fafb', borderRadius: '8px', color: '#6b7280', textAlign: 'center' }}>
              No authorized farms match your area or search criteria.
            </p>
          ) : (
            <div className="grid">
              {filteredFarms.map((farm) => {
                const activeCount = farm.treatments?.filter((t) => t.status === 'ACTIVE').length || 0;
                const completedCount = farm.treatments?.filter((t) => t.status === 'COMPLETED').length || 0;
                return (
                  <article
                    key={farm.id}
                    className="card"
                    style={{ cursor: 'pointer', transition: 'border-color 0.2s', borderLeft: activeCount > 0 ? '4px solid #3b82f6' : '4px solid #94a3b8' }}
                    onClick={() => setSelectedFarm(farm)}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span className="badge" style={{ background: '#f1f5f9', color: '#334155' }}>
                        📍 {farm.district}, {farm.state}
                      </span>
                      {activeCount > 0 && <span className="badge danger">{activeCount} ACTIVE TREATMENT(S)</span>}
                    </div>
                    <h3 style={{ margin: '0.5rem 0 0.25rem 0' }}>{farm.name}</h3>
                    <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>
                      {farm.taluka ? `Taluka: ${farm.taluka} · ` : ''}PIN: {farm.pincode || 'N/A'}
                    </p>
                    <div style={{ display: 'flex', gap: '1rem', marginTop: '0.75rem', fontSize: '0.85rem', borderTop: '1px solid #f1f5f9', paddingTop: '0.5rem' }}>
                      <span>🐄 {farm.animals?.length || 0} Animals</span>
                      <span>💊 {farm.treatments?.length || 0} Total Treatments</span>
                      <span>✓ {completedCount} Completed</span>
                    </div>
                    <button
                      type="button"
                      style={{ marginTop: '0.75rem', width: '100%', padding: '0.4rem', fontSize: '0.85rem' }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedFarm(farm);
                      }}
                    >
                      Open Farm Treatments & Herd →
                    </button>
                  </article>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* LEVEL 2: Selected Farm Details View */}
      {selectedFarm && !selectedAnimal && currentFarm && (
        <div>
          {/* Farm Header Summary */}
          <div style={{ padding: '1rem', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0 }}>{currentFarm.name}</h3>
                <p style={{ margin: '0.25rem 0 0 0', color: '#64748b', fontSize: '0.85rem' }}>
                  Location: {currentFarm.district}, {currentFarm.state} {currentFarm.taluka ? `· Taluka: ${currentFarm.taluka}` : ''} · Pincode: {currentFarm.pincode || 'N/A'}
                </p>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <span className="badge">{currentFarm.animals?.length || 0} Animals</span>
                <span className="badge">{currentFarm.treatments?.length || 0} Treatments</span>
              </div>
            </div>
          </div>

          {/* Treatment Status Filter Buttons */}
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
            {[
              ['ALL', 'All Treatments'],
              ['ACTIVE', 'Active Treatments'],
              ['COMPLETED', 'Past / Completed'],
              ['CANCELLED', 'Cancelled / Discontinued'],
            ].map(([val, txt]) => (
              <button
                key={val}
                type="button"
                onClick={() => setTreatmentFilter(val)}
                style={{
                  padding: '0.4rem 0.8rem',
                  borderRadius: '6px',
                  border: 'none',
                  background: treatmentFilter === val ? '#2563eb' : '#f1f5f9',
                  color: treatmentFilter === val ? '#ffffff' : '#334155',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                }}
              >
                {txt}
              </button>
            ))}
          </div>

          {/* Treatments Grid */}
          {filteredTreatments.length === 0 ? (
            <p style={{ padding: '1.5rem', background: '#f9fafb', borderRadius: '8px', color: '#6b7280', textAlign: 'center' }}>
              No {treatmentFilter.toLowerCase()} treatments recorded on this farm.
            </p>
          ) : (
            <div className="grid">
              {filteredTreatments.map((treatment) => {
                // Find animal eligibility check
                const animalCheck = currentFarm.eligibilityChecks?.find((ec) => ec.animalId === treatment.animal.id);
                const isUnderWithdrawal = animalCheck?.status === 'UNDER_WITHDRAWAL';
                const isEligible = animalCheck?.status === 'ELIGIBLE_FOR_MILK';

                // Treatment badge
                let statusBadge = (
                  <span className="badge" style={{ background: '#e2e8f0', color: '#334155' }}>
                    {treatment.status}
                  </span>
                );
                if (treatment.status === 'ACTIVE') {
                  statusBadge = <span className="badge" style={{ background: '#dbeafe', color: '#1e40af' }}>ACTIVE TREATMENT</span>;
                } else if (treatment.status === 'COMPLETED') {
                  statusBadge = <span className="badge success">COMPLETED</span>;
                } else if (treatment.status === 'CANCELLED') {
                  statusBadge = <span className="badge danger">CANCELLED</span>;
                }

                // Prescribed medicines summary
                const prescriptionItems = treatment.prescription?.items || [];
                const diagnosis = treatment.case?.diagnoses?.[0];

                return (
                  <article key={treatment.id} className="card" style={{ borderLeft: treatment.status === 'ACTIVE' ? '4px solid #3b82f6' : '4px solid #cbd5e1' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                      {statusBadge}
                      {/* Distinct withdrawal vs milk eligibility badges */}
                      {isUnderWithdrawal && (
                        <span className="badge" style={{ background: '#ffedd5', color: '#9a3412', fontWeight: 600 }}>
                          ⚠️ UNDER WITHDRAWAL
                        </span>
                      )}
                      {isEligible && (
                        <span className="badge success">✓ MILK ELIGIBLE</span>
                      )}
                    </div>

                    <h4 style={{ margin: '0 0 0.25rem 0' }}>
                      Animal: <strong>{treatment.animal.tagNumber}</strong> ({treatment.animal.name || 'Unnamed'})
                    </h4>
                    <p style={{ margin: '0 0 0.5rem 0', color: '#64748b', fontSize: '0.85rem' }}>
                      Farm: {currentFarm.name} · Location: {currentFarm.district}
                    </p>

                    {/* Prescription Details */}
                    {prescriptionItems.length > 0 && (
                      <div style={{ padding: '0.5rem', background: '#f8fafc', borderRadius: '6px', fontSize: '0.85rem', margin: '0.5rem 0' }}>
                        {prescriptionItems.map((pi) => (
                          <div key={pi.id}>
                            <strong>Medicine:</strong> {pi.drug?.name || 'Veterinary Drug'}
                            {pi.drug?.antimicrobialClass?.name && <span style={{ color: '#64748b' }}> ({pi.drug.antimicrobialClass.name})</span>}
                            <div>
                              Dose: {pi.doseValue} {pi.doseUnit} · Route: {pi.route} · Freq: {pi.frequency}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Case and Clinical Diagnosis Linkage */}
                    {diagnosis && (
                      <p style={{ margin: '0.25rem 0', fontSize: '0.85rem' }}>
                        <strong>Clinical Diagnosis:</strong> {diagnosis.disease?.name || 'Clinical Observation'}
                        {diagnosis.clinicalNotes && <span style={{ color: '#475569' }}> — "{diagnosis.clinicalNotes}"</span>}
                      </p>
                    )}

                    {/* Start and Completion Dates */}
                    <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.5rem' }}>
                      <div>Started: {treatment.startedAt ? new Date(treatment.startedAt).toLocaleDateString() : 'Pending'}</div>
                      <div>Completed: {treatment.completedAt ? new Date(treatment.completedAt).toLocaleDateString() : (treatment.expectedEndDate ? `Expected ${new Date(treatment.expectedEndDate).toLocaleDateString()}` : 'Active')}</div>
                      {animalCheck?.withdrawalEndDate && (
                        <div style={{ fontWeight: 600, color: '#c2410c', marginTop: '0.25rem' }}>
                          Withdrawal ends: {new Date(animalCheck.withdrawalEndDate).toLocaleString()}
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      style={{ marginTop: '0.75rem', width: '100%', padding: '0.4rem', fontSize: '0.85rem' }}
                      onClick={() => setSelectedAnimal(treatment.animal)}
                    >
                      View Animal Timeline & History →
                    </button>
                  </article>
                );
              })}
            </div>
          )}

          {/* Animals in Farm Section */}
          <h3 style={{ marginTop: '2rem' }}>Farm Herd Animals ({currentFarm.animals?.length || 0})</h3>
          <div className="grid">
            {currentFarm.animals?.map((animal) => {
              const check = currentFarm.eligibilityChecks?.find((ec) => ec.animalId === animal.id);
              return (
                <article key={animal.id} className="card compact" style={{ cursor: 'pointer' }} onClick={() => setSelectedAnimal(animal)}>
                  <strong>{animal.tagNumber}</strong> · {animal.name || 'Animal'}
                  <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
                    Species: {animal.species?.name || 'Cattle'} · Lactating: {animal.lactating ? 'Yes' : 'No'}
                  </div>
                  {check && (
                    <span className={"badge " + (check.status === "ELIGIBLE_FOR_MILK" ? "success" : "danger")} style={{ marginTop: "0.5rem", display: "inline-block" }}>
                      {label(check.status)}
                    </span>
                  )}
                </article>
              );
            })}
          </div>
        </div>
      )}

      {/* LEVEL 3: Selected Animal Timeline & History */}
      {selectedFarm && selectedAnimal && (
        <article className="card" style={{ marginTop: '1rem', border: '2px solid #3b82f6' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ margin: 0 }}>Animal {selectedAnimal.tagNumber} — Clinical History</h3>
              <p style={{ margin: '0.25rem 0 0 0', color: '#64748b', fontSize: '0.85rem' }}>
                Farm: {selectedFarm.name} · Location: {selectedFarm.district}, {selectedFarm.state}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSelectedAnimal(null)}
              style={{ padding: '0.35rem 0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#ffffff', cursor: 'pointer' }}
            >
              ← Back to Farm Treatments
            </button>
          </div>

          <h4 style={{ marginTop: '1.25rem' }}>Treatments Recorded for Animal {selectedAnimal.tagNumber}</h4>
          {currentFarm?.treatments?.filter((t) => t.animal.id === selectedAnimal.id).length === 0 ? (
            <p style={{ color: '#6b7280' }}>No treatments recorded for this animal.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.5rem' }}>
              {currentFarm.treatments
                .filter((t) => t.animal.id === selectedAnimal.id)
                .map((t) => (
                  <div key={t.id} style={{ padding: '0.75rem', background: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <strong>Status: {t.status}</strong>
                      <small>Started: {t.startedAt ? new Date(t.startedAt).toLocaleDateString() : 'N/A'}</small>
                    </div>
                    {t.prescription?.items?.map((pi) => (
                      <div key={pi.id} style={{ fontSize: '0.85rem', marginTop: '0.25rem' }}>
                        Drug: {pi.drug?.name} · Dose: {pi.doseValue} {pi.doseUnit} ({pi.route})
                      </div>
                    ))}
                    {t.notes && <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.25rem' }}>Notes: {t.notes}</div>}
                  </div>
                ))}
            </div>
          )}
        </article>
      )}
    </div>
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
    ? ['organization-amu', 'withdrawal-eligibility', 'certificates', 'veterinary-activity', 'audit']
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

      {/* Veterinarian Farm-Wise Traceability and Area Navigation */}
      {vet && data?.authorizedFarms && (
        <VeterinarianTraceabilityDashboard authorizedFarms={data.authorizedFarms} />
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
