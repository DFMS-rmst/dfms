import { useEffect, useState } from 'react';
import { publicApi } from './api.js';

const statusConfig = {
  ELIGIBLE_FOR_MILK: {
    label: 'ELIGIBLE FOR MILK COLLECTION',
    badgeClass: 'status-badge-eligible',
    bannerStyle: {
      backgroundColor: '#ecfdf5',
      borderColor: '#10b981',
      color: '#064e3b',
    },
    icon: '✅',
    summary: 'This animal is currently cleared for milk collection based on recorded treatment history.',
  },
  UNDER_WITHDRAWAL: {
    label: 'UNDER WITHDRAWAL — MILK BLOCKED',
    badgeClass: 'status-badge-withdrawal',
    bannerStyle: {
      backgroundColor: '#fffbeb',
      borderColor: '#f59e0b',
      color: '#78350f',
    },
    icon: '⏳',
    summary:
      'Mandatory withdrawal interval is currently active following veterinary antimicrobial treatment.',
  },
  TREATMENT_ACTIVE: {
    label: 'TREATMENT ACTIVE — MILK BLOCKED',
    badgeClass: 'status-badge-active',
    bannerStyle: {
      backgroundColor: '#fef2f2',
      borderColor: '#ef4444',
      color: '#991b1b',
    },
    icon: '⚠️',
    summary:
      'Animal is undergoing an active veterinary treatment course. Milk collection is strictly prohibited.',
  },
  RULE_NOT_FOUND: {
    label: 'RULE MISSING — MILK BLOCKED (FAIL-CLOSED)',
    badgeClass: 'status-badge-blocked',
    bannerStyle: {
      backgroundColor: '#fef2f2',
      borderColor: '#dc2626',
      color: '#991b1b',
    },
    icon: '🚫',
    summary:
      'No verified statutory withdrawal rule was found for an administered substance. Milk collection is strictly blocked under fail-closed safety policy.',
  },
  REVIEW_REQUIRED: {
    label: 'REGULATORY REVIEW REQUIRED',
    badgeClass: 'status-badge-review',
    bannerStyle: {
      backgroundColor: '#fff7ed',
      borderColor: '#ea580c',
      color: '#9a3412',
    },
    icon: '🔍',
    summary:
      'Conflicting reference rules or special statutory conditions require administrator or veterinary review.',
  },
};

