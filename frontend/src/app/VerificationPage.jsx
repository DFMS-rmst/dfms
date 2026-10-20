import { useState } from 'react';
import { api } from './api.js';

export function VerificationPage({
  pendingData,
  pendingUser,
  verificationToken,
  onComplete,
  onSubmitted,
  onBack,
  onBackToLogin,
}) {
  const resolvedData = pendingData || {};
  const user = pendingUser || resolvedData.user || {};
  const token = verificationToken || resolvedData.token || resolvedData.verificationToken;
  const role = resolvedData.role || user.role || user.pendingRole || 'FARMER';
  const handleDone = onComplete || onSubmitted;
  const handleBack = onBack || onBackToLogin;

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [isDone, setIsDone] = useState(false);
  const [docName, setDocName] = useState('');
  const [docData, setDocData] = useState('');

  const roleMeta = {
    VETERINARIAN: {
      title: 'Veterinarian Credential & License Verification',
      subtitle:
        'Submit your statutory council registration number, qualification, and license document for platform review.',
      badge: '🩺 Registered Practitioner',
      icon: '🩺',
    },
    FARMER: {
      title: 'Farmer Identity & Livestock Farm Verification',
      subtitle:
        'Submit your farm location, farmer registration or Kisan Credit ID, and land/identity document for administrative validation.',
      badge: '🌾 Livestock Producer',
      icon: '🌾',
    },
    DAIRY_OWNER: {
      title: 'Dairy Enterprise & FSSAI Verification',
      subtitle:
        'Submit your dairy processing plant details, FSSAI license number, and registration proof for platform operator approval.',
      badge: '🥛 Dairy Cooperative / Plant',
      icon: '🥛',
    },
  }[role] || {
    title: 'User Verification',
    subtitle: 'Submit your credentials for administrative review.',
    badge: '👤 User',
    icon: '📋',
  };

  async function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) {
      setDocName('');
      setDocData('');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('File size exceeds 5MB limit. Please upload a smaller PDF or image.');
      return;
    }
    setDocName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      setDocData(reader.result);
      setError('');
    };
    reader.onerror = () => {
      setError('Failed to read document file.');
    };
    reader.readAsDataURL(file);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!token) {
      setError(
        'Your verification session has expired or is invalid. Please return to Sign In or Register to obtain a fresh verification session.',
      );
      return;
    }
    setSubmitting(true);
    setError('');

    try {
      const form = new FormData(e.currentTarget);
      const values = Object.fromEntries(form.entries());
      delete values.documentFile;

      const payload = {
        role,
        ...values,
        documentName: docName || null,
        documentData: docData || null,
      };

      await api('/auth/verification/submit', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      setIsDone(true);
      handleDone?.();
    } catch (err) {
      setError(err.message || 'Verification submission failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  if (isDone) {
    return (
      <main className="modern-auth-page">
        <div className="modern-auth-mesh-bg">
          <div className="mesh-blob blob-1"></div>
          <div className="mesh-blob blob-2"></div>
        </div>
        <div className="verification-page-container">
          <div className="verification-card verification-success-card">
            <div className="verification-success-icon">🎉</div>
            <h2
              style={{
                fontSize: '1.85rem',
                color: '#0f172a',
                margin: '0 0 0.75rem 0',
                fontWeight: 800,
              }}
            >
              Verification Submitted Successfully!
            </h2>
            <div className="verification-status-pill">
              <span>⏳</span> Status: Pending Administrator Approval
            </div>
            <p
              style={{
                color: '#475569',
                fontSize: '0.98rem',
                lineHeight: '1.6',
                margin: '0 0 1.5rem 0',
              }}
            >
              Thank you, <strong>{user?.fullName || pendingUser?.fullName}</strong>. Your
              verification details and supporting documents for <strong>{roleMeta.badge}</strong>{' '}
              have been received.
            </p>
            <div className="verification-next-steps">
              <h4>What happens next?</h4>
              <ul>
                <li>
                  The Platform Administrator will inspect your submitted credentials and documents.
                </li>
                <li>Once validated and approved, your account will be activated.</li>
                <li>You can then sign in directly with your email and password.</li>
              </ul>
            </div>
            <button
              type="button"
              className="modern-submit-btn"
              onClick={handleBack}
              style={{ maxWidth: '280px', margin: '0 auto' }}
            >
              Return to Sign In
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="modern-auth-page">
      <div className="modern-auth-mesh-bg">
        <div className="mesh-blob blob-1"></div>
        <div className="mesh-blob blob-2"></div>
        <div className="mesh-blob blob-3"></div>
      </div>

      <div className="verification-page-container">
        <div className="verification-card">
          {/* Header Row */}
          <div className="verification-header-row">
            <span className="verification-step-badge">
              <span>🌾</span> Commercial Ag-Tech Onboarding
            </span>
            <button type="button" className="verification-back-btn" onClick={handleBack}>
              <span>←</span> Return to Sign In
            </button>
          </div>

          {/* Stepper Progress */}
          <div className="verification-stepper">
            <div className="step-item completed">
              <div className="step-circle">✓</div>
              <span>1. Account Created</span>
            </div>
            <div className="step-divider completed"></div>
            <div className="step-item active">
              <div className="step-circle">2</div>
              <span>2. Profile & Verification</span>
            </div>
            <div className="step-divider"></div>
            <div className="step-item">
              <div className="step-circle">3</div>
              <span>3. Admin Approval</span>
            </div>
          </div>

          {/* Role Banner */}
          <div className="verification-role-banner">
            <div className="verification-role-icon">{roleMeta.icon}</div>
            <div className="verification-role-info">
              <div className="verification-role-badge">{roleMeta.badge}</div>
              <h3 className="verification-role-title">{roleMeta.title}</h3>
              <p className="verification-role-desc">{roleMeta.subtitle}</p>
            </div>
          </div>

          {!token && (
            <div className="auth-error-alert" style={{ marginBottom: '1.5rem' }}>
              <span className="alert-icon">⚠️</span>
              <span>
                Verification session is missing or expired. Please{' '}
                <button
                  type="button"
                  onClick={handleBack}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'inherit',
                    textDecoration: 'underline',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Sign In
                </button>{' '}
                to continue verification.
              </span>
            </div>
          )}

          <form className="modern-form" onSubmit={handleSubmit}>
            {/* VETERINARIAN FORM FIELDS */}
            {role === 'VETERINARIAN' && (
              <>
                <div className="form-row-2">
                  <div className="input-group">
                    <label htmlFor="qualification">Qualification *</label>
                    <div className="input-field-wrapper">
                      <span className="field-icon">🎓</span>
                      <input
                        id="qualification"
                        name="qualification"
                        type="text"
                        required
                        placeholder="e.g. B.V.Sc. & A.H. / M.V.Sc."
                      />
                    </div>
                  </div>
                  <div className="input-group">
                    <label htmlFor="registrationCouncil">State Veterinary Council *</label>
                    <div className="input-field-wrapper">
                      <span className="field-icon">🏛️</span>
                      <input
                        id="registrationCouncil"
                        name="registrationCouncil"
                        type="text"
                        required
                        placeholder="e.g. Maharashtra State Veterinary Council"
                      />
                    </div>
                  </div>
                </div>

                <div className="form-row-2">
                  <div className="input-group">
                    <label htmlFor="registrationNumber">
                      Veterinary Council Registration No. *
                    </label>
                    <div className="input-field-wrapper">
                      <span className="field-icon">🔢</span>
                      <input
                        id="registrationNumber"
                        name="registrationNumber"
                        type="text"
                        required
                        placeholder="e.g. MSVC-2022-4512"
                      />
                    </div>
                  </div>
                  <div className="input-group">
                    <label htmlFor="specialization">Specialization / Clinical Focus</label>
                    <div className="input-field-wrapper">
                      <span className="field-icon">🩺</span>
                      <input
                        id="specialization"
                        name="specialization"
                        type="text"
                        placeholder="e.g. Bovine Medicine, Surgery"
                      />
                    </div>
                  </div>
                </div>

                <div className="form-row-3">
                  <div className="input-group">
                    <label htmlFor="experienceYears">Experience (Years)</label>
                    <div className="input-field-wrapper">
                      <span className="field-icon">⏳</span>
                      <input
                        id="experienceYears"
                        name="experienceYears"
                        type="number"
                        min="0"
                        max="60"
                        placeholder="e.g. 5"
                      />
                    </div>
                  </div>
                  <div className="input-group">
                    <label htmlFor="state">Service State *</label>
                    <div className="input-field-wrapper">
                      <span className="field-icon">📍</span>
                      <input
                        id="state"
                        name="state"
                        type="text"
                        required
                        placeholder="e.g. Gujarat"
                      />
                    </div>
                  </div>
                  <div className="input-group">
                    <label htmlFor="district">Service District</label>
                    <div className="input-field-wrapper">
                      <span className="field-icon">🏙️</span>
                      <input id="district" name="district" type="text" placeholder="e.g. Anand" />
                    </div>
                  </div>
                </div>

                <div className="form-row-2">
                  <div className="input-group">
                    <label htmlFor="taluka">Taluka / Sub-district</label>
                    <div className="input-field-wrapper">
                      <span className="field-icon">🏘️</span>
                      <input id="taluka" name="taluka" type="text" placeholder="e.g. Anand Rural" />
                    </div>
                  </div>
                  <div className="input-group">
                    <label htmlFor="pincode">Pincode</label>
                    <div className="input-field-wrapper">
                      <span className="field-icon">📮</span>
                      <input id="pincode" name="pincode" type="text" placeholder="e.g. 388001" />
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* FARMER FORM FIELDS */}
            {role === 'FARMER' && (
              <>
                <div className="form-row-2">
                  <div className="input-group">
                    <label htmlFor="farmName">Farm / Dairy Farm Name *</label>
                    <div className="input-field-wrapper">
                      <span className="field-icon">🚜</span>
                      <input
                        id="farmName"
                        name="farmName"
                        type="text"
                        required
                        placeholder="e.g. Patel Dairy Farm"
                      />
                    </div>
                  </div>
                  <div className="input-group">
                    <label htmlFor="farmerIdNumber">Farmer ID / KCC / Land Record No. *</label>
                    <div className="input-field-wrapper">
                      <span className="field-icon">🪪</span>
                      <input
                        id="farmerIdNumber"
                        name="farmerIdNumber"
                        type="text"
                        required
                        placeholder="e.g. KCC-GJ-2024-8841"
                      />
                    </div>
                  </div>
                </div>

                <div className="form-row-3">
                  <div className="input-group">
                    <label htmlFor="state">State *</label>
                    <div className="input-field-wrapper">
                      <span className="field-icon">📍</span>
                      <input
                        id="state"
                        name="state"
                        type="text"
                        required
                        placeholder="e.g. Gujarat"
                      />
                    </div>
                  </div>
                  <div className="input-group">
                    <label htmlFor="district">District *</label>
                    <div className="input-field-wrapper">
                      <span className="field-icon">🏙️</span>
                      <input
                        id="district"
                        name="district"
                        type="text"
                        required
                        placeholder="e.g. Anand"
                      />
                    </div>
                  </div>
                  <div className="input-group">
                    <label htmlFor="totalCattle">Estimated Herd Size (Cattle)</label>
                    <div className="input-field-wrapper">
                      <span className="field-icon">🐄</span>
                      <input
                        id="totalCattle"
                        name="totalCattle"
                        type="number"
                        min="0"
                        placeholder="e.g. 15"
                      />
                    </div>
                  </div>
                </div>

                <div className="form-row-2">
                  <div className="input-group">
                    <label htmlFor="taluka">Taluka / Village</label>
                    <div className="input-field-wrapper">
                      <span className="field-icon">🏘️</span>
                      <input id="taluka" name="taluka" type="text" placeholder="e.g. Anand" />
                    </div>
                  </div>
                  <div className="input-group">
                    <label htmlFor="pincode">Pincode</label>
                    <div className="input-field-wrapper">
                      <span className="field-icon">📮</span>
                      <input id="pincode" name="pincode" type="text" placeholder="e.g. 388001" />
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* DAIRY OWNER FORM FIELDS */}
            {role === 'DAIRY_OWNER' && (
              <>
                <div className="form-row-2">
                  <div className="input-group">
                    <label htmlFor="dairyName">Dairy Cooperative / Plant Name *</label>
                    <div className="input-field-wrapper">
                      <span className="field-icon">🥛</span>
                      <input
                        id="dairyName"
                        name="dairyName"
                        type="text"
                        required
                        placeholder="e.g. Saurashtra Milk Cooperative"
                      />
                    </div>
                  </div>
                  <div className="input-group">
                    <label htmlFor="fssaiLicenseNumber">FSSAI License / Registration No. *</label>
                    <div className="input-field-wrapper">
                      <span className="field-icon">📜</span>
                      <input
                        id="fssaiLicenseNumber"
                        name="fssaiLicenseNumber"
                        type="text"
                        required
                        placeholder="e.g. FSSAI-11521018000412"
                      />
                    </div>
                  </div>
                </div>

                <div className="form-row-2">
                  <div className="input-group">
                    <label htmlFor="state">Operational State *</label>
                    <div className="input-field-wrapper">
                      <span className="field-icon">📍</span>
                      <input
                        id="state"
                        name="state"
                        type="text"
                        required
                        placeholder="e.g. Gujarat"
                      />
                    </div>
                  </div>
                  <div className="input-group">
                    <label htmlFor="district">Primary District *</label>
                    <div className="input-field-wrapper">
                      <span className="field-icon">🏙️</span>
                      <input
                        id="district"
                        name="district"
                        type="text"
                        required
                        placeholder="e.g. Rajkot"
                      />
                    </div>
                  </div>
                </div>

                <div className="form-row-2">
                  <div className="input-group">
                    <label htmlFor="operationalArea">Procurement Area / Route</label>
                    <div className="input-field-wrapper">
                      <span className="field-icon">🚚</span>
                      <input
                        id="operationalArea"
                        name="operationalArea"
                        type="text"
                        placeholder="e.g. Rajkot, Gondal & Jasdan"
                      />
                    </div>
                  </div>
                  <div className="input-group">
                    <label htmlFor="dailyCapacityLiters">Daily Processing Capacity (Liters)</label>
                    <div className="input-field-wrapper">
                      <span className="field-icon">📊</span>
                      <input
                        id="dailyCapacityLiters"
                        name="dailyCapacityLiters"
                        type="number"
                        min="0"
                        placeholder="e.g. 50000"
                      />
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* DOCUMENT UPLOAD (ALL 3 USER TYPES) */}
            <div className="verification-upload-box">
              <input
                id="documentFile"
                name="documentFile"
                type="file"
                className="verification-file-input"
                accept=".pdf,image/png,image/jpeg,image/jpg"
                onChange={handleFileChange}
              />
              <div className="verification-upload-icon">📄</div>
              <div className="verification-upload-title">
                Upload Official Verification Document / Certificate
              </div>
              <div className="verification-upload-hint">
                {role === 'VETERINARIAN' &&
                  'Upload your State Veterinary Council Registration Certificate or Degree.'}
                {role === 'FARMER' &&
                  'Upload your Farmer ID card, Kisan Credit Card, or Land Record certificate.'}
                {role === 'DAIRY_OWNER' &&
                  'Upload your FSSAI Dairy License or Business Registration Certificate.'}
                <br />
                <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                  PDF, PNG, JPG (Max 5MB) • Drag & drop or click to browse
                </span>
              </div>
              {docName ? (
                <div className="verification-file-selected">
                  <span>✓</span> Document Selected: {docName}
                </div>
              ) : (
                <span
                  style={{
                    display: 'inline-block',
                    padding: '0.4rem 0.9rem',
                    background: '#ffffff',
                    border: '1px solid #cbd5e1',
                    borderRadius: '0.5rem',
                    fontSize: '0.84rem',
                    fontWeight: 600,
                    color: '#475569',
                  }}
                >
                  Browse File
                </span>
              )}
            </div>

            {error && (
              <div className="auth-error-alert">
                <span className="alert-icon">⚠️</span>
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              className="modern-submit-btn"
              disabled={submitting}
              style={{ marginTop: '0.75rem' }}
            >
              {submitting ? 'Submitting Verification…' : 'Submit Verification for Admin Approval'}
            </button>
          </form>

          <p
            style={{
              marginTop: '1.25rem',
              textAlign: 'center',
              fontSize: '0.82rem',
              color: '#64748b',
            }}
          >
            🔒 All documents and credentials are encrypted and accessible only to authorized
            platform administrators.
          </p>
        </div>
      </div>
    </main>
  );
}
