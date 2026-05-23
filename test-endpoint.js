import http from 'k6/http';
import { check } from 'k6';

const API_BASE = __ENV.API_BASE || 'http://localhost:3000/api/trpc';
const SESSION_COOKIE = __ENV.SESSION_COOKIE || '';

export const options = {
  vus: 1,
  duration: '10s',
  thresholds: {},
};

export default function () {
  console.log(`\n📍 Testing endpoint: ${API_BASE}/students.list`);
  console.log(`🔐 Using cookie: __session=${SESSION_COOKIE.substring(0, 50)}...`);

  const payload = JSON.stringify({
    search: '',
    status: 'ACTIVE',
    page: 1,
    pageSize: 10,
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
      'Cookie': `__session=${SESSION_COOKIE}`,
    },
  };

  console.log(`📤 Sending POST with headers:`, JSON.stringify(params.headers));
  console.log(`📦 Payload:`, payload);

  const response = http.post(`${API_BASE}/students.list`, payload, params);

  console.log(`\n📥 Response status: ${response.status}`);
  console.log(`📝 Response headers:`, JSON.stringify(response.headers));
  console.log(`📄 Response body (first 500 chars):\n${response.body.substring(0, 500)}`);

  check(response, {
    'Status is 200': (r) => r.status === 200,
    'Status is 401 (needs auth)': (r) => r.status === 401,
    'Status is 404 (endpoint not found)': (r) => r.status === 404,
  });
}
