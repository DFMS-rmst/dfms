import { useEffect, useState } from 'react';
import { api } from './api.js';

const statusLabel = (value) => value?.replaceAll('_', ' ');
export function CoreEngine({ farms, isAdmin }) {
  const [farmId, setFarmId] = useState(farms[0]?.id || '');
  const [summary, setSummary] = useState(null);
  const [trends, setTrends] = useState([]);
  const [drugs, setDrugs] = useState([]);
  const [classes, setClasses] = useState([]);
  const [eligibility, setEligibility] = useState([]);
  const [mrl, setMrl] = useState([]);
  const [error, setError] = useState('');
  async function load() {
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
      {summary && (
        <>
          <h2>AMU Overview</h2>
          <div className="grid">
            <Metric title="Administrations" value={summary.totalAdministrations} />
            <Metric title="Antimicrobial treatments" value={summary.totalAntimicrobialTreatments} />
            <Metric title="Treated animals" value={summary.treatedAnimals} />
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
          <article className="card" key={check.id}>
            <span className="badge">{statusLabel(check.status)}</span>
            <h3>{check.animal.name || check.animal.tagNumber}</h3>
            <p>
              {check.animal.farm.name} · {check.animal.species.canonicalName}
            </p>
            <p>
              Effective eligibility:{' '}
              {check.eligibilityDate
                ? new Date(check.eligibilityDate).toLocaleString()
                : 'Not calculable'}
            </p>
            {check.treatmentEvaluations.map((item) => (
              <p key={item.id}>
                {item.drug?.canonicalName || 'Active treatment'}: {statusLabel(item.status)}
                {item.withdrawalEndsAt
                  ? ` until ${new Date(item.withdrawalEndsAt).toLocaleString()}`
                  : ''}
              </p>
            ))}
            <button onClick={() => reevaluate(check.animal.id)}>Re-evaluate</button>
            {check.status === 'ELIGIBLE_FOR_MILK' && (
              <button onClick={() => issue(check.animal.id)}>Generate Certificate</button>
            )}
          </article>
        ))}
      </div>
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
    </section>
  );
}
function Metric({ title, value }) {
  return (
    <article className="card">
      <small>{title}</small>
      <h3>{value}</h3>
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
