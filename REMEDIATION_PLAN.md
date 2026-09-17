# Festora Security & Quality Remediation Plan

**Start Date:** March 27, 2026
**Current Score:** 52/100
**Target Score:** 75+/100 (Phase 1: P0 & P1)

---

## Overview

This document tracks the systematic remediation of all 20 issues from the comprehensive audit. Work is organized by priority level (P0 → P1 → P2 → P3).

---

## 🚨 Phase 0: Critical Security (P0) — HIGHEST PRIORITY

These are showstoppers that make the app unsafe for production. **Must complete before any deployment.**

### P0.1: Lock Down Firestore Rules
**Status:** ✅ DONE
**Files:** `firestore.rules`
**Effort:** 30 minutes
**Blocker:** Yes (production security showstopper)

**Current Issue:**
- Wildcard rule `match /{document=**} { allow read, write: if true; }` exposes ALL data

**Solution:**
- Remove the wildcard rule entirely
- Deploy proper rules from DATABASE_SCHEMA.md (lines 357-414)
- Test rules with Firebase Emulator before deployment

**Subtasks:**
- [x] Read current firestore.rules
- [x] Extract exact rules from DATABASE_SCHEMA.md
- [x] Update firestore.rules with proper security rules
- [ ] Enable Firebase emulator and test locally
- [x] Document the change

---

### P0.2: Remove Hardcoded Cashfree Secret
**Status:** ✅ DONE
**Files:** `src/app/api/payments/webhook/route.ts`
**Effort:** 15 minutes
**Blocker:** Yes (credential exposure)

**Current Issue:**
```typescript
const CASHFREE_CLIENT_SECRET = process.env.CASHFREE_CLIENT_SECRET
  || "cfsk_ma_prod_3372958addf2821785142092eab42d5d_2144d937";
```

**Solution:**
- Remove the hardcoded fallback entirely
- Use `|| throw new Error()` instead to fail loudly on missing env var
- Add validation at startup

**Subtasks:**
- [x] Read webhook.ts
- [x] Remove hardcoded secret key
- [x] Add proper error handling for missing env var
- [x] Search for other instances of this pattern in codebase

---

### P0.3: Remove Hardcoded SMTP Credentials
**Status:** ✅ DONE
**Files:** `src/lib/email.ts`, `src/app/api/cron/inferex-reminder/route.ts`
**Effort:** 15 minutes
**Blocker:** Yes (credential exposure)

**Current Issue:**
```typescript
user: '978b27001@smtp-brevo.com',
```

**Solution:**
- Move to environment variable (e.g., `BREVO_SMTP_USER`)
- Remove hardcoded username
- Add validation for required env vars

**Subtasks:**
- [x] Read email.ts
- [x] Replace hardcoded credentials with env var
- [x] Add validation at startup
- [x] Search for other hardcoded SMTP credentials

---

### P0.4: Rotate Exposed Secrets
**Status:** ⏳ PENDING
**Files:** N/A (external action)
**Effort:** 1 hour (manual external process)
**Blocker:** Yes (if repo is public)

**Action Items:**
- [ ] **Cashfree:** Rotate the exposed production secret key in dashboard
- [ ] **Brevo SMTP:** Change password for `978b27001@smtp-brevo.com`
- [ ] **GitHub:** If repo is public, invalidate any exposed credentials
- [ ] **Documentation:** Add to deployment checklist that secrets must never be committed

---

## 🔴 Phase 1: High-Priority Security (P1) — THIS WEEK

These enable exploitation even if P0 is fixed. Complete within one week of P0.

### P1.1: Implement Server-Side Route Protection
**Status:** ✅ DONE
**Files:** `middleware.ts`, API routes
**Effort:** 2-3 hours
**Depends On:** P0.1 (Firestore rules)

**Current Issue:**
- Middleware does nothing — routes rely 100% on client-side checks
- Admin routes check `userData.role` but Firestore allows anyone to modify their role

**Solution:**
- Add proper server-side auth checks in middleware
- Verify user authentication and role server-side
- Use Firestore rules to enforce role-based access

**Subtasks:**
- [x] Read middleware.ts
- [x] Add auth context verification
- [x] Implement admin role check with Firestore rules
- [x] Protect all admin API routes and pages
- [ ] Test with emulator

