@echo off
REM Simple test script to verify /api-test endpoint works

set API_BASE=http://localhost:3000/api-test-simple
set TENANT_ID=cmou5jp0v0001zcaw4bfkigy7

echo 🧪 Testing /api-test endpoint
echo ==============================
echo API_BASE: %API_BASE%
echo TENANT_ID: %TENANT_ID%
echo.

REM Test 1: students.list
echo 📝 Test 1: students.list
echo ---
curl -X POST "%API_BASE%/students.list" ^
  -H "Content-Type: application/json" ^
  -H "x-tenant-id: %TENANT_ID%" ^
  -d "{\"search\":\"\",\"status\":\"ACTIVE\",\"page\":1,\"pageSize\":10}"

echo.
echo.

REM Test 2: attendance.getGroups
echo 📝 Test 2: attendance.getGroups
echo ---
for /f "tokens=1-3 delims=/ " %%a in ('date /t') do (set TODAY=%%c-%%a-%%b)
curl -X POST "%API_BASE%/attendance.getGroups" ^
  -H "Content-Type: application/json" ^
  -H "x-tenant-id: %TENANT_ID%" ^
  -d "{\"dateString\":\"%TODAY%\"}"

echo.
echo.

echo ✅ Tests completed
