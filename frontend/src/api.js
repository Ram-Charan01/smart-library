export async function api(path, { body, ...options } = {}) {
  const response = await fetch(`/api${path}`, {
    ...options,
    ...(body === undefined ? {} : { body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' } })
  });
  if (response.status === 401 && !['/auth/login', '/auth/me'].includes(path)) {
    window.dispatchEvent(new Event('library:session-expired'));
  }
  const data = await response.json().catch(() => null);
  if (!response.ok || data === null) {
    const error = new Error(data?.error || 'The library server could not complete the request.');
    error.status = response.status;
    throw error;
  }
  return data;
}
