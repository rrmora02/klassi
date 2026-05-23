import http from 'k6/http';
import { check, group } from 'k6';

const API_BASE = __ENV.API_BASE || 'http://localhost:3001/api-test-simple';
const TENANT_ID = __ENV.TENANT_ID || '';
const GROUP_ID = __ENV.GROUP_ID || '';

export const options = {
  vus: 1,
  duration: '1m',
  thresholds: {},
};

function callTRPC(endpoint, input) {
  const params = {
    headers: {
      'Content-Type': 'application/json',
      'x-tenant-id': TENANT_ID,
    },
  };

  const url = `${API_BASE}/${endpoint}`;
  const payload = JSON.stringify(input);
  return http.post(url, payload, params);
}

export default function () {
  // Test 1: getSessionRoster (the slowest one)
  group('Profiling: getSessionRoster', () => {
    const startTime = new Date();
    const response = callTRPC('attendance.getSessionRoster', {
      groupId: GROUP_ID,
      dateString: new Date().toISOString().split('T')[0],
    });
    const duration = new Date() - startTime;

    console.log(`⏱️  getSessionRoster took ${duration}ms`);
    console.log(`📊 Status: ${response.status}`);
    console.log(`📦 Response size: ${response.body.length} bytes`);

    check(response, {
      'status is 200': (r) => r.status === 200,
    });
  });
}
