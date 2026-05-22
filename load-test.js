import http from 'k6/http';
import { check, group, sleep } from 'k6';

// Configuration
const API_BASE = __ENV.API_BASE || 'http://localhost:3000/api/trpc';
const TENANT_ID = __ENV.TENANT_ID || 'cluq4mjpk0000pjhu7l9x1234';
const GROUP_ID = __ENV.GROUP_ID || 'cluq5mjpk0001pjhu7l9x5678';
const USER_ID = __ENV.USER_ID || 'user_1234567890';

export const options = {
  stages: [
    { duration: '1m', target: 10 },   // Ramp-up: 0 → 10 users
    { duration: '2m', target: 50 },   // Ramp-up: 10 → 50 users
    { duration: '2m', target: 100 },  // Ramp-up: 50 → 100 users
    { duration: '2m', target: 100 },  // Stay: 100 users
    { duration: '1m', target: 0 },    // Ramp-down: 100 → 0
  ],
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'],
    http_req_failed: ['rate<0.1'], // Keep error rate < 10%
  },
  ext: {
    loadimpact: {
      projectID: 3456789,
      name: 'Klassi Stress Test'
    }
  }
};

// Helper function to make tRPC calls
function callTRPC(endpoint, input) {
  const payload = JSON.stringify(input);
  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
    timeout: '30s',
  };

  // tRPC URL format: /api/trpc/[router].[procedure]
  const url = `${API_BASE}/${endpoint}`;
  console.log(`Calling: ${url}`);

  const response = http.post(url, payload, params);

  if (response.status !== 200) {
    console.log(`Response status: ${response.status}`);
    console.log(`Response body: ${response.body.substring(0, 200)}`);
  }

  return response;
}

export default function () {
  // Scenario 1: Students List (heavy query with includes)
  group('Students List Query', () => {
    const response = callTRPC('students.list', {
      search: '',
      status: 'ACTIVE',
      page: 1,
      pageSize: 20,
    });

    check(response, {
      'students.list status is 200': (r) => r.status === 200,
      'students.list response time < 1000ms': (r) => r.timings.duration < 1000,
      'students.list has no error': (r) => !r.body.includes('error'),
    });
  });

  sleep(1);

  // Scenario 2: Attendance GetSessionRoster (N+1 queries)
  group('Attendance GetSessionRoster Query', () => {
    const today = new Date().toISOString().split('T')[0];
    const response = callTRPC('attendance.getSessionRoster', {
      groupId: GROUP_ID,
      dateString: today,
    });

    check(response, {
      'getSessionRoster status is 200': (r) => r.status === 200,
      'getSessionRoster response time < 1000ms': (r) => r.timings.duration < 1000,
      'getSessionRoster has no error': (r) => !r.body.includes('error'),
    });
  });

  sleep(1);

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

  sleep(1);

  // Scenario 4: Simple health check
  group('Health Check', () => {
    const response = http.get(`${API_BASE.replace('/api/trpc', '')}/api/health`, {
      timeout: '30s',
    });

    check(response, {
      'health check returns 200 or 404': (r) => r.status === 200 || r.status === 404,
    });
  });

  sleep(2); // Simulate user thinking time
}
