import { useEffect, useState } from 'react';
import { api } from './api.js';

/**
 * RiskBadge component:
 * Fetches dynamic ML / smart hybrid animal risk level from /api/animals/:id/risk
 * and renders a styled colored badge:
 *   🟢 Low (Low risk)
 *   🟡 Medium (Medium risk)
 *   🔴 High (High risk)
 */
export function RiskBadge({ animalId, className = '' }) {
  const [riskData, setRiskData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!animalId) return;
    let isMounted = true;
    setLoading(true);
    setError(null);

    async function fetchAnimalRisk() {
      try {
        let result = null;

        // Try direct fetch to /api/animals/:id/risk first
        try {
          const directRes = await fetch(`/api/animals/${animalId}/risk`, {
            headers: { Accept: 'application/json' },
          });
          if (directRes.ok) {
            result = await directRes.json();
          }
        } catch {
          // fallback to api() helper if direct fetch fails
        }

        // If direct fetch didn't return data, use configured api client
        if (!result) {
          result = await api(`/animals/${animalId}/risk`);
        }

        if (isMounted) {
          const payload = result?.data || result;
          setRiskData(payload);
          setLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message || 'Unable to calculate animal risk');
          setLoading(false);
        }
      }
    }

    fetchAnimalRisk();

    return () => {
      isMounted = false;
    };
  }, [animalId]);

  if (loading) {
    return (
      <span
        className={`risk-badge risk-badge-loading ${className}`}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.35rem',
          padding: '0.22rem 0.65rem',
          borderRadius: '9999px',
          fontSize: '0.78rem',
          fontWeight: 600,
          background: '#f8fafc',
          color: '#64748b',
          border: '1px solid #cbd5e1',
          lineHeight: 1.2,
        }}
      >
        <span style={{ fontSize: '0.75rem' }}>⏳</span> Evaluating…
      </span>
    );
  }

  if (error || !riskData) {
    return (
      <span
        className={`risk-badge risk-badge-fallback ${className}`}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.35rem',
          padding: '0.22rem 0.65rem',
          borderRadius: '9999px',
          fontSize: '0.78rem',
          fontWeight: 600,
          background: '#f8fafc',
          color: '#94a3b8',
          border: '1px solid #e2e8f0',
          lineHeight: 1.2,
        }}
        title={error || 'Risk information unavailable'}
      >
        ⚪ Risk: N/A
      </span>
    );
  }

  // Parse risk level (supports 'LOW', 'MEDIUM', 'HIGH', 'Low', 'Medium', 'High')
  const rawLevel = String(
    riskData.riskLevel || riskData.risk || riskData.level || 'LOW',
  ).toUpperCase();
  const isHigh = rawLevel.includes('HIGH');
  const isMedium = rawLevel.includes('MED') || rawLevel.includes('MODERATE');

  let badgeText = '🟢 Low';
  let badgeBg = '#f0fdf4';
  let badgeColor = '#16a34a';
  let badgeBorder = '#bbf7d0';

  if (isHigh) {
    badgeText = '🔴 High';
    badgeBg = '#fef2f2';
    badgeColor = '#dc2626';
    badgeBorder = '#fecaca';
  } else if (isMedium) {
    badgeText = '🟡 Medium';
    badgeBg = '#fffbeb';
    badgeColor = '#d97706';
    badgeBorder = '#fde68a';
  }

  return (
    <span
      className={`risk-badge ${isHigh ? 'risk-high' : isMedium ? 'risk-medium' : 'risk-low'} ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.35rem',
        padding: '0.24rem 0.65rem',
        borderRadius: '9999px',
        fontSize: '0.78rem',
        fontWeight: 700,
        letterSpacing: '0.02em',
        background: badgeBg,
        color: badgeColor,
        border: `1px solid ${badgeBorder}`,
        lineHeight: 1.2,
        cursor: 'default',
        boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
      }}
      title={`Automated Risk Assessment: ${rawLevel}`}
    >
      {badgeText}
    </span>
  );
}
export default RiskBadge;
