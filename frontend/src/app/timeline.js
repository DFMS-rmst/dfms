const TIMELINE_EVENT_LABELS = {
  CREATED: 'Animal Profile Created',
  UPDATED: 'Animal Profile Updated',
  TREATMENT_REQUEST_CREATED: 'Treatment Request Created',
  VETERINARY_CASE_OPENED: 'Veterinary Case Opened',
  DIAGNOSIS_RECORDED: 'Diagnosis Recorded',
  PRESCRIPTION_ISSUED: 'Prescription Issued',
  TREATMENT_ACTIVE: 'Treatment Started',
  TREATMENT_COMPLETED: 'Treatment Completed',
  TREATMENT_CANCELLED: 'Treatment Cancelled',
  TREATMENT_ADMINISTERED: 'Medicine Administration Recorded',
  MILK_ELIGIBILITY_CHANGED: 'Milk Eligibility Updated',
};

export function timelineEventLabel(eventType) {
  if (TIMELINE_EVENT_LABELS[eventType]) return TIMELINE_EVENT_LABELS[eventType];
  if (typeof eventType !== 'string' || !eventType.trim()) return 'Health Timeline Event';
  return eventType
    .trim()
    .toLowerCase()
    .split('_')
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(' ');
}

export function timelineEventsFromResponse(result) {
  return Array.isArray(result?.events) ? result.events : [];
}

export function formatTimelineDate(value) {
  if (!value) return 'Date unavailable';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Date unavailable' : date.toLocaleString();
}
