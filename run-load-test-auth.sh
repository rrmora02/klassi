#!/bin/bash

# Authenticated Load Test Runner for Klassi (Supabase 15-connection limit)
# Usage: ./run-load-test-auth.sh

set -e

echo "🔥 Klassi Authenticated Load Testing Suite"
echo "=========================================="
echo "⚠️  Max connections: 14 (Supabase free tier = 15 pool size)"
echo ""

# Check if k6 is installed
if ! command -v k6 &> /dev/null; then
    echo "❌ k6 is not installed. Please install it first:"
    echo "   brew install k6  (macOS)"
    echo "   choco install k6 (Windows)"
    echo "   apt-get install k6 (Linux)"
    exit 1
fi

# Get environment variables
if [ -z "$API_BASE" ]; then
    API_BASE="${API_BASE:-http://localhost:3000/api/trpc}"
fi

if [ -z "$TENANT_ID" ]; then
    read -p "Enter TENANT_ID (from database): " TENANT_ID
fi

if [ -z "$GROUP_ID" ]; then
    read -p "Enter GROUP_ID (from database, optional): " GROUP_ID
fi

if [ -z "$TEST_EMAIL" ]; then
    read -p "Enter TEST_EMAIL (for authentication): " TEST_EMAIL
fi

if [ -z "$TEST_PASSWORD" ]; then
    read -sp "Enter TEST_PASSWORD: " TEST_PASSWORD
    echo ""
fi

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
REPORT_DIR="stress-test-reports"

# Create report directory
mkdir -p "$REPORT_DIR"

echo ""
echo "✅ Configuration:"
echo "   API_BASE: $API_BASE"
echo "   TENANT_ID: $TENANT_ID"
echo "   GROUP_ID: $GROUP_ID"
echo "   TEST_EMAIL: $TEST_EMAIL"
echo "   Max VUs: 14 (limited by Supabase connection pool)"
echo ""

# Check if dev server is running
echo "🔍 Checking if dev server is running..."
if ! curl -s "$API_BASE/students.list" > /dev/null 2>&1; then
    echo "⚠️  Dev server might not be accessible at $API_BASE"
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi
echo "✅ Dev server is accessible"
echo ""

# Run authenticated load test
echo "🚀 Starting authenticated stress test..."
echo "   Stages: 30s@2u → 1m@5u → 1m@10u → 1m@14u → 2m@14u → 1m@0u"
echo "   Duration: ~8 minutes"
echo ""

k6 run \
  --env API_BASE="$API_BASE" \
  --env TENANT_ID="$TENANT_ID" \
  --env GROUP_ID="$GROUP_ID" \
  --env TEST_EMAIL="$TEST_EMAIL" \
  --env TEST_PASSWORD="$TEST_PASSWORD" \
  --out "json=$REPORT_DIR/results_${TIMESTAMP}.json" \
  load-test-auth.js

echo ""
echo "✅ Authenticated stress test completed!"
echo ""
echo "📊 Results:"
echo "   JSON: $REPORT_DIR/results_${TIMESTAMP}.json"
echo ""
echo "Next steps:"
echo "1. Check metrics above for p95 and p99 latency"
echo "2. Check error rate (should be < 5%)"
echo "3. Monitor PostgreSQL connection pool during test"
echo "4. Run again to verify results are consistent"
echo ""
