# Security

## Current Status

| Issue                                  | Status      | Severity        |
| -------------------------------------- | ----------- | --------------- |
| Environment separation (dev/test/prod) | **FIXED**   | Critical        |
| Security headers                       | **FIXED**   | Medium          |
| RLS policies on all tables             | **DONE**    | High            |
| Plaintext secrets in database          | **PENDING** | High (8.0/10)   |
| API rate limiting                      | **PENDING** | Medium (6.0/10) |

## Outstanding Security Work

### 1. Database Secret Encryption (Priority 1)

User API tokens stored unencrypted:

- `users.reader_access_token` (Readwise API token)
- `users.llm_api_key` (LLM API keys)

**Risk**: Anyone with database access can read all user API tokens.

**Solution**: Application-level AES-256-GCM encryption with key in env vars.

### 2. API Rate Limiting (Priority 2)

No rate limiting on:

- `/api/sync/readwise`
- `/api/reader/documents`
- Other API routes

**Risk**: API abuse, cost escalation, service degradation.

**Solution**: Upstash Redis rate limiting (20 req/min per user).

---

## Deployment Checklist

### Before Each Deployment

- [ ] All tests pass (unit, integration, E2E)
- [ ] No secrets in code or git history
- [ ] Environment variables documented in .env.example
- [ ] No console.log with sensitive data
- [ ] Rate limits configured on new API routes
- [ ] Input validation on all user inputs
- [ ] Authentication required on protected routes
- [ ] RLS policies applied to new database tables
- [x] User tokens encrypted at rest

### Weekly Review

- [ ] Check GitHub security alerts
- [ ] Review npm audit results
- [ ] Check error logs for anomalies
- [ ] Verify test database isolation
- [ ] Review API usage metrics

### Monthly Review

- [ ] Rotate API keys and tokens
- [ ] Review user access permissions
- [ ] Check database size and optimize
- [ ] Review and update dependencies
- [ ] Test disaster recovery procedures

---

## Implemented Security Measures

### Security Headers (next.config.ts)

- `X-Frame-Options: DENY` - Prevents clickjacking
- `X-Content-Type-Options: nosniff` - Prevents MIME sniffing
- `Referrer-Policy: origin-when-cross-origin`
- `X-XSS-Protection: 1; mode=block`
- `Permissions-Policy` - Restricts camera, microphone, geolocation

### Database Security

- Row Level Security (RLS) enabled on all tables
- RLS policies scoped to `auth.uid()`
- Service role key never exposed to client
- Separate client/server/admin Supabase clients

### Environment Separation

- Local Supabase for dev/test (zero production contamination)
- `.env.development.local` for dev
- `.env.test` for tests
- Production credentials only in Vercel

---

## Related

- [Secret Rotation Procedures](./secret-rotation.md)
- [CI Performance Baseline](./ci-baseline.md)
