import crypto from 'node:crypto';
import { canonicalize } from '../certificates/canonical.js';

export const DAILY_CLEARANCE_CANONICAL_VERSION = 'SIH-DAILY-CLEARANCE-1.0';
export const DAILY_CLEARANCE_DISCLAIMER =
  'This clearance is based on treatment records and withdrawal-reference rules recorded in the system. It is not a laboratory residue test and does not independently verify the physical source or composition of collected milk.';

export const hashDailySnapshot = (payload) =>
  crypto.createHash('sha256').update(canonicalize(payload), 'utf8').digest('hex');
