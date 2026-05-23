@echo off
REM Simple test script to verify /api-test endpoint works

set API_BASE=http://localhost:3000/api-test
set TENANT_ID=cmou5jp0v0001zcaw4bfkigy7

echo 🧪 Testing /api-test endpoint
echo ==============================
echo API_BASE: %API_BASE%
echo TENANT_ID: %TENANT_ID%
echo.

REM Test 1: students.list query
echo 📝 Test 1: students.list query (GET)
echo ---
set INPUT={"search":"","status":"ACTIVE","page":1,"pageSize":10}
REM URL encode the input (basic encoding for common chars)
setlocal enabledelayedexpansion
set "INPUT=!INPUT:"=\"!"
curl -X GET "%API_BASE%/students.list?input=%s:=!INPUT!%" ^
  -H "Content-Type: application/json" ^
  -H "x-tenant-id: %TENANT_ID%"

echo.
echo.

REM Test 2: attendance.getGroups query
echo 📝 Test 2: attendance.getGroups query (GET)
echo ---
for /f "tokens=1-3 delims=/ " %%a in ('date /t') do (set TODAY=%%c-%%a-%%b)
set INPUT={"dateString":"%TODAY%"}
REM URL encode the input
setlocal enabledelayedexpansion
set "INPUT=!INPUT:"=\"!"
curl -X GET "%API_BASE%/attendance.getGroups?input=%s:=!INPUT!%" ^
  -H "Content-Type: application/json" ^
  -H "x-tenant-id: %TENANT_ID%"

echo.
echo.

echo ✅ Tests completed
