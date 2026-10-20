/**
 * Blockchain Service (Standalone / Local Mode)
 *
 * Docker and blockchain network requirements have been removed.
 * Certificate and clearance records use SHA-256 canonical hashing
 * in MySQL for integrity proof.
 */

export async function anchorCertificate(certificateId, actorUserId) {
  return {
    status: 'DISABLED',
    message: 'Blockchain anchoring is disabled; record integrity backed by SHA-256 canonical hash in MySQL.',
  };
}

export async function verifyCertificateIntegrity(certificate) {
  return {
    status: 'NOT_ANCHORED',
    anchor: null,
  };
}

export async function anchorDailyClearance(clearanceId, actorUserId) {
  return {
    status: 'DISABLED',
    message: 'Blockchain anchoring is disabled; record integrity backed by SHA-256 canonical hash in MySQL.',
  };
}

export async function verifyDailyClearanceIntegrity(clearance) {
  return {
    status: 'NOT_ANCHORED',
    anchor: null,
  };
}
