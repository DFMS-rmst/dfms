/* eslint-disable react-hooks/exhaustive-deps -- effects deliberately synchronize selected server resources */
import { useEffect, useState } from 'react';
import { api, download } from './api.js';

const Field = ({ label, name, type = 'text', required = true }) => (
  <label>
    {label}
    <input name={name} type={type} required={required} />
  </label>
);
function RequestForm({ farms, veterinarians, refresh }) {
  const [farmId, setFarmId] = useState(farms[0]?.id || '');
  const [animals, setAnimals] = useState([]);

  useEffect(() => {
    if (!farmId && farms.length > 0) {
      setFarmId(farms[0].id);
    }
  }, [farms, farmId]);

  useEffect(() => {
    let active = true;
    if (farmId) {
      api(`/farms/${farmId}/animals`)
        .then((d) => {
          if (active) setAnimals(d.animals || []);
        })
        .catch(() => {
          if (active) setAnimals([]);
        });
    } else {
      setAnimals([]);
    }
    return () => {
      active = false;
    };
  }, [farmId]);

  async function submit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const value = Object.fromEntries(new FormData(form));
    const attachment = form.elements.attachment.files[0];
    delete value.attachment;
    const created = await api('/treatment-requests', {
      method: 'POST',
      body: JSON.stringify(value),
    });
    if (attachment) {
      const upload = await api('/files/presign-upload', {
        method: 'POST',
        body: JSON.stringify({
          category: 'TREATMENT_REQUEST',
          entityType: 'TREATMENT_REQUEST',
          entityId: created.treatmentRequest.id,
          originalName: attachment.name,
          mimeType: attachment.type,
          sizeBytes: attachment.size,
        }),
      });
      const response = await fetch(upload.uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': attachment.type },
        body: attachment,
      });
      if (!response.ok) throw new Error('Attachment upload failed');
    }
    form.reset();
    refresh();
  }
  return (
    <form className="card form" onSubmit={submit}>
      <h2>Request Treatment</h2>
      <label>
        Farm
        <select name="farmId" value={farmId} onChange={(e) => setFarmId(e.target.value)}>
          {farms.map((f) => (
            <option key={f.id} value={f.id}>
              {f.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        Animal
        <select name="animalId">
          {animals.map((a) => (
            <option key={a.id} value={a.id}>
              {a.tagNumber} — {a.name || a.species.canonicalName}
            </option>
          ))}
        </select>
      </label>
      <label>
        Verified veterinarian
        <select name="requestedVeterinarianId">
          {veterinarians.map((v) => (
            <option key={v.id} value={v.id}>
              {v.user.fullName} — {v.specialization || v.qualification}
            </option>
          ))}
        </select>
      </label>
      <label>
        Urgency
        <select name="urgency">
          <option value="ROUTINE">ROUTINE</option>
          <option value="SOON">SOON</option>
          <option value="URGENT">URGENT</option>
          <option value="EMERGENCY">EMERGENCY</option>
        </select>
      </label>
      <label>
        Observations
        <textarea name="observations" required />
      </label>
      <label>
        Symptoms / notes
        <textarea name="symptoms" />
      </label>
      <label>
        Supporting image (optional)
        <input name="attachment" type="file" accept="image/jpeg,image/png,image/webp" />
      </label>
      <button>Send treatment request</button>
    </form>
  );
}
function CaseWorkspace({ caseId, context, user, capabilities, close }) {
  const [item, setItem] = useState(null);
  const [messages, setMessages] = useState([]);
  const [diseases, setDiseases] = useState([]);
  const [drugs, setDrugs] = useState([]);
  async function load() {
    setItem((await api(`/veterinary-cases/${caseId}`)).case);
    setMessages((await api(`/veterinary-cases/${caseId}/messages`)).messages);
  }
  // Reload when the selected case changes; load intentionally closes over that case id.
  useEffect(() => {
    load();
    api('/reference-data/diseases').then((d) => setDiseases(d.diseases));
    api('/reference-data/drugs').then((d) => setDrugs(d.drugs));
    const timer = setInterval(load, 15000);
    return () => clearInterval(timer);
  }, [caseId]);
  if (!item) return <p>Loading veterinary case…</p>;
  const assignedVerifiedVeterinarian =
    context.kind === 'VETERINARIAN' &&
    context.veterinarianStatus === 'VERIFIED' &&
    item.veterinarian.user.id === user.id;
  const canRecordAdministration =
    assignedVerifiedVeterinarian ||
    (context.kind === 'FARM' && capabilities.canRecordAdministration);
  async function message(e) {
    e.preventDefault();
    await api(`/veterinary-cases/${caseId}/messages`, {
      method: 'POST',
      body: JSON.stringify(Object.fromEntries(new FormData(e.currentTarget))),
    });
    e.currentTarget.reset();
    load();
  }
  async function diagnose(e) {
    e.preventDefault();
    const v = Object.fromEntries(new FormData(e.currentTarget));
    if (!v.diseaseId) v.diseaseId = null;
    await api(`/veterinary-cases/${caseId}/diagnoses`, { method: 'POST', body: JSON.stringify(v) });
    e.currentTarget.reset();
    load();
  }
  async function prescribe(e) {
    e.preventDefault();
    const v = Object.fromEntries(new FormData(e.currentTarget));
    const payload = {
      diagnosisId: v.diagnosisId || null,
      startDate: v.startDate,
      expectedEndDate: v.expectedEndDate || null,
      instructions: v.instructions,
      items: [
        {
          drugId: v.drugId,
          doseValue: Number(v.doseValue),
          doseUnit: v.doseUnit,
          route: v.route,
          frequency: v.frequency,
          durationValue: Number(v.durationValue),
          durationUnit: v.durationUnit,
          startDate: v.startDate,
          expectedEndDate: v.expectedEndDate || null,
          instructions: v.itemInstructions,
        },
      ],
    };
    await api(`/veterinary-cases/${caseId}/prescriptions`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    e.currentTarget.reset();
    load();
  }
  async function startTreatment(prescriptionId) {
    const treatment = (
      await api('/treatments', { method: 'POST', body: JSON.stringify({ caseId, prescriptionId }) })
    ).treatment;
    await api(`/treatments/${treatment.id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'ACTIVE' }),
    });
    load();
  }
  async function administer(e, treatment) {
    e.preventDefault();
    const v = Object.fromEntries(new FormData(e.currentTarget));
    v.amount = Number(v.amount);
    if (v.activeIngredientMg) v.activeIngredientMg = Number(v.activeIngredientMg);
    else {
      delete v.activeIngredientMg;
      delete v.conversionProvenance;
    }
    v.administeredAt = new Date().toISOString();
    const selected = item.prescriptions
      .find((p) => p.id === treatment.prescriptionId)
      ?.items.find((x) => x.id === v.prescriptionItemId);
    v.drugId = selected?.drugId;
    await api(`/treatments/${treatment.id}/administrations`, {
      method: 'POST',
      body: JSON.stringify(v),
    });
    e.currentTarget.reset();
    load();
  }
  async function complete(id) {
    await api(`/treatments/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'COMPLETED', notes: 'Completed by veterinarian' }),
    });
    load();
  }
  return (
    <section>
      <div className="flex-between" style={{ marginBottom: '1.25rem', alignItems: 'center' }}>
        <h1 style={{ margin: 0 }}>Veterinary Case</h1>
        <button
          type="button"
          className="secondary"
          style={{ fontSize: '0.86rem', padding: '0.45rem 0.85rem' }}
          onClick={close}
        >
          ← Back to Requests & Cases
        </button>
      </div>
      <div className="card">
        <span className="badge">{item.status}</span>
        <h3>{item.animal.name || item.animal.tagNumber}</h3>
        <p>
          {item.farm.name} · Assigned to {item.veterinarian.user.fullName}
        </p>
        <p>
          <strong>Farmer observations:</strong> {item.request.observations}
        </p>
      </div>
      <div className="workflow-columns">
        <section>
          <h2>Case Chat</h2>
          <div className="chat">
            {messages.map((m) => (
              <article key={m.id}>
                <strong>{m.sender.fullName}</strong>
                <p>{m.body}</p>
                <small>{new Date(m.sentAt).toLocaleString()}</small>
              </article>
            ))}
          </div>
          <form className="inline-form" onSubmit={message}>
            <input name="body" aria-label="Message" required placeholder="Write a case message" />
            <button>Send</button>
          </form>
        </section>
        <section>
          <h2>Diagnosis</h2>
          {item.diagnoses.map((d) => (
            <article className="card compact" key={d.id}>
              <strong>{d.disease?.canonicalName || 'Clinical diagnosis'}</strong>
              <p>{d.clinicalNotes}</p>
            </article>
          ))}
          {assignedVerifiedVeterinarian && (
            <form className="card form" onSubmit={diagnose}>
              <label>
                Disease reference (optional)
                <select name="diseaseId">
                  <option value="">Free-text clinical diagnosis</option>
                  {diseases.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.canonicalName}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Clinical notes
                <textarea name="clinicalNotes" required />
              </label>
              <label>
                Follow-up notes
                <textarea name="followUpNotes" />
              </label>
              <button>Record diagnosis</button>
            </form>
          )}
        </section>
      </div>
      <h2>Prescriptions and Treatment</h2>
      {item.prescriptions.map((p) => (
        <article className="card" key={p.id}>
          <div className="flex-between">
            <h3>Prescription {new Date(p.prescribedAt).toLocaleDateString()}</h3>
            <button
              type="button"
              className="secondary"
              onClick={() =>
                download(`/veterinary-cases/prescriptions/${p.id}/pdf`, `prescription-${p.id}.pdf`)
              }
            >
              📄 Download PDF
            </button>
          </div>
          {p.items.map((x) => (
            <p key={x.id}>
              {x.drug.canonicalName}: {x.doseValue} {x.doseUnit}, {x.route}, {x.frequency},{' '}
              {x.durationValue} {x.durationUnit}
            </p>
          ))}
          {assignedVerifiedVeterinarian &&
            !item.treatments.some((t) => t.prescriptionId === p.id) && (
              <button onClick={() => startTreatment(p.id)}>Start treatment</button>
            )}
        </article>
      ))}
      {assignedVerifiedVeterinarian && (
        <form className="card form" onSubmit={prescribe}>
          <h3>Create Prescription</h3>
          <label>
            Diagnosis
            <select name="diagnosisId">
              <option value="">No linked diagnosis</option>
              {item.diagnoses.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.clinicalNotes.slice(0, 60)}
                </option>
              ))}
            </select>
          </label>
          <label>
            Drug / active ingredient
            <select name="drugId">
              {drugs.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.canonicalName}
                </option>
              ))}
            </select>
          </label>
          <Field label="Dose value (veterinarian entered)" name="doseValue" type="number" />
          <label>
            Dose unit
            <select name="doseUnit">
              <option value="mg">mg (milligrams)</option>
              <option value="g">g (grams)</option>
              <option value="ml">ml (milliliters)</option>
              <option value="IU">IU (International Units)</option>
              <option value="mg/kg">mg/kg</option>
              <option value="tablets">tablets / bolus</option>
            </select>
          </label>
          <label>
            Route of administration
            <select name="route">
              <option value="INTRAMUSCULAR">INTRAMUSCULAR (IM)</option>
              <option value="SUBCUTANEOUS">SUBCUTANEOUS (SC)</option>
              <option value="ORAL">ORAL (PO)</option>
              <option value="INTRAVENOUS">INTRAVENOUS (IV)</option>
              <option value="TOPICAL">TOPICAL</option>
              <option value="INTRAMAMMARY">INTRAMAMMARY</option>
            </select>
          </label>
          <label>
            Frequency
            <select name="frequency">
              <option value="ONCE_DAILY">ONCE_DAILY (Once a day)</option>
              <option value="TWICE_DAILY">TWICE_DAILY (Every 12 hours)</option>
              <option value="EVERY_8_HOURS">EVERY_8_HOURS (3 times a day)</option>
              <option value="SINGLE_DOSE">SINGLE_DOSE (One time)</option>
              <option value="AS_NEEDED">AS_NEEDED</option>
            </select>
          </label>
          <Field label="Duration value" name="durationValue" type="number" />
          <label>
            Duration unit
            <select name="durationUnit">
              <option value="DAYS">DAYS</option>
              <option value="HOURS">HOURS</option>
              <option value="WEEKS">WEEKS</option>
            </select>
          </label>
          <Field label="Start date" name="startDate" type="date" />
          <Field label="Expected end date" name="expectedEndDate" type="date" required={false} />
          <label>
            Instructions
            <textarea name="instructions" />
          </label>
          <label>
            Item instructions
            <textarea name="itemInstructions" />
          </label>
          <button>Issue prescription</button>
        </form>
      )}
      {item.treatments.map((t) => (
        <article className="card" key={t.id}>
          <h3>Treatment · {t.status}</h3>
          <p>{t.administrations.length} actual administration(s) recorded</p>
          {t.administrations.map((a) => (
            <p key={a.id}>
              {a.drug.canonicalName}: {a.amount} {a.amountUnit} at{' '}
              {new Date(a.administeredAt).toLocaleString()}
            </p>
          ))}
          {t.status === 'ACTIVE' && canRecordAdministration && (
            <>
              <AdministrationForm
                treatment={t}
                caseItem={item}
                onAdminister={async (v) => {
                  v.administeredAt = new Date().toISOString();
                  const selected = item.prescriptions
                    .find((p) => p.id === t.prescriptionId)
                    ?.items.find((x) => x.id === v.prescriptionItemId);
                  v.drugId = selected?.drugId;
                  await api(`/treatments/${t.id}/administrations`, {
                    method: 'POST',
                    body: JSON.stringify(v),
                  });
                  load();
                }}
              />
              {assignedVerifiedVeterinarian && (
                <button className="secondary" style={{ marginTop: '0.75rem' }} onClick={() => complete(t.id)}>
                  ✅ Complete Treatment Course
                </button>
              )}
            </>
          )}
        </article>
      ))}
    </section>
  );
}

