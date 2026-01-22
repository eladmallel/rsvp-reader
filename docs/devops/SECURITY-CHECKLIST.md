# Security Checklist

## Before Each Deployment

- [x] All tests pass (unit, integration, E2E)
- [x] No secrets in code or git history
- [x] Environment variables documented in .env.example
- [ ] No console.log with sensitive data
- [ ] Rate limits configured on new API routes
- [x] Input validation on all user inputs
- [x] Authentication required on protected routes
- [x] RLS policies applied to new database tables
- [x] User tokens encrypted at rest (reader_access_token, llm_api_key)

## Weekly Review

- [ ] Check GitHub security alerts
- [ ] Review npm audit results
- [ ] Check error logs for anomalies
- [ ] Verify test database isolation
- [ ] Review API usage metrics

## Monthly Review

- [ ] Rotate API keys and tokens
- [ ] Review user access permissions
- [ ] Check database size and optimize
- [ ] Review and update dependencies
- [ ] Test disaster recovery procedures

## Quarterly Review

- [ ] Full security audit
- [ ] Penetration testing
- [ ] Review and update security policies
- [ ] Review third-party integrations
- [ ] Update security documentation
