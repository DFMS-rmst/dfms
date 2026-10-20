import { useEffect, useState } from 'react';
import { api } from './api.js';

/* eslint-disable react-refresh/only-export-components */
export const SPECIES_LIMITS = {
  Cow: { maxAge: 25, minWeight: 20, maxWeight: 1400, label: 'Cow (Cattle)' },
  Buffalo: { maxAge: 25, minWeight: 20, maxWeight: 1400, label: 'Buffalo (Cattle)' },
  Goat: { maxAge: 18, minWeight: 2, maxWeight: 160, label: 'Goat' },
  Sheep: { maxAge: 15, minWeight: 2, maxWeight: 180, label: 'Sheep' },
  Chicken: { maxAge: 10, minWeight: 0.1, maxWeight: 10, label: 'Chicken (Poultry)' },
};

export function validateAnimalRiskForm(data) {
  const issues = [];
  const limits = SPECIES_LIMITS[data.species] || SPECIES_LIMITS.Cow;

  if (!data.age_years || Number(data.age_years) <= 0) {
    issues.push('Age must be greater than 0.');
  } else if (Number(data.age_years) > limits.maxAge) {
    issues.push(
      `Age (${data.age_years} yrs) exceeds natural lifespan for ${limits.label} (max: ${limits.maxAge} yrs).`,
    );
  }

  if (Number(data.weight_kg) < limits.minWeight || Number(data.weight_kg) > limits.maxWeight) {
    issues.push(
      `Weight (${data.weight_kg} kg) outside realistic range for ${limits.label} (${limits.minWeight} - ${limits.maxWeight} kg).`,
    );
  }

  const maxAlive = Math.floor(Number(data.age_years) * 365.25);
  if (Number(data.days_since_last_treatment) > maxAlive) {
    issues.push(
      `Days since last treatment (${data.days_since_last_treatment}d) exceeds total lifespan (${maxAlive}d).`,
    );
  }

  if (Number(data.treatments_last_30d) > Number(data.treatments_last_90d)) {
    issues.push(
      `Treatments in 30d (${data.treatments_last_30d}) cannot exceed treatments in 90d (${data.treatments_last_90d}).`,
    );
  }

  if (Number(data.total_antimicrobial_days_90d) > 90) {
    issues.push(
      `Antimicrobial days in 90d (${data.total_antimicrobial_days_90d}) cannot exceed 90 days.`,
    );
  }

  if (Number(data.treatments_last_30d) > 0 && Number(data.days_since_last_treatment) > 30) {
    issues.push(
      `Had ${data.treatments_last_30d} treatments in last 30d, so days since last treatment must be ≤ 30 (got ${data.days_since_last_treatment}).`,
    );
  }

  if (
    Number(data.days_since_last_treatment) > 90 &&
    (Number(data.treatments_last_90d) > 0 || Number(data.total_antimicrobial_days_90d) > 0)
  ) {
    issues.push(
      `If last treatment was >90 days ago (${data.days_since_last_treatment}d), treatments in 90d and antimicrobial days must be 0.`,
    );
  }

  if (Number(data.treatments_last_90d) > 0) {
    if (Number(data.unique_antimicrobial_classes_90d) > Number(data.treatments_last_90d)) {
      issues.push('Unique antimicrobial classes cannot exceed total treatment count in 90 days.');
    }
    if (Number(data.max_repeated_class_count_90d) > Number(data.treatments_last_90d)) {
      issues.push('Maximum repeated class count cannot exceed total treatment count in 90 days.');
    }
    if (
      Number(data.no_response_events_90d) + Number(data.partial_response_events_90d) >
      Number(data.treatments_last_90d)
    ) {
      issues.push('Sum of (no response + partial response) cannot exceed treatments in 90 days.');
    }
    if (Number(data.recurrent_condition_events_90d) > Number(data.treatments_last_90d)) {
      issues.push('Recurrent condition events cannot exceed treatments in 90 days.');
    }
  } else {
    if (
      Number(data.unique_antimicrobial_classes_90d) > 0 ||
      Number(data.max_repeated_class_count_90d) > 0
    ) {
      issues.push('Antimicrobial class counts must be 0 if treatments in last 90 days is 0.');
    }
    if (Number(data.no_response_events_90d) > 0 || Number(data.partial_response_events_90d) > 0) {
      issues.push('Treatment failure events must be 0 if treatments in last 90 days is 0.');
    }
  }

  return issues;
}

