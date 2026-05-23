import http from 'k6/http';
import { check, group } from 'k6';

const API_BASE = __ENV.API_BASE || 'http://localhost:3000/api-test-debug';
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
  group('Profiling: getSessionRoster (DEBUG)', () => {
    const response = callTRPC('attendance.getSessionRoster', {
      groupId: GROUP_ID,
      dateString: new Date().toISOString().split('T')[0],
    });

    if (response.status === 200) {
      try {
        const data = JSON.parse(response.body);
        if (data._timing) {
          console.log(`📊 TIMING BREAKDOWN:`);
          console.log(`   Total: ${data._timing.total}ms`);
          console.log(`   Tenant check: ${data._timing.tenantCheck}ms`);
          console.log(`   Tenant user: ${data._timing.tenantUser}ms`);
          console.log(`   Body parse: ${data._timing.bodyParse}ms`);
          console.log(`   Procedure: ${data._timing.procedure}ms`);
        }
      } catch (e) {
        console.log(`Status: ${response.status}`);
      }
    }

    check(response, {
      'status is 200': (r) => r.status === 200,
    });
  });
}