---

### P1.2: Remove Debug/Test Pages
**Status:** ✅ DONE
**Files:** Legacy pages directory removed entirely.
**Effort:** 30 minutes
**Dependencies:** None

**Current Issue:**
- Debug pages exposed in production
- Can reveal system information to attackers

**Subtasks:**
- [ ] List all debug/test files
- [ ] Remove: `src/pages/cleanup.tsx`
- [ ] Remove: `src/pages/diagnostic.tsx`
- [ ] Remove: `src/app/test-email/`
- [ ] Remove test scripts from root (optional: move to `/scripts/` folder)

---

### P1.3: Remove Sensitive Console Logging
**Status:** ⏳ PENDING
**Files:** All API routes in `src/pages/api/`, `src/app/api/`
**Effort:** 1-2 hours
**Dependencies:** None

**Current Issue:**
- Production logs contain user IDs, payment details, API key presence checks, etc.

**Solution:**
- Audit all console.log statements
- Remove logs that contain PII or sensitive data
- Keep only error messages and non-sensitive debugging info

**Subtasks:**
- [ ] Search for all console.log in API routes
- [ ] Identify which ones log sensitive data
- [ ] Remove or sanitize them
- [ ] Consider using a proper logging library (optional)

---

### P1.4: Add Rate Limiting
**Status:** ⏳ PENDING
**Files:** `src/pages/api/auth/*`, `src/pages/api/payments/*`, `src/pages/api/email/*`
**Effort:** 2 hours
**Dependencies:** None

**Current Issue:**
- No rate limiting on auth, payment, or email endpoints
- Vulnerable to brute force and DoS

**Solution:**
- Install rate limiting middleware (e.g., `Ratelimit` from Upstash or simple in-memory solution)
- Apply to sensitive endpoints

**Subtasks:**
- [ ] Choose rate limiting library
- [ ] Implement rate limiting middleware
- [ ] Apply to login/signup endpoints (5-10 req/min per IP)
- [ ] Apply to payment creation (1 req/min per user)
- [ ] Apply to email sending (1 req/min per email)
- [ ] Test rate limiting

---

### P1.5: Re-enable Firebase Emulators
**Status:** ⏳ PENDING
**Files:** `src/lib/firebase.ts`
**Effort:** 30 minutes
**Dependencies:** None

**Current Issue:**
- Firebase emulator connections are commented out
- Dev environment hits production Firestore directly

**Solution:**
- Uncomment emulator code
- Add env var to toggle emulators (`USE_FIREBASE_EMULATOR`)
- Document setup in DEPLOYMENT.md

**Subtasks:**
- [ ] Read firebase.ts
- [ ] Uncomment emulator code
- [ ] Add environment variable check
- [ ] Update DEPLOYMENT.md or dev guide

---

## 🟡 Phase 2: Architecture & Code Quality (P2) — THIS MONTH

Lower security priority but important for maintainability and performance.

### P2.1: Consolidate API Routes
**Status:** ✅ DONE
**Files:** `src/pages/api/*`, `src/app/api/*`
**Effort:** 6-8 hours
**Dependencies:** P1.1 (auth middleware)

**Current Issue:**
- 31 legacy routes in Pages Router + 9 in App Router = confusion and maintenance nightmare

**Solution:**
- Migrate all Pages Router routes to App Router
- Use modern API structure (`route.ts` files)
- Consolidate similar endpoints

**Subtasks:**
- [ ] List all 31 Pages Router endpoints
- [ ] List all 9 App Router endpoints
- [ ] Identify overlaps/conflicts
- [ ] Create migration plan with batches
- [ ] Execute migrations in batches
- [ ] Test all endpoints after migration
- [ ] Delete old Pages Router files

---

### P2.2: Add Proper TypeScript Types
**Status:** ⏳ PENDING
**Files:** `src/lib/payment.ts`, API routes, various components
**Effort:** 4-5 hours
**Dependencies:** None

**Current Issue:**
- Heavy use of `any` types
- Missing Firestore document shape interfaces

**Solution:**
- Create `types/firestore.ts` with all document interfaces
- Replace all Firestore `any` types with proper interfaces
- Use TypeScript strict mode

