const base = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1';
let token = sessionStorage.getItem('accessToken');

export const hasAccessToken = () => Boolean(token);
export function setAccessToken(value) {
  token = value;
  if (value) sessionStorage.setItem('accessToken', value);
  else sessionStorage.removeItem('accessToken');
}

export async function api(path, options = {}, retry = true) {
  const response = await fetch(`${base}${path}`, {
    credentials: 'include',
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  if (response.status === 401 && retry && !path.startsWith('/auth/')) {
    const refresh = await fetch(`${base}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    });
    if (refresh.ok) {
      const refreshed = await refresh.json();
      setAccessToken(refreshed.data.accessToken);
      return api(path, options, false);
    }
  }
  const body = response.status === 204 ? null : await response.json();
  if (!response.ok) {
    const fields = body?.error?.details?.fieldErrors || {};
    const fieldMessage = Object.entries(fields)
      .filter(([, messages]) => messages?.length)
      .map(([field, messages]) => `${field}: ${messages[0]}`)
      .join('; ');
    const error = new Error(fieldMessage || body?.error?.message || 'Request failed');
    error.code = body?.error?.code;
    error.details = body?.error?.details;
    throw error;
  }
  return body?.data;
}

export async function download(path, filename) {
  const response = await fetch(`${base}${path}`, {
    credentials: 'include',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!response.ok) throw new Error('Download failed');
  const url = URL.createObjectURL(await response.blob());
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export async function publicApi(path) {
  const response = await fetch(`${base}${path}`);
  const body = await response.json();
  if (!response.ok) throw new Error(body?.error?.message || 'Verification failed');
  return body.data;
}
