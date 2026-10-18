export function treatmentRequestIdFromResponse(result) {
  return result?.request?.id || null;
}

export function canCompleteTreatment(treatment) {
  return treatment?.status === 'ACTIVE' && (treatment?.administrations?.length || 0) > 0;
}
