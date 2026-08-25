import { useEffect, useState } from 'react';
const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1';
export function App() {
  const [apiStatus, setApiStatus] = useState('checking');
  useEffect(() => {
    const controller = new AbortController();
    fetch(`${apiBaseUrl}/health`, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error('Health check failed');
        return response.json();
      })
      .then(() => setApiStatus('connected'))
      .catch((error) => {
        if (error.name !== 'AbortError') setApiStatus('unavailable');
      });
    return () => controller.abort();
  }, []);
  return (
    <main className="shell">
      <section className="hero" aria-labelledby="page-title">
        <p className="eyebrow">SIH25007 academic prototype</p>
        <h1 id="page-title">Responsible treatment to trustworthy milk collection</h1>
        <p className="summary">
          Farm and veterinary workflows, first-class antimicrobial usage monitoring, verified
          withdrawal rules, explainable milk eligibility, and limited integrity proofs.
        </p>
        <dl className="status-grid">
          <div>
            <dt>Milestone</dt>
            <dd>Architecture and healthy scaffold</dd>
          </div>
          <div>
            <dt>API</dt>
            <dd data-status={apiStatus}>{apiStatus}</dd>
          </div>
          <div>
            <dt>Safety boundary</dt>
            <dd>No laboratory or residue measurement</dd>
          </div>
        </dl>
      </section>
    </main>
  );
}
