import http from 'k6/http';
import { check, group, sleep } from 'k6';

// Configuration
const API_BASE = __ENV.API_BASE || 'http://localhost:3000/api-test';
const TENANT_ID = __ENV.TENANT_ID || '';
const GROUP_ID = __ENV.GROUP_ID || '';

export const options = {
  stages: [
    { duration: '30s', target: 2 },    // Ramp-up: 0 → 2 users
    { duration: '1m', target: 5 },     // Ramp-up: 2 → 5 users
    { duration: '1m', target: 10 },    // Ramp-up: 5 → 10 users
    { duration: '1m', target: 14 },    // Ramp-up: 10 → 14 users (LIMIT)
    { duration: '2m', target: 14 },    // Stay: 14 users (sustain load)
    { duration: '1m', target: 0 },     // Ramp-down: 14 → 0
  ],
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'],
    http_req_failed: ['rate<0.05'], // Keep error rate < 5%
  },
  maxVUs: 14, // CRITICAL: Never exceed pool size
  ext: {
    loadimpact: {
      projectID: 3456789,
      name: 'Klassi Authenticated Load Test (14 conn limit)'
    }
  }
};


// Helper function to make tRPC calls - uses POST for both queries and mutations
function callTRPC(endpoint, input) {
  const params = {
    headers: {
      'Content-Type': 'application/json',
      'x-tenant-id': TENANT_ID,
    },
    tags: { name: endpoint }
  };

  const url = `${API_BASE}/${endpoint}`;
  const payload = JSON.stringify(input);
  const response = http.post(url, payload, params);

  return response;
}

export default function (data) {
  // Scenario 1: Students List Query
  group('Students List Query', () => {
    const response = callTRPC('students.list', {
      search: '',
      status: 'ACTIVE',
      page: 1,
      pageSize: 10,
    });

    check(response, {
      'students.list status is 200': (r) => r.status === 200,
      'students.list response time < 1000ms': (r) => r.timings.duration < 1000,
      'students.list has no error': (r) => !r.body.includes('error') || r.body.includes('data'),
    });
  });

  sleep(1);

  // Scenario 2: Attendance GetSessionRoster
  if (GROUP_ID) {
    group('Attendance GetSessionRoster Query', () => {
      const today = new Date().toISOString().split('T')[0];
      const response = callTRPC('attendance.getSessionRoster', {
        groupId: GROUP_ID,
        dateString: today,
      });

      check(response, {
        'getSessionRoster status is 200': (r) => r.status === 200,
        'getSessionRoster response time < 1000ms': (r) => r.timings.duration < 1000,
        'getSessionRoster has data': (r) => r.body.length > 0,
      });
    });

    sleep(1);
  }

  // Scenario 3: Get Groups for Attendance
  group('Attendance GetGroups Query', () => {
    const today = new Date().toISOString().split('T')[0];
    const response = callTRPC('attendance.getGroups', {
      dateString: today,
    });

    check(response, {
      'getGroups status is 200': (r) => r.status === 200,
      'getGroups response time < 1000ms': (r) => r.timings.duration < 1000,
    });
  });

  sleep(2);
}