export function PublicAnimalVerification({ verificationId }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    publicApi(`/public/animals/${verificationId}`)
      .then((res) => {
        setData(res);
        setError('');
      })
      .catch((cause) => {
        setError(cause.message || 'Animal record not found or invalid verification ID.');
      })
      .finally(() => setLoading(false));
  }, [verificationId]);

  const config = data ? statusConfig[data.status] || {
    label: data.status?.replaceAll('_', ' ') || 'UNKNOWN',
    bannerStyle: { backgroundColor: '#f1f5f9', borderColor: '#94a3b8', color: '#1e293b' },
    icon: 'ℹ️',
    summary: 'Status evaluation is currently pending or unclassified.',
  } : null;

  return (
    <main className="auth-page" style={{ padding: '2rem 1rem' }}>
      <article className="card verification" style={{ maxWidth: '640px', margin: '0 auto' }}>
        <p className="eyebrow" style={{ letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          Official Livestock Verification
        </p>
        <h1 style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>
          Animal Identification &amp; Milk Clearance
        </h1>
        <p style={{ color: 'var(--ag-text-muted)', fontSize: '0.88rem', marginBottom: '1.5rem' }}>
          Real-time deterministic eligibility check for dairy collectors and veterinarians
        </p>

        {loading && <p>Loading animal verification record…</p>}

        {error && (
          <div
            style={{
              padding: '1.25rem',
              borderRadius: '0.75rem',
              backgroundColor: '#fef2f2',
              border: '1.5px solid #f87171',
              color: '#991b1b',
              marginBottom: '1.5rem',
            }}
          >
            <strong>Verification Error</strong>
            <p style={{ margin: '0.35rem 0 0', fontSize: '0.92rem' }}>{error}</p>
          </div>
        )}

        {data && config && (
          <>
            {/* Prominent Status Banner */}
            <div
              style={{
                padding: '1.25rem',
                borderRadius: '0.75rem',
                border: `2px solid ${config.bannerStyle.borderColor}`,
                backgroundColor: config.bannerStyle.backgroundColor,
                color: config.bannerStyle.color,
                marginBottom: '1.5rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <span style={{ fontSize: '1.5rem' }}>{config.icon}</span>
                <strong style={{ fontSize: '1.15rem', letterSpacing: '0.02em' }}>
                  {config.label}
                </strong>
              </div>
              <p style={{ margin: '0.6rem 0 0', fontSize: '0.92rem', lineHeight: 1.45 }}>
                {config.summary}
              </p>
              {data.status === 'ELIGIBLE_FOR_MILK' && data.eligibleFrom && (
                <p style={{ margin: '0.4rem 0 0', fontSize: '0.85rem', fontWeight: 600 }}>
                  Eligible from: {new Date(data.eligibleFrom).toLocaleString()}
                </p>
              )}
              {data.status === 'UNDER_WITHDRAWAL' && data.withdrawalEndsAt && (
                <p style={{ margin: '0.4rem 0 0', fontSize: '0.85rem', fontWeight: 600 }}>
                  Mandatory withdrawal ends: {new Date(data.withdrawalEndsAt).toLocaleString()}
                </p>
              )}
              {data.ruleExplanation && (
                <div
                  style={{
                    marginTop: '0.75rem',
                    padding: '0.6rem 0.85rem',
                    backgroundColor: 'rgba(255, 255, 255, 0.75)',
                    borderRadius: '0.5rem',
                    fontSize: '0.84rem',
                    lineHeight: 1.4,
                  }}
                >
                  <strong>Domain Explanation:</strong> {data.ruleExplanation}
                </div>
              )}
            </div>

            {/* Animal Identification Details */}
            <h2 style={{ fontSize: '1.25rem', marginBottom: '0.75rem' }}>Animal Identity</h2>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '0.85rem',
                marginBottom: '1.5rem',
              }}
            >
              <div
                style={{
                  padding: '0.75rem 1rem',
                  backgroundColor: '#f8fafc',
                  borderRadius: '0.6rem',
                  border: '1px solid var(--ag-border)',
                }}
              >
                <small style={{ color: 'var(--ag-text-muted)' }}>Ear Tag / Number</small>
                <p style={{ margin: '0.2rem 0 0', fontWeight: 700, fontSize: '1.05rem' }}>
                  {data.animalTag}
                </p>
              </div>

              <div
                style={{
                  padding: '0.75rem 1rem',
                  backgroundColor: '#f8fafc',
                  borderRadius: '0.6rem',
                  border: '1px solid var(--ag-border)',
                }}
              >
                <small style={{ color: 'var(--ag-text-muted)' }}>Animal Name / Nickname</small>
                <p style={{ margin: '0.2rem 0 0', fontWeight: 600 }}>
                  {data.animalName || 'Not specified'}
                </p>
              </div>

              <div
                style={{
                  padding: '0.75rem 1rem',
                  backgroundColor: '#f8fafc',
                  borderRadius: '0.6rem',
                  border: '1px solid var(--ag-border)',
                }}
              >
                <small style={{ color: 'var(--ag-text-muted)' }}>Species &amp; Breed</small>
                <p style={{ margin: '0.2rem 0 0', fontWeight: 600 }}>
                  {data.species} {data.breed ? `(${data.breed})` : ''}
                </p>
              </div>

              <div
                style={{
                  padding: '0.75rem 1rem',
                  backgroundColor: '#f8fafc',
                  borderRadius: '0.6rem',
                  border: '1px solid var(--ag-border)',
                }}
              >
                <small style={{ color: 'var(--ag-text-muted)' }}>Authorized Farm</small>
                <p style={{ margin: '0.2rem 0 0', fontWeight: 600 }}>{data.farmName}</p>
              </div>

              <div
                style={{
                  padding: '0.75rem 1rem',
                  backgroundColor: '#f8fafc',
                  borderRadius: '0.6rem',
                  border: '1px solid var(--ag-border)',
                }}
              >
                <small style={{ color: 'var(--ag-text-muted)' }}>Lactating Status</small>
                <p style={{ margin: '0.2rem 0 0', fontWeight: 600 }}>
                  {data.lactating ? 'Active Lactation' : 'Non-Lactating / Dry'}
                </p>
              </div>

              <div
                style={{
                  padding: '0.75rem 1rem',
                  backgroundColor: '#f8fafc',
                  borderRadius: '0.6rem',
                  border: '1px solid var(--ag-border)',
                }}
              >
                <small style={{ color: 'var(--ag-text-muted)' }}>Last Evaluation Time</small>
                <p style={{ margin: '0.2rem 0 0', fontWeight: 500, fontSize: '0.85rem' }}>
                  {new Date(data.evaluatedAt).toLocaleString()}
                </p>
              </div>
            </div>

            {/* Scope Clarification */}
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
              <strong>Scope Notice:</strong> Individual animal verification applies exclusively to{' '}
              <strong>Milk Collection Eligibility</strong> under recorded veterinary treatment
              history. It does not certify slaughter eligibility, which requires a separate statutory
              regulatory clearance.
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
