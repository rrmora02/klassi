#!/bin/bash

# Simple test script to verify /api-test endpoint works

API_BASE="${API_BASE:-http://localhost:3000/api-test}"
TENANT_ID="${TENANT_ID:-cmou5jp0v0001zcaw4bfkigy7}"

echo "🧪 Testing /api-test endpoint"
echo "=============================="
echo "API_BASE: $API_BASE"
echo "TENANT_ID: $TENANT_ID"
echo ""

# Test 1: students.list query
echo "📝 Test 1: students.list query (GET)"
echo "---"
INPUT='{"search":"","status":"ACTIVE","page":1,"pageSize":10}'
ENCODED_INPUT=$(python3 -c "import urllib.parse; print(urllib.parse.quote('$INPUT'))")
curl -X GET "$API_BASE/students.list?input=$ENCODED_INPUT" \
  -H "Content-Type: application/json" \
  -H "x-tenant-id: $TENANT_ID" 2>&1

echo ""
echo ""

# Test 2: attendance.getGroups query
echo "📝 Test 2: attendance.getGroups query (GET)"
echo "---"
TODAY=$(date +%Y-%m-%d)
INPUT="{\"dateString\":\"$TODAY\"}"
ENCODED_INPUT=$(python3 -c "import urllib.parse; print(urllib.parse.quote('$INPUT'))")
curl -X GET "$API_BASE/attendance.getGroups?input=$ENCODED_INPUT" \
  -H "Content-Type: application/json" \
  -H "x-tenant-id: $TENANT_ID" 2>&1

echo ""
echo ""

echo "✅ Tests completed"
