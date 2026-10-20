import { useEffect, useState } from 'react';
import { api, download, hasAccessToken, setAccessToken } from './api.js';
import { VeterinaryWorkflow } from './VeterinaryWorkflow.jsx';
import { CoreEngine } from './CoreEngine.jsx';
import { Certificates, DashboardReports, PublicVerification } from './TrustLayer.jsx';
import { AiLayer, AmuRiskCard } from './AiLayer.jsx';
import { DailyClearance, PublicDailyClearance } from './DailyClearance.jsx';
import { PublicAnimalVerification } from './PublicAnimalVerification.jsx';
import { formatTimelineDate, timelineEventLabel, timelineEventsFromResponse } from './timeline.js';
import {
  buildWorkspaces,
  farmCapabilities,
  navigationFor,
  normalizeOptionalFields,
} from './authorization.js';
import { VerificationPage } from './VerificationPage.jsx';
import { AdminVerifications } from './AdminVerifications.jsx';
import { DairyHub } from './DairyHub.jsx';
const Field = ({ label, name, type = 'text', required = true, defaultValue }) => (
  <label>
    {label}
    <input name={name} type={type} required={required} defaultValue={defaultValue} />
  </label>
);
function AuthPage({ mode, done, go, onRequireVerification }) {
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError('');
    try {
      const raw = Object.fromEntries(new FormData(e.currentTarget));
      const payload = mode === 'register' ? normalizeOptionalFields(raw, ['phone']) : raw;
      const data = await api(`/auth/${mode}`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      if (data.requiresVerification) {
        onRequireVerification?.({
          user: data.user,
          role: data.role || payload.role,
          token: data.verificationToken,
        });
        return;
      }
      setAccessToken(data.accessToken);
      done(data.user);
    } catch (x) {
      if (x.data?.requiresVerification && x.data?.verificationToken) {
        onRequireVerification?.({
          user: x.data.user,
          role: x.data.role,
          token: x.data.verificationToken,
        });
        return;
      }
      setError(x.message);
    }
  }

  return (
    <main className="modern-auth-page">
      <div className="modern-auth-mesh-bg">
        <div className="mesh-blob blob-1"></div>
        <div className="mesh-blob blob-2"></div>
        <div className="mesh-blob blob-3"></div>
      </div>

      <div className="modern-auth-container">
        {/* Left Side Hero Showcase */}
        <div className="modern-auth-hero">
          <div className="hero-tag-badge">
            <span className="badge-sparkle">🌾</span> Commercial Ag-Tech Platform
          </div>
          <h1 className="hero-main-title">
            Smart Livestock <br />
            <span className="gradient-highlight">& AMU Management</span>
          </h1>
          <p className="hero-description">
            Streamlined farm operations, verified veterinary health records, withdrawal monitoring,
            and milk eligibility certificates.
          </p>
          <div className="hero-pills-container">
            <span className="hero-pill">🐄 Livestock Tracking</span>
            <span className="hero-pill">🩺 Verified Vets</span>
            <span className="hero-pill">🥛 Milk Certificates</span>
            <span className="hero-pill">🛡️ Cryptographic Integrity</span>
          </div>
        </div>

        {/* Right Side Glass Card Form */}
        <div className="modern-auth-card-outer">
          <div className="modern-auth-card">
            {/* Pill Tab Switcher */}
            <div className="modern-tab-switcher">
              <button
                type="button"
                className={`tab-btn ${mode === 'login' ? 'active' : ''}`}
                onClick={() => {
                  setError('');
                  go('login');
                }}
              >
                Sign In
              </button>
              <button
                type="button"
                className={`tab-btn ${mode === 'register' ? 'active' : ''}`}
                onClick={() => {
                  setError('');
                  go('register');
                }}
              >
                Create Account
              </button>
            </div>

            <div className="form-title-group">
              <h2>{mode === 'login' ? 'Welcome back' : 'Create account'}</h2>
              <p className="form-sub-text">
                {mode === 'login'
                  ? 'Enter your credentials to access your dashboard'
                  : 'Register a new account to manage farms and livestock'}
              </p>
            </div>

            <form className="modern-form" onSubmit={submit}>
              {mode === 'register' && (
                <>
                  <div className="input-group">
                    <label htmlFor="fullName">Full Name</label>
                    <div className="input-field-wrapper">
                      <span className="field-icon">👤</span>
                      <input
                        id="fullName"
                        name="fullName"
                        type="text"
                        required
                        placeholder="e.g. Ramesh Patel"
                      />
                    </div>
                  </div>

                  <div className="input-group">
                    <label htmlFor="phone">Phone Number</label>
                    <div className="input-field-wrapper">
                      <span className="field-icon">📱</span>
                      <input
                        id="phone"
                        name="phone"
                        type="tel"
                        required
                        placeholder="+91 98765 43210"
                      />
                    </div>
                  </div>
                </>
              )}

              <div className="input-group">
                <label htmlFor="email">Email Address</label>
                <div className="input-field-wrapper">
                  <span className="field-icon">✉️</span>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    placeholder="name@example.com"
                  />
                </div>
              </div>

              <div className="input-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label htmlFor="password">Password</label>
                  {mode === 'register' && (
                    <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 500 }}>
                      Min. 10 characters
                    </span>
                  )}
                </div>
                <div className="input-field-wrapper has-toggle">
                  <span className="field-icon">🔒</span>
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={mode === 'register' ? 10 : undefined}
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    className="password-toggle-btn"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label="Toggle password visibility"
                  >
                    {showPassword ? '👁️' : '🙈'}
                  </button>
                </div>
              </div>

              {mode === 'register' && (
                <div className="input-group">
                  <label htmlFor="userRole">Account Role / Type</label>
                  <div className="input-field-wrapper">
                    <span className="field-icon">🏷️</span>
                    <select id="userRole" name="role" required defaultValue="FARMER">
                      <option value="FARMER">🌾 Farmer / Livestock Owner</option>
                      <option value="VETERINARIAN">🩺 Veterinarian</option>
                      <option value="DAIRY_OWNER">🥛 Dairy Owner / Cooperative</option>
                    </select>
                  </div>
                </div>
              )}

              {error && (
                <div className="auth-error-alert">
                  <span className="alert-icon">⚠️</span>
                  <span>{error}</span>
                </div>
              )}

              <button type="submit" className="modern-submit-btn">
                {mode === 'login' ? 'Login' : 'Register'}
              </button>
            </form>

            <div className="modern-auth-footer">
              <p>
                {mode === 'login' ? "Don't have an account yet?" : 'Already registered?'}
                <button
                  type="button"
                  className="switch-mode-link"
                  onClick={() => {
                    setError('');
                    go(mode === 'login' ? 'register' : 'login');
                  }}
                >
                  {mode === 'login' ? 'Register instead' : 'Login instead'}
                </button>
              </p>

              {mode === 'login' && (
                <div className="demo-credentials-bar">
                  <details>
                    <summary>🔑 Need quick demo credentials?</summary>
                    <ul>
                      <li>
                        <strong>Platform Admin:</strong> <code>admin@example.local</code>
                      </li>
                      <li>
                        <strong>Farm Owner:</strong> <code>farmer@example.local</code>
                      </li>
                      <li>
                        <strong>Veterinarian:</strong> <code>vet@example.local</code>
                      </li>
                      <li>
                        <strong>Password:</strong> <code>DemoOnly!234</code>
                      </li>
                    </ul>
                  </details>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
function FarmForm({ done }) {
  async function submit(e) {
    e.preventDefault();
    const payload = normalizeOptionalFields(Object.fromEntries(new FormData(e.currentTarget)), [
      'taluka',
      'pincode',
    ]);
    done(
      (
        await api('/farms', {
          method: 'POST',
          body: JSON.stringify(payload),
        })
      ).farm,
    );
  }
  return (
    <form className="card form" onSubmit={submit}>
      <h2>Create Farm</h2>
      <Field label="Farm name" name="name" />
      <Field label="State" name="state" />
      <Field label="District" name="district" />
      <Field label="Taluka" name="taluka" required={false} />
      <Field label="PIN code" name="pincode" required={false} />
      <button>Create farm</button>
    </form>
  );
}
function AnimalForm({ farmId, species, done }) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function submit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    const v = Object.fromEntries(new FormData(e.currentTarget));
    v.lactating = v.lactating === 'on';
    try {
      const res = await api(`/farms/${farmId}/animals`, {
        method: 'POST',
        body: JSON.stringify(v),
      });
      done(res.animal);
      e.currentTarget.reset();
    } catch (err) {
      setError(err.message || 'Failed to add animal');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="card form" onSubmit={submit} style={{ marginTop: '2rem' }}>
      <h2>Add Animal</h2>
      {error && <p className="error">{error}</p>}
      <Field label="Tag number" name="tagNumber" required />
      <Field label="Name" name="name" required={false} />
      <label>
        Species Category
        <select name="speciesId" required defaultValue={species[0]?.id || ''}>
          {species.map((s) => (
            <option key={s.id} value={s.id}>
              {s.canonicalName} {s.scientificName ? `(${s.scientificName})` : ''}
            </option>
          ))}
        </select>
      </label>
      <label>
        Sex Category
        <select name="sex" defaultValue="FEMALE">
          <option value="FEMALE">Female (Cow / Ewe / Doe / Sow / Mare)</option>
          <option value="MALE">Male</option>
          <option value="INTACT_FEMALE">Intact Female</option>
          <option value="INTACT_MALE">Intact Male (Bull / Ram / Buck / Stallion / Boar)</option>
          <option value="NEUTERED">Neutered (Steer / Wether / Gelding / Barrow)</option>
          <option value="CASTRATED">Castrated</option>
          <option value="HERMAPHRODITE">Intersex / Hermaphrodite</option>
          <option value="UNKNOWN">Unknown / Unspecified</option>
        </select>
      </label>
      <label className="check">
        <input name="lactating" type="checkbox" /> <span>Lactating (Currently Producing Milk)</span>
      </label>
      <button disabled={submitting}>{submitting ? 'Adding animal...' : 'Add Animal'}</button>
    </form>
  );
}
function VetProfile({ onAuthorizationChanged }) {
  const [profile, setProfile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    api('/veterinarians/me')
      .then((d) => setProfile(d.profile))
      .catch(() => {});
  }, []);

  async function submit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    setSuccess('');
    try {
      const v = Object.fromEntries(new FormData(e.currentTarget));
      const credential = v.credential;
      delete v.credential;
      v.experienceYears = v.experienceYears ? Number(v.experienceYears) : null;
      v.serviceAreas = [{ state: v.state, district: v.district || null }];
      delete v.state;
      delete v.district;
      const saved = (await api('/veterinarians/me', { method: 'PUT', body: JSON.stringify(v) }))
        .profile;
      if (credential?.size) {
        const intent = await api('/files/upload-intents', {
          method: 'POST',
          body: JSON.stringify({
            entityType: 'VETERINARIAN_PROFILE',
            entityId: saved.id,
            purpose: 'REGISTRATION_CERTIFICATE',
            mimeType: credential.type,
            sizeBytes: credential.size,
            originalFilename: credential.name,
          }),
        });
        const upload = await fetch(intent.uploadUrl, {
          method: 'PUT',
          headers: { 'Content-Type': credential.type },
          body: credential,
        });
        if (!upload.ok) throw new Error('Private document upload failed');
        await api(`/files/${intent.file.id}/complete`, { method: 'POST' });
      }
      setProfile(saved);
      setSuccess(
        '✅ Veterinarian profile and credentials submitted successfully! Awaiting platform verification.',
      );
      await onAuthorizationChanged?.();
    } catch (err) {
      setError(err.message || 'Failed to submit profile credentials');
    } finally {
      setSubmitting(false);
    }
  }

  const qualificationsList = [
    'B.V.Sc. & A.H.',
    'M.V.Sc.',
    'Ph.D. in Veterinary Science',
    'D.V.M. (Doctor of Veterinary Medicine)',
    'Diploma in Veterinary Science / Technology',
    'B.Sc. (Veterinary Science / Animal Husbandry)',
  ];

  const councilsList = [
    'Veterinary Council of India (VCI)',
    'State Veterinary Council — Maharashtra',
    'State Veterinary Council — Karnataka',
    'State Veterinary Council — Gujarat',
    'State Veterinary Council — Punjab',
    'State Veterinary Council — Haryana',
    'State Veterinary Council — Uttar Pradesh',
    'State Veterinary Council — Tamil Nadu',
    'State Veterinary Council — Rajasthan',
    'State Veterinary Council — Kerala',
    'State Veterinary Council — Andhra Pradesh',
    'State Veterinary Council — Telangana',
    'State Veterinary Council — Madhya Pradesh',
    'Other National / State Veterinary Council',
  ];

  const statesList = [
    'Karnataka',
    'Maharashtra',
    'Gujarat',
    'Punjab',
    'Haryana',
    'Uttar Pradesh',
    'Tamil Nadu',
    'Rajasthan',
    'Kerala',
    'Andhra Pradesh',
    'Telangana',
    'Madhya Pradesh',
    'Bihar',
    'West Bengal',
    'Assam',
    'Other State / Union Territory',
  ];

  return (
    <form className="card form" onSubmit={submit}>
      <h2>Veterinarian Profile / Verification Submission</h2>
      {profile && (
        <span className="badge" style={{ marginBottom: '1rem', display: 'inline-block' }}>
          {profile.status}
        </span>
      )}
      {error && <p className="error">{error}</p>}
      {success && <p className="success-text">{success}</p>}

      <label>
        Qualification
        <select
          name="qualification"
          required
          defaultValue={profile?.qualification || 'B.V.Sc. & A.H.'}
        >
          {profile?.qualification && !qualificationsList.includes(profile.qualification) && (
            <option value={profile.qualification}>{profile.qualification}</option>
          )}
          {qualificationsList.map((q) => (
            <option key={q} value={q}>
              {q}
            </option>
          ))}
        </select>
      </label>

      <label>
        Specialization
        <select
          name="specialization"
          defaultValue={profile?.specialization || 'Bovine Medicine & Surgery'}
        >
          {profile?.specialization &&
            ![
              'Bovine Medicine & Surgery',
              'Small Ruminant Medicine',
              'Theriogenology & Reproduction',
              'Preventive Medicine & Herd Health',
              'General Farm Practice & Surgery',
              'Swine Health & Medicine',
              'Equine Medicine',
              'Avian & Poultry Medicine',
            ].includes(profile.specialization) && (
              <option value={profile.specialization}>{profile.specialization}</option>
            )}
          <option value="Bovine Medicine & Surgery">
            Bovine Medicine & Surgery (Cattle & Buffalo)
          </option>
          <option value="Small Ruminant Medicine">Small Ruminant Medicine (Goat & Sheep)</option>
          <option value="Theriogenology & Reproduction">Theriogenology & Reproduction</option>
          <option value="Preventive Medicine & Herd Health">
            Preventive Medicine & Herd Health
          </option>
          <option value="General Farm Practice & Surgery">General Farm Practice & Surgery</option>
          <option value="Swine Health & Medicine">Swine Health & Medicine</option>
          <option value="Equine Medicine">Equine Medicine</option>
          <option value="Avian & Poultry Medicine">Avian & Poultry Medicine</option>
        </select>
      </label>

      <Field
        label="Registration number (e.g. VCI/2021/4892)"
        name="registrationNumber"
        required
        defaultValue={profile?.registrationNumber}
      />

      <label>
        Registration council
        <select
          name="registrationCouncil"
          required
          defaultValue={profile?.registrationCouncil || 'Veterinary Council of India (VCI)'}
        >
          {profile?.registrationCouncil && !councilsList.includes(profile.registrationCouncil) && (
            <option value={profile.registrationCouncil}>{profile.registrationCouncil}</option>
          )}
          {councilsList.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </label>

      <label>
        Years of Experience
        <select name="experienceYears" defaultValue={profile?.experienceYears ?? 5}>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 15, 20].map((yr) => (
            <option key={yr} value={yr}>
              {yr} {yr === 1 ? 'Year' : 'Years'}
            </option>
          ))}
        </select>
      </label>

      <label>
        Service State
        <select
          name="state"
          required
          defaultValue={profile?.serviceAreas?.[0]?.state || 'Karnataka'}
        >
          {profile?.serviceAreas?.[0]?.state &&
            !statesList.includes(profile.serviceAreas[0].state) && (
              <option value={profile.serviceAreas[0].state}>{profile.serviceAreas[0].state}</option>
            )}
          {statesList.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </label>

      <Field
        label="Service District (e.g. Mysuru)"
        name="district"
        required={false}
        defaultValue={profile?.serviceAreas?.[0]?.district}
      />

      <label>
        Registration certificate (PDF, JPEG, or PNG; max 10 MB)
        <input name="credential" type="file" accept="application/pdf,image/jpeg,image/png" />
      </label>

      <button disabled={submitting}>
        {submitting ? '⏳ Submitting profile...' : 'Submit profile for verification'}
      </button>

      <p className="muted" style={{ marginTop: '0.5rem', fontSize: '0.85rem' }}>
        🔒 Registration documents are stored securely using private AWS S3 presigned authorization.
      </p>
    </form>
  );
}
function AdminVets() {
  const [items, setItems] = useState([]);
  useEffect(() => {
    api('/admin/veterinarians?status=PENDING').then((d) => setItems(d.veterinarians));
  }, []);
  async function review(id, status) {
    await api(`/admin/veterinarians/${id}/verification`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
    setItems((all) => all.filter((v) => v.id !== id));
  }
  async function viewDocument(fileId) {
    const { downloadUrl } = await api(`/files/${fileId}/download-intents`, { method: 'POST' });
    window.open(downloadUrl, '_blank', 'noopener,noreferrer');
  }
  return (
    <section>
      <h1>Pending Veterinarians</h1>
      {!items.length && <div className="card">No pending applications.</div>}
      {items.map((v) => (
        <article className="card review" key={v.id}>
          <div>
            <h3>{v.user.fullName}</h3>
            <p>{v.qualification}</p>
            <p>
              {v.registrationCouncil} / {v.registrationNumber}
            </p>
            {v.documents
              .filter((file) => file.status === 'AVAILABLE')
              .map((file) => (
                <button className="link" key={file.id} onClick={() => viewDocument(file.id)}>
                  View private registration document
                </button>
              ))}
          </div>
          <div className="actions">
            <button onClick={() => review(v.id, 'VERIFIED')}>Verify</button>
            <button className="danger" onClick={() => review(v.id, 'REJECTED')}>
              Reject
            </button>
          </div>
        </article>
      ))}
    </section>
  );
}

function UserProfileModal({ user, refreshContext, close }) {
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape') close();
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [close]);

  async function submit(e) {
    e.preventDefault();
    setError('');
    setSuccess('');
    const raw = Object.fromEntries(new FormData(e.currentTarget));
    const payload = {};
    if (raw.fullName) payload.fullName = raw.fullName;
    if (raw.phone !== undefined) payload.phone = raw.phone;
    if (raw.newPassword) {
      payload.currentPassword = raw.currentPassword;
      payload.newPassword = raw.newPassword;
    }
    try {
      await api('/auth/profile', { method: 'PATCH', body: JSON.stringify(payload) });
      setSuccess('Profile updated successfully!');
      await refreshContext();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && close()}>
      <div className="card modal">
        <div className="flex-between" style={{ marginBottom: '1.25rem' }}>
          <h2 style={{ margin: 0 }}>User Profile & Security</h2>
          <button
            type="button"
            className="modal-close-btn"
            onClick={close}
            aria-label="Close profile modal"
            title="Close modal (Esc)"
          >
            ✕
          </button>
        </div>
        <form className="form" onSubmit={submit}>
          <Field label="Full Name" name="fullName" defaultValue={user.fullName} />
          <Field
            label="Phone Number"
            name="phone"
            required={false}
            defaultValue={user.phone || ''}
          />
          <hr style={{ margin: '1rem 0' }} />
          <h3>Security / Change Password</h3>
          <Field label="Current Password" name="currentPassword" type="password" required={false} />
          <Field label="New Password" name="newPassword" type="password" required={false} />
          <button>Save Changes</button>
          {error && <p className="error">{error}</p>}
          {success && <p className="success-text">{success}</p>}
        </form>
      </div>
    </div>
  );
}

