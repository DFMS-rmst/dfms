import { env } from '../../config/env.js';
import { AppError } from '../../common/errors.js';

async function call(path, body) {
  let response;
  const urlsToTry = [env.ML_SERVICE_URL];
  if (env.ML_SERVICE_URL.includes('//ml:')) {
    urlsToTry.push(env.ML_SERVICE_URL.replace('//ml:', '//localhost:'));
    urlsToTry.push(env.ML_SERVICE_URL.replace('//ml:', '//127.0.0.1:'));
  }

  let lastError;
  for (const baseUrl of urlsToTry) {
    try {
      response = await fetch(`${baseUrl}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(5000),
      });
      if (response) break;
    } catch (err) {
      lastError = err;
    }
  }

  if (!response) {
    throw new AppError(
      503,
      'ML_SERVICE_UNAVAILABLE',
      `ML decision-support service is unavailable (${lastError?.message || 'connection failed'})`,
    );
  }
  if (!response.ok)
    throw new AppError(503, 'ML_SERVICE_ERROR', 'ML decision-support service failed');
  return response.json();
}

export const inferRisk = (features) => call('/v1/amu-risk', { features });
export const retrieveKnowledge = (question, limit = 5) => call('/v1/retrieve', { question, limit });
