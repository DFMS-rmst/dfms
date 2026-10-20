import { env } from '../../config/env.js';
import { AppError } from '../../common/errors.js';

async function getTargetUrls(path = '') {
  const urls = [env.ML_SERVICE_URL];
  if (env.ML_SERVICE_URL.includes('//ml:')) {
    urls.push(env.ML_SERVICE_URL.replace('//ml:', '//localhost:'));
    urls.push(env.ML_SERVICE_URL.replace('//ml:', '//127.0.0.1:'));
  }
  if (env.ML_SERVICE_URL.includes('localhost')) {
    urls.push(env.ML_SERVICE_URL.replace('localhost', '127.0.0.1'));
  } else if (env.ML_SERVICE_URL.includes('127.0.0.1')) {
    urls.push(env.ML_SERVICE_URL.replace('127.0.0.1', 'localhost'));
  }
  return [...new Set(urls)].map((u) => `${u}${path}`);
}

async function call(path, body) {
  let response;
  const urlsToTry = await getTargetUrls(path);

  let lastError;
  for (const url of urlsToTry) {
    try {
      response = await fetch(url, {
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
  if (!response.ok) {
    let errDetail;
    try {
      const errJson = await response.json();
      if (errJson.detail) {
        errDetail = Array.isArray(errJson.detail)
          ? errJson.detail.map((d) => d.msg || JSON.stringify(d)).join('; ')
          : errJson.detail;
      } else if (errJson.message) {
        errDetail = errJson.message;
      }
    } catch {
      // ignore
    }
    throw new AppError(
      response.status === 422 ? 400 : 503,
      response.status === 422 ? 'INVALID_ML_INPUT' : 'ML_SERVICE_ERROR',
      errDetail || 'ML decision-support service failed',
    );
  }
  return response.json();
}

export async function checkMlHealth() {
  const urlsToTry = await getTargetUrls('/');
  for (const url of urlsToTry) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(2000) });
      if (res.ok) {
        const data = await res.json();
        return { available: true, data };
      }
    } catch {
      // try next
    }
  }
  return { available: false, error: 'ML service is offline or unreachable on port 8000' };
}

export const inferRisk = (features) => call('/v1/amu-risk', { features });
export const predictAnimalRisk = (data) => call('/predict', data);