export function PredictionResultCard({ result, title = 'Risk Prediction Result' }) {
  if (!result) return null;

  const predicted = result.prediction || result.predictedRisk || 'LOW';
  const probs = result.probabilities || {};

  const badgeColor =
    predicted === 'HIGH' ? '#dc2626' : predicted === 'MEDIUM' ? '#d97706' : '#16a34a';
  const badgeBg = predicted === 'HIGH' ? '#fef2f2' : predicted === 'MEDIUM' ? '#fffbeb' : '#f0fdf4';
  const badgeBorder =
    predicted === 'HIGH' ? '#fecaca' : predicted === 'MEDIUM' ? '#fde68a' : '#bbf7d0';

  return (
    <div
      style={{
        background: '#ffffff',
        border: `1.5px solid ${badgeBorder}`,
        borderRadius: '0.75rem',
        padding: '1.25rem',
        marginTop: '1rem',
        boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1rem',
        }}
      >
        <h4 style={{ margin: 0, fontSize: '1.05rem', color: '#1e293b' }}>{title}</h4>
        <span
          style={{
            background: badgeBg,
            color: badgeColor,
            border: `1px solid ${badgeBorder}`,
            padding: '0.35rem 0.8rem',
            borderRadius: '9999px',
            fontWeight: 700,
            fontSize: '0.88rem',
            letterSpacing: '0.04em',
          }}
        >
          {predicted === 'HIGH'
            ? '🚨 HIGH RISK'
            : predicted === 'MEDIUM'
              ? '⚠️ MEDIUM RISK'
              : '✅ LOW RISK'}
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
        <span
          style={{
            fontSize: '0.82rem',
            fontWeight: 600,
            color: '#64748b',
            textTransform: 'uppercase',
          }}
        >
          Random Forest Class Probabilities
        </span>
        {Object.entries(probs).map(([riskClass, probability]) => {
          const pct = Math.round(Number(probability) * 100);
          const barColor =
            riskClass === 'HIGH' ? '#ef4444' : riskClass === 'MEDIUM' ? '#f59e0b' : '#22c55e';
          return (
            <div
              key={riskClass}
              style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}
            >
              <div
                style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}
              >
                <span style={{ fontWeight: 600, color: '#334155' }}>{riskClass} RISK</span>
                <span style={{ fontWeight: 700, color: barColor }}>{pct}%</span>
              </div>
              <div
                style={{
                  height: '8px',
                  background: '#f1f5f9',
                  borderRadius: '9999px',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    height: '100%',
                    width: `${pct}%`,
                    backgroundColor: barColor,
                    borderRadius: '9999px',
                    transition: 'width 0.6s ease',
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <p style={{ margin: '0.9rem 0 0', fontSize: '0.78rem', color: '#64748b', lineHeight: 1.4 }}>
        💡 <strong>Decision Support:</strong> High risk indicates repeated exposure, multiple
        classes, or poor clinical response warranting close monitoring and antimicrobial
        stewardship.
      </p>
    </div>
  );
}

/**
 * Modal for Veterinarian to input treatment details, predict risk, and record the clinical report.
 */
export function AnimalRiskAssessmentModal({
  animalId,
  caseId = null,
  animalInfo,
  onClose,
  onSaved,
}) {
  const [formData, setFormData] = useState({
    species: 'Cow',
    age_years: 4.5,
    weight_kg: 450,
    treatments_last_30d: 1,
    treatments_last_90d: 2,
    days_since_last_treatment: 14,
    unique_antimicrobial_classes_90d: 1,
    max_repeated_class_count_90d: 1,
    mean_treatment_interval_days: 20,
    total_antimicrobial_days_90d: 10,
    recurrent_condition_events_90d: 0,
    no_response_events_90d: 0,
    partial_response_events_90d: 0,
    notes: '',
    recommendations: '',
  });

  const [loadingDefaults, setLoadingDefaults] = useState(true);
  const [predicting, setPredicting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [predictionResult, setPredictionResult] = useState(null);
  const [validationWarnings, setValidationWarnings] = useState([]);
  const [serverError, setServerError] = useState(null);
  const [mlServiceStatus, setMlServiceStatus] = useState('checking'); // 'checking' | 'online' | 'offline'
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    let active = true;

    // Check ML microservice status
    api('/ml/status')
      .then((res) => {
        if (!active) return;
        const info = res?.available !== undefined ? res : res?.data;
        if (info?.available) {
          setMlServiceStatus('online');
        } else {
          setMlServiceStatus('offline');
        }
      })
      .catch(() => {
        if (active) setMlServiceStatus('offline');
      });

    // Pre-fill defaults from treatment history
    api(`/ml/animals/${animalId}/risk-defaults`)
      .then((res) => {
        if (!active) return;
        const defaults = res?.defaults || res?.data?.defaults;
        if (defaults) {
          setFormData((prev) => ({
            ...prev,
            ...defaults,
          }));
        }
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoadingDefaults(false);
      });

    return () => {
      active = false;
    };
  }, [animalId]);

  const currentLimits = SPECIES_LIMITS[formData.species] || SPECIES_LIMITS.Cow;

  const handleChange = (e) => {
    const { name, value } = e.target;
    const isText = ['species', 'notes', 'recommendations'].includes(name);
    const updated = {
      ...formData,
      [name]: isText ? value : Number(value),
    };
    setFormData(updated);
    setServerError(null);

    if (validationWarnings.length > 0) {
      setValidationWarnings(validateAnimalRiskForm(updated));
    }
  };

  const handlePredict = async (e) => {
    e?.preventDefault();
    const validationIssues = validateAnimalRiskForm(formData);
    if (validationIssues.length > 0) {
      setValidationWarnings(validationIssues);
      return;
    }
    setValidationWarnings([]);
    setServerError(null);
    setPredicting(true);

    try {
      const res = await api('/ml/predict', {
        method: 'POST',
        body: JSON.stringify(formData),
      });
      const result = res?.prediction !== undefined ? res : res?.data;
      setPredictionResult(result);
      setMlServiceStatus('online');
    } catch (err) {
      setServerError(err.message || 'Risk prediction request failed');
      if (err.message?.toLowerCase().includes('unavailable')) {
        setMlServiceStatus('offline');
      }
    } finally {
      setPredicting(false);
    }
  };

  const handleSaveAssessment = async (e) => {
    e?.preventDefault();
    const validationIssues = validateAnimalRiskForm(formData);
    if (validationIssues.length > 0) {
      setValidationWarnings(validationIssues);
      return;
    }
    setValidationWarnings([]);
    setServerError(null);
    setSaving(true);

    try {
      const res = await api(`/ml/animals/${animalId}/risk-assessment`, {
        method: 'POST',
        body: JSON.stringify({
          ...formData,
          caseId,
        }),
      });
      const assessment = res?.assessment || res?.data?.assessment || res;
      setSavedSuccess(true);
      setMlServiceStatus('online');
      setPredictionResult({
        prediction: assessment.predictedRisk,
        probabilities: assessment.probabilities,
      });
      onSaved?.(assessment);
    } catch (err) {
      setServerError(err.message || 'Failed to save animal risk assessment');
      if (err.message?.toLowerCase().includes('unavailable')) {
        setMlServiceStatus('offline');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div
        className="modal"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '680px', maxHeight: '90vh', overflowY: 'auto' }}
      >
        <div
          className="flex-between"
          style={{
            marginBottom: '1rem',
            borderBottom: '1px solid #e2e8f0',
            paddingBottom: '0.75rem',
            alignItems: 'flex-start',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
              <h2 style={{ margin: 0, fontSize: '1.35rem', color: '#0f172a' }}>
                🩺 Animal Risk Prediction &amp; Assessment
              </h2>
              {mlServiceStatus === 'online' && (
                <span
                  style={{
                    fontSize: '0.74rem',
                    background: '#dcfce7',
                    color: '#15803d',
                    padding: '0.2rem 0.5rem',
                    borderRadius: '1rem',
                    fontWeight: 700,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.3rem',
                  }}
                >
                  <span
                    style={{ width: 6, height: 6, borderRadius: '50%', background: '#16a34a' }}
                  />
                  ML Engine Online
                </span>
              )}
              {mlServiceStatus === 'offline' && (
                <span
                  style={{
                    fontSize: '0.74rem',
                    background: '#fee2e2',
                    color: '#b91c1c',
                    padding: '0.2rem 0.5rem',
                    borderRadius: '1rem',
                    fontWeight: 700,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.3rem',
                  }}
                >
                  <span
                    style={{ width: 6, height: 6, borderRadius: '50%', background: '#dc2626' }}
                  />
                  ML Engine Offline (Port 8000)
                </span>
              )}
            </div>
            <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem', color: '#64748b' }}>
              Animal: <strong>{animalInfo?.name || animalInfo?.tagNumber || 'Livestock'}</strong>
              {animalInfo?.tagNumber ? ` (Tag: ${animalInfo.tagNumber})` : ''}
            </p>
          </div>
          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
            aria-label="Close modal"
          >
            ×
          </button>
        </div>

        {loadingDefaults && (
          <p style={{ color: '#059669', fontSize: '0.9rem' }}>
            ⚡ Pre-filling parameters from recorded treatment history…
          </p>
        )}

        <div
          style={{
            backgroundColor: '#ecfdf5',
            border: '1px solid #a7f3d0',
            borderRadius: '0.5rem',
            padding: '0.65rem 0.85rem',
            marginBottom: '1rem',
            fontSize: '0.82rem',
            color: '#065f46',
            display: 'flex',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '0.4rem',
          }}
        >
          <span>
            <strong>Species:</strong> {currentLimits.label}
          </span>
          <span>
            <strong>Natural Lifespan:</strong> Up to {currentLimits.maxAge} yrs
          </span>
          <span>
            <strong>Realistic Weight:</strong> {currentLimits.minWeight} – {currentLimits.maxWeight}{' '}
            kg
          </span>
        </div>

        {/* Biological and physiological form input warnings */}
        {validationWarnings.length > 0 && (
          <div
            style={{
              background: '#fef2f2',
              border: '1px solid #fecaca',
              color: '#991b1b',
              padding: '0.75rem',
              borderRadius: '0.5rem',
              marginBottom: '1rem',
              fontSize: '0.84rem',
            }}
          >
            <strong>⚠️ Input &amp; Biological Validation Warnings:</strong>
            <ul style={{ margin: '0.35rem 0 0', paddingLeft: '1.2rem' }}>
              {validationWarnings.map((msg, i) => (
                <li key={i}>{msg}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Backend service connection error banner */}
        {serverError && (
          <div
            style={{
              background: '#fffbeb',
              border: '1px solid #fde68a',
              color: '#92400e',
              padding: '0.85rem',
              borderRadius: '0.5rem',
              marginBottom: '1rem',
              fontSize: '0.85rem',
              lineHeight: 1.5,
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                fontWeight: 700,
                marginBottom: '0.2rem',
              }}
            >
              <span>🔌 Service Status Alert:</span>
            </div>
            <div>{serverError}</div>
            <div
              style={{
                marginTop: '0.5rem',
                fontSize: '0.8rem',
                color: '#78350f',
                background: '#fef3c7',
                padding: '0.45rem 0.65rem',
                borderRadius: '0.35rem',
                border: '1px solid #fcd34d',
              }}
            >
              <strong>How to resolve:</strong> The ML decision-support service runs as a Python
              FastAPI service on port 8000. Start it by running:
              <br />
              <code
                style={{
                  display: 'inline-block',
                  marginTop: '0.25rem',
                  padding: '0.15rem 0.4rem',
                  background: '#fef9c3',
                  border: '1px solid #fde047',
                  borderRadius: '0.25rem',
                  fontFamily: 'monospace',
                  fontWeight: 700,
                  color: '#713f12',
                }}
              >
                npm run ml:start
              </code>
            </div>
          </div>
        )}

        {savedSuccess && (
          <div
            style={{
              background: '#f0fdf4',
              border: '1px solid #bbf7d0',
              color: '#166534',
              padding: '0.75rem',
              borderRadius: '0.5rem',
              marginBottom: '1rem',
              fontSize: '0.88rem',
            }}
          >
            ✅ <strong>Clinical Risk Assessment Recorded!</strong> The report has been added to the
            animal's official health timeline and is now visible to the farmer.
          </div>
        )}

        <form
          onSubmit={handleSaveAssessment}
          style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}
        >
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
            <label style={{ fontSize: '0.84rem', fontWeight: 600 }}>
              Species
              <select name="species" value={formData.species} onChange={handleChange} required>
                <option value="Cow">Cow (Cattle)</option>
                <option value="Buffalo">Buffalo</option>
                <option value="Goat">Goat</option>
                <option value="Sheep">Sheep</option>
                <option value="Chicken">Chicken</option>
              </select>
            </label>

            <label style={{ fontSize: '0.84rem', fontWeight: 600 }}>
              Age (Years)
              <input
                type="number"
                step="0.1"
                min="0.1"
                max={currentLimits.maxAge}
                name="age_years"
                value={formData.age_years}
                onChange={handleChange}
                required
              />
            </label>

            <label style={{ fontSize: '0.84rem', fontWeight: 600 }}>
              Weight (kg)
              <input
                type="number"
                step="0.5"
                min={currentLimits.minWeight}
                max={currentLimits.maxWeight}
                name="weight_kg"
                value={formData.weight_kg}
                onChange={handleChange}
                required
              />
            </label>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
            <label style={{ fontSize: '0.84rem', fontWeight: 600 }}>
              Treatments (Last 30d)
              <input
                type="number"
                min="0"
                name="treatments_last_30d"
                value={formData.treatments_last_30d}
                onChange={handleChange}
                required
              />
            </label>

            <label style={{ fontSize: '0.84rem', fontWeight: 600 }}>
              Treatments (Last 90d)
              <input
                type="number"
                min="0"
                name="treatments_last_90d"
                value={formData.treatments_last_90d}
                onChange={handleChange}
                required
              />
            </label>

            <label style={{ fontSize: '0.84rem', fontWeight: 600 }}>
              Days Since Last Treatment
              <input
                type="number"
                min="0"
                name="days_since_last_treatment"
                value={formData.days_since_last_treatment}
                onChange={handleChange}
                required
              />
            </label>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <label style={{ fontSize: '0.84rem', fontWeight: 600 }}>
              Unique Antimicrobial Classes (90d)
              <input
                type="number"
                min="0"
                name="unique_antimicrobial_classes_90d"
                value={formData.unique_antimicrobial_classes_90d}
                onChange={handleChange}
                required
              />
            </label>

            <label style={{ fontSize: '0.84rem', fontWeight: 600 }}>
              Max Repeated Class Count (90d)
              <input
                type="number"
                min="0"
                name="max_repeated_class_count_90d"
                value={formData.max_repeated_class_count_90d}
                onChange={handleChange}
                required
              />
            </label>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <label style={{ fontSize: '0.84rem', fontWeight: 600 }}>
              Mean Treatment Interval (Days)
              <input
                type="number"
                step="0.5"
                min="0"
                name="mean_treatment_interval_days"
                value={formData.mean_treatment_interval_days}
                onChange={handleChange}
                required
              />
            </label>

            <label style={{ fontSize: '0.84rem', fontWeight: 600 }}>
              Total Antimicrobial Days (90d)
              <input
                type="number"
                min="0"
                max="90"
                name="total_antimicrobial_days_90d"
                value={formData.total_antimicrobial_days_90d}
                onChange={handleChange}
                required
              />
            </label>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
            <label style={{ fontSize: '0.84rem', fontWeight: 600 }}>
              Recurrent Conditions (90d)
              <input
                type="number"
                min="0"
                name="recurrent_condition_events_90d"
                value={formData.recurrent_condition_events_90d}
                onChange={handleChange}
                required
              />
            </label>

            <label style={{ fontSize: '0.84rem', fontWeight: 600 }}>
              No Response Events (90d)
              <input
                type="number"
                min="0"
                name="no_response_events_90d"
                value={formData.no_response_events_90d}
                onChange={handleChange}
                required
              />
            </label>

            <label style={{ fontSize: '0.84rem', fontWeight: 600 }}>
              Partial Response Events (90d)
              <input
                type="number"
                min="0"
                name="partial_response_events_90d"
                value={formData.partial_response_events_90d}
                onChange={handleChange}
                required
              />
            </label>
          </div>

          <label style={{ fontSize: '0.84rem', fontWeight: 600 }}>
            Veterinarian Clinical Observations &amp; Notes
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              rows="2"
              placeholder="e.g. Animal showing signs of mastitis recovery, treatment completing..."
            />
          </label>

          <label style={{ fontSize: '0.84rem', fontWeight: 600 }}>
            Farmer Advice &amp; Recommendations
            <textarea
              name="recommendations"
              value={formData.recommendations}
              onChange={handleChange}
              rows="2"
              placeholder="e.g. Ensure strict milk withdrawal adherence for 48 hours; isolate if fever recurs."
            />
          </label>

          {predictionResult && <PredictionResultCard result={predictionResult} />}

          <div
            style={{
              display: 'flex',
              gap: '0.75rem',
              marginTop: '0.5rem',
              justifyContent: 'flex-end',
            }}
          >
            <button
              type="button"
              className="secondary"
              onClick={handlePredict}
              disabled={predicting || saving}
            >
              {predicting ? '⚡ Evaluating...' : '⚡ Preview Risk Prediction'}
            </button>
            <button type="submit" disabled={saving || predicting}>
              {saving ? '💾 Saving Report...' : '💾 Save & Share Report with Farmer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/**
 * Modal for Farmer (and Vet/Admin) to view the individual animal risk report.
 */
export function AnimalRiskReportModal({ animal, _farmId, onClose, onOpenAssessment }) {
  const [assessment, setAssessment] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    Promise.all([
      api(`/ml/animals/${animal.id}/latest-risk`),
      api(`/ml/animals/${animal.id}/risk-assessments`),
    ])
      .then(([latestRes, histRes]) => {
        if (!active) return;
        setAssessment(latestRes?.assessment || latestRes?.data?.assessment || null);
        setHistory(histRes?.assessments || histRes?.data?.assessments || []);
      })
      .catch((err) => {
        if (active) setError(err.message || 'Failed to load risk report');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [animal.id]);

  const predicted = assessment?.predictedRisk || 'UNKNOWN';
  const probs = assessment?.probabilities || {};

  const badgeColor =
    predicted === 'HIGH' ? '#dc2626' : predicted === 'MEDIUM' ? '#d97706' : '#16a34a';
  const badgeBg = predicted === 'HIGH' ? '#fef2f2' : predicted === 'MEDIUM' ? '#fffbeb' : '#f0fdf4';
  const badgeBorder =
    predicted === 'HIGH' ? '#fecaca' : predicted === 'MEDIUM' ? '#fde68a' : '#bbf7d0';

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div
        className="modal"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '640px', maxHeight: '90vh', overflowY: 'auto' }}
      >
        <div
          className="flex-between"
          style={{
            marginBottom: '1rem',
            borderBottom: '1px solid #e2e8f0',
            paddingBottom: '0.75rem',
          }}
        >
          <div>
            <h2 style={{ margin: 0, fontSize: '1.35rem', color: '#0f172a' }}>
              📊 Animal Health &amp; Risk Report
            </h2>
            <p style={{ margin: '0.2rem 0 0', fontSize: '0.85rem', color: '#64748b' }}>
              Animal: <strong>{animal.name || animal.tagNumber}</strong> · Tag:{' '}
              <strong>{animal.tagNumber}</strong>
            </p>
          </div>
          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
            aria-label="Close modal"
          >
            ×
          </button>
        </div>

        {loading && <p>Loading animal risk report…</p>}
        {error && <p className="error">{error}</p>}

        {!loading && !assessment && (
          <div style={{ textAlign: 'center', padding: '2rem 1rem' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>📋</div>
            <h3 style={{ margin: '0 0 0.5rem', color: '#334155' }}>No Clinical Risk Report Yet</h3>
            <p
              style={{
                color: '#64748b',
                fontSize: '0.88rem',
                maxWidth: '420px',
                margin: '0 auto 1.25rem',
              }}
            >
              A risk report will be generated when a verified veterinarian evaluates this animal
              during a veterinary care case or routine health review.
            </p>
            {onOpenAssessment && (
              <button type="button" onClick={onOpenAssessment}>
                🩺 Perform Veterinary Risk Assessment
              </button>
            )}
          </div>
        )}

        {!loading && assessment && (
          <div>
            {/* Top Risk Score Summary Banner */}
            <div
              style={{
                background: badgeBg,
                border: `2px solid ${badgeBorder}`,
                borderRadius: '0.75rem',
                padding: '1.25rem',
                marginBottom: '1.25rem',
                textAlign: 'center',
              }}
            >
              <span
                style={{
                  display: 'inline-block',
                  background: badgeColor,
                  color: '#ffffff',
                  fontWeight: 800,
                  fontSize: '0.82rem',
                  padding: '0.3rem 0.85rem',
                  borderRadius: '9999px',
                  letterSpacing: '0.05em',
                  marginBottom: '0.5rem',
                }}
              >
                ML RANDOM FOREST EVALUATION
              </span>
              <h1 style={{ margin: '0.2rem 0', fontSize: '1.85rem', color: badgeColor }}>
                {predicted === 'HIGH'
                  ? '🚨 HIGH ANIMAL RISK'
                  : predicted === 'MEDIUM'
                    ? '⚠️ MEDIUM ANIMAL RISK'
                    : '✅ LOW ANIMAL RISK'}
              </h1>
              <p style={{ margin: '0.2rem 0', color: '#475569', fontSize: '0.9rem' }}>
                Evaluated by Dr.{' '}
                {assessment.veterinarian?.user?.fullName ||
                  assessment.createdBy?.fullName ||
                  'Veterinarian'}
                {' · '}
                {new Date(assessment.createdAt).toLocaleDateString()} at{' '}
                {new Date(assessment.createdAt).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>

            {/* Probability Breakdown */}
            <div className="card" style={{ marginBottom: '1rem', padding: '1rem' }}>
              <h4 style={{ margin: '0 0 0.75rem', fontSize: '0.95rem', color: '#1e293b' }}>
                Risk Probability Distribution
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {Object.entries(probs).map(([riskClass, prob]) => {
                  const pct = Math.round(Number(prob) * 100);
                  const barColor =
                    riskClass === 'HIGH'
                      ? '#ef4444'
                      : riskClass === 'MEDIUM'
                        ? '#f59e0b'
                        : '#22c55e';
                  return (
                    <div key={riskClass}>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          fontSize: '0.82rem',
                          marginBottom: '0.15rem',
                        }}
                      >
                        <span style={{ fontWeight: 600 }}>{riskClass} RISK</span>
                        <span style={{ fontWeight: 700, color: barColor }}>{pct}%</span>
                      </div>
                      <div
                        style={{
                          height: '8px',
                          background: '#e2e8f0',
                          borderRadius: '4px',
                          overflow: 'hidden',
                        }}
                      >
                        <div
                          style={{
                            height: '100%',
                            width: `${pct}%`,
                            background: barColor,
                            borderRadius: '4px',
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Clinical & Biological Input Parameters */}
            <div className="card" style={{ marginBottom: '1rem', padding: '1rem' }}>
              <h4 style={{ margin: '0 0 0.75rem', fontSize: '0.95rem', color: '#1e293b' }}>
                Recorded Physiological &amp; Treatment Parameters
              </h4>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                  gap: '0.65rem',
                }}
              >
                <div className="metric-chip">
                  <small>Species</small>
                  <strong>{assessment.species}</strong>
                </div>
                <div className="metric-chip">
                  <small>Age</small>
                  <strong>{Number(assessment.ageYears)} yrs</strong>
                </div>
                <div className="metric-chip">
                  <small>Weight</small>
                  <strong>{Number(assessment.weightKg)} kg</strong>
                </div>
                <div className="metric-chip">
                  <small>Treatments (30d)</small>
                  <strong>{assessment.treatmentsLast30d}</strong>
                </div>
                <div className="metric-chip">
                  <small>Treatments (90d)</small>
                  <strong>{assessment.treatmentsLast90d}</strong>
                </div>
                <div className="metric-chip">
                  <small>Days Since Last</small>
                  <strong>{assessment.daysSinceLastTreatment}d</strong>
                </div>
                <div className="metric-chip">
                  <small>AMU Classes (90d)</small>
                  <strong>{assessment.uniqueAntimicrobialClasses90d}</strong>
                </div>
                <div className="metric-chip">
                  <small>Antimicrobial Days</small>
                  <strong>{assessment.totalAntimicrobialDays90d}d / 90d</strong>
                </div>
              </div>
            </div>

            {/* Veterinarian Notes & Recommendations */}
            {(assessment.notes || assessment.recommendations) && (
              <div
                style={{
                  background: '#f8fafc',
                  border: '1px solid #cbd5e1',
                  borderRadius: '0.5rem',
                  padding: '1rem',
                  marginBottom: '1rem',
                }}
              >
                {assessment.notes && (
                  <div style={{ marginBottom: '0.65rem' }}>
                    <strong
                      style={{
                        fontSize: '0.85rem',
                        color: '#334155',
                        display: 'block',
                        marginBottom: '0.2rem',
                      }}
                    >
                      🩺 Veterinarian Clinical Observations:
                    </strong>
                    <p style={{ margin: 0, fontSize: '0.88rem', color: '#475569' }}>
                      {assessment.notes}
                    </p>
                  </div>
                )}
                {assessment.recommendations && (
                  <div>
                    <strong
                      style={{
                        fontSize: '0.85rem',
                        color: '#065f46',
                        display: 'block',
                        marginBottom: '0.2rem',
                      }}
                    >
                      💡 Advice for Farmer:
                    </strong>
                    <p
                      style={{ margin: 0, fontSize: '0.88rem', color: '#1e293b', fontWeight: 500 }}
                    >
                      {assessment.recommendations}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Assessment History */}
            {history.length > 1 && (
              <details style={{ marginTop: '1rem', fontSize: '0.86rem' }}>
                <summary style={{ cursor: 'pointer', fontWeight: 600, color: '#475569' }}>
                  📜 Prior Risk Assessments History ({history.length})
                </summary>
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.5rem',
                    marginTop: '0.5rem',
                  }}
                >
                  {history.map((item) => (
                    <div
                      key={item.id}
                      style={{
                        padding: '0.5rem 0.75rem',
                        border: '1px solid #e2e8f0',
                        borderRadius: '0.4rem',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        background: '#ffffff',
                      }}
                    >
                      <span>
                        <strong>{item.predictedRisk} RISK</strong> ·{' '}
                        {new Date(item.createdAt).toLocaleDateString()}
                      </span>
                      <small style={{ color: '#64748b' }}>
                        By {item.veterinarian?.user?.fullName || item.createdBy?.fullName || 'Vet'}
                      </small>
                    </div>
                  ))}
                </div>
              </details>
            )}

            <p
              style={{
                fontSize: '0.74rem',
                color: '#94a3b8',
                marginTop: '1rem',
                textAlign: 'center',
              }}
            >
              ⚖️ This decision-support risk prediction is produced by a trained Random Forest
              classifier based on veterinary-entered treatment parameters. It does not replace
              laboratory milk residue testing or individual veterinary clinical diagnosis.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
