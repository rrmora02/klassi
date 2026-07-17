# 🔥 Klassi Stress Testing Guide

## Prerequisites

### 1. Install k6
```bash
# macOS
brew install k6

# Windows (PowerShell)
choco install k6

# Linux
sudo apt-get install k6

# Or download from https://k6.io/docs/getting-started/installation/
```

### 2. Get Required IDs from Klassi

You need:
- **TENANT_ID**: Your school/tenant UUID
- **GROUP_ID**: A valid group ID to test
- **USER_ID**: A valid user ID (from Clerk)

**To find these:**
1. Login to Klassi
2. Open DevTools (F12) → Network tab
3. Make any API call
4. Look at request payload for `tenantId`, `groupId`, `userId`

## Configuration

### Set Environment Variables
```bash
export API_BASE="http://localhost:3000/api/trpc"
export TENANT_ID="your-tenant-id"
export GROUP_ID="your-group-id"
export USER_ID="your-user-id"
```

### Optional: Enable PostgreSQL Slow Query Logging
```bash
# Connect to your database
psql -U postgres -d klassi -f setup-pg-logging.sql

# Then watch slow queries in real-time
tail -f /var/log/postgresql/postgresql.log | grep "duration:"
```

## Running Tests

### Quick Test (1 user, 1 minute)
```bash
k6 run -u 1 -d 1m load-test.js
```

### Standard Test (10 → 100 users, 8 minutes)
```bash
k6 run load-test.js
```

### With Custom Environment
```bash
k6 run \
  --env API_BASE=http://localhost:3000/api/trpc \
  --env TENANT_ID=your-id \
  --env GROUP_ID=your-group-id \
  --env USER_ID=your-user-id \
  load-test.js
```

### Generate HTML Report
```bash
k6 run --out=html=report.html load-test.js
# Opens in browser automatically or check ./report.html
```

## Interpreting Results

### Key Metrics
- **http_req_duration**: Response time (target p95 < 500ms, p99 < 1000ms)
- **http_req_failed**: Error rate (target < 0.1%)
- **iterations**: Total requests completed
- **data_received/sent**: Total payload size

### Example Output
```
http_req_duration....: avg=245ms    min=50ms     med=220ms   max=1.2s     p(90)=380ms  p(95)=480ms  p(99)=950ms
http_req_failed......: 0.5%
data_received........: 12 MB
```

## Common Issues

### "Connection refused"
- Make sure dev server is running: `npm run dev`
- Check API_BASE URL is correct

### "Invalid credentials"
- Verify USER_ID is correct
- Check if user has permission to access the resources

### High error rate
- Reduce number of users (start with 10)
- Check database connection pool size
- Monitor PostgreSQL logs

## Next Steps After Testing

1. **Identify slow endpoints** from k6 results
2. **Check PostgreSQL slow query log** for problematic queries
3. **Profile specific queries** with EXPLAIN ANALYZE
4. **Apply optimizations** from findings
5. **Re-test** to verify improvements

## Resources

- [k6 Documentation](https://k6.io/docs/)
- [k6 tRPC Testing](https://k6.io/docs/examples/http-authentication/)
- [PostgreSQL Query Analysis](https://www.postgresql.org/docs/current/sql-explain.html)
