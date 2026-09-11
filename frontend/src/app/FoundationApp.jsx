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
  async function submit(e) {
    e.preventDefault();
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
    <main className="auth-page">
      <form className="card form" onSubmit={submit}>
        <p className="eyebrow">SIH25007 Platform</p>
        <h1>{mode === 'login' ? 'Welcome back' : 'Create account'}</h1>
        {mode === 'register' && (
          <>
            <Field label="Full name" name="fullName" />
            <Field label="Phone" name="phone" required={false} />
          </>
        )}
        <Field label="Email" name="email" type="email" />
        <Field label="Password" name="password" type="password" />
        <button>{mode === 'login' ? 'Login' : 'Register'}</button>
        {error && <p className="error">{error}</p>}
        <button
          className="link"
          type="button"
          onClick={() => go(mode === 'login' ? 'register' : 'login')}
        >
          {mode === 'login' ? 'Register instead' : 'Login instead'}
        </button>
      </form>
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
  return (
    <div>
      <header>
        <strong>Livestock AMU Platform</strong>
        <label>
          Workspace
          <select value={workspace?.id} onChange={(event) => selectWorkspace(event.target.value)}>
            {workspaces.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
        <nav>
          {workspace &&
            navigationFor(workspace).map(([target, label]) => (
              <button
                key={target}
                onClick={() => (target === 'farm' ? openActiveFarm() : setPage(target))}
              >
                {label}
              </button>
            ))}
          <button onClick={logout}>Logout</button>
        </nav>
      </header>
      <main className="content">
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
                <button className="link" onClick={() => setAnimalTimeline(null)}>
                  Close timeline
                </button>
                <h2>{animalTimeline.animal.name || animalTimeline.animal.tagNumber} history</h2>
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
        {page === 'admin' && workspace?.kind === 'ADMIN' && <AdminVets />}
      </main>
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
