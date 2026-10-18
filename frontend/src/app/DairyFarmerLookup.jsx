import { useState, useEffect } from 'react';
import { api } from './api.js';
import { HealthTimeline } from './FoundationApp.jsx';

export function DairyFarmerLookup() {
  const [farmersList, setFarmersList] = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [selectedFarmer, setSelectedFarmer] = useState(null);
  const [error, setError] = useState('');
  const [timelineAnimal, setTimelineAnimal] = useState(null);
  const [animalTimeline, setAnimalTimeline] = useState(null);
  const [loadingTimeline, setLoadingTimeline] = useState(false);

  useEffect(() => {
    loadFarmers();
  }, []);

  async function loadFarmers() {
    setLoadingList(true);
    try {
      const res = await api('/dairy/farmers');
      setFarmersList(res.farmers || []);
    } catch (err) {
      setError(err.message || 'Failed to load farmers list');
    } finally {
      setLoadingList(false);
    }
  }

  async function lookupFarmer(query) {
    if (!query || !query.trim()) return;
    setSearching(true);
    setError('');
    try {
      const res = await api(`/dairy/farmers/${encodeURIComponent(query.trim())}`);
      setSelectedFarmer(res);
    } catch (err) {
      setError(err.message || `No farmer found matching ID: ${query}`);
      setSelectedFarmer(null);
    } finally {
      setSearching(false);
    }
  }

  async function openAnimalTimeline(animal) {
    setTimelineAnimal(animal);
    setLoadingTimeline(true);
    try {
      const res = await api(`/dairy/animals/${animal.id}/timeline`);
      setAnimalTimeline({
        animal: res.animal,
        events: res.events || [],
        loading: false,
        error: null,
      });
    } catch (err) {
      setAnimalTimeline({
        animal,
        events: [],
        loading: false,
        error: err.message || 'Failed to retrieve animal health timeline',
      });
    } finally {
      setLoadingTimeline(false);
    }
  }

  return (
    <section>
      <div className="flex-between" style={{ alignItems: 'flex-start', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ margin: '0 0 0.35rem 0' }}>🥛 Farmer &amp; Livestock Health Lookup</h1>
          <p style={{ margin: 0, color: 'var(--ag-text-muted)' }}>
            Search registered farmers by Farmer ID to verify herd health records, withdrawal status, and milk collection eligibility.
          </p>
        </div>
        <button type="button" className="secondary" onClick={loadFarmers}>
          🔄 Refresh Directory
        </button>
      </div>

      {/* SEARCH BAR */}
      <div
        className="card"
        style={{
          background: 'linear-gradient(135deg, #f0fdf4 0%, #ffffff 100%)',
          border: '1.5px solid #bbf7d0',
          marginBottom: '1.75rem',
          padding: '1.5rem',
        }}
      >
        <h3 style={{ margin: '0 0 0.6rem 0', color: '#166534', fontSize: '1.15rem' }}>
          🔍 Lookup Farmer by ID
        </h3>
        <p style={{ margin: '0 0 1rem 0', fontSize: '0.88rem', color: '#475569' }}>
          Enter a Farmer ID (e.g. Kisan Credit Card number, Farmer Registration ID, or Farm Name) to inspect their livestock health records.
        </p>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            lookupFarmer(searchQuery);
          }}
          style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}
        >
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Enter Farmer ID (e.g. KCC-GJ-2024-8841, FRM-..., or Name)"
            style={{
              flex: '1',
              minWidth: '280px',
              padding: '0.75rem 1rem',
              borderRadius: '0.65rem',
              border: '1.5px solid #cbd5e1',
              fontSize: '0.95rem',
            }}
          />
          <button
            type="submit"
            className="primary"
            disabled={searching || !searchQuery.trim()}
            style={{ padding: '0.75rem 1.5rem', fontSize: '0.95rem', fontWeight: 700 }}
          >
            {searching ? 'Searching…' : '🔍 Lookup Farmer'}
          </button>
          {selectedFarmer && (
            <button
              type="button"
              className="secondary"
              onClick={() => {
                setSelectedFarmer(null);
                setSearchQuery('');
              }}
            >
              Clear
            </button>
          )}
        </form>

        {error && (
          <div className="auth-error-alert" style={{ marginTop: '1rem' }}>
            <span className="alert-icon">⚠️</span>
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* SELECTED FARMER DETAILS */}
      {selectedFarmer && (
        <div style={{ marginBottom: '2.5rem' }}>
          {/* Header Card */}
          <div className="card" style={{ marginBottom: '1.25rem', borderLeft: '4px solid var(--ag-green-primary)' }}>
            <div className="flex-between" style={{ alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <span
                  style={{
                    display: 'inline-block',
                    padding: '0.25rem 0.75rem',
                    borderRadius: '9999px',
                    background: '#dcfce7',
                    color: '#166534',
                    fontWeight: 700,
                    fontSize: '0.8rem',
                    marginBottom: '0.4rem',
                  }}
                >
                  ✓ Registered Farmer
                </span>
                <h2 style={{ margin: '0 0 0.35rem 0', fontSize: '1.6rem' }}>
                  {selectedFarmer.farmer.fullName}
                </h2>
                <p style={{ margin: '0 0 0.5rem 0', color: 'var(--ag-text-muted)', fontSize: '0.92rem' }}>
                  <strong>Farmer ID:</strong>{' '}
                  <code style={{ fontSize: '0.95rem', padding: '0.15rem 0.4rem', background: '#f1f5f9', borderRadius: '0.25rem' }}>
                    {selectedFarmer.farmer.farmerIdNumber}
                  </code>{' '}
                  | <strong>Farm:</strong> {selectedFarmer.farm.name} ({selectedFarmer.farm.district}, {selectedFarmer.farm.state})
                </p>
                <p style={{ margin: 0, fontSize: '0.88rem', color: '#64748b' }}>
                  <strong>Contact:</strong> {selectedFarmer.farmer.phone || 'N/A'} · {selectedFarmer.farmer.email}
                </p>
              </div>

              {/* Status summary pill */}
              <div
                style={{
                  textAlign: 'right',
                  padding: '1rem',
                  background: selectedFarmer.summary.canCollectEntireHerd ? '#ecfdf5' : '#fffbeb',
                  borderRadius: '0.75rem',
                  border: `1px solid ${selectedFarmer.summary.canCollectEntireHerd ? '#a7f3d0' : '#fde68a'}`,
                  minWidth: '220px',
                }}
              >
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#64748b' }}>
                  Milk Collection Clearance
                </div>
                <div
                  style={{
                    fontSize: '1.25rem',
                    fontWeight: 800,
                    color: selectedFarmer.summary.canCollectEntireHerd ? '#059669' : '#d97706',
                    marginTop: '0.2rem',
                  }}
                >
                  {selectedFarmer.summary.canCollectEntireHerd ? '✓ ALL ELIGIBLE' : '⚠️ CAUTION REQUIRED'}
                </div>
                <div style={{ fontSize: '0.82rem', marginTop: '0.35rem', color: '#475569' }}>
                  {selectedFarmer.summary.eligibleForCollectionCount} / {selectedFarmer.summary.totalAnimals} Animals Clear
                </div>
              </div>
            </div>

            {/* Recommendation banner */}
            <div
              style={{
                marginTop: '1.25rem',
                padding: '0.85rem 1rem',
                borderRadius: '0.65rem',
                background: selectedFarmer.summary.canCollectEntireHerd ? '#f0fdf4' : '#fff7ed',
                border: `1px solid ${selectedFarmer.summary.canCollectEntireHerd ? '#86efac' : '#fed7aa'}`,
                color: selectedFarmer.summary.canCollectEntireHerd ? '#166534' : '#9a3412',
                fontSize: '0.9rem',
                fontWeight: 600,
              }}
            >
              {selectedFarmer.summary.recommendation}
            </div>
          </div>

          {/* Herd Livestock & Health Table */}
          <h3 style={{ margin: '1.5rem 0 0.75rem 0' }}>
            Livestock Health &amp; Withdrawal Records ({selectedFarmer.animals.length})
          </h3>

          {selectedFarmer.animals.length === 0 && (
            <div className="card">No active animals registered on this farm.</div>
          )}

          <div className="grid">
            {selectedFarmer.animals.map((a) => {
              const isEligible = a.milkEligibility.isEligible;
              const isWithdrawal = a.milkEligibility.status === 'UNDER_WITHDRAWAL';
              const isTreatment = a.milkEligibility.status === 'TREATMENT_ACTIVE';

              return (
                <article
                  key={a.id}
                  className="card animal-card"
                  style={{
                    borderTop: `4px solid ${
                      isEligible ? 'var(--ag-green-primary)' : isWithdrawal ? '#ea580c' : '#8b5cf6'
                    }`,
                  }}
                >
                  <div className="flex-between" style={{ alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                    <div>
                      <h4 style={{ margin: 0, fontSize: '1.2rem' }}>{a.name || a.tagNumber}</h4>
                      <span style={{ fontSize: '0.85rem', color: 'var(--ag-text-muted)' }}>
                        Tag: <strong>{a.tagNumber}</strong>
                      </span>
                    </div>
                    <span
                      style={{
                        padding: '0.25rem 0.65rem',
                        borderRadius: '9999px',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        background: isEligible ? '#dcfce7' : isWithdrawal ? '#ffedd5' : '#ede9fe',
                        color: isEligible ? '#166534' : isWithdrawal ? '#c2410c' : '#6b21a8',
                      }}
                    >
                      {isEligible ? '✓ Safe For Milk' : isWithdrawal ? '⚠️ Under Withdrawal' : '🩺 In Treatment'}
                    </span>
                  </div>

                  <p style={{ margin: '0.2rem 0', fontSize: '0.88rem' }}>
                    <strong>Species:</strong> {a.species} · <strong>Breed:</strong> {a.breed} ·{' '}
                    <strong>Sex:</strong> {a.sex} {a.lactating ? '· Lactating' : ''}
                  </p>

                  {/* Withdrawal or Blocker Information */}
                  {a.milkEligibility.blocker && (
                    <div
                      style={{
                        margin: '0.65rem 0',
                        padding: '0.6rem 0.85rem',
                        borderRadius: '0.5rem',
                        background: isWithdrawal ? '#fff7ed' : '#faf5ff',
                        border: `1px solid ${isWithdrawal ? '#ffedd5' : '#f3e8ff'}`,
                        fontSize: '0.84rem',
                        color: isWithdrawal ? '#9a3412' : '#581c87',
                      }}
                    >
                      <strong>Restriction:</strong> {a.milkEligibility.blocker}
                      {a.milkEligibility.drug && (
                        <div>
                          <strong>Drug:</strong> {a.milkEligibility.drug} ({a.milkEligibility.route || 'Clinical'})
                        </div>
                      )}
                      {a.milkEligibility.withdrawalEndsAt && (
                        <div>
                          <strong>Withdrawal Ends:</strong>{' '}
                          {new Date(a.milkEligibility.withdrawalEndsAt).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Active Certificate Info */}
                  {a.activeCertificate && (
                    <p style={{ margin: '0.4rem 0', fontSize: '0.82rem', color: '#059669' }}>
                      📜 Certificate: <strong>#{a.activeCertificate.certificateNumber}</strong>
                    </p>
                  )}

                  {/* Recent Treatments Snippet */}
                  {a.recentTreatments?.length > 0 && (
                    <div style={{ marginTop: '0.5rem', fontSize: '0.82rem', color: '#475569' }}>
                      <strong>Latest Treatment:</strong> {a.recentTreatments[0].drugName} (
                      {new Date(a.recentTreatments[0].createdAt).toLocaleDateString()})
                    </div>
                  )}

                  {/* Action button */}
                  <div style={{ marginTop: '1rem' }}>
                    <button
                      type="button"
                      className="secondary"
                      style={{ width: '100%', fontSize: '0.85rem', padding: '0.45rem' }}
                      onClick={() => openAnimalTimeline(a)}
                    >
                      📜 View Complete Health History
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      )}

      {/* REGISTERED FARMERS DIRECTORY */}
      {!selectedFarmer && (
        <div className="card">
          <h3 style={{ margin: '0 0 1rem 0' }}>📋 Registered Farmers Directory ({farmersList.length})</h3>

          {loadingList && <p>Loading farmers directory…</p>}

          {!loadingList && farmersList.length === 0 && (
            <p style={{ color: 'var(--ag-text-muted)' }}>No farmers registered on the platform yet.</p>
          )}

          {!loadingList && farmersList.length > 0 && (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #e2e8f0', textAlign: 'left', color: '#64748b' }}>
                    <th style={{ padding: '0.75rem 0.5rem' }}>Farmer ID</th>
                    <th style={{ padding: '0.75rem 0.5rem' }}>Farmer Name</th>
                    <th style={{ padding: '0.75rem 0.5rem' }}>Farm</th>
                    <th style={{ padding: '0.75rem 0.5rem' }}>District, State</th>
                    <th style={{ padding: '0.75rem 0.5rem' }}>Herd Size</th>
                    <th style={{ padding: '0.75rem 0.5rem' }}>Milk Status</th>
                    <th style={{ padding: '0.75rem 0.5rem', textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {farmersList.map((f) => (
                    <tr key={f.farmId} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '0.75rem 0.5rem', fontWeight: 700 }}>
                        <code style={{ background: '#f8fafc', padding: '0.15rem 0.4rem', borderRadius: '0.25rem' }}>
                          {f.farmerIdNumber}
                        </code>
                      </td>
                      <td style={{ padding: '0.75rem 0.5rem' }}>
                        <strong>{f.farmerName}</strong>
                        {f.farmerPhone && (
                          <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{f.farmerPhone}</div>
                        )}
                      </td>
                      <td style={{ padding: '0.75rem 0.5rem' }}>{f.farmName}</td>
                      <td style={{ padding: '0.75rem 0.5rem' }}>
                        {f.district}, {f.state}
                      </td>
                      <td style={{ padding: '0.75rem 0.5rem' }}>{f.totalAnimals} Cattle</td>
                      <td style={{ padding: '0.75rem 0.5rem' }}>
                        <span
                          style={{
                            padding: '0.2rem 0.6rem',
                            borderRadius: '9999px',
                            fontSize: '0.78rem',
                            fontWeight: 700,
                            background: f.allClearForMilk ? '#dcfce7' : '#fef3c7',
                            color: f.allClearForMilk ? '#166534' : '#92400e',
                          }}
                        >
                          {f.allClearForMilk ? '✓ All Clear' : `${f.withholdingAnimalsCount} Withholding`}
                        </span>
                      </td>
                      <td style={{ padding: '0.75rem 0.5rem', textAlign: 'right' }}>
                        <button
                          type="button"
                          className="primary"
                          style={{ fontSize: '0.82rem', padding: '0.4rem 0.8rem' }}
                          onClick={() => {
                            setSearchQuery(f.farmerIdNumber);
                            lookupFarmer(f.farmerIdNumber);
                          }}
                        >
                          Inspect Health →
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* HEALTH TIMELINE MODAL */}
      {timelineAnimal && (
        <div className="modal-backdrop" onClick={() => setTimelineAnimal(null)}>
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '850px', width: '90%', maxHeight: '85vh', overflow: 'auto' }}
          >
            {loadingTimeline ? (
              <p>Loading animal health timeline…</p>
            ) : (
              <HealthTimeline
                timeline={animalTimeline}
                showAmuRisk={true}
                farmId={timelineAnimal?.farmId}
                onClose={() => setTimelineAnimal(null)}
              />
            )}
          </div>
        </div>
      )}
    </section>
  );
}
