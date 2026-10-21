import { useEffect, useState } from 'react';
import { api } from './api.js';

const statusLabel = (value) => value?.replaceAll('_', ' ');
const ELIGIBILITY_COPY = {
  TREATMENT_ACTIVE: {
    title: 'Not currently eligible',
    reason: 'An active or planned treatment is recorded for this animal.',
    action: 'Complete the treatment only after actual administrations are recorded.',
  },
  UNDER_WITHDRAWAL: {
    title: 'Under withdrawal',
    reason: 'An applicable withdrawal period has not yet ended.',
    action: 'Keep milk out of collection until every blocking withdrawal period has ended.',
  },
  ELIGIBLE_FOR_MILK: {
    title: 'Rule-based milk eligibility: Eligible',
    reason: 'Recorded treatment history has cleared the applicable withdrawal-reference rules.',
    action: null,
  },
  RULE_NOT_FOUND: {
    title: 'Rule not found',
    reason:
      'No applicable verified withdrawal reference was found for the recorded product, species, route, and jurisdiction.',
    action: 'Reference review is required. Do not substitute a guessed period.',
  },
  REVIEW_REQUIRED: {
    title: 'Review required',
    reason: 'The available evidence or reference cannot automatically support milk eligibility.',
    action: 'Reference or domain review is required.',
  },
};

const blockerText = (code) =>
  ({
    TREATMENT_ACTIVE: 'Active treatment',
    NO_EXACT_APPLICABLE_RULE: 'No exact applicable verified rule',
    MINIMUM_ONLY_REQUIRES_REVIEW: 'Only a statutory minimum reference is available',
    CONFLICTING_SOURCE: 'Conflicting reference sources',
    TREATMENT_COMPLETION_DATE_MISSING: 'Treatment completion evidence is incomplete',
    ANIMAL_NOT_LACTATING: 'Milk eligibility is not applicable because the animal is not lactating',
    REFERENCE_BLOCKED_FOR_CERTIFICATE_USE: 'The reference is explicitly blocked from automatic certificate use',
    REVIEW_REQUIRED: 'The reference requires independent review',
    NOT_AVAILABLE: 'The required withdrawal reference is not available',
    RULE_NOT_FOUND: 'The reference record confirms that no usable rule was found',
  })[code] || statusLabel(code);