**Subtasks:**
- [ ] Audit codebase for `any` types (grep for `: any`)
- [ ] Create Firestore type interfaces (User, Event, Order, Ticket, etc.)
- [ ] Replace `any` with proper types in payment.ts
- [ ] Replace `any` in API routes
- [ ] Enable strict TypeScript checks in tsconfig.json

---

### P2.3: Clean Up Dead Code
**Status:** ⏳ PENDING
**Files:** Various
**Effort:** 1-2 hours
**Dependencies:** None

**Current Issue:**
- `sendIndividualTicketsToTeamMembers()` in webhook.ts (unused)
- Empty files in root: `fix-aignite-count.js`, `manual-fix-instructions.js`
- Test/manual scripts

**Subtasks:**
- [ ] Remove unused functions in webhook.ts
- [ ] Delete empty 2-byte files
- [ ] Move test scripts to `/scripts/` or delete if not needed
- [ ] Remove or archive diagnostic files

---

### P2.4: Set Up Testing Framework
**Status:** ✅ DONE (initial setup)
**Files:** `package.json`, new test files
**Effort:** 4-6 hours
**Dependencies:** P2.2 (types) recommended

**Current Issue:**
- Zero tests (0/100 score)
- No test framework installed

**Solution:**
- Install Jest or Vitest
- Write tests for:
  - Payment webhook processing (critical path)
  - Auth flows
  - Permission checks
- Add pre-commit test hook

**Subtasks:**
- [ ] Choose test framework (Jest recommended)
- [ ] Install and configure
- [ ] Write payment webhook tests
- [ ] Write auth tests
- [ ] Write permission/admin tests
- [ ] Add to CI/CD or pre-commit

---

## 🟢 Phase 3: Performance & SEO (P2/P3) — LATER

### P3.1: Improve SEO & Performance
**Status:** ⏳ PENDING
**Files:** `src/app/page.tsx`, `src/app/layout.tsx`, `next.config.ts`
**Effort:** 3-4 hours

**Action Items:**
- [ ] Convert homepage to Server Component (remove 'use client')
- [ ] Add proper meta tags (OG, Twitter Cards)
- [ ] Add robots.txt and sitemap.xml
- [ ] Switch Google Fonts to `next/font`
- [ ] Fix images.domains (use remotePatterns instead)
- [ ] Add Suspense boundaries for better UX

---

### P3.2: Add Error Monitoring
**Status:** ✅ DONE (Sentry integrated)
**Files:** New integration
**Effort:** 2-3 hours

**Action Items:**
- [ ] Set up Sentry or similar
- [ ] Capture API errors
- [ ] Track frontend errors
- [ ] Add alerting for critical issues

---

## 📋 Execution Checklist

### Phase 0 (P0) — By EOD Today
- [x] P0.1: Firestore rules
- [x] P0.2: Cashfree secret
- [x] P0.3: SMTP credentials
- [ ] P0.4: Rotate secrets (external)

### Phase 1 (P1) — This Week
- [x] P1.1: Middleware auth
- [x] P1.2: Remove debug pages
- [ ] P1.3: Remove console logs
- [ ] P1.4: Rate limiting
- [ ] P1.5: Firebase emulators

### Phase 2 (P2) — Next 2 Weeks
- [x] P2.1: API consolidation
- [ ] P2.2: TypeScript types
- [ ] P2.3: Dead code cleanup
- [x] P2.4: Testing setup

### Phase 3 (P3) — Following Weeks
- [ ] P3.1: SEO/Performance
- [x] P3.2: Error monitoring (Sentry)

---

## Success Criteria

- ✅ No hardcoded secrets in codebase
- ✅ Firestore rules enforce authentication and authorization
- ✅ All admin routes protected server-side
- ✅ No debug pages in production
- ✅ Sensitive console logs removed
- ✅ Rate limiting on auth/payment endpoints
- ✅ All API routes in App Router
- ✅ No `any` types in TypeScript
- ✅ Core flows tested (payment, auth, permissions)
- ✅ Security score: 75+/100
- ✅ Overall score: 65+/100

---

## Notes

- Always test changes with Firebase Emulator before deploying
- After P0.1 (Firestore rules), all other security measures become enforceable
- API consolidation (P2.1) should happen early to avoid future conflicts
- Testing (P2.4) should cover payment flows as they handle real money
