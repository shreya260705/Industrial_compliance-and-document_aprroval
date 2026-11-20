const publicAuthEndpoint = /\/auth\/(?:login|register|forgot-password|reset-password|refresh)\/?$/i;

export const clearAuthorizationHeader = (headers) => {
  if (!headers) return;

  if (typeof headers.delete === 'function') {
    headers.delete('Authorization');
    return;
  }

  Object.keys(headers)
    .filter((name) => name.toLowerCase() === 'authorization')
    .forEach((name) => delete headers[name]);
};

export const setAuthorizationHeader = (headers, url, token) => {
  clearAuthorizationHeader(headers);

  if (!headers || !token || publicAuthEndpoint.test((url || '').split('?')[0])) {
    return;
  }

  if (typeof headers.set === 'function') {
    headers.set('Authorization', `Bearer ${token}`);
  } else {
    headers.Authorization = `Bearer ${token}`;
  }
};
