import { useEffect, useState } from 'react';
import { api } from './api.js';
import { toast } from './toast.js';

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
    REFERENCE_BLOCKED_FOR_CERTIFICATE_USE:
      'The reference is explicitly blocked from automatic certificate use',
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
        <p>
          {check.animal.farm.name} · {check.animal.species.canonicalName}
        </p>
      )}
      <h4>{notApplicable ? 'Milk eligibility not applicable' : copy.title}</h4>
      <p>
        <strong>Reason:</strong> {explanation.question || copy.reason}
      </p>
      {explanation.blockers?.length > 0 && (
        <p>
          <strong>Blocking evidence:</strong> {explanation.blockers.map(blockerText).join('; ')}
        </p>
      )}
      {copy.action && !notApplicable && (
        <p>
          <strong>Action:</strong> {copy.action}
        </p>
      )}
      <p>
        <strong>Evaluated at:</strong> {new Date(check.evaluatedAt).toLocaleString()}
      </p>
      <p>
        <strong>Eligible from:</strong>{' '}
        {check.eligibilityDate
          ? new Date(check.eligibilityDate).toLocaleString()
          : 'Not calculable'}
      </p>
      {(check.treatmentEvaluations || []).map((item) => (
        <section className="notice" key={item.id}>
          <strong>
            {item.medicineName ||
              item.medicine?.medicineName ||
              item.drug?.canonicalName ||
              'Treatment status'}
          </strong>
          {item.drugProduct !== undefined && (
            <p>Product: {item.drugProduct?.productName || 'Product not identified'}</p>
          )}
          {item.medicine?.antimicrobialClass && <p>Class: {item.medicine.antimicrobialClass}</p>}
          <p>Actual route: {item.route || 'Not available'}</p>
          <p>
            Last administration:{' '}
            {item.lastAdministrationAt
              ? new Date(item.lastAdministrationAt).toLocaleString()
              : 'Not recorded'}
          </p>
          <p>
            Treatment completed:{' '}
            {item.treatmentCompletedAt
              ? new Date(item.treatmentCompletedAt).toLocaleString()
              : 'Not completed'}
          </p>
          <p>Status: {statusLabel(item.status)}</p>
          {item.withdrawalEndsAt && (
            <p>Withdrawal until: {new Date(item.withdrawalEndsAt).toLocaleString()}</p>
          )}
          {item.blockerCode && <p>Reason: {blockerText(item.blockerCode)}</p>}
          {item.withdrawalRule && (
            <p>
              Reference: {item.withdrawalRule.source?.organization} —{' '}
              {item.withdrawalRule.source?.title}
              {' · '}
              {item.withdrawalRule.jurisdiction}
              {' · '}
              {item.withdrawalRule.verificationStatus?.replaceAll('_', ' ')}
              {' · '}
              {item.withdrawalRule.durationValue} {item.withdrawalRule.durationUnit}
            </p>
          )}
          {item.ruleSnapshot && (
            <p>
              Withdrawal reference:{' '}
              {item.ruleSnapshot.medicineName || item.medicineName || 'Medicine'} (
              {item.ruleSnapshot.milkWithdrawalDays ?? 0} days)
            </p>
          )}
        </section>
      ))}
      <p className="notice">
        This is a rule-based eligibility result and not a laboratory residue test.
      </p>
      {onReevaluate && (
        <button onClick={() => onReevaluate(check.animal.id)}>Refresh current eligibility</button>
      )}
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
    try {
      await api(`/eligibility/animals/${animalId}/evaluate`, { method: 'POST' });
      toast.success('Milk eligibility re-evaluated successfully!');
      await load();
    } catch (err) {
      toast.error(err.message || 'Evaluation failed');
    }
  }
  async function issue(animalId) {
    try {
      await api(`/certificates/animals/${animalId}`, { method: 'POST' });
      toast.success('Milk eligibility certificate issued successfully!');
      setError('Certificate issued. Open Certificates to view its PDF, QR, and proof status.');
      await load();
    } catch (x) {
      toast.error(x.message || 'Failed to issue certificate');
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
              help={
                summary.totalAdministrations === 0
                  ? '0 dosage events recorded yet. Administer a prescribed dose in Veterinary Care to record Administration #1.'
                  : 'Total actual dosage events recorded across active treatments.'
              }
            />
            <Metric
              title="Antimicrobial treatments"
              value={summary.totalAntimicrobialTreatments}
              help="Number of distinct active/completed treatment courses."
            />
            <Metric
              title="Treated animals"
              value={summary.treatedAnimals}
              help="Distinct animals that received treatment."
            />
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
      <h2>Milk Eligibility List</h2>
      <div className="grid">
        {eligibility.map((check) => (
          <EligibilityCard
            key={check.id}
            check={check}
            canIssue={canIssue}
            onReevaluate={reevaluate}
            onIssue={issue}
          />
        ))}
      </div>
      <h2>MRL Reference Viewer</h2>
      <p className="notice">
        Regulatory reference only; no residue was measured. MRL values are not withdrawal periods
        and do not determine eligibility.
      </p>
      <DataTable
        headings={['Drug / Medicine', 'Species scope', 'Product', 'MRL', 'Jurisdiction', 'Source']}
        rows={mrl.map((x) => [
          x.medicineName || x.drug?.canonicalName || 'Medicine',
          x.species?.canonicalName || x.speciesScope || 'As specified by source',
          x.foodProduct || 'Milk',
          `${x.value} ${x.unit}`,
          x.jurisdiction,
          x.source?.organization || 'Official Reference',
        ])}
      />
    </section>
  );
}
function Metric({ title, value, help }) {
  return (
    <article className="card">
      <small style={{ fontWeight: 700, color: '#475569' }}>{title}</small>
      <h3 style={{ margin: '0.4rem 0 0.2rem', fontSize: '1.5rem' }}>{value}</h3>
      {help && (
        <small
          style={{ fontSize: '0.78rem', color: '#64748b', display: 'block', lineHeight: 1.35 }}
        >
          {help}
        </small>
      )}
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
