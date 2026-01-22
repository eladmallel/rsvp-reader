# Security Checklist

## Before Each Deployment

- [ ] All tests pass (unit, integration, E2E)
- [ ] No secrets in code or git history
- [ ] Environment variables documented in .env.example
- [ ] No console.log with sensitive data
- [ ] Rate limits configured on new API routes
- [ ] Input validation on all user inputs
- [ ] Authentication required on protected routes
- [ ] RLS policies applied to new database tables

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
