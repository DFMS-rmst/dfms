import { useState } from 'react';
import { api } from './api.js';

export function AmuRiskCard({ farmId, animalId = '' }) {
  const [risk, setRisk] = useState(null);
  const [error, setError] = useState('');

  async function loadRisk() {
    setError('');
    try {
      setRisk(
        await api(animalId ? `/ml/animals/${animalId}/amu-risk` : `/ml/farms/${farmId}/amu-risk`),
      );
    } catch (problem) {
      setError(problem.message);
    }
  }

  return (
    <div>
      <button onClick={loadRisk} disabled={!animalId && !farmId}>
        Evaluate recorded AMU pattern
      </button>
      {error && (
        <p className="error" style={{ marginTop: '0.75rem' }}>
          ⚠️ {error}
        </p>
      )}
      {risk && (
        <div style={{ marginTop: '1rem' }} className="risk-display-card">
          <div className="flex-between">
            <span className={`badge ${risk.risk.category === 'UNUSUAL' ? 'danger' : 'success'}`}>
              {risk.risk.category} AMU PATTERN
            </span>
            <strong style={{ fontSize: '1.2rem' }}>
              {risk.risk.displayRiskScore} / 100 Risk Score
            </strong>
          </div>
          <div
            className="progress-bar-container"
            style={{
              margin: '0.75rem 0',
              background: '#e2e8f0',
              height: '10px',
              borderRadius: '5px',
              overflow: 'hidden',
            }}
          >
            <div
              className="progress-bar"
              style={{
                width: `${risk.risk.displayRiskScore}%`,
                height: '100%',
                background:
                  risk.risk.category === 'UNUSUAL'
                    ? 'linear-gradient(90deg, #f97316, #dc2626)'
                    : 'linear-gradient(90deg, #22c55e, #16a34a)',
                transition: 'width 0.5s ease',
              }}
            />
          </div>
          <p className="muted" style={{ fontSize: '0.85rem' }}>
            {risk.risk.disclaimer}
          </p>
          <p className="muted" style={{ fontSize: '0.85rem' }}>
            This is a pattern-based decision-support indicator, not a clinical diagnosis or
            milk-safety determination. Model: {risk.risk.modelVersion}. Training disclosure:
            SYNTHETIC DEMONSTRATION DATA.
          </p>
          <h4>Contributing Risk Factors</h4>
          <div className="grid" style={{ gap: '0.5rem' }}>
            {risk.risk.contributingIndicators.map((item) => (
              <div
                key={item.feature}
                className="indicator-chip"
                style={{
                  background: '#f8fafc',
                  padding: '0.5rem',
                  borderRadius: '6px',
                  border: '1px solid #e2e8f0',
                }}
              >
                <small style={{ fontWeight: 700, color: '#475569' }}>
                  {item.feature.replaceAll('_', ' ')}
                </small>
                <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                  Direction: <strong>{item.direction}</strong>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {error && <p className="error">{error}</p>}
    </div>
  );
}
