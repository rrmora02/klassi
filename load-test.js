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
  const payload = JSON.stringify({ input });
  const params = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${USER_ID}`,
    },
  };

  const url = `${API_BASE}/${endpoint}`;
  const response = http.post(url, payload, params);

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
      'students.list response time < 500ms': (r) => r.timings.duration < 500,
      'students.list has data': (r) => r.body.includes('students'),
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
      'getSessionRoster response time < 500ms': (r) => r.timings.duration < 500,
      'getSessionRoster has enrollments': (r) => r.body.includes('enrollments'),
    });
  });

  sleep(1);

  // Scenario 3: Mark Attendance (mutation)
  group('Mark Attendance Mutation', () => {
    const today = new Date().toISOString().split('T')[0];

    // First, get session
    const rosterResponse = callTRPC('attendance.getSessionRoster', {
      groupId: GROUP_ID,
      dateString: today,
    });

    const rosterData = JSON.parse(rosterResponse.body);

    if (rosterData?.result?.data?.session?.id) {
      const sessionId = rosterData.result.data.session.id;
      const enrollmentId = rosterData.result.data.enrollments?.[0]?.enrollmentId;

      if (enrollmentId) {
        const markResponse = callTRPC('attendance.markAttendance', {
          sessionId: sessionId,
          enrollmentId: enrollmentId,
          status: 'PRESENT',
        });

        check(markResponse, {
          'markAttendance status is 200': (r) => r.status === 200,
          'markAttendance response time < 500ms': (r) => r.timings.duration < 500,
        });
      }
    }
  });

  sleep(1);

  // Scenario 4: Dashboard Stats (parallel queries)
  group('Dashboard Stats Query', () => {
    // Simulate multiple queries happening in parallel
    const responses = http.batch([
      ['POST', `${API_BASE}/students.count`, JSON.stringify({ input: {} })],
      ['POST', `${API_BASE}/groups.count`, JSON.stringify({ input: {} })],
      ['POST', `${API_BASE}/payments.summary`, JSON.stringify({ input: { month: 5, year: 2026 } })],
    ].map(([method, url, body]) => [method, url, body, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${USER_ID}`,
      },
    }]));

    responses.forEach((response, index) => {
      check(response, {
        [`dashboard query ${index} status is 200`]: (r) => r.status === 200,
        [`dashboard query ${index} response time < 300ms`]: (r) => r.timings.duration < 300,
      });
    });
  });

  sleep(2); // Simulate user thinking time
}
