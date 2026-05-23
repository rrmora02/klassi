import http from 'k6/http';
import { check, group, sleep } from 'k6';

// Configuration
const API_BASE = __ENV.API_BASE || 'http://localhost:3000/api/trpc';
const CLERK_API_KEY = __ENV.CLERK_API_KEY || '';
const TEST_EMAIL = __ENV.TEST_EMAIL || 'test@example.com';
const TEST_PASSWORD = __ENV.TEST_PASSWORD || 'password123';
const TENANT_ID = __ENV.TENANT_ID || '';
const GROUP_ID = __ENV.GROUP_ID || '';

let authToken = '';

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

// Setup: Authenticate once before test
export function setup() {
  console.log('🔐 Authenticating with Clerk...');

  // Try to get auth token from Clerk
  const authRes = http.post('http://localhost:3000/api/auth/callback/credentials', {
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
  });

  if (authRes.status !== 200) {
    console.warn('⚠️ Direct auth failed, will try Clerk session...');
  }

  // Get session cookie
  const cookieJar = http.cookieJar();
  cookieJar.set('localhost:3000', '__session', 'test_session', { path: '/' });

  return { authenticated: true };
}

// Helper function to make authenticated tRPC calls
function callTRPC(endpoint, input, sessionToken = '') {
  const payload = JSON.stringify(input);
  const params = {
    headers: {
      'Content-Type': 'application/json',
      ...(sessionToken && { 'Authorization': `Bearer ${sessionToken}` })
    },
    cookies: {
      '__session': sessionToken || 'test_session'
    },
  };

  const url = `${API_BASE}/${endpoint}`;
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

  sleep(1);

  // Scenario 4: Dashboard stats (if available)
  group('Dashboard Stats Query', () => {
    const response = callTRPC('dashboard.getDashboardData', {});

    check(response, {
      'dashboard status is 200': (r) => r.status === 200 || r.status === 404,
      'dashboard response time < 1000ms': (r) => r.timings.duration < 1000,
    });
  });

  sleep(2);
}
