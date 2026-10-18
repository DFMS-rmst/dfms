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
      subtitle: 'Submit your statutory council registration number, qualification, and license document for platform review.',
      badge: '🩺 Registered Practitioner',
      icon: '🩺',
    },
    FARMER: {
      title: 'Farmer Identity & Livestock Farm Verification',
      subtitle: 'Submit your farm location, farmer registration or Kisan Credit ID, and land/identity document for administrative validation.',
      badge: '🌾 Livestock Producer',
      icon: '🌾',
    },
    DAIRY_OWNER: {
      title: 'Dairy Enterprise & FSSAI Verification',
      subtitle: 'Submit your dairy processing plant details, FSSAI license number, and registration proof for platform operator approval.',
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
      setError('Your verification session has expired or is invalid. Please return to Sign In or Register to obtain a fresh verification session.');
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
        <div className="modern-auth-container" style={{ maxWidth: '680px', margin: '2rem auto' }}>
          <div className="modern-auth-card" style={{ textAlign: 'center', padding: '3rem 2rem' }}>
            <div style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>🎉</div>
            <h2 style={{ fontSize: '1.8rem', color: '#0f172a', marginBottom: '0.75rem' }}>
              Verification Submitted Successfully!
            </h2>
            <div
              style={{
                display: 'inline-block',
                padding: '0.35rem 1rem',
                borderRadius: '9999px',
                background: '#fef3c7',
                color: '#92400e',
                fontWeight: 700,
                fontSize: '0.85rem',
                marginBottom: '1.5rem',
              }}
            >
              ⏳ Status: Pending Administrator Approval
            </div>
            <p style={{ color: '#475569', fontSize: '0.98rem', lineHeight: '1.6', marginBottom: '1.5rem' }}>
              Thank you, <strong>{pendingUser?.fullName}</strong>. Your verification details and supporting
              documents for <strong>{roleMeta.badge}</strong> have been received.
            </p>
            <div
              style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '1rem',
                padding: '1.25rem',
                textAlign: 'left',
                marginBottom: '2rem',
                fontSize: '0.9rem',
                color: '#334155',
              }}
            >
              <h4 style={{ margin: '0 0 0.5rem 0', color: '#0f172a' }}>What happens next?</h4>
              <ul style={{ margin: 0, paddingLeft: '1.25rem', lineHeight: '1.7' }}>
                <li>The Platform Administrator will inspect your submitted credentials and documents.</li>
                <li>Once validated and approved, your account will be activated.</li>
                <li>Then only you can sign in with your email and password.</li>
              </ul>
            </div>
            <button
              type="button"
              className="modern-submit-btn"
              onClick={handleBack}
              style={{ maxWidth: '300px', margin: '0 auto' }}
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

      <div className="modern-auth-container" style={{ maxWidth: '820px', margin: '2rem auto' }}>
        <div className="modern-auth-card" style={{ padding: '2.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.35rem 0.85rem',
                background: 'rgba(5, 150, 105, 0.1)',
                color: 'var(--ag-green-primary)',
                fontWeight: 700,
                fontSize: '0.85rem',
                borderRadius: '9999px',
              }}
            >
              Step 2 of 2: Profile Verification
            </span>
            <button
              type="button"
              onClick={handleBack}
              style={{
                background: 'none',
                border: 'none',
                color: '#64748b',
                cursor: 'pointer',
                fontSize: '0.88rem',
                fontWeight: 600,
              }}
            >
              ← Back to Sign In
            </button>
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

          <div className="form-title-group" style={{ marginBottom: '1.75rem' }}>
            <h2 style={{ fontSize: '1.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span>{roleMeta.icon}</span> {roleMeta.title}
            </h2>
            <p className="form-sub-text">
              {roleMeta.subtitle}
            </p>
          </div>

          <form className="modern-form" onSubmit={handleSubmit}>
            {/* VETERINARIAN FORM FIELDS */}
            {role === 'VETERINARIAN' && (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="input-group">
                    <label htmlFor="qualification">Qualification *</label>
                    <div className="input-field-wrapper">
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

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="input-group">
                    <label htmlFor="registrationNumber">Veterinary Council Registration No. *</label>
                    <div className="input-field-wrapper">
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
                      <input
                        id="specialization"
                        name="specialization"
                        type="text"
                        placeholder="e.g. Bovine Medicine, Surgery"
                      />
                    </div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                  <div className="input-group">
                    <label htmlFor="experienceYears">Experience (Years)</label>
                    <div className="input-field-wrapper">
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
                      <input id="state" name="state" type="text" required placeholder="e.g. Gujarat" />
                    </div>
                  </div>
                  <div className="input-group">
                    <label htmlFor="district">Service District</label>
                    <div className="input-field-wrapper">
                      <input id="district" name="district" type="text" placeholder="e.g. Anand" />
                    </div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="input-group">
                    <label htmlFor="taluka">Taluka / Sub-district</label>
                    <div className="input-field-wrapper">
                      <input id="taluka" name="taluka" type="text" placeholder="e.g. Anand Rural" />
                    </div>
                  </div>
                  <div className="input-group">
                    <label htmlFor="pincode">Pincode</label>
                    <div className="input-field-wrapper">
                      <input id="pincode" name="pincode" type="text" placeholder="e.g. 388001" />
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* FARMER FORM FIELDS */}
            {role === 'FARMER' && (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="input-group">
                    <label htmlFor="farmName">Farm / Dairy Farm Name *</label>
                    <div className="input-field-wrapper">
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

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                  <div className="input-group">
                    <label htmlFor="state">State *</label>
                    <div className="input-field-wrapper">
                      <input id="state" name="state" type="text" required placeholder="e.g. Gujarat" />
                    </div>
                  </div>
                  <div className="input-group">
                    <label htmlFor="district">District *</label>
                    <div className="input-field-wrapper">
                      <input id="district" name="district" type="text" required placeholder="e.g. Anand" />
                    </div>
                  </div>
                  <div className="input-group">
                    <label htmlFor="totalCattle">Estimated Herd Size (Cattle)</label>
                    <div className="input-field-wrapper">
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

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="input-group">
                    <label htmlFor="taluka">Taluka / Village</label>
                    <div className="input-field-wrapper">
                      <input id="taluka" name="taluka" type="text" placeholder="e.g. Anand" />
                    </div>
                  </div>
                  <div className="input-group">
                    <label htmlFor="pincode">Pincode</label>
                    <div className="input-field-wrapper">
                      <input id="pincode" name="pincode" type="text" placeholder="e.g. 388001" />
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* DAIRY OWNER FORM FIELDS */}
            {role === 'DAIRY_OWNER' && (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="input-group">
                    <label htmlFor="dairyName">Dairy Cooperative / Plant Name *</label>
                    <div className="input-field-wrapper">
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

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="input-group">
                    <label htmlFor="state">Operational State *</label>
                    <div className="input-field-wrapper">
                      <input id="state" name="state" type="text" required placeholder="e.g. Gujarat" />
                    </div>
                  </div>
                  <div className="input-group">
                    <label htmlFor="district">Primary District *</label>
                    <div className="input-field-wrapper">
                      <input id="district" name="district" type="text" required placeholder="e.g. Rajkot" />
                    </div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="input-group">
                    <label htmlFor="operationalArea">Procurement Area / Route</label>
                    <div className="input-field-wrapper">
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
            <div
              style={{
                background: '#f8fafc',
                border: '1.5px dashed #cbd5e1',
                borderRadius: '0.85rem',
                padding: '1.25rem',
                marginTop: '0.5rem',
              }}
            >
              <label
                htmlFor="documentFile"
                style={{
                  display: 'block',
                  fontWeight: 700,
                  fontSize: '0.92rem',
                  color: '#0f172a',
                  marginBottom: '0.35rem',
                }}
              >
                📎 Official Verification Document / Certificate (PDF or Image)
              </label>
              <p style={{ margin: '0 0 0.85rem 0', fontSize: '0.82rem', color: '#64748b' }}>
                {role === 'VETERINARIAN' && 'Upload your State Veterinary Council Registration Certificate or Degree.'}
                {role === 'FARMER' && 'Upload your Farmer ID card, Kisan Credit Card, or Land Record certificate.'}
                {role === 'DAIRY_OWNER' && 'Upload your FSSAI Dairy License or Business Registration Certificate.'}
              </p>
              <input
                id="documentFile"
                name="documentFile"
                type="file"
                accept=".pdf,image/png,image/jpeg,image/jpg"
                onChange={handleFileChange}
                style={{
                  display: 'block',
                  width: '100%',
                  padding: '0.5rem',
                  fontSize: '0.88rem',
                  background: '#ffffff',
                  borderRadius: '0.5rem',
                  border: '1px solid #cbd5e1',
                }}
              />
              {docName && (
                <div style={{ marginTop: '0.5rem', color: 'var(--ag-green-primary)', fontSize: '0.85rem', fontWeight: 600 }}>
                  ✓ Selected: {docName}
                </div>
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
              style={{ marginTop: '1rem' }}
            >
              {submitting ? 'Submitting Verification…' : 'Submit Verification for Admin Approval'}
            </button>
          </form>

          <p style={{ marginTop: '1.25rem', textAlign: 'center', fontSize: '0.85rem', color: '#64748b' }}>
            🔒 All documents and credentials are encrypted and accessible only to authorized platform administrators.
          </p>
        </div>
      </div>
    </main>
  );
}