export function EligibilityCard({ check, canIssue = false, onReevaluate, onIssue }) {
  const copy = ELIGIBILITY_COPY[check.status] || ELIGIBILITY_COPY.REVIEW_REQUIRED;
  const explanation = check.explanation || {};
  const notApplicable = explanation.blockers?.includes('ANIMAL_NOT_LACTATING');
  return (
    <article className="card">
      <span className="badge">{notApplicable ? 'NOT APPLICABLE' : statusLabel(check.status)}</span>
      <h3>{check.animal?.name || check.animal?.tagNumber || 'Animal'}</h3>
      {check.animal?.farm && check.animal?.species && (
        <p>{check.animal.farm.name} · {check.animal.species.canonicalName}</p>
      )}
      <h4>{notApplicable ? 'Milk eligibility not applicable' : copy.title}</h4>
      <p><strong>Reason:</strong> {explanation.question || copy.reason}</p>
      {explanation.blockers?.length > 0 && (
        <p><strong>Blocking evidence:</strong> {explanation.blockers.map(blockerText).join('; ')}</p>
      )}
      {copy.action && !notApplicable && <p><strong>Action:</strong> {copy.action}</p>}
      <p><strong>Evaluated at:</strong> {new Date(check.evaluatedAt).toLocaleString()}</p>
      <p><strong>Eligible from:</strong> {check.eligibilityDate ? new Date(check.eligibilityDate).toLocaleString() : 'Not calculable'}</p>
      {(check.treatmentEvaluations || []).map((item) => (
        <section className="notice" key={item.id}>
          <strong>{item.drug?.canonicalName || 'Treatment status'}</strong>
          <p>Product: {item.drugProduct?.productName || 'Product not identified'}</p>
          <p>Actual route: {item.route || 'Not available'}</p>
          <p>Last administration: {item.lastAdministrationAt ? new Date(item.lastAdministrationAt).toLocaleString() : 'Not recorded'}</p>
          <p>Treatment completed: {item.treatmentCompletedAt ? new Date(item.treatmentCompletedAt).toLocaleString() : 'Not completed'}</p>
          <p>Status: {statusLabel(item.status)}</p>
          {item.withdrawalEndsAt && <p>Withdrawal until: {new Date(item.withdrawalEndsAt).toLocaleString()}</p>}
          {item.blockerCode && <p>Reason: {blockerText(item.blockerCode)}</p>}
          {item.withdrawalRule && (
            <p>
              Reference: {item.withdrawalRule.source.organization} — {item.withdrawalRule.source.title}
              {' · '}{item.withdrawalRule.jurisdiction}
              {' · '}{item.withdrawalRule.verificationStatus.replaceAll('_', ' ')}
              {' · '}{item.withdrawalRule.durationValue} {item.withdrawalRule.durationUnit}
            </p>
          )}
        </section>
      ))}
      <p className="notice">This is a rule-based eligibility result and not a laboratory residue test.</p>
      {onReevaluate && <button onClick={() => onReevaluate(check.animal.id)}>Refresh current eligibility</button>}
      {canIssue && !notApplicable && check.status === 'ELIGIBLE_FOR_MILK' && onIssue && (
        <button onClick={() => onIssue(check.animal.id)}>Generate Certificate</button>
      )}
    </article>
  );
}
export function CoreEngine({ farms, isAdmin, canIssue = false }) {
  const [farmId, setFarmId] = useState(farms[0]?.id || '');
  const [summary, setSummary] = useState(null);
  const [trends, setTrends] = useState([]);
  const [drugs, setDrugs] = useState([]);
  const [classes, setClasses] = useState([]);
  const [eligibility, setEligibility] = useState([]);
  const [mrl, setMrl] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedCard, setSelectedCard] = useState('ELIGIBLE');
  async function load() {
    setLoading(true);
    try {
      const query = !isAdmin && farmId ? `?farmId=${farmId}` : '';
      const [summaryData, trendData, drugData, classData, eligibilityData, mrlData] =
        await Promise.all([
          api(`/amu/summary${query}`),
          api(`/amu/trends${query}`),
          api(`/amu/by-drug${query}`),
          api(`/amu/by-class${query}`),
          api(`/eligibility${query}`),
          api('/reference-data/mrl'),
        ]);
      setSummary(summaryData.summary);
      setTrends(trendData.trends);
      setDrugs(drugData.groups);
      setClasses(classData.groups);
      setEligibility(eligibilityData.eligibility);
      setMrl(mrlData.rules);
      setError('');
    } catch (x) {
      setError(x.message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, [farmId, isAdmin]); // eslint-disable-line react-hooks/exhaustive-deps
  async function reevaluate(animalId) {
    await api(`/eligibility/animals/${animalId}/evaluate`, { method: 'POST' });
    await load();
  }
  async function issue(animalId) {
    try {
      await api(`/certificates/animals/${animalId}`, { method: 'POST' });
      setError('Certificate issued. Open Certificates to view its PDF, QR, and proof status.');
    } catch (x) {
      setError(x.message);
    }
  }
  return (
    <section>
      <h1>AMU, Withdrawal and Milk Eligibility</h1>
      {!isAdmin && (
        <label>
          Farm
          <select value={farmId} onChange={(e) => setFarmId(e.target.value)}>
            {farms.map((farm) => (
              <option key={farm.id} value={farm.id}>
                {farm.name}
              </option>
            ))}
          </select>
        </label>
      )}
      {isAdmin && <p className="eyebrow">Organization-level platform view</p>}
      {error && <p className="error">{error}</p>}
      {loading && <p>Loading current AMU and milk eligibility…</p>}
      {summary && (
        <>
          <h2>AMU Overview</h2>
          <div className="grid">
            <Metric
              title="Recorded Administrations (Doses Given)"
              value={summary.totalAdministrations}
              help={summary.totalAdministrations === 0 ? "0 dosage events recorded yet. Administer a prescribed dose in Veterinary Care to record Administration #1." : "Total actual dosage events recorded across active treatments."}
            />
            <Metric title="Antimicrobial treatments" value={summary.totalAntimicrobialTreatments} help="Number of distinct active/completed treatment courses." />
            <Metric title="Treated animals" value={summary.treatedAnimals} help="Distinct animals that received treatment." />
            <Metric
              title="Animals treated"
              value={`${summary.animalsTreatedPercentage.toFixed(1)}%`}
            />
            <Metric title="Treatment-days" value={summary.antimicrobialTreatmentDays} />
            <Metric title="Completed courses" value={summary.completedCourses} />
            <Metric
              title="Average duration"
              value={
                summary.averageTreatmentDurationDays == null
                  ? 'Not available'
                  : `${summary.averageTreatmentDurationDays.toFixed(1)} days`
              }
            />
            <Metric
              title="Active ingredient mass"
              value={
                summary.activeIngredientMass.status === 'AVAILABLE'
                  ? `${summary.activeIngredientMass.value} mg`
                  : 'Metric not available'
              }
            />
          </div>
          <p className="notice">
            AMU describes recorded use. It does not prove antimicrobial misuse.
          </p>
        </>
      )}
      {/* Administrative view retains technical drug-usage and class charts */}
      {isAdmin && (
        <>
          <h2>Monthly AMU Trends</h2>
          <DataTable
            headings={['Month', 'Administrations', 'Treatments', 'Treated animals']}
            rows={trends.map((x) => [x.month, x.administrations, x.treatments, x.treatedAnimals])}
          />
          <div className="workflow-columns">
            <section>
              <h2>Usage by Drug</h2>
              <Breakdown rows={drugs} />
            </section>
            <section>
              <h2>Usage by Class</h2>
              <Breakdown rows={classes} />
            </section>
          </div>
        </>
      )}

      {/* Two Selectable Cards in the Farmer's Milk Eligibility Section */}
      <h2>Milk Eligibility Overview</h2>
      {(() => {
        const eligibleList = eligibility.filter((c) => c.status === 'ELIGIBLE_FOR_MILK');
        const notEligibleList = eligibility.filter((c) => c.status !== 'ELIGIBLE_FOR_MILK');
        const displayedList = selectedCard === 'ELIGIBLE' ? eligibleList : notEligibleList;

        return (
          <>
            <div
              className="grid"
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: '1rem',
                marginBottom: '1.5rem',
              }}
            >
              {/* Card 1: Eligible Animals */}
              <div
                role="button"
                tabIndex={0}
                onClick={() => setSelectedCard('ELIGIBLE')}
                onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setSelectedCard('ELIGIBLE')}
                style={{
                  cursor: 'pointer',
                  padding: '1.25rem',
                  borderRadius: '10px',
                  background: selectedCard === 'ELIGIBLE' ? '#f0fdf4' : '#ffffff',
                  border: selectedCard === 'ELIGIBLE' ? '2px solid #22c55e' : '1px solid #e5e7eb',
                  boxShadow: selectedCard === 'ELIGIBLE' ? '0 4px 6px -1px rgba(34, 197, 94, 0.15)' : 'none',
                  transition: 'all 0.2s ease',
                }}
                aria-label="Eligible Animals card"
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#166534', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Eligible Animals
                  </span>
                  <span style={{ padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700, background: '#dcfce7', color: '#15803d' }}>
                    CLEAR TO MILK
                  </span>
                </div>
                <h3 style={{ fontSize: '2.25rem', margin: '0.5rem 0', color: '#15803d' }}>
                  {eligibleList.length}
                </h3>
                <p style={{ margin: 0, fontSize: '0.875rem', color: '#4b5563' }}>
                  Animals cleared for milk collection. All withdrawal rules satisfied.
                </p>
                <div style={{ marginTop: '0.75rem', fontSize: '0.8rem', fontWeight: 600, color: '#16a34a' }}>
                  {selectedCard === 'ELIGIBLE' ? '● Currently viewing list' : 'Click to view animals →'}
                </div>
              </div>

              {/* Card 2: Not Eligible Animals */}
              <div
                role="button"
                tabIndex={0}
                onClick={() => setSelectedCard('NOT_ELIGIBLE')}
                onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setSelectedCard('NOT_ELIGIBLE')}
                style={{
                  cursor: 'pointer',
                  padding: '1.25rem',
                  borderRadius: '10px',
                  background: selectedCard === 'NOT_ELIGIBLE' ? '#fffbeb' : '#ffffff',
                  border: selectedCard === 'NOT_ELIGIBLE' ? '2px solid #f59e0b' : '1px solid #e5e7eb',
                  boxShadow: selectedCard === 'NOT_ELIGIBLE' ? '0 4px 6px -1px rgba(245, 158, 11, 0.15)' : 'none',
                  transition: 'all 0.2s ease',
                }}
                aria-label="Not Eligible Animals card"
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#92400e', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Not Eligible Animals
                  </span>
                  <span style={{ padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700, background: '#fef3c7', color: '#b45309' }}>
                    DO NOT MILK
                  </span>
                </div>
                <h3 style={{ fontSize: '2.25rem', margin: '0.5rem 0', color: '#b45309' }}>
                  {notEligibleList.length}
                </h3>
                <p style={{ margin: 0, fontSize: '0.875rem', color: '#4b5563' }}>
                  Animals under active withdrawal, treatment, or missing rule review.
                </p>
                <div style={{ marginTop: '0.75rem', fontSize: '0.8rem', fontWeight: 600, color: '#d97706' }}>
                  {selectedCard === 'NOT_ELIGIBLE' ? '● Currently viewing list' : 'Click to view animals →'}
                </div>
              </div>
            </div>

            {/* List for the Selected Card */}
            <h3>
              {selectedCard === 'ELIGIBLE'
                ? `Eligible Animals for Milk Collection (${eligibleList.length})`
                : `Withheld / Not Eligible Animals (${notEligibleList.length})`}
            </h3>

            {displayedList.length === 0 ? (
              <p style={{ padding: '1rem', background: '#f9fafb', borderRadius: '8px', color: '#6b7280' }}>
                {selectedCard === 'ELIGIBLE'
                  ? 'No animals are currently marked eligible for milk collection.'
                  : 'Good news: No animals are currently under withdrawal or blocked.'}
              </p>
            ) : (
              <div className="grid">
                {displayedList.map((check) => {
                  // Calculate remaining days safely
                  let remainingDaysText = null;
                  const targetDate = check.eligibilityDate || check.withdrawalEndDate;
                  if (targetDate) {
                    const diffMs = new Date(targetDate).getTime() - Date.now();
                    const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
                    if (days > 0) {
                      remainingDaysText = `${days} day(s) remaining until expected clearance`;
                    } else {
                      remainingDaysText = 'Withdrawal duration completed — re-evaluation ready';
                    }
                  } else if (check.status === 'RULE_NOT_FOUND' || check.status === 'REVIEW_REQUIRED') {
                    remainingDaysText = 'Withdrawal end date cannot be determined (Rule review required)';
                  }

                  return (
                    <article className="card" key={check.id} style={{ position: 'relative' }}>
                      <span className="badge" style={{ float: 'right' }}>
                        {statusLabel(check.status)}
                      </span>
                      <h4>{check.animal?.name || check.animal?.tagNumber || 'Animal'}</h4>
                      <p>
                        Tag: <strong>{check.animal?.tagNumber || 'N/A'}</strong> · Species: {check.animal?.species?.canonicalName || 'Livestock'}
                      </p>
                      <p>
                        Farm: <strong>{check.animal?.farm?.name || 'Farm'}</strong>
                      </p>

                      {check.status === 'ELIGIBLE_FOR_MILK' ? (
                        <div style={{ padding: '0.5rem', background: '#ecfdf5', borderRadius: '6px', color: '#065f46', fontSize: '0.875rem', margin: '0.5rem 0' }}>
                          ✓ All withdrawal periods cleared. Milk is eligible for daily collection.
                        </div>
                      ) : (
                        <div style={{ padding: '0.5rem', background: '#fffbeb', borderRadius: '6px', color: '#92400e', fontSize: '0.875rem', margin: '0.5rem 0' }}>
                          <p style={{ margin: '0 0 0.25rem 0' }}>
                            <strong>Reason:</strong> {check.explanation?.question || ELIGIBILITY_COPY[check.status]?.reason || 'Under observation'}
                          </p>
                          {targetDate && (
                            <p style={{ margin: '0 0 0.25rem 0' }}>
                              <strong>Withdrawal ends:</strong> {new Date(targetDate).toLocaleString()}
                            </p>
                          )}
                          {remainingDaysText && (
                            <p style={{ margin: 0, fontWeight: 600 }}>
                              ⏱ {remainingDaysText}
                            </p>
                          )}
                        </div>
                      )}

                      {/* Render individual evaluation cards if present */}
                      <EligibilityCard
                        check={check}
                        canIssue={canIssue}
                        onReevaluate={reevaluate}
                        onIssue={issue}
                      />
                    </article>
                  );
                })}
              </div>
            )}
          </>
        );
      })()}

      {/* MRL Reference Viewer is strictly reserved for Admin/Technical workflows */}
      {isAdmin && (
        <>
          <h2>MRL Reference Viewer</h2>
          <p className="notice">
            Regulatory reference only; no residue was measured. MRL values are not withdrawal periods
            and do not determine eligibility.
          </p>
          <DataTable
            headings={['Drug', 'Species scope', 'Product', 'MRL', 'Jurisdiction', 'Source']}
            rows={mrl.map((x) => [
              x.drug.canonicalName,
              x.species?.canonicalName || x.speciesScope || 'As specified by source',
              x.foodProduct,
              `${x.value} ${x.unit}`,
              x.jurisdiction,
              x.source.organization,
            ])}
          />
        </>
      )}
    </section>
  );
}
function Metric({ title, value, help }) {
  return (
    <article className="card">
      <small style={{ fontWeight: 700, color: '#475569' }}>{title}</small>
      <h3 style={{ margin: '0.4rem 0 0.2rem', fontSize: '1.5rem' }}>{value}</h3>
      {help && <small style={{ fontSize: '0.78rem', color: '#64748b', display: 'block', lineHeight: 1.35 }}>{help}</small>}
    </article>
  );
}
function Breakdown({ rows }) {
  return (
    <DataTable
      headings={['Name', 'Administrations', 'Treatments', 'Animals']}
      rows={rows.map((x) => [x.name, x.administrations, x.treatments, x.treatedAnimals])}
    />
  );
}
function DataTable({ headings, rows }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            {headings.map((x) => (
              <th key={x}>{x}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i}>
              {row.map((cell, j) => (
                <td key={j}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length === 0 && <p>No recorded data for this scope.</p>}
    </div>
  );
}