function AdministrationForm({ treatment, caseItem, onAdminister }) {
  const prescription = caseItem.prescriptions.find((p) => p.id === treatment.prescriptionId);
  const items = prescription?.items || [];
  const [selectedItemId, setSelectedItemId] = useState(items[0]?.id || '');
  const [amount, setAmount] = useState(items[0]?.doseValue || '');
  const [amountUnit, setAmountUnit] = useState(items[0]?.doseUnit || 'ml');
  const [route, setRoute] = useState(items[0]?.route || 'INTRAMUSCULAR');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const selected = items.find((x) => x.id === selectedItemId);
    if (selected) {
      setAmount(selected.doseValue || '');
      setAmountUnit(selected.doseUnit || 'ml');
      setRoute(selected.route || 'INTRAMUSCULAR');
    }
  }, [selectedItemId, items]);

  async function submit(e) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    try {
      await onAdminister({
        prescriptionItemId: selectedItemId,
        amount: Number(amount),
        amountUnit,
        route,
        notes,
      });
      setNotes('');
    } finally {
      setSubmitting(false);
    }
  }

  const nextNumber = (treatment.administrations?.length || 0) + 1;

  return (
    <form className="card form" style={{ background: '#f8fafc', marginTop: '1rem', border: '1px solid #cbd5e1' }} onSubmit={submit}>
      <div className="flex-between" style={{ alignItems: 'center' }}>
        <h4 style={{ margin: 0, color: '#0f172a' }}>💉 Record Administration #{nextNumber}</h4>
        <span className="badge success">Auto-Filled Prescribed Dose</span>
      </div>
      <p style={{ fontSize: '0.84rem', color: '#64748b', margin: '0.35rem 0 0.85rem' }}>
        Select a prescribed item to auto-populate the recommended dose amount, unit, and route. Recording an administration registers an actual dosage event for AMU tracking.
      </p>
      <label>
        Prescribed Medicine Item
        <select value={selectedItemId} onChange={(e) => setSelectedItemId(e.target.value)}>
          {items.map((x) => (
            <option key={x.id} value={x.id}>
              {x.drug.canonicalName} — {x.doseValue} {x.doseUnit} ({x.route}, {x.frequency})
            </option>
          ))}
        </select>
      </label>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem' }}>
        <label>
          Amount Given
          <input
            type="number"
            step="any"
            required
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </label>
        <label>
          Dose Unit
          <select value={amountUnit} onChange={(e) => setAmountUnit(e.target.value)}>
            <option value="ml">ml</option>
            <option value="mg">mg</option>
            <option value="g">g</option>
            <option value="IU">IU</option>
            <option value="tablets">tablets</option>
          </select>
        </label>
        <label>
          Administration Route
          <select value={route} onChange={(e) => setRoute(e.target.value)}>
            <option value="INTRAMUSCULAR">INTRAMUSCULAR (IM)</option>
            <option value="SUBCUTANEOUS">SUBCUTANEOUS (SC)</option>
            <option value="ORAL">ORAL (PO)</option>
            <option value="INTRAVENOUS">INTRAVENOUS (IV)</option>
            <option value="TOPICAL">TOPICAL</option>
            <option value="INTRAMAMMARY">INTRAMAMMARY</option>
          </select>
        </label>
      </div>
      <label>
        Administration Notes (Optional)
        <input
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="e.g. Dose given in neck muscle; animal calm"
        />
      </label>
      <button disabled={submitting} style={{ marginTop: '0.5rem' }}>
        {submitting ? 'Recording Dose...' : `💉 Record Administration #${nextNumber}`}
      </button>
    </form>
  );
}
export function VeterinaryWorkflow({ farms, context, user, capabilities }) {
  const [vets, setVets] = useState([]);
  const [requests, setRequests] = useState([]);
  const [cases, setCases] = useState([]);
  const [selectedCase, setSelectedCase] = useState(null);
  const [filters, setFilters] = useState('');
  async function load() {
    const query =
      context.kind === 'FARM'
        ? `?scope=FARM&farmId=${encodeURIComponent(context.farmId)}`
        : '?scope=VETERINARIAN';
    setRequests((await api(`/treatment-requests${query}`)).requests);
    setCases((await api(`/veterinary-cases${query}`)).cases);
  }
  async function search(e) {
    e?.preventDefault();
    const query = e
      ? new URLSearchParams(Object.fromEntries(new FormData(e.currentTarget))).toString()
      : filters;
    setFilters(query);
    setVets((await api(`/veterinarians?${query}`)).veterinarians);
  }
  // Initial server synchronization; later refreshes are driven by user actions.
  useEffect(() => {
    load();
    search();
  }, []);
  if (selectedCase)
    return (
      <CaseWorkspace
        caseId={selectedCase}
        context={context}
        user={user}
        capabilities={capabilities}
        close={() => {
          setSelectedCase(null);
          load();
        }}
      />
    );
  async function decide(id, status) {
    const result = await api(`/treatment-requests/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
    if (result.veterinaryCase) setSelectedCase(result.veterinaryCase.id);
    else load();
  }
  const veterinarianContext = context.kind === 'VETERINARIAN';
  const verifiedVeterinarian = veterinarianContext && context.veterinarianStatus === 'VERIFIED';
  const farmManagementContext = context.kind === 'FARM' && capabilities.canRequestTreatment;
  return (
    <section>
      <h1>Veterinary Service</h1>
      {farmManagementContext && (
        <>
          <form className="filter-bar" onSubmit={search}>
            <input name="name" placeholder="Veterinarian name" />
            <input name="state" placeholder="State" />
            <input name="district" placeholder="District" />
            <input name="specialization" placeholder="Specialization" />
            <button>Search verified veterinarians</button>
          </form>
          <div className="grid">
            {vets.map((v) => (
              <article className="card" key={v.id}>
                <h3>{v.user.fullName}</h3>
                <p>{v.qualification}</p>
                <p>
                  {v.specialization || 'General veterinary practice'} · {v.experienceYears ?? 0}{' '}
                  years
                </p>
                <span className="badge">VERIFIED</span>
              </article>
            ))}
          </div>
          <RequestForm farms={farms} veterinarians={vets} refresh={load} />
        </>
      )}
      <h2>{veterinarianContext ? 'Assigned Treatment Requests' : 'Farm Treatment Requests'}</h2>
      {requests.map((r) => (
        <article className="card review" key={r.id}>
          <div>
            <span className="badge">{r.status}</span>
            <h3>{r.animal.name || r.animal.tagNumber}</h3>
            <p>
              {r.farm.name} · {r.urgency}
            </p>
            <p>{r.observations}</p>
          </div>
          <div className="actions">
            {verifiedVeterinarian && r.status === 'REQUESTED' && (
              <>
                <button onClick={() => decide(r.id, 'ACCEPTED')}>Accept</button>
                <button className="danger" onClick={() => decide(r.id, 'REJECTED')}>
                  Reject
                </button>
              </>
            )}
            {context.kind === 'FARM' &&
              capabilities.canCancelRequests &&
              r.status === 'REQUESTED' && (
                <button className="danger" onClick={() => decide(r.id, 'CANCELLED')}>
                  Cancel
                </button>
              )}
            {r.veterinaryCase && (
              <button onClick={() => setSelectedCase(r.veterinaryCase.id)}>Open case</button>
            )}
          </div>
        </article>
      ))}
      <h2>Accepted Requests / Cases</h2>
      {cases.map((c) => (
        <button className="card farm" key={c.id} onClick={() => setSelectedCase(c.id)}>
          <strong>{c.animal.name || c.animal.tagNumber}</strong>
          <p>
            {c.farm.name} · {c.status}
          </p>
        </button>
      ))}
    </section>
  );
}
