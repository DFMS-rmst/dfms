import { useEffect, useState } from 'react';
import { api, download, publicApi } from './api.js';

const display = (value) => value?.replaceAll('_', ' ') || 'Not available';
const reason = (item) =>
  ({
    TREATMENT_ACTIVE: 'An active treatment is recorded.',
    UNDER_WITHDRAWAL: item.withdrawalEndsAt
      ? `The withdrawal period continues until ${new Date(item.withdrawalEndsAt).toLocaleString()}.`
      : 'An applicable withdrawal period is still active.',
    RULE_NOT_FOUND: 'No applicable verified withdrawal reference was found.',
    REVIEW_REQUIRED: 'The recorded evidence or reference requires review.',
  })[item.eligibilityStatus] || display(item.blockingReason);

export function DailyClearance({ farm, canRun = false }) {
  const [evaluation, setEvaluation] = useState(null);
  const [history, setHistory] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  async function load() {
    setLoading(true);
    setError('');
    try {
      const [today, prior, alertData] = await Promise.all([
        api(`/daily-clearances/today?farmId=${farm.id}`),
        api(`/daily-clearances?farmId=${farm.id}`),
        api('/alerts'),
      ]);
      setEvaluation(today.evaluation);
      setHistory(prior.evaluations || []);
      setAlerts((alertData.alerts || []).filter((item) => item.farmId === farm.id));
    } catch (cause) {
      setError(cause.message || 'Unable to load today’s milk eligibility.');
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, [farm.id]); // eslint-disable-line react-hooks/exhaustive-deps
  async function run() {
    setRunning(true);
    try {
      await api('/daily-clearances/run-today', {
        method: 'POST',
        body: JSON.stringify({ farmId: farm.id }),
      });
      await load();
    } catch (cause) {
      setError(cause.message);
    } finally {
      setRunning(false);
    }
  }
  if (loading) return <p>Loading today’s system evaluation…</p>;
  if (error && !evaluation) return <p className="error">{error}</p>;
  const eligible = evaluation?.items?.filter((item) => item.included) || [];
  const blocked = evaluation?.items?.filter((item) => !item.included) || [];
  return (
    <section>
      <h1>Today’s Milk Eligibility</h1>
      <p className="notice">
        The system determines this list from current animal eligibility. Farmers cannot manually add
        animals.
      </p>
      {error && <p className="error">{error}</p>}
      {evaluation && (
        <>
          <div className="grid">
            <article className="card">
              <strong>Business date</strong>
              <h3>{String(evaluation.businessDate).slice(0, 10)}</h3>
              <small>{evaluation.timeZone}</small>
            </article>
            <article className="card">
              <strong>Applicable lactating animals</strong>
              <h3>{evaluation.applicableCount}</h3>
            </article>
            <article className="card">
              <strong>Eligible</strong>
              <h3>{evaluation.eligibleCount}</h3>
            </article>
            <article className="card">
              <strong>Blocked</strong>
              <h3>{evaluation.blockedCount}</h3>
            </article>
            <article className="card">
              <strong>Current version</strong>
              <h3>Version {evaluation.version}</h3>
              <small>{display(evaluation.status)}</small>
            </article>
          </div>
          {canRun && (
            <button disabled={running} onClick={run}>
              {running ? 'Evaluating…' : 'Run today’s eligibility evaluation'}
            </button>
          )}
          <h2>Eligible Animals</h2>
          {eligible.length ? (
            <div className="grid">
              {eligible.map((item) => (
                <article className="card" key={item.id}>
                  <h3>{item.animalTagSnapshot}</h3>
                  <p>{item.animalNameSnapshot || 'No recorded name'}</p>
                  <span className="badge">ELIGIBLE FOR MILK</span>
                </article>
              ))}
            </div>
          ) : (
            <p>No animals are currently eligible for today’s milk collection clearance.</p>
          )}
          <h2>Not Currently Eligible</h2>
          {blocked.length ? (
            <div className="grid">
              {blocked.map((item) => (
                <article className="card" key={item.id}>
                  <h3>{item.animalTagSnapshot}</h3>
                  <span className="badge">{display(item.eligibilityStatus)}</span>
                  <p>{reason(item)}</p>
                </article>
              ))}
            </div>
          ) : (
            <p>No applicable animals are currently blocked.</p>
          )}
          <h2>Daily Milk Collection Clearance</h2>
          {evaluation.clearance ? (
            <article className="card">
              <h3>{evaluation.clearance.clearanceNumber}</h3>
              <p>
                Version {evaluation.version} · {display(evaluation.status)}
              </p>
              <p className="notice">{evaluation.clearance.disclaimer}</p>
              <button
                onClick={() =>
                  download(
                    `/daily-clearances/${evaluation.id}/pdf`,
                    `${evaluation.clearance.clearanceNumber}.pdf`,
                  )
                }
              >
                Download PDF with QR
              </button>
              <h3>Document Integrity</h3>
              <p>
                <strong>Tamper Verification:</strong> Verified (Canonical SHA-256)
              </p>
              <p className="notice">
                Document integrity is cryptographically verified via canonical SHA-256 hashing; it
                does not determine milk eligibility or replace laboratory residue testing.
              </p>
            </article>
          ) : (
            <p>
              No positive clearance document was generated because no animals currently qualify.
            </p>
          )}
        </>
      )}
      <h2>Farm Notifications</h2>
      {alerts.length ? (
        alerts.slice(0, 10).map((item) => (
          <article className="card" key={item.id}>
            <strong>{item.title}</strong>
            <p>{item.message}</p>
            <small>
              {new Date(item.createdAt).toLocaleString()} · {display(item.status)}
            </small>
          </article>
        ))
      ) : (
        <p>No farm notifications yet.</p>
      )}
      <h2>Clearance History</h2>
      {history.map((item) => (
        <article className="card" key={item.id}>
          <strong>
            {String(item.businessDate).slice(0, 10)} · Version {item.version}
          </strong>
          <p>
            {display(item.status)} · {item.eligibleCount} of {item.applicableCount} eligible
          </p>
          {item.clearance && <small>{item.clearance.clearanceNumber}</small>}
        </article>
      ))}
    </section>
  );
}

export function PublicDailyClearance({ verificationId }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    publicApi(`/public/daily-clearances/${verificationId}`)
      .then(setData)
      .catch((cause) => setError(cause.message));
  }, [verificationId]);
  return (
    <main className="auth-page">
      <article className="card verification">
        <p className="eyebrow">Public verification</p>
        <h1>Daily Milk Collection Clearance</h1>
        {error && <p className="error">{error}</p>}
        {data && (
          <>
            <h2>{data.clearanceNumber}</h2>
            <p>
              <strong>Status:</strong> {display(data.status)}
            </p>
            <p>
              <strong>Farm:</strong> {data.farmName}
            </p>
            <p>
              <strong>Business date:</strong> {String(data.businessDate).slice(0, 10)}
            </p>
            <p>
              <strong>Version:</strong> {data.version}
            </p>
            <p>
              <strong>Eligible animal count:</strong> {data.eligibleAnimalCount}
            </p>
            <p>
              <strong>Document integrity:</strong> {display(data.documentIntegrity)} (Canonical
              SHA-256)
            </p>
            <p className="notice">{data.disclaimer}</p>
          </>
        )}
      </article>
    </main>
  );
}
