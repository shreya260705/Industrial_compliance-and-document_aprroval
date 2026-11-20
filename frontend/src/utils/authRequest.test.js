import assert from 'node:assert/strict';
import test from 'node:test';
import { setAuthorizationHeader } from './authRequest.js';

test('does not send a stale bearer token to public auth endpoints', () => {
  const headers = { Authorization: 'Bearer revoked-token' };

  setAuthorizationHeader(headers, '/api/v1/auth/login', 'revoked-token');

  assert.deepEqual(headers, {});
});

test('attaches the current bearer token to protected API requests', () => {
  const headers = { Authorization: 'Bearer stale-token' };

  setAuthorizationHeader(headers, '/api/v1/admin/platform-overview', 'current-token');

  assert.equal(headers.Authorization, 'Bearer current-token');
});
