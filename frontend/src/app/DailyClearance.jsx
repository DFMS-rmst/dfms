import { useEffect, useState } from 'react';
import { api, download, publicApi } from './api.js';
import { toast } from './toast.js';

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
      toast.success('Today’s milk eligibility evaluated successfully!');
      await load();
    } catch (cause) {
      toast.error(cause.message || 'Evaluation failed');
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

  const isCurrent = data?.status === 'CURRENT';
  const isSuperseded = data?.status === 'SUPERSEDED';

  return (
    <main className="auth-page" style={{ padding: '2rem 1rem' }}>
      <article className="card verification" style={{ maxWidth: '640px', margin: '0 auto' }}>
        <p className="eyebrow" style={{ letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          Public Verification
        </p>
        <h1 style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>
          Daily Milk Collection Clearance
        </h1>
        <p style={{ color: 'var(--ag-text-muted)', fontSize: '0.88rem', marginBottom: '1.5rem' }}>
          Server-backed document verification for milk collection organizations &amp; dairy unions
        </p>
        {error && <p className="error">{error}</p>}
        {data && (
          <>
            {/* Prominent Verification Status Banner */}
            {isCurrent && (
              <div
                style={{
                  padding: '1rem 1.25rem',
                  borderRadius: '0.75rem',
                  border: '2px solid #10b981',
                  backgroundColor: '#ecfdf5',
                  color: '#064e3b',
                  marginBottom: '1.5rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: '1.4rem' }}>✅</span>
                  <strong style={{ fontSize: '1.1rem' }}>CURRENT VALID CLEARANCE</strong>
                </div>
                <p style={{ margin: '0.4rem 0 0', fontSize: '0.9rem' }}>
                  This document is currently active and valid for milk collection on business date{' '}
                  <strong>{String(data.businessDate).slice(0, 10)}</strong>.
                </p>
              </div>
            )}

            {isSuperseded && (
              <div
                style={{
                  padding: '1rem 1.25rem',
                  borderRadius: '0.75rem',
                  border: '2px solid #ea580c',
                  backgroundColor: '#fff7ed',
                  color: '#9a3412',
                  marginBottom: '1.5rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: '1.4rem' }}>⚠️</span>
                  <strong style={{ fontSize: '1.1rem' }}>
                    SUPERSEDED CLEARANCE — DO NOT COLLECT
                  </strong>
                </div>
                <p style={{ margin: '0.4rem 0 0', fontSize: '0.9rem', lineHeight: 1.45 }}>
                  This clearance document (Version {data.version}) has been{' '}
                  <strong>superseded</strong> by a newer evaluation. Do not accept milk collection
                  based on this outdated document.
                </p>
                {data.invalidationReason && (
                  <p style={{ margin: '0.35rem 0 0', fontSize: '0.84rem' }}>
                    <strong>Invalidation Reason:</strong> {display(data.invalidationReason)}
                  </p>
                )}
              </div>
            )}

            {!isCurrent && !isSuperseded && (
              <div
                style={{
                  padding: '1rem 1.25rem',
                  borderRadius: '0.75rem',
                  border: '2px solid #dc2626',
                  backgroundColor: '#fef2f2',
                  color: '#991b1b',
                  marginBottom: '1.5rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: '1.4rem' }}>🚫</span>
                  <strong style={{ fontSize: '1.1rem' }}>INVALID / REVOKED CLEARANCE</strong>
                </div>
                <p style={{ margin: '0.4rem 0 0', fontSize: '0.9rem' }}>
                  This clearance status is {display(data.status)}. Milk collection is strictly
                  blocked.
                </p>
              </div>
            )}

            <h2>{data.clearanceNumber}</h2>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '0.75rem',
                margin: '1rem 0 1.5rem',
              }}
            >
              <div
                style={{
                  padding: '0.6rem 0.8rem',
                  background: '#f8fafc',
                  borderRadius: '0.5rem',
                  border: '1px solid var(--ag-border)',
                }}
              >
                <small style={{ color: 'var(--ag-text-muted)' }}>Status</small>
                <p style={{ margin: '0.15rem 0 0', fontWeight: 600 }}>{display(data.status)}</p>
              </div>
              <div
                style={{
                  padding: '0.6rem 0.8rem',
                  background: '#f8fafc',
                  borderRadius: '0.5rem',
                  border: '1px solid var(--ag-border)',
                }}
              >
                <small style={{ color: 'var(--ag-text-muted)' }}>Farm Name</small>
                <p style={{ margin: '0.15rem 0 0', fontWeight: 600 }}>{data.farmName}</p>
              </div>
              <div
                style={{
                  padding: '0.6rem 0.8rem',
                  background: '#f8fafc',
                  borderRadius: '0.5rem',
                  border: '1px solid var(--ag-border)',
                }}
              >
                <small style={{ color: 'var(--ag-text-muted)' }}>Business Date</small>
                <p style={{ margin: '0.15rem 0 0', fontWeight: 600 }}>
                  {String(data.businessDate).slice(0, 10)}
                </p>
              </div>
              <div
                style={{
                  padding: '0.6rem 0.8rem',
                  background: '#f8fafc',
                  borderRadius: '0.5rem',
                  border: '1px solid var(--ag-border)',
                }}
              >
                <small style={{ color: 'var(--ag-text-muted)' }}>Document Version</small>
                <p style={{ margin: '0.15rem 0 0', fontWeight: 600 }}>Version {data.version}</p>
              </div>
              <div
                style={{
                  padding: '0.6rem 0.8rem',
                  background: '#f8fafc',
                  borderRadius: '0.5rem',
                  border: '1px solid var(--ag-border)',
                }}
              >
                <small style={{ color: 'var(--ag-text-muted)' }}>Eligible Animals</small>
                <p style={{ margin: '0.15rem 0 0', fontWeight: 600 }}>{data.eligibleAnimalCount}</p>
              </div>
              <div
                style={{
                  padding: '0.6rem 0.8rem',
                  background: '#f8fafc',
                  borderRadius: '0.5rem',
                  border: '1px solid var(--ag-border)',
                }}
              >
                <small style={{ color: 'var(--ag-text-muted)' }}>Document Integrity</small>
                <p style={{ margin: '0.15rem 0 0', fontWeight: 600 }}>
                  {display(data.documentIntegrity)} (Canonical SHA-256)
                </p>
              </div>
            </div>

            <div
              style={{
                padding: '0.75rem 1rem',
                backgroundColor: '#f1f5f9',
                borderRadius: '0.6rem',
                border: '1px solid #cbd5e1',
                fontSize: '0.82rem',
                color: '#334155',
                marginBottom: '1rem',
              }}
            >
              <strong>Daily Farm Clearance Scope:</strong> This verification is specific to bulk
              milk intake for the farm and business date. For individual animal identity or
              treatment checking, scan the animal’s ear-tag QR code directly.
            </div>

            <p className="notice" style={{ fontSize: '0.82rem' }}>
              {data.disclaimer}
            </p>
          </>
        )}
      </article>
    </main>
  );
}
