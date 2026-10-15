/* eslint-disable react-hooks/exhaustive-deps -- effects deliberately synchronize selected server resources */
import { useEffect, useState } from 'react';
import { api, download } from './api.js';
import { canCompleteTreatment, treatmentRequestIdFromResponse } from './workflowContracts.js';

const Field = ({ label, name, type = 'text', required = true }) => (
  <label>
    {label}
    <input name={name} type={type} required={required} />
  </label>
);
function RequestForm({ farms, veterinarians, refresh }) {
  const [farmId, setFarmId] = useState(farms[0]?.id || '');
  const [animals, setAnimals] = useState([]);
  const [animalId, setAnimalId] = useState('');
  const [requestedVetId, setRequestedVetId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

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
          if (active) {
            const list = d.animals || [];
            setAnimals(list);
            if (list.length > 0) setAnimalId(list[0].id);
            else setAnimalId('');
          }
        })
        .catch(() => {
          if (active) {
            setAnimals([]);
            setAnimalId('');
          }
        });
    } else {
      setAnimals([]);
      setAnimalId('');
    }
    return () => {
      active = false;
    };
  }, [farmId]);

  useEffect(() => {
    if (veterinarians.length > 0) {
      if (!requestedVetId || !veterinarians.some((v) => v.id === requestedVetId)) {
        setRequestedVetId(veterinarians[0].id);
      }
    } else {
      setRequestedVetId('');
    }
  }, [veterinarians, requestedVetId]);

  async function submit(event) {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    setSuccess('');
    const form = event.currentTarget;
    const value = Object.fromEntries(new FormData(form));
    const attachment = form.elements.attachment?.files?.[0];
    delete value.attachment;

    if (!value.observations || value.observations.trim().length < 3) {
      setError('Observations must be at least 3 characters long.');
      setSubmitting(false);
      return;
    }

    try {
      const created = await api('/treatment-requests', {
        method: 'POST',
        body: JSON.stringify(value),
      });
      const treatmentRequestId = treatmentRequestIdFromResponse(created);
      if (attachment && treatmentRequestId) {
        try {
          const upload = await api('/files/presign-upload', {
            method: 'POST',
            body: JSON.stringify({
              category: 'TREATMENT_REQUEST',
              entityType: 'TREATMENT_REQUEST',
              entityId: treatmentRequestId,
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
          if (response.ok && upload.file?.id) {
            await api(`/files/${upload.file.id}/complete`, { method: 'POST' });
          }
        } catch (fileErr) {
          console.warn('Optional attachment upload error:', fileErr);
        }
      }
      setSuccess('✅ Treatment request sent successfully! Assigned veterinarian has been notified.');
      form.reset();
      refresh?.();
    } catch (err) {
      setError(err.message || 'Failed to send treatment request');
    } finally {
      setSubmitting(false);
    }
  }

  const isBtnDisabled = submitting || !farmId || !animalId || !requestedVetId;

  return (
    <form className="card form" onSubmit={submit} style={{ marginTop: '2rem' }}>
      <h2>Request Treatment</h2>
      {error && <p className="error">{error}</p>}
      {success && <p className="success-text">{success}</p>}

      <label>
        Farm
        <select name="farmId" value={farmId} onChange={(e) => setFarmId(e.target.value)} required>
          {farms.length === 0 && <option value="">No farms registered</option>}
          {farms.map((f) => (
            <option key={f.id} value={f.id}>
              {f.name}
            </option>
          ))}
        </select>
      </label>

      <label>
        Animal
        <select name="animalId" value={animalId} onChange={(e) => setAnimalId(e.target.value)} required>
          {animals.length === 0 && <option value="">No animals found for selected farm</option>}
          {animals.map((a) => (
            <option key={a.id} value={a.id}>
              {a.tagNumber} — {a.name || a.species?.canonicalName || 'Livestock'}
            </option>
          ))}
        </select>
      </label>
      {animals.length === 0 && (
        <p className="notice" style={{ marginTop: '-0.3rem', fontSize: '0.85rem' }}>
          ⚠️ No animals found on this farm. Please add an animal to this farm before requesting treatment.
        </p>
      )}

      <label>
        Verified veterinarian
        <select
          name="requestedVeterinarianId"
          value={requestedVetId}
          onChange={(e) => setRequestedVetId(e.target.value)}
          required
        >
          {veterinarians.length === 0 && (
            <option value="">No verified veterinarians found in search</option>
          )}
          {veterinarians.map((v) => (
            <option key={v.id} value={v.id}>
              {v.user.fullName} — {v.specialization || v.qualification}
            </option>
          ))}
        </select>
      </label>
      {veterinarians.length === 0 && (
        <p className="notice" style={{ marginTop: '-0.3rem', fontSize: '0.85rem' }}>
          ⚠️ No verified veterinarians found matching search criteria. Use search bar above or verify a veterinarian profile.
        </p>
      )}

      <label>
        Urgency
        <select name="urgency" defaultValue="ROUTINE">
          <option value="ROUTINE">ROUTINE</option>
          <option value="SOON">SOON</option>
          <option value="URGENT">URGENT</option>
          <option value="EMERGENCY">EMERGENCY</option>
        </select>
      </label>
      <label>
        Observations (Min 3 characters)
        <textarea name="observations" placeholder="Describe symptoms or reason for request..." required minLength={3} />
      </label>
      <label>
        Symptoms / Notes (Optional)
        <textarea name="symptoms" placeholder="Additional health notes or clinical history..." />
      </label>
      <label>
        Supporting image (optional)
        <input name="attachment" type="file" accept="image/jpeg,image/png,image/webp" />
      </label>
      <button disabled={isBtnDisabled}>
        {submitting ? '📩 Sending treatment request...' : 'Send treatment request'}
      </button>
    </form>
  );
}
function CaseWorkspace({ caseId, context, user, capabilities, close }) {
  const [item, setItem] = useState(null);
  const [messages, setMessages] = useState([]);
  const [diseases, setDiseases] = useState([]);
  const [drugs, setDrugs] = useState([]);
  const [workflowError, setWorkflowError] = useState('');
  const [prescriptionDrugId, setPrescriptionDrugId] = useState('');
  const [prescriptionProductId, setPrescriptionProductId] = useState('');
  async function load() {
    setItem((await api(`/veterinary-cases/${caseId}`)).case);
    setMessages((await api(`/veterinary-cases/${caseId}/messages`)).messages);
  }
  // Reload when the selected case changes; load intentionally closes over that case id.
  useEffect(() => {
    load();
    api('/reference-data/diseases').then((d) => setDiseases(d.diseases));
    api('/reference-data/drugs').then((d) => {
      setDrugs(d.drugs);
      setPrescriptionDrugId((current) => current || d.drugs[0]?.id || '');
    });
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
          drugProductId: v.drugProductId || null,
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
    setWorkflowError('');
    try {
      await api('/treatments', {
        method: 'POST',
        body: JSON.stringify({ caseId, prescriptionId, startImmediately: true }),
      });
      await load();
    } catch (error) {
      setWorkflowError(error.message || 'Unable to start treatment');
    }
  }
  async function complete(id) {
    if (!window.confirm('Complete this treatment course using the recorded administration history?'))
      return;
    setWorkflowError('');
    try {
      await api(`/treatments/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'COMPLETED', notes: 'Completed by veterinarian' }),
      });
      await load();
    } catch (error) {
      setWorkflowError(error.message || 'Unable to complete treatment');
    }
  }
  async function activateTreatment(id) {
    setWorkflowError('');
    try {
      await api(`/treatments/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'ACTIVE' }),
      });
      await load();
    } catch (error) {
      setWorkflowError(error.message || 'Unable to start planned treatment');
    }
  }
  async function cancel(id) {
    const reason = window.prompt('Why was this treatment cancelled or not administered?');
    if (!reason?.trim()) return;
    setWorkflowError('');
    try {
      await api(`/treatments/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'CANCELLED', notes: reason.trim() }),
      });
      await load();
    } catch (error) {
      setWorkflowError(error.message || 'Unable to cancel treatment');
    }
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
      {workflowError && <p className="error">{workflowError}</p>}
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
              <br />
              <small>Product: {x.drugProduct?.productName || 'Not specified'}</small>
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
            <select
              name="drugId"
              value={prescriptionDrugId}
              onChange={(event) => {
                setPrescriptionDrugId(event.target.value);
                setPrescriptionProductId('');
              }}
            >
              {drugs.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.canonicalName}
                </option>
              ))}
            </select>
          </label>
          <label>
            Approved product (optional)
            <select
              name="drugProductId"
              value={prescriptionProductId}
              onChange={(event) => setPrescriptionProductId(event.target.value)}
            >
              <option value="">Product not specified / no approved product available</option>
              {(drugs.find((drug) => drug.id === prescriptionDrugId)?.products || []).map(
                (product) => (
                  <option key={product.id} value={product.id}>
                    {product.productName} — {product.formulation} ({product.route})
                  </option>
                ),
              )}
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
          {t.administrations.length > 0 && (
            <p>
              Last administration:{' '}
              {new Date(t.administrations[0].administeredAt).toLocaleString()}
            </p>
          )}
          {t.administrations.map((a, index) => (
            <article className="card compact" key={a.id}>
              <strong>Administration #{t.administrations.length - index}</strong>
              <p>Medicine: {a.drug.canonicalName}</p>
              <p>Product: {a.drugProduct?.productName || 'Not specified'}</p>
              <p>Actual amount: {a.amount} {a.amountUnit}</p>
              <p>Route: {a.route}</p>
              <p>Administered at: {new Date(a.administeredAt).toLocaleString()}</p>
              <p>Recorded by: {a.administeredBy?.fullName || 'Recorded user unavailable'}</p>
              <p>
                Performed by:{' '}
                {a.performedBy?.fullName || a.performedByName || a.administeredBy?.fullName || 'Not recorded'}
              </p>
              <p>Notes: {a.notes || 'None'}</p>
              <p>Deviation: {a.deviationReason || 'None recorded'}</p>
            </article>
          ))}
          {t.status === 'PLANNED' && assignedVerifiedVeterinarian && (
            <div className="inline-form" style={{ marginTop: '0.75rem' }}>
              <button onClick={() => activateTreatment(t.id)}>Start Planned Treatment</button>
              <button className="danger" onClick={() => cancel(t.id)}>
                Cancel / Not Administered
              </button>
            </div>
          )}
          {t.status === 'ACTIVE' && canRecordAdministration && (
            <>
              <AdministrationForm
                treatment={t}
                caseItem={item}
                onAdminister={async (v) => {
                  await api(`/treatments/${t.id}/administrations`, {
                    method: 'POST',
                    body: JSON.stringify(v),
                  });
                  load();
                }}
              />
              {assignedVerifiedVeterinarian && (
                <div className="inline-form" style={{ marginTop: '0.75rem' }}>
                  <button
                    className="secondary"
                    disabled={!canCompleteTreatment(t)}
                    title={
                      t.administrations.length === 0
                        ? 'Record at least one actual administration before completion'
                        : 'Complete treatment course'
                    }
                    onClick={() => complete(t.id)}
                  >
                    ✅ Complete Treatment Course
                  </button>
                  <button className="danger" onClick={() => cancel(t.id)}>
                    Cancel / Not Administered
                  </button>
                </div>
              )}
              {assignedVerifiedVeterinarian && t.administrations.length === 0 && (
                <p className="notice">
                  Completion is unavailable until an actual medicine administration is recorded.
                  If no medicine was given, cancel the treatment with a reason.
                </p>
              )}
            </>
          )}
        </article>
      ))}
    </section>
  );
}

export function AdministrationForm({ treatment, caseItem, onAdminister }) {
  const prescription = caseItem.prescriptions.find((p) => p.id === treatment.prescriptionId);
  const items = prescription?.items || [];
  const [selectedItemId, setSelectedItemId] = useState(items[0]?.id || '');
  const [amount, setAmount] = useState(items[0]?.doseValue || '');
  const [amountUnit, setAmountUnit] = useState(items[0]?.doseUnit || 'ml');
  const [route, setRoute] = useState(items[0]?.route || 'INTRAMUSCULAR');
  const [drugProductId, setDrugProductId] = useState(items[0]?.drugProductId || '');
  const [administeredAt, setAdministeredAt] = useState(() => {
    const now = new Date(Date.now() - new Date().getTimezoneOffset() * 60000);
    return now.toISOString().slice(0, 16);
  });
  const [samePerformer, setSamePerformer] = useState(true);
  const [performedByName, setPerformedByName] = useState('');
  const [deviationReason, setDeviationReason] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const selected = items.find((x) => x.id === selectedItemId);
    if (selected) {
      setAmount(selected.doseValue || '');
      setAmountUnit(selected.doseUnit || 'ml');
      setRoute(selected.route || 'INTRAMUSCULAR');
      setDrugProductId(selected.drugProductId || '');
      setDeviationReason('');
    }
  }, [selectedItemId, items]);

  async function submit(e) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError('');
    try {
      await onAdminister({
        prescriptionItemId: selectedItemId,
        amount: Number(amount),
        amountUnit,
        route,
        drugProductId: drugProductId || null,
        administeredAt: new Date(administeredAt).toISOString(),
        performedByName: samePerformer ? null : performedByName,
        deviationReason: hasDeviation ? deviationReason : null,
        notes,
      });
      setNotes('');
    } catch (submissionError) {
      setError(submissionError.message || 'Unable to record administration');
    } finally {
      setSubmitting(false);
    }
  }

  const nextNumber = (treatment.administrations?.length || 0) + 1;
  const selectedItem = items.find((item) => item.id === selectedItemId);
  const products = selectedItem?.drug?.products || [];
  const hasDeviation =
    selectedItem &&
    (Number(selectedItem.doseValue) !== Number(amount) ||
      selectedItem.doseUnit !== amountUnit ||
      selectedItem.route !== route ||
      (selectedItem.drugProductId || '') !== drugProductId);

  return (
    <form className="card form" style={{ background: '#f8fafc', marginTop: '1rem', border: '1px solid #cbd5e1' }} onSubmit={submit}>
      <div className="flex-between" style={{ alignItems: 'center' }}>
        <h4 style={{ margin: 0, color: '#0f172a' }}>💉 Record Administration #{nextNumber}</h4>
        <span className="badge success">Auto-Filled Prescribed Dose</span>
      </div>
      <p style={{ fontSize: '0.84rem', color: '#64748b', margin: '0.35rem 0 0.85rem' }}>
        Select a prescribed item to auto-populate the recommended dose amount, unit, and route. Recording an administration registers an actual dosage event for AMU tracking.
      </p>
      {error && <p className="error">{error}</p>}
      <p><strong>Animal:</strong> {caseItem.animal.name || caseItem.animal.tagNumber}</p>
      <p><strong>Treatment:</strong> {treatment.status}</p>
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
      {selectedItem && (
        <div className="notice">
          <strong>Prescription:</strong> {selectedItem.drug.canonicalName}
          {' · '}{selectedItem.drugProduct?.productName || 'Product not specified'}
          {' · '}{selectedItem.doseValue} {selectedItem.doseUnit}
          {' · '}{selectedItem.route}
        </div>
      )}
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
        <label>
          Actual Product
          <select value={drugProductId} onChange={(e) => setDrugProductId(e.target.value)}>
            <option value="">Product unknown / not specified</option>
            {products.map((product) => (
              <option key={product.id} value={product.id}>
                {product.productName} — {product.formulation}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label>
        Actual administration date and time
        <input
          type="datetime-local"
          required
          max={new Date(Date.now() - new Date().getTimezoneOffset() * 60000)
            .toISOString()
            .slice(0, 16)}
          value={administeredAt}
          onChange={(event) => setAdministeredAt(event.target.value)}
        />
      </label>
      <label className="checkbox-line">
        <input
          type="checkbox"
          checked={samePerformer}
          onChange={(event) => setSamePerformer(event.target.checked)}
        />
        Medicine was performed by the same person recording this entry
      </label>
      {!samePerformer && (
        <label>
          Performed by (name)
          <input
            required
            value={performedByName}
            onChange={(event) => setPerformedByName(event.target.value)}
            placeholder="Name of the person who administered the medicine"
          />
        </label>
      )}
      {hasDeviation && (
        <label className="notice">
          ⚠ Deviation from prescription — reason required
          <textarea
            required
            minLength={3}
            value={deviationReason}
            onChange={(event) => setDeviationReason(event.target.value)}
            placeholder="Explain why the actual amount, unit, route, or product differed"
          />
        </label>
      )}
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
            <select name="specialization" defaultValue="">
              <option value="">All Specializations</option>
              <option value="Bovine">Bovine Medicine & Surgery</option>
              <option value="Small Ruminant">Small Ruminant Medicine</option>
              <option value="Theriogenology">Theriogenology & Reproduction</option>
              <option value="Preventive">Preventive Medicine & Herd Health</option>
              <option value="General">General Farm Practice & Surgery</option>
              <option value="Swine">Swine Health & Medicine</option>
              <option value="Equine">Equine Medicine</option>
              <option value="Avian">Avian & Poultry Medicine</option>
            </select>
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
