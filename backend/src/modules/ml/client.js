import { env } from '../../config/env.js';
import { AppError } from '../../common/errors.js';

async function call(path, body) {
  let response;
  try {
    response = await fetch(`${env.ML_SERVICE_URL}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(5000),
    });
  } catch {
    throw new AppError(503, 'ML_SERVICE_UNAVAILABLE', 'ML decision-support service is unavailable');
  }
  if (!response.ok)
    throw new AppError(503, 'ML_SERVICE_ERROR', 'ML decision-support service failed');
  return response.json();
}

export const inferRisk = (features) => call('/v1/amu-risk', { features });
export const retrieveKnowledge = (question, limit = 5) => call('/v1/retrieve', { question, limit });
