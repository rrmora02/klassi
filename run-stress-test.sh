#!/bin/bash

# Stress Test Runner for Klassi
# Usage: ./run-stress-test.sh

set -e

echo "🔥 Klassi Stress Testing Suite"
echo "==============================="
echo ""

# Check if k6 is installed
if ! command -v k6 &> /dev/null; then
    echo "❌ k6 is not installed. Please install it first:"
    echo "   brew install k6  (macOS)"
    echo "   choco install k6 (Windows)"
    echo "   apt-get install k6 (Linux)"
    exit 1
fi

# Get IDs from user if not set
if [ -z "$TENANT_ID" ]; then
    echo "📝 Required: TENANT_ID"
    echo "   (Get from DevTools when logged into Klassi)"
    read -p "Enter TENANT_ID: " TENANT_ID
fi

if [ -z "$GROUP_ID" ]; then
    read -p "Enter GROUP_ID: " GROUP_ID
fi

if [ -z "$USER_ID" ]; then
    read -p "Enter USER_ID: " USER_ID
fi

API_BASE="${API_BASE:-http://localhost:3000/api/trpc}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
REPORT_DIR="stress-test-reports"

# Create report directory
mkdir -p "$REPORT_DIR"

echo ""
echo "✅ Configuration:"
echo "   API_BASE: $API_BASE"
echo "   TENANT_ID: $TENANT_ID"
echo "   GROUP_ID: $GROUP_ID"
echo "   USER_ID: $USER_ID"
echo ""

# Check if dev server is running
echo "🔍 Checking if dev server is running..."
if ! curl -s "$API_BASE/students.list" > /dev/null 2>&1; then
    echo "❌ Dev server not accessible at $API_BASE"
    echo "   Make sure 'npm run dev' is running"
    exit 1
fi
echo "✅ Dev server is running"
echo ""

# Run tests
echo "🚀 Starting stress test..."
echo "   Stages: 1m@10u → 2m@50u → 2m@100u → 2m@100u → 1m@0u"
echo "   Duration: ~8 minutes"
echo ""

k6 run \
  --env API_BASE="$API_BASE" \
  --env TENANT_ID="$TENANT_ID" \
  --env GROUP_ID="$GROUP_ID" \
  --env USER_ID="$USER_ID" \
  --out "json=$REPORT_DIR/results_${TIMESTAMP}.json" \
  load-test.js

# Generate HTML report
echo ""
echo "📊 Generating HTML report..."
k6 run \
  --env API_BASE="$API_BASE" \
  --env TENANT_ID="$TENANT_ID" \
  --env GROUP_ID="$GROUP_ID" \
  --env USER_ID="$USER_ID" \
  --out "html=$REPORT_DIR/report_${TIMESTAMP}.html" \
  load-test.js

echo ""
echo "✅ Stress test completed!"
echo ""
echo "📈 Reports generated:"
echo "   JSON: $REPORT_DIR/results_${TIMESTAMP}.json"
echo "   HTML: $REPORT_DIR/report_${TIMESTAMP}.html"
echo ""
echo "Next steps:"
echo "1. Review HTML report in browser"
echo "2. Check PostgreSQL slow query logs"
echo "3. Identify bottlenecks"
echo "4. Apply optimizations"
echo ""
