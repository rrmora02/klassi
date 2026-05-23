#!/bin/bash

# Simple test script to verify /api-test endpoint works

API_BASE="${API_BASE:-http://localhost:3000/api-test-simple}"
TENANT_ID="${TENANT_ID:-cmou5jp0v0001zcaw4bfkigy7}"

echo "🧪 Testing /api-test endpoint"
echo "=============================="
echo "API_BASE: $API_BASE"
echo "TENANT_ID: $TENANT_ID"
echo ""

# Test 1: students.list query (POST)
echo "📝 Test 1: students.list"
echo "---"
curl -X POST "$API_BASE/students.list" \
  -H "Content-Type: application/json" \
  -H "x-tenant-id: $TENANT_ID" \
  -d '{"search":"","status":"ACTIVE","page":1,"pageSize":10}' 2>&1

echo ""
echo ""

# Test 2: attendance.getGroups query (POST)
echo "📝 Test 2: attendance.getGroups"
echo "---"
TODAY=$(date +%Y-%m-%d)
curl -X POST "$API_BASE/attendance.getGroups" \
  -H "Content-Type: application/json" \
  -H "x-tenant-id: $TENANT_ID" \
  -d "{\"dateString\":\"$TODAY\"}" 2>&1

echo ""
echo ""

echo "✅ Tests completed"
