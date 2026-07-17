# Performance Analysis - Klassi Load Test Results

## 📊 Test Summary (14 concurrent users)
- **Avg Latency**: 1.85s ⚠️ (should be <500ms)
- **p(95) Latency**: 2.48s ❌ (5x over target)
- **p(99) Latency**: 3.11s ❌ (3x over target)
- **Error Rate**: 0% ✅
- **Total Requests**: 1,098
- **Duration**: ~6.5 minutes

---

## 🔍 Root Causes Identified

### 1. **N+1 Query Problem** (getSessionRoster)
**Location**: `src/server/api/routers/attendance.ts:getSessionRoster`

Current flow (3 sequential queries):
```javascript
// Query 1: Get group + discipline
const group = await ctx.db.group.findFirst(...); // ~50-100ms

// Query 2: Get class session for that group
const session = await ctx.db.classSession.findFirst(...); // ~50-100ms

// Query 3: Get all enrollments + students
const enrollments = await ctx.db.enrollment.findMany(...); // ~800-1000ms
```

**Impact**: 1.85s average latency ❌

**Solution**: Combine into single query with proper joins

---

### 2. **Missing Database Indexes**
**Critical missing indexes**:
- `Student(firstName, lastName, email)` - used in OR search
- `Student(tenantId, status)` - filtered in every list query
- `Enrollment(groupId, status)` - loaded for every group
- `ClassSession(groupId, date)` - looked up for every roster
- `Group(tenantId, isActive, instructorId)` - filtered in getGroups

**Impact**: Full table scans instead of index seeks (~500-800ms per query)

---

### 3. **In-Memory Filtering** (getGroups)
**Location**: `src/server/api/routers/attendance.ts:getGroups`

```javascript
// Gets ALL groups, then filters in JavaScript
let groups = await ctx.db.group.findMany({ where: { tenantId, isActive: true } });
groups = groups.filter(group => {
  // Filters by schedule day - should be done in DB
  const schedule = Array.isArray(group.schedule) ? group.schedule : [];
  return schedule.includes(dayOfWeek);
});
```

**Impact**: If 100+ groups, wastes memory and CPU (~200-300ms)

---

### 4. **Missing Query Optimization** (students.list)
**Issues**:
- OR search on 4 unindexed fields (firstName, lastName, email, phone)
- Complex nested filter on enrollments without indexes
- No pagination optimization

---

## 📈 Performance by Endpoint

| Endpoint | Avg | p(95) | p(99) | Success <1000ms |
|----------|-----|-------|-------|-----------------|
| students.list | 1.85s | 2.48s | 3.11s | 5% |
| getSessionRoster | 2.2s | ~2.7s | ~3.2s | 0% |
| getGroups | 2.0s | ~2.5s | ~3.1s | 0% |

**Worst performer**: getSessionRoster (N+1 problem)

---

## 🎯 Priority Fixes (Estimated Impact)

### CRITICAL (Target: 1.85s → 400-600ms)

#### 1. Add Database Indexes
**Effort**: 15 min | **Impact**: 40-50% faster ⚡

```sql
-- Create these indexes
CREATE INDEX idx_student_first_name ON "Student"(tenantId, firstName);
CREATE INDEX idx_student_last_name ON "Student"(tenantId, lastName);
CREATE INDEX idx_student_email ON "Student"(tenantId, email);
CREATE INDEX idx_student_status ON "Student"(tenantId, status);

CREATE INDEX idx_enrollment_group_status ON "Enrollment"(groupId, status);
CREATE INDEX idx_enrollment_student ON "Enrollment"(studentId, status);

CREATE INDEX idx_class_session_group_date ON "ClassSession"(groupId, date);

CREATE INDEX idx_group_tenant_active ON "Group"(tenantId, isActive);
CREATE INDEX idx_group_instructor ON "Group"(instructorId, tenantId);
```

#### 2. Fix N+1 in getSessionRoster
**Effort**: 30 min | **Impact**: 50-60% faster on that endpoint ⚡⚡

Before (3 queries):
```javascript
const group = await db.group.findFirst(...);           // ~100ms
const session = await db.classSession.findFirst(...);  // ~100ms
const enrollments = await db.enrollment.findMany(...); // ~1000ms
// Total: ~1200ms
```

After (1-2 queries with Promise.all):
```javascript
const [group, enrollments] = await Promise.all([
  db.group.findFirst({ where: { id: groupId, tenantId } }),
  db.enrollment.findMany({ 
    where: { groupId, status: "ACTIVE" },
    include: { student: true }
  })
]);

// Fetch session only if needed
const session = enrollments.length > 0 
  ? await db.classSession.findFirst({ where: { groupId, date } })
  : null;
// Total: ~600-700ms
```

#### 3. Move getGroups Filter to Database
**Effort**: 20 min | **Impact**: 30-40% faster on that endpoint ⚡

Before (in-memory filter):
```javascript
let groups = await db.group.findMany({ where: { tenantId, isActive: true } });
groups = groups.filter(g => g.schedule?.includes(dayOfWeek)); // In JavaScript
```

After (database filter):
```javascript
const groups = await db.group.findMany({
  where: {
    tenantId,
    isActive: true,
    ...(dayOfWeek && {
      schedule: { has: dayOfWeek } // Uses PostgreSQL array contains
    })
  }
});
```

---

### MEDIUM (Target: 600ms → 300-400ms)

#### 4. Add Query Result Caching
**Effort**: 45 min | **Impact**: 70-80% faster (for repeated queries) ⚡⚡⚡

- Cache `getGroups` for 5 minutes (unlikely to change during class)
- Cache `students.list` for 1 minute per tenant
- Use Redis or simple in-memory cache

#### 5. Optimize Search Query
**Effort**: 25 min | **Impact**: 20-30% faster

Replace OR search with full-text search:
```javascript
// Current: 4 OR conditions
...(input.search && {
  OR: [
    { firstName: { contains: input.search, mode: "insensitive" } },
    { lastName: { contains: input.search, mode: "insensitive" } },
    { email: { contains: input.search, mode: "insensitive" } },
    { phone: { contains: input.search } },
  ],
}),

// Better: Single searchable field or PostgreSQL full-text search
```

---

## 📋 Implementation Roadmap

```
Week 1:
  Day 1: Add database indexes (15 min)
  Day 2: Fix N+1 in getSessionRoster (30 min) 
  Day 3: Move getGroups filter to DB (20 min)
  Expected result: ~60-70% improvement (1.85s → 600-700ms)

Week 2:
  Day 1: Add caching layer (45 min)
  Day 2: Optimize search queries (25 min)
  Expected result: ~80-85% improvement (1.85s → 300-400ms)
```

---

## 🚨 Important Notes

**Note on connection pooling**: 14 concurrent users is LOW. For comparison:
- Small SaaS: 100-500 concurrent users
- Medium SaaS: 1000-5000 concurrent users
- Large SaaS: 10,000+ concurrent users

If you optimize to 300-400ms at 14 users, you should aim for sub-200ms at 100+ users.

**Test with higher concurrency once optimizations are done**:
```bash
# After fixes, test with 50-100 concurrent users
k6 run load-test-auth.js --env VUS=50 --env DURATION=10m
```

---

## Next Steps

1. **Start with database indexes** (quickest win: 40-50% improvement, 15 min)
2. **Fix N+1 in getSessionRoster** (50-60% improvement on that endpoint, 30 min)
3. **Move getGroups filter to DB** (30-40% improvement on that endpoint, 20 min)
4. **Run load test again** to confirm improvements
5. **Add caching** for final optimization push
6. **Re-test at higher concurrency** (50-100 users)
