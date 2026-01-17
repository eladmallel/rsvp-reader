---
description: Deploy the application to Vercel
---

1. Ensure all changes are committed.
2. Run the deployment command:
   ```bash
   npx vercel --prod
   ```
3. If this is a first-time deployment or environment variables have changed, ensure they are set in Vercel:
   ```bash
   npx vercel env add <KEY> production
   ```
4. Verify the deployment URL returned by the CLI.
