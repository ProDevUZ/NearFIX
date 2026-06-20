# NearFIX App Review Notes Template

Configure reviewer access through production environment variables. Do not commit the real phone numbers or OTP code.

## Reviewer credentials

- Demo client phone: `[APP_REVIEW_PHONE_NUMBERS first entry]`
- Demo worker phone: `[APP_REVIEW_PHONE_NUMBERS second entry]`
- OTP code: `[APP_REVIEW_OTP_CODE]`

## Test flow

1. Open NearFIX and continue to the login screen.
2. Enter either allowlisted demo phone number.
3. Tap **OTP kod olish**.
4. Enter the review OTP supplied in App Review Connect notes.
5. The client account opens the marketplace flow.
6. The worker account opens the worker dashboard and approved demo profile.

## Security controls

- `APP_REVIEW_OTP_ENABLED` is disabled by default.
- Only exact phone numbers in `APP_REVIEW_PHONE_NUMBERS` receive the review challenge.
- The review code uses the normal one-time challenge expiry, cooldown and attempt limit.
- Normal users continue through the configured SMS provider.
- Disable reviewer OTP and remove the allowlist when reviewer access is no longer required.

Prepare the least-privilege demo accounts after configuring the environment:

```bash
npm run app-review:prepare
```

The command does not print the OTP code or complete phone numbers.
