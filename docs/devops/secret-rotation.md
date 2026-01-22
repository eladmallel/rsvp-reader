# Secret Rotation Procedures

## When to Rotate Secrets

- **Immediately**: If a secret is compromised or exposed
- **Quarterly**: Routine rotation for compliance
- **After**: Team member leaves with access

## How to Rotate Each Secret

### Supabase Keys

1. Go to Supabase Dashboard > Project Settings > API
2. Click "Reset" next to the key you want to rotate
3. Update environment variables:
   - Local: `.env.local`
   - CI: GitHub Secrets
   - Production: Vercel Environment Variables
4. Redeploy application
5. Verify application still works

### SYNC_API_KEY

1. Generate new key:
   ```bash
   openssl rand -hex 32
   ```
2. Update in all environments
3. Update cron script/caller with new key
4. Old key is immediately invalid (no grace period)

### Readwise Access Token

1. Go to https://readwise.io/access_token
2. Revoke old token
3. Generate new token
4. Update `.env.local`
5. Update CI secrets if used in integration tests

## Emergency Revocation

If a secret is exposed publicly (e.g., committed to git):

1. **Immediately** rotate the secret (follow above procedures)
2. Check git history: `git log -p -- .env.local`
3. If secret was committed:
   - Rotate secret immediately
   - Consider rewriting git history (destructive)
   - Notify team
   - Monitor for unauthorized access

## Verification Checklist

After rotating secrets:

- [ ] Local development works
- [ ] Tests pass
- [ ] CI/CD pipeline succeeds
- [ ] Production deployment healthy
- [ ] No authentication errors in logs
- [ ] Background jobs (sync) still running
