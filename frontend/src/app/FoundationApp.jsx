import { useEffect, useState } from 'react';
import { api, hasAccessToken, setAccessToken } from './api.js';
import { VeterinaryWorkflow } from './VeterinaryWorkflow.jsx';
import { CoreEngine } from './CoreEngine.jsx';
import { Certificates, DashboardReports, PublicVerification } from './TrustLayer.jsx';
import { AiLayer, AmuRiskCard } from './AiLayer.jsx';
import {
  buildWorkspaces,
  farmCapabilities,
  navigationFor,
  normalizeOptionalFields,
} from './authorization.js';
const Field = ({ label, name, type = 'text', required = true, defaultValue }) => (
  <label>
    {label}
    <input name={name} type={type} required={required} defaultValue={defaultValue} />
  </label>
);
function AuthPage({ mode, done, go }) {
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
      setAccessToken(data.accessToken);
      done(data.user);
    } catch (x) {
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
            Streamlined farm operations, verified veterinary health records, withdrawal monitoring, and milk eligibility certificates.
          </p>
          <div className="hero-pills-container">
            <span className="hero-pill">🐄 Livestock Tracking</span>
            <span className="hero-pill">🩺 Verified Vets</span>
            <span className="hero-pill">🥛 Milk Certificates</span>
            <span className="hero-pill">🛡️ Blockchain Proof</span>
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
                onClick={() => { setError(''); go('login'); }}
              >
                Sign In
              </button>
              <button
                type="button"
                className={`tab-btn ${mode === 'register' ? 'active' : ''}`}
                onClick={() => { setError(''); go('register'); }}
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
                    <label htmlFor="phone">Phone Number (Optional)</label>
                    <div className="input-field-wrapper">
                      <span className="field-icon">📱</span>
                      <input
                        id="phone"
                        name="phone"
                        type="tel"
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
                <label htmlFor="password">Password</label>
                <div className="input-field-wrapper">
                  <span className="field-icon">🔒</span>
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    required
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
                  onClick={() => { setError(''); go(mode === 'login' ? 'register' : 'login'); }}
                >
                  {mode === 'login' ? 'Register instead' : 'Login instead'}
                </button>
              </p>
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
  async function submit(e) {
    e.preventDefault();
    const v = Object.fromEntries(new FormData(e.currentTarget));
    v.lactating = v.lactating === 'on';
    done(
      (await api(`/farms/${farmId}/animals`, { method: 'POST', body: JSON.stringify(v) })).animal,
    );
  }
  return (
    <form className="card form" onSubmit={submit}>
      <h2>Add Animal</h2>
      <Field label="Tag number" name="tagNumber" />
      <Field label="Name" name="name" required={false} />
      <label>
        Species
        <select name="speciesId">
          {species.map((s) => (
            <option key={s.id} value={s.id}>
              {s.canonicalName}
            </option>
          ))}
        </select>
      </label>
      <label>
        Sex
        <select name="sex">
          <option>FEMALE</option>
          <option>MALE</option>
          <option>UNKNOWN</option>
        </select>
      </label>
      <label className="check">
        <input name="lactating" type="checkbox" /> Lactating
      </label>
      <button>Add animal</button>
    </form>
  );
}
function VetProfile({ onAuthorizationChanged }) {
  const [profile, setProfile] = useState(null);
  useEffect(() => {
    api('/veterinarians/me').then((d) => setProfile(d.profile));
  }, []);
  async function submit(e) {
    e.preventDefault();
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
    await onAuthorizationChanged?.();
  }
  return (
    <form className="card form" onSubmit={submit}>
      <h2>Veterinarian Profile / Verification Submission</h2>
      {profile && <span className="badge">{profile.status}</span>}
      <Field label="Qualification" name="qualification" defaultValue={profile?.qualification} />
      <Field
        label="Specialization"
        name="specialization"
        required={false}
        defaultValue={profile?.specialization}
      />
      <label>
        Registration certificate (PDF, JPEG, or PNG; max 10 MB)
        <input name="credential" type="file" accept="application/pdf,image/jpeg,image/png" />
      </label>
      <Field
        label="Experience years"
        name="experienceYears"
        type="number"
        required={false}
        defaultValue={profile?.experienceYears}
      />
      <Field
        label="Registration number"
        name="registrationNumber"
        defaultValue={profile?.registrationNumber}
      />
      <Field
        label="Registration council"
        name="registrationCouncil"
        defaultValue={profile?.registrationCouncil}
      />
      <Field label="Service state" name="state" defaultValue={profile?.serviceAreas?.[0]?.state} />
      <Field
        label="Service district"
        name="district"
        required={false}
        defaultValue={profile?.serviceAreas?.[0]?.district}
      />
      <button>Submit profile</button>
      <p className="muted">
        Registration documents are private and use authorized S3 upload links.
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
      setSuccess('Withdrawal rule added successfully!');
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
        <h2>Add Verified Regulatory Withdrawal Rule</h2>
        <Field label="Rule Code (e.g. FSSAI-CATTLE-OXY-01)" name="code" />
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
          <select name="drugId">
            <option value="">All Drugs in Class</option>
            {drugsList.map((d) => (
              <option key={d.id} value={d.id}>
                {d.canonicalName}
              </option>
            ))}
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
        <Field label="Duration Value (Days)" name="durationValue" type="number" defaultValue="7" />
        <Field label="Organization Source" name="organization" defaultValue="FSSAI" />
        <Field
          label="Source Title"
          name="sourceTitle"
          defaultValue="Food Safety and Standards Regulations"
        />
        <Field
          label="Source URL"
          name="sourceUrl"
          required={false}
          defaultValue="https://fssai.gov.in"
        />
        <button>Add Regulatory Rule</button>
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
            <input name="roles" type="checkbox" value="FARM_MANAGER" /> Farm manager
          </label>
          <label className="check">
            <input name="roles" type="checkbox" value="FARM_WORKER" /> Farm worker
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
  if (workspace?.kind === 'VETERINARIAN')
    return workspace.veterinarianStatus === 'VERIFIED' ? 'dashboard' : 'vet';
  if (workspace?.kind === 'FARM') return 'farm';
  return 'home';
};

function Workspace({ user, setUser, logout }) {
  const workspaces = buildWorkspaces(user);
  const [workspaceId, setWorkspaceId] = useState(workspaces[0]?.id || 'account');
  const workspace = workspaces.find((item) => item.id === workspaceId) || workspaces[0];
  const [page, setPage] = useState(initialPageFor(workspace));
  const [farms, setFarms] = useState([]);
  const [farm, setFarm] = useState(null);
  const [animals, setAnimals] = useState([]);
  const [animalTimeline, setAnimalTimeline] = useState(null);
  const [species, setSpecies] = useState([]);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    api('/farms').then((d) => setFarms(d.farms));
    api('/species').then((d) => setSpecies(d.species));
  }, []);

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
    const result = await api(`/farms/${farm.id}/animals/${animal.id}/timeline`);
    setAnimalTimeline({ animal, events: result.timeline });
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
    ai: '🤖',
    members: '👥',
    admin: '🛡️',
  };

  return (
    <div className="dashboard-app-layout">
      {/* Left Sidebar Navigation Drawer */}
      <aside className={`dashboard-sidebar ${sidebarOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-brand">
          <span className="brand-icon">🌾</span>
          <h2 className="brand-name">Digital Farm</h2>
          <span className="brand-tag">SIH25007</span>
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
          <button
            type="button"
            className="sidebar-logout-btn"
            onClick={logout}
            title="Logout"
          >
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
            <h2>Animal List</h2>
            <div className="grid">
              {animals.map((a) => (
                <article className="card" key={a.id}>
                  <h3>{a.name || a.tagNumber}</h3>
                  <p>Tag: {a.tagNumber}</p>
                  <p>
                    {a.species.canonicalName} · {a.status}
                  </p>
                  <button onClick={() => openTimeline(a)}>View health timeline</button>
                </article>
              ))}
            </div>
            {animalTimeline && (
              <section className="card">
                <div className="flex-between" style={{ marginBottom: '1.25rem' }}>
                  <h2 style={{ margin: 0 }}>
                    {animalTimeline.animal.name || animalTimeline.animal.tagNumber} History
                  </h2>
                  <button
                    type="button"
                    className="modal-close-btn"
                    onClick={() => setAnimalTimeline(null)}
                    aria-label="Close timeline"
                    title="Close timeline"
                  >
                    ✕
                  </button>
                </div>
                {capabilities.canViewManagementAnalytics && (
                  <>
                    <h3>Animal AMU Pattern Risk</h3>
                    <AmuRiskCard farmId={farm.id} animalId={animalTimeline.animal.id} />
                  </>
                )}
                {animalTimeline.events.length === 0 && <p>No recorded health events.</p>}
                {animalTimeline.events.map((event) => (
                  <article key={event.id}>
                    <strong>{event.title}</strong>
                    <p>{event.description}</p>
                    <small>{new Date(event.occurredAt).toLocaleString()}</small>
                  </article>
                ))}
              </section>
            )}
            {capabilities.canEditAnimals && (
              <AnimalForm
                farmId={farm.id}
                species={species}
                done={(a) => setAnimals((all) => [a, ...all])}
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
        {page === 'admin' && workspace?.kind === 'ADMIN' && (
          <>
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
  const [mode, setMode] = useState('login');
  const [user, setUser] = useState(null);
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
  return user ? (
    <Workspace user={user} setUser={setUser} logout={logout} />
  ) : (
    <AuthPage mode={mode} done={setUser} go={setMode} />
  );
}
