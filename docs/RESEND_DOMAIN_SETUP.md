# Verify Your Resend Domain (send email to any user)

Right now your CuminJar account uses Resend in **sandbox mode**, meaning OTP verification
emails only deliver to the Resend account owner's verified inbox. To send to any real user,
verify your custom domain in Resend. This is a one-time setup.

## 1. Add your domain in Resend
1. Log in at https://resend.com/domains
2. Click **Add Domain**
3. Enter the domain you want to send from (e.g. `cuminjar.com`)
4. Choose a region (usually the one closest to your users)

## 2. Add the DNS records Resend shows you
Resend will show 3–5 records to add at your DNS provider:
- **MX** record (for bounce handling)
- **SPF** (`TXT` starting with `v=spf1`)
- **DKIM** (`TXT` or `CNAME` records — 3 of them)
- **DMARC** (`TXT` at `_dmarc.<domain>`) — optional but recommended

Add each record in your DNS panel (Cloudflare / Route 53 / Namecheap / GoDaddy). Save.

## 3. Verify
Back in Resend, click **Verify Domain**. Propagation usually takes 5–30 minutes.

## 4. Update the FROM address in CuminJar
Once the domain shows **Verified** in Resend, update the backend env variable:

```
# /app/backend/.env
RESEND_FROM_EMAIL=CuminJar <hello@cuminjar.com>
```

Then restart the backend (`sudo supervisorctl restart backend`). New OTP + invite emails will
now be delivered to any recipient.

## 5. Verify by sending a test
- Sign out of CuminJar, sign up again with a personal Gmail, and check the inbox for the
  6-digit OTP code — it should arrive within a few seconds.
- If it does not, check the Resend **Logs** tab for delivery status.

## Notes
- Keep `onboarding@resend.dev` (default) as fallback only while you're still testing.
- Emergent LLM key and Resend key are stored in `/app/backend/.env` — never commit these.
