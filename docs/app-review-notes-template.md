# NearFIX App Review Notes

Copy this document into App Store Connect Review Notes. Replace only the bracketed reviewer credentials immediately before submission. Never commit real phone numbers or OTP codes.

## Production services

- Mobile backend: https://nearfix-production-c0db.up.railway.app
- Admin portal: https://adaptable-embrace-production.up.railway.app
- Privacy Policy: https://nearfix-production-c0db.up.railway.app/legal/privacy
- Terms / Public Offer: https://nearfix-production-c0db.up.railway.app/legal/terms

## Reviewer credentials

- Demo client phone: `[ENTER DEMO CLIENT PHONE IN APP STORE CONNECT]`
- Demo worker phone: `[ENTER DEMO WORKER PHONE IN APP STORE CONNECT]`
- Review OTP: `[ENTER REVIEW OTP IN APP STORE CONNECT]`

These values are supplied only in App Store Connect and are not stored in the repository.

## Review OTP strategy

- Production SMS remains the default login path.
- Reviewer OTP is disabled by default with `APP_REVIEW_OTP_ENABLED=false`.
- Before review, the operator enables reviewer OTP and configures exactly the two demo phone numbers in the production allowlist.
- The review OTP works only for allowlisted numbers and uses the normal challenge expiry, resend cooldown and attempt limit.
- Non-allowlisted users continue through the normal SMS provider.
- Reviewer OTP is disabled and the allowlist is removed after review access is no longer required.

## Client test flow

1. Open NearFIX and continue to the login screen.
2. Enter the demo client phone supplied in App Store Connect.
3. Tap **OTP kod olish** and enter the supplied review OTP.
4. Browse workers and open a worker profile.
5. Create an order and open its chat when a demo order is available.
6. Use **Usta haqida shikoyat** or **Muammo haqida xabar berish** to inspect reporting.
7. Open **Profil → Sozlamalar → Yordam** to create a support request.
8. Open **Profil → Sozlamalar → Hisobni o'chirish** to inspect the two-step deletion warning. Cancel unless deletion is specifically being tested.

## Worker test flow

1. Sign out and enter the demo worker phone supplied in App Store Connect.
2. Enter the supplied review OTP.
3. The approved demo worker account opens the worker dashboard.
4. Review incoming/active jobs, chat, profile management and worker support.
5. Account deletion is available under **Worker Profile → Hisobni o'chirish** with two confirmation steps.

## Safety and moderation

- Users can report workers, reviews, chat messages and order problems.
- Users can block another user and manage blocked users from Profile.
- Client and worker support requests are available in-app.
- Reports, support tickets, reviews, workers and user suspension are moderated through the production admin portal.

## Demo account preparation

After configuring the production reviewer variables, prepare least-privilege demo accounts from the backend workspace:

```bash
npm run app-review:prepare
```

The command does not print the OTP code or complete phone numbers.