function AdminRulesManager() {
  const [rules, setRules] = useState([]);
  const [speciesList, setSpeciesList] = useState([]);
  const [drugsList, setDrugsList] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedDrugId, setSelectedDrugId] = useState('');

  async function load() {
    try {
      const [r, s, d] = await Promise.all([
        api('/withdrawal/rules'),
        api('/species'),
        api('/reference-data/drugs'),
      ]);
      setRules(r.rules);
      setSpeciesList(s.species);
      setDrugsList(d.drugs);
      setSelectedDrugId((current) => current || d.drugs[0]?.id || '');
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function addRule(e) {
    e.preventDefault();
    setError('');
    setSuccess('');
    const raw = Object.fromEntries(new FormData(e.currentTarget));
    try {
      await api('/withdrawal/rules', { method: 'POST', body: JSON.stringify(raw) });
      setSuccess(
        'Reference submitted as REVIEW REQUIRED. It cannot drive eligibility until independently reviewed.',
      );
      e.currentTarget.reset();
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <section style={{ marginTop: '2rem' }}>
      <h1>Withdrawal Rules & Reference Data Manager</h1>
      <form className="card form" onSubmit={addRule}>
        <h2>Submit Withdrawal Reference for Review</h2>
        <p className="notice">
          Manual entries are never automatically authoritative. Provide exact product context and
          provenance; new entries remain REVIEW REQUIRED and cannot make an animal eligible.
        </p>
        <Field label="Rule Code" name="code" />
        <label>
          Species
          <select name="speciesId">
            {speciesList.map((s) => (
              <option key={s.id} value={s.id}>
                {s.canonicalName}
              </option>
            ))}
          </select>
        </label>
        <label>
          Drug / Active Ingredient
          <select
            name="drugId"
            value={selectedDrugId}
            onChange={(event) => setSelectedDrugId(event.target.value)}
            required
          >
            {drugsList.map((d) => (
              <option key={d.id} value={d.id}>
                {d.canonicalName}
              </option>
            ))}
          </select>
        </label>
        <label>
          Exact approved product
          <select name="drugProductId" required defaultValue="">
            <option value="" disabled>
              Select a referenced product
            </option>
            {(drugsList.find((drug) => drug.id === selectedDrugId)?.products || []).map(
              (product) => (
                <option key={product.id} value={product.id}>
                  {product.productName} — {product.formulation}
                </option>
              ),
            )}
          </select>
        </label>
        <label>
          Route of Administration
          <select name="route" defaultValue="INTRAMUSCULAR">
            <option value="INTRAMUSCULAR">INTRAMUSCULAR</option>
            <option value="SUBCUTANEOUS">SUBCUTANEOUS</option>
            <option value="ORAL">ORAL</option>
            <option value="INTRAVENOUS">INTRAVENOUS</option>
            <option value="TOPICAL">TOPICAL</option>
            <option value="INTRAMAMMARY">INTRAMAMMARY</option>
          </select>
        </label>
        <Field label="Exact formulation" name="formulation" />
        <Field label="Withdrawal duration" name="durationValue" type="number" />
        <label>
          Duration unit
          <select name="durationUnit">
            <option value="HOUR">Hours</option>
            <option value="DAY">Days</option>
          </select>
        </label>
        <Field label="Jurisdiction" name="jurisdiction" />
        <Field label="Source organization" name="organization" />
        <Field label="Source document/title" name="sourceTitle" />
        <Field label="Source URL" name="sourceUrl" type="url" />
        <Field label="Page/table/section" name="sourceSection" />
        <Field label="Effective from" name="effectiveFrom" type="date" required={false} />
        <label>
          Use conditions
          <textarea name="useConditions" required />
        </label>
        <input type="hidden" name="foodProduct" value="MILK" />
        <button>Submit Reference for Review</button>
        {error && <p className="error">{error}</p>}
        {success && <p className="success-text">{success}</p>}
      </form>

      <h2>Configured Withdrawal Rules ({rules.length})</h2>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Code</th>
              <th>Species</th>
              <th>Drug</th>
              <th>Route</th>
              <th>Duration</th>
              <th>Jurisdiction / Source</th>
              <th>Verification</th>
            </tr>
          </thead>
          <tbody>
            {rules.map((r) => (
              <tr key={r.id}>
                <td>
                  <strong>{r.code}</strong>
                </td>
                <td>{r.species?.canonicalName}</td>
                <td>{r.drug?.canonicalName || 'All'}</td>
                <td>{r.route}</td>
                <td>
                  {r.durationValue} {r.durationUnit}s
                </td>
                <td>
                  {r.jurisdiction} ({r.source?.organization})
                </td>
                <td>{r.verificationStatus?.replaceAll('_', ' ')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
function FarmMembers({ farmId, canAssign, onAuthorizationChanged }) {
  const [members, setMembers] = useState([]);
  const [error, setError] = useState('');
  async function load() {
    setMembers((await api(`/farms/${farmId}/members`)).members);
  }
  useEffect(() => {
    load();
  }, [farmId]); // eslint-disable-line react-hooks/exhaustive-deps
  async function add(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const roles = new FormData(form).getAll('roles');
    if (!roles.length) return setError('Choose FARM_MANAGER or FARM_WORKER.');
    try {
      await api(`/farms/${farmId}/members`, {
        method: 'POST',
        body: JSON.stringify({ email: form.elements.email.value, roles }),
      });
      form.reset();
      setError('');
      await load();
      await onAuthorizationChanged?.();
    } catch (problem) {
      setError(problem.message);
    }
  }
  return (
    <section>
      <h1>Farm Members</h1>
      <p className="notice">The person must register an account before you add their email.</p>
      <div className="grid">
        {members.map((member) => (
          <article className="card" key={member.id}>
            <h3>{member.user.fullName}</h3>
            <p>{member.user.email}</p>
            <p>{member.roles.map((item) => item.role.replaceAll('_', ' ')).join(' + ')}</p>
          </article>
        ))}
      </div>
      {canAssign && (
        <form className="card form" onSubmit={add}>
          <h2>Add registered member</h2>
          <Field label="Registered email" name="email" type="email" />
          <label className="check">
            <input name="roles" type="checkbox" value="FARM_MANAGER" /> <span>Farm manager</span>
          </label>
          <label className="check">
            <input name="roles" type="checkbox" value="FARM_WORKER" /> <span>Farm worker</span>
          </label>
          <button>Add / update member</button>
        </form>
      )}
      {error && <p className="error">{error}</p>}
    </section>
  );
}

function VetStatus({ user, refreshContext }) {
  const status = user.veterinarian?.status;
  return (
    <section>
      <h1>Veterinarian Onboarding</h1>
      {status && <p className="notice">Current verification status: {status}</p>}
      {status === 'PENDING' && <p>Your credentials are awaiting platform review.</p>}
      {status === 'REJECTED' && (
        <p>Your application was rejected. Update and resubmit it for review.</p>
      )}
      {status === 'SUSPENDED' && (
        <p>Clinical access is suspended. Contact the platform operator.</p>
      )}
      <VetProfile onAuthorizationChanged={refreshContext} />
    </section>
  );
}

const initialPageFor = (workspace) => {
  if (workspace?.kind === 'ADMIN') return 'dashboard';
  if (workspace?.kind === 'DAIRY_OWNER') return 'dairy-dashboard';
  if (workspace?.kind === 'VETERINARIAN')
    return workspace.veterinarianStatus === 'VERIFIED' ? 'dashboard' : 'vet';
  if (workspace?.kind === 'FARM') return 'farm';
  return 'home';
};

function TimelineDetails({ details }) {
  if (!details || typeof details !== 'object' || Array.isArray(details)) return null;

  const items = [];
  if (typeof details.tagNumber === 'string') items.push(['Animal tag', details.tagNumber]);
  if (typeof details.name === 'string') items.push(['Animal name', details.name]);
  if (typeof details.status === 'string') {
    items.push(['Status', details.status.replaceAll('_', ' ')]);
  }
  if (typeof details.previousStatus === 'string') {
    items.push(['Previous status', details.previousStatus.replaceAll('_', ' ')]);
  }
  if (typeof details.lactating === 'boolean') {
    items.push(['Lactating', details.lactating ? 'Yes' : 'No']);
  }
  if (details.eligibilityDate) {
    items.push(['Eligible from', formatTimelineDate(details.eligibilityDate)]);
  }
  if (typeof details.medicine === 'string') items.push(['Medicine', details.medicine]);
  if (typeof details.product === 'string') items.push(['Product', details.product]);
  if (details.actualAmount != null && typeof details.amountUnit === 'string') {
    items.push(['Actual amount', `${details.actualAmount} ${details.amountUnit}`]);
  }
  if (typeof details.route === 'string') items.push(['Route', details.route]);
  if (details.administeredAt) {
    items.push(['Administered at', formatTimelineDate(details.administeredAt)]);
  }
  if (typeof details.recordedBy === 'string') items.push(['Recorded by', details.recordedBy]);
  if (typeof details.performedBy === 'string') items.push(['Performed by', details.performedBy]);
  if (typeof details.notes === 'string' && details.notes) items.push(['Notes', details.notes]);
  if (typeof details.deviationReason === 'string' && details.deviationReason) {
    items.push(['Deviation reason', details.deviationReason]);
  }

  if (items.length === 0) return null;
  return (
    <dl className="timeline-details">
      {items.map(([label, value]) => (
        <div key={label}>
          <dt>{label}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function HealthTimeline({ timeline, showAmuRisk = false, farmId, onClose }) {
  const animal = timeline?.animal || {};
  const events = Array.isArray(timeline?.events) ? timeline.events : [];
  const animalLabel = animal.name || animal.tagNumber || 'Animal';

  return (
    <section className="card" aria-label={`${animalLabel} health timeline`}>
      <div className="flex-between" style={{ marginBottom: '1.25rem' }}>
        <h2 style={{ margin: 0 }}>{animalLabel} History</h2>
        {onClose && (
          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
            aria-label="Close timeline"
            title="Close timeline"
          >
            ✕
          </button>
        )}
      </div>
      {showAmuRisk && animal.id && (
        <>
          <h3>Animal AMU Pattern Risk</h3>
          <AmuRiskCard farmId={farmId} animalId={animal.id} />
        </>
      )}
      {timeline?.loading && <p>Loading health timeline…</p>}
      {timeline?.error && <p className="error">{timeline.error}</p>}
      {!timeline?.loading && !timeline?.error && events.length === 0 && (
        <p>No health timeline events are available yet.</p>
      )}
      {events.map((event, index) => (
        <article
          className="timeline-event"
          key={event?.id || `${event?.eventType || 'event'}-${index}`}
        >
          <strong>{timelineEventLabel(event?.eventType)}</strong>
          <p>{event?.summary || 'No additional summary was recorded.'}</p>
          <TimelineDetails details={event?.details} />
          <small>{formatTimelineDate(event?.createdAt)}</small>
        </article>
      ))}
    </section>
  );
}

function AnimalTagModal({ animal, farm, onClose }) {
  const [tagData, setTagData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    api(`/farms/${farm.id}/animals/${animal.id}/qr-tag`)
      .then((d) => {
        if (active) setTagData(d);
      })
      .catch((err) => {
        if (active) setError(err.message || 'Failed to load QR tag data');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [farm.id, animal.id]);

  async function handleDownloadPdf() {
    setDownloading(true);
    try {
      await download(
        `/farms/${farm.id}/animals/${animal.id}/tag-pdf`,
        `Animal-Tag-${animal.tagNumber}.pdf`,
      );
    } catch (err) {
      setError(err.message || 'Failed to download tag PDF');
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '440px' }}>
        <div className="flex-between" style={{ marginBottom: '1rem' }}>
          <h3 style={{ margin: 0, fontSize: '1.2rem' }}>🏷️ Animal Identification Tag</h3>
          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
            aria-label="Close tag modal"
          >
            ×
          </button>
        </div>

        {loading && <p>Loading animal identification QR tag…</p>}
        {error && <p className="error">{error}</p>}

        {tagData && (
          <div style={{ textAlign: 'center' }}>
            <div
              style={{
                border: '2px solid #064e3b',
                borderRadius: '0.75rem',
                padding: '1.25rem',
                backgroundColor: '#ffffff',
                boxShadow: '0 4px 12px rgba(6, 78, 59, 0.08)',
                marginBottom: '1rem',
              }}
            >
              <div
                style={{
                  backgroundColor: '#064e3b',
                  color: '#fff',
                  borderRadius: '0.4rem',
                  padding: '0.35rem',
                  fontSize: '0.76rem',
                  fontWeight: 700,
                  letterSpacing: '0.05em',
                  textTransform: 'uppercase',
                  marginBottom: '0.75rem',
                }}
              >
                Official Livestock QR Tag
              </div>
              <h2 style={{ fontSize: '1.6rem', margin: '0.2rem 0', color: '#0f172a' }}>
                {tagData.tagNumber}
              </h2>
              <p
                style={{
                  margin: '0.2rem 0 0.8rem',
                  color: 'var(--ag-text-muted)',
                  fontSize: '0.9rem',
                }}
              >
                {tagData.name ? `${tagData.name} · ` : ''}
                {tagData.species} · {tagData.farmName}
              </p>

              {tagData.qrDataUrl && (
                <div style={{ margin: '0.5rem auto 1rem', width: '180px', height: '180px' }}>
                  <img
                    src={tagData.qrDataUrl}
                    alt={`QR tag for animal ${tagData.tagNumber}`}
                    style={{ width: '100%', height: '100%', display: 'block', borderRadius: '8px' }}
                  />
                </div>
              )}

              <small
                style={{
                  display: 'block',
                  color: '#64748b',
                  fontSize: '0.75rem',
                  wordBreak: 'break-all',
                  marginBottom: '0.5rem',
                }}
              >
                <a
                  href={tagData.verificationUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: '#059669', textDecoration: 'underline' }}
                >
                  {tagData.verificationUrl}
                </a>
              </small>

              <p
                style={{
                  fontSize: '0.75rem',
                  color: '#475569',
                  backgroundColor: '#ecfdf5',
                  padding: '0.5rem',
                  borderRadius: '0.4rem',
                  margin: '0.5rem 0 0',
                }}
              >
                Scan or click to verify live milk clearance. Does not expose private health records.
              </p>
            </div>

            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={downloading}
              style={{ width: '100%', padding: '0.65rem' }}
            >
              {downloading ? 'Generating PDF…' : '⬇️ Download Printable PDF Tag'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function Workspace({ user, setUser, logout }) {
  const workspaces = buildWorkspaces(user);
  const [workspaceId, setWorkspaceId] = useState(workspaces[0]?.id || 'account');
  const workspace = workspaces.find((item) => item.id === workspaceId) || workspaces[0];
  const [page, setPage] = useState(initialPageFor(workspace));
  const [farms, setFarms] = useState([]);
  const [farm, setFarm] = useState(null);
  const [animals, setAnimals] = useState([]);
  const [animalTimeline, setAnimalTimeline] = useState(null);
  const [selectedTagAnimal, setSelectedTagAnimal] = useState(null);
  const [species, setSpecies] = useState([]);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    let active = true;
    api('/farms').then((d) => {
      if (!active) return;
      const list = d.farms || [];
      setFarms(list);
      if (workspace?.kind === 'FARM') {
        const found = list.find((item) => item.id === workspace.farmId);
        if (found) open(found);
      }
    });
    api('/species').then((d) => {
      if (active) setSpecies(d.species || []);
    });
    return () => {
      active = false;
    };
  }, [workspaceId]);

  async function refreshContext() {
    const next = (await api('/auth/me')).user;
    setUser(next);
    return next;
  }

  async function open(item) {
    setFarm(item);
    setAnimals((await api(`/farms/${item.id}/animals`)).animals);
    setPage('farm');
  }

  async function openTimeline(animal) {
    setAnimalTimeline({ animal, events: [], loading: true, error: '' });
    try {
      const result = await api(`/farms/${farm.id}/animals/${animal.id}/timeline`);
      setAnimalTimeline({
        animal,
        events: timelineEventsFromResponse(result),
        loading: false,
        error: '',
      });
    } catch (error) {
      setAnimalTimeline({
        animal,
        events: [],
        loading: false,
        error: error.message || 'Unable to load the health timeline.',
      });
    }
  }

  async function deleteAnimal(animal) {
    if (
      !window.confirm(
        `Are you sure you want to delete animal "${animal.name || animal.tagNumber}"?`,
      )
    ) {
      return;
    }
    try {
      await api(`/farms/${farm.id}/animals/${animal.id}`, { method: 'DELETE' });
      setAnimals((all) => all.filter((x) => x.id !== animal.id));
      if (animalTimeline?.animal?.id === animal.id) {
        setAnimalTimeline(null);
      }
    } catch (err) {
      alert(err.message || 'Failed to delete animal');
    }
  }

  const activeFarm =
    workspace?.kind === 'FARM' ? farms.find((item) => item.id === workspace.farmId) : null;
  const capabilities = workspace?.kind === 'FARM' ? farmCapabilities(workspace.roles) : {};

  useEffect(() => {
    if (page === 'farm' && activeFarm && farm?.id !== activeFarm.id) open(activeFarm);
  }, [activeFarm?.id, page]); // eslint-disable-line react-hooks/exhaustive-deps

  function selectWorkspace(id) {
    const next = workspaces.find((item) => item.id === id);
    setWorkspaceId(id);
    setFarm(null);
    setAnimalTimeline(null);
    setPage(initialPageFor(next));
    if (next?.kind === 'FARM') {
      const selectedFarm = farms.find((item) => item.id === next.farmId);
      if (selectedFarm) open(selectedFarm);
    }
  }

  async function openActiveFarm() {
    if (activeFarm) await open(activeFarm);
  }

  const navIcons = {
    home: '🏠',
    create: '➕',
    vet: '🩺',
    farm: '🐄',
    'veterinary-care': '🩺',
    dashboard: '📊',
    'core-engine': '🥛',
    certificates: '📜',
    'daily-clearance': '🥛',
    ai: '🤖',
    members: '👥',
    admin: '🛡️',
    'dairy-dashboard': '🥛',
    'dairy-farmers': '🧑‍🌾',
    'dairy-inventory': '📦',
  };

  return (
    <div className="dashboard-app-layout">
      {/* Left Sidebar Navigation Drawer */}
      <aside className={`dashboard-sidebar ${sidebarOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-brand">
          <span className="brand-icon">🌾</span>
          <h2 className="brand-name">Digital Farm</h2>
          <span className="brand-tag">DFMS</span>
        </div>

        <div className="sidebar-user-card">
          <div className="user-avatar">
            {user.fullName ? user.fullName.charAt(0).toUpperCase() : '👤'}
          </div>
          <div className="user-info">
            <span className="user-name">{user.fullName}</span>
            <span className="user-role-badge">
              {workspace?.kind === 'ADMIN'
                ? 'PLATFORM ADMIN'
                : workspace?.kind === 'VETERINARIAN'
                  ? 'VETERINARIAN'
                  : workspace?.kind === 'DAIRY_OWNER'
                    ? 'DAIRY OPERATOR'
                    : workspace?.roles?.[0]?.replaceAll('_', ' ') || 'USER'}
            </span>
          </div>
        </div>

        <nav className="sidebar-nav">
          <div className="sidebar-section-title">MAIN NAVIGATION</div>
          {workspace &&
            navigationFor(workspace).map(([target, itemLabel]) => {
              const isActive = page === target;
              return (
                <button
                  key={target}
                  type="button"
                  className={`sidebar-nav-item ${isActive ? 'active' : ''}`}
                  onClick={() => {
                    if (target === 'farm') openActiveFarm();
                    else setPage(target);
                    setSidebarOpen(false);
                  }}
                >
                  <span className="nav-item-icon">{navIcons[target] || '📍'}</span>
                  <span className="nav-item-text">{itemLabel}</span>
                </button>
              );
            })}
        </nav>

        <div className="sidebar-footer">
          <button type="button" className="sidebar-logout-btn" onClick={logout} title="Logout">
            🚪 Logout
          </button>
        </div>
      </aside>

      {/* Main Dashboard Wrapper & Topbar */}
      <div className="dashboard-main-wrapper">
        <header className="dashboard-topbar">
          <div className="topbar-left">
            <button
              type="button"
              className="mobile-toggle-btn"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              aria-label="Toggle menu"
            >
              ☰
            </button>
            <h1 className="page-breadcrumb-title">{workspace?.label || 'Dashboard'}</h1>
          </div>

          <div className="topbar-right">
            <div className="workspace-selector-group">
              <label htmlFor="workspaceSelect" className="workspace-label">
                Workspace:
              </label>
              <select
                id="workspaceSelect"
                className="workspace-selector-select"
                value={workspace?.id}
                onChange={(event) => {
                  selectWorkspace(event.target.value);
                  setSidebarOpen(false);
                }}
              >
                {workspaces.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              className="secondary"
              style={{ fontSize: '0.86rem', padding: '0.45rem 0.85rem' }}
              onClick={() => setShowProfileModal(true)}
            >
              ⚙️ Profile
            </button>
          </div>
        </header>

        {showProfileModal && (
          <UserProfileModal
            user={user}
            refreshContext={refreshContext}
            close={() => setShowProfileModal(false)}
          />
        )}

        <main className="dashboard-content-area">
          <p className="eyebrow">{user.fullName}</p>
          {page === 'home' && workspace?.kind === 'ACCOUNT' && (
            <section>
              <h1>Account & Onboarding</h1>
              <p>
                Create a farm to become its owner and manager, or submit veterinarian credentials.
              </p>
            </section>
          )}
          {page === 'create' && (
            <FarmForm
              done={async (f) => {
                setFarms((a) => [f, ...a]);
                await refreshContext();
                setWorkspaceId(`farm:${f.id}`);
                await open(f);
              }}
            />
          )}
          {page === 'farm' && !farm && (
            <section className="card">
              <h2>Loading Farm &amp; Livestock…</h2>
              <p style={{ color: 'var(--ag-text-muted)' }}>
                Retrieving registered farm records and animals for {workspace?.label || 'selected farm'}…
              </p>
            </section>
          )}
          {page === 'farm' && farm && (
            <section>
              <h1>{farm.name}</h1>
              <p>
                {farm.district}, {farm.state}
              </p>
              {capabilities.canViewManagementAnalytics && (
                <section className="card">
                  <h2>Farm AMU Pattern Risk</h2>
                  <AmuRiskCard farmId={farm.id} />
                </section>
              )}
              <h2>Animal List ({animals.length})</h2>
              <div className="grid">
                {animals.length === 0 && (
                  <p style={{ color: 'var(--ag-text-muted)' }}>
                    No animals registered in this farm yet.
                  </p>
                )}
                {animals.map((a) => (
                  <article className="card animal-card" key={a.id}>
                    <div
                      className="flex-between"
                      style={{ alignItems: 'flex-start', gap: '0.5rem', marginBottom: '0.4rem' }}
                    >
                      <h3 style={{ margin: 0, fontSize: '1.15rem' }}>{a.name || a.tagNumber}</h3>
                      {capabilities.canEditAnimals && (
                        <button
                          type="button"
                          className="icon-delete-btn"
                          onClick={() => deleteAnimal(a)}
                          title={`Delete ${a.name || a.tagNumber}`}
                          aria-label={`Delete ${a.name || a.tagNumber}`}
                        >
                          🗑️
                        </button>
                      )}
                    </div>
                    <p
                      style={{
                        margin: '0.15rem 0',
                        fontSize: '0.88rem',
                        color: 'var(--ag-text-muted)',
                      }}
                    >
                      <strong>Tag:</strong> {a.tagNumber}
                    </p>
                    <p style={{ margin: '0.3rem 0 0.85rem', fontSize: '0.86rem' }}>
                      <strong style={{ color: 'var(--ag-forest-dark)' }}>
                        {a.species?.canonicalName || 'Livestock'}
                      </strong>{' '}
                      · {a.sex ? a.sex.replaceAll('_', ' ') : 'FEMALE'} · {a.status}
                    </p>
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: '0.4rem',
                        marginTop: '0.5rem',
                      }}
                    >
                      <button
                        type="button"
                        className="secondary"
                        style={{ fontSize: '0.82rem', padding: '0.45rem' }}
                        onClick={() => openTimeline(a)}
                      >
                        📜 Timeline
                      </button>
                      <button
                        type="button"
                        className="secondary"
                        style={{ fontSize: '0.82rem', padding: '0.45rem' }}
                        onClick={() => setSelectedTagAnimal(a)}
                      >
                        🏷️ QR Tag
                      </button>
                    </div>
                  </article>
                ))}
              </div>
              {animalTimeline && (
                <HealthTimeline
                  timeline={animalTimeline}
                  showAmuRisk={capabilities.canViewManagementAnalytics}
                  farmId={farm.id}
                  onClose={() => setAnimalTimeline(null)}
                />
              )}
              {selectedTagAnimal && (
                <AnimalTagModal
                  animal={selectedTagAnimal}
                  farm={farm}
                  onClose={() => setSelectedTagAnimal(null)}
                />
              )}
              {capabilities.canEditAnimals && (
                <AnimalForm
                  farmId={farm.id}
                  species={species}
                  done={(a) =>
                    setAnimals((all) => [
                      { ...a, species: a.species || species.find((s) => s.id === a.speciesId) },
                      ...all,
                    ])
                  }
                />
              )}
            </section>
          )}
          {page === 'vet' && <VetStatus user={user} refreshContext={refreshContext} />}
          {page === 'members' && workspace?.kind === 'FARM' && (
            <FarmMembers
              farmId={workspace.farmId}
              canAssign={capabilities.owns}
              onAuthorizationChanged={refreshContext}
            />
          )}
          {page === 'veterinary-care' && (
            <VeterinaryWorkflow
              farms={workspace?.kind === 'FARM' && activeFarm ? [activeFarm] : []}
              context={workspace}
              user={user}
              capabilities={capabilities}
            />
          )}
          {page === 'core-engine' && (
            <CoreEngine
              farms={workspace?.kind === 'FARM' && activeFarm ? [activeFarm] : []}
              isAdmin={workspace?.kind === 'ADMIN'}
              canIssue={workspace?.kind === 'ADMIN' || capabilities.canIssueCertificate}
            />
          )}
          {page === 'certificates' && (
            <Certificates
              farms={workspace?.kind === 'FARM' && activeFarm ? [activeFarm] : []}
              isAdmin={workspace?.kind === 'ADMIN'}
              canAnchor={workspace?.kind === 'ADMIN' || capabilities.canAnchorCertificate}
              canRevoke={workspace?.kind === 'ADMIN'}
            />
          )}
          {page === 'daily-clearance' && workspace?.kind === 'FARM' && activeFarm && (
            <DailyClearance farm={activeFarm} canRun={Boolean(capabilities.manages)} />
          )}
          {page === 'dashboard' && (
            <DashboardReports
              farms={activeFarm ? [activeFarm] : []}
              user={user}
              workspace={workspace}
            />
          )}
          {page === 'ai' && (
            <AiLayer farms={activeFarm ? [activeFarm] : []} user={user} workspace={workspace} />
          )}
          {['dairy-dashboard', 'dairy-farmers', 'dairy-inventory'].includes(page) && (
            <DairyHub
              initialTab={
                page === 'dairy-farmers'
                  ? 'farmers'
                  : page === 'dairy-inventory'
                    ? 'intake'
                    : 'analytics'
              }
              user={user}
              workspace={workspace}
            />
          )}
          {page === 'admin' && workspace?.kind === 'ADMIN' && (
            <>
              <AdminVerifications />
              <AdminVets />
              <AdminRulesManager />
            </>
          )}
        </main>
      </div>
    </div>
  );
}
export function App() {
  const verificationId = window.location.pathname.match(/^\/verify\/certificate\/([^/]+)$/)?.[1];
  const dailyVerificationId = window.location.pathname.match(
    /^\/verify\/daily-clearance\/([^/]+)$/,
  )?.[1];
  const animalVerificationId = window.location.pathname.match(
    /^\/verify\/animal\/([^/]+)$/,
  )?.[1];
  const [mode, setMode] = useState('login');
  const [user, setUser] = useState(null);
  const [pendingVerification, setPendingVerification] = useState(() => {
    try {
      const saved = sessionStorage.getItem('dfms_pending_verification');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    if (hasAccessToken())
      api('/auth/me')
        .then((d) => setUser(d.user))
        .catch(() => setAccessToken(null));
  }, []);

  async function logout() {
    await api('/auth/logout', { method: 'POST' });
    setAccessToken(null);
    setUser(null);
  }

  if (verificationId) return <PublicVerification verificationId={verificationId} />;
  if (dailyVerificationId) return <PublicDailyClearance verificationId={dailyVerificationId} />;
  if (animalVerificationId) return <PublicAnimalVerification verificationId={animalVerificationId} />;
  if (pendingVerification) {
    return (
      <VerificationPage
        pendingData={pendingVerification}
        pendingUser={pendingVerification?.user}
        verificationToken={pendingVerification?.token || pendingVerification?.verificationToken}
        onComplete={() => {
          sessionStorage.removeItem('dfms_pending_verification');
          setPendingVerification(null);
          setMode('login');
        }}
        onBack={() => {
          sessionStorage.removeItem('dfms_pending_verification');
          setPendingVerification(null);
          setMode('login');
        }}
      />
    );
  }

  return user ? (
    <Workspace user={user} setUser={setUser} logout={logout} />
  ) : (
    <AuthPage
      mode={mode}
      done={setUser}
      go={setMode}
      onRequireVerification={(verificationData) => {
        sessionStorage.setItem('dfms_pending_verification', JSON.stringify(verificationData));
        setPendingVerification(verificationData);
      }}
    />
  );
}
