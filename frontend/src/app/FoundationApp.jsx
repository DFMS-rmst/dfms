import { useEffect, useState } from 'react';
import { api, hasAccessToken, setAccessToken } from './api.js';
import { VeterinaryWorkflow } from './VeterinaryWorkflow.jsx';
import { CoreEngine } from './CoreEngine.jsx';
import { Certificates, DashboardReports, PublicVerification } from './TrustLayer.jsx';
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
      const data = await api(`/auth/${mode}`, {
        method: 'POST',
        body: JSON.stringify(Object.fromEntries(new FormData(e.currentTarget))),
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
    done(
      (
        await api('/farms', {
          method: 'POST',
          body: JSON.stringify(Object.fromEntries(new FormData(e.currentTarget))),
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
function VetProfile() {
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
function Workspace({ user, logout }) {
  const [page, setPage] = useState('farms');
  const [farms, setFarms] = useState([]);
  const [farm, setFarm] = useState(null);
  const [animals, setAnimals] = useState([]);
  const [animalTimeline, setAnimalTimeline] = useState(null);
  const [species, setSpecies] = useState([]);
  useEffect(() => {
    api('/farms').then((d) => setFarms(d.farms));
    api('/species').then((d) => setSpecies(d.species));
  }, []);
  async function open(item) {
    setFarm(item);
    setAnimals((await api(`/farms/${item.id}/animals`)).animals);
    setPage('farm');
  }
  async function openTimeline(animal) {
    const result = await api(`/farms/${farm.id}/animals/${animal.id}/timeline`);
    setAnimalTimeline({ animal, events: result.timeline });
  }
  const admin = user.platformRoles.includes('PLATFORM_ADMIN');
  return (
    <div>
      <header>
        <strong>Livestock AMU Platform</strong>
        <nav>
          <button onClick={() => setPage('farms')}>My Farms</button>
          <button onClick={() => setPage('create')}>Create Farm</button>
          <button onClick={() => setPage('vet')}>Veterinarian Profile</button>
          <button onClick={() => setPage('veterinary-care')}>Veterinary Care</button>
          <button onClick={() => setPage('core-engine')}>AMU & Milk Eligibility</button>
          <button onClick={() => setPage('certificates')}>Certificates</button>
          <button onClick={() => setPage('dashboard')}>Dashboard & Reports</button>
          {admin && <button onClick={() => setPage('admin')}>Vet Reviews</button>}
          <button onClick={logout}>Logout</button>
        </nav>
      </header>
      <main className="content">
        <p className="eyebrow">{user.fullName}</p>
        {page === 'farms' && (
          <section>
            <h1>My Farms</h1>
            <div className="grid">
              {farms.map((f) => (
                <button className="card farm" key={f.id} onClick={() => open(f)}>
                  <h3>{f.name}</h3>
                  <p>
                    {f.district}, {f.state}
                  </p>
                  <span>{f._count.animals} animals</span>
                </button>
              ))}
            </div>
          </section>
        )}
        {page === 'create' && (
          <FarmForm
            done={(f) => {
              setFarms((a) => [f, ...a]);
              open(f);
            }}
          />
        )}
        {page === 'farm' && farm && (
          <section>
            <h1>{farm.name}</h1>
            <p>
              {farm.district}, {farm.state}
            </p>
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
            <AnimalForm
              farmId={farm.id}
              species={species}
              done={(a) => setAnimals((all) => [a, ...all])}
            />
          </section>
        )}
        {page === 'vet' && <VetProfile />}
        {page === 'veterinary-care' && (
          <VeterinaryWorkflow
            farms={farms}
            isVeterinarian={user.platformRoles.includes('VETERINARIAN')}
          />
        )}
        {page === 'core-engine' && <CoreEngine farms={farms} isAdmin={admin} />}
        {page === 'certificates' && <Certificates farms={farms} isAdmin={admin} />}
        {page === 'dashboard' && <DashboardReports farms={farms} user={user} />}
        {page === 'admin' && admin && <AdminVets />}
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
    <Workspace user={user} logout={logout} />
  ) : (
    <AuthPage mode={mode} done={setUser} go={setMode} />
  );
}
