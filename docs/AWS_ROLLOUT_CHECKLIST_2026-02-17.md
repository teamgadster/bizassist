<!-- BizAssist_api -->
# AWS Backend + SES Rollout Checklist (BizAssist)

_Last updated: 2026-02-17_

## 1. IAM Policy Skeleton (minimum viable for API service)

- **SES:**
  - `ses:SendEmail`, `ses:SendRawEmail` (scoped to region and identity)
  - `ses:GetSendQuota`, `ses:GetSendStatistics`
  - `ses:ListIdentities`, `ses:GetIdentityVerificationAttributes`
- **RDS:**
  - Use RDS IAM authentication if possible, otherwise DB user/pass via Secrets Manager
- **App Runner/ECS:**
  - `logs:CreateLogStream`, `logs:PutLogEvents` (for CloudWatch logs)
  - `secretsmanager:GetSecretValue` (if using Secrets Manager)
- **General:**
  - Never grant wildcard `*` permissions; scope to service, region, and resource where possible

## 2. Environment Variable Matrix

| Variable              | Required | Example / Notes                                              |
| --------------------- | -------- | ------------------------------------------------------------ |
| AWS_REGION            | Yes      | ap-southeast-1 (default used by API if not provided)         |
| AWS_ACCESS_KEY_ID     | Optional | Use IAM role in Render when possible; else inject secret key |
| AWS_SECRET_ACCESS_KEY | Optional | Use IAM role in Render when possible; else inject secret key |
| SES_FROM_EMAIL        | Yes      | no-reply@yourdomain.com (must be verified in SES identity)   |
| SES_CONFIGURATION_SET | Optional | SES configuration set for events/analytics                   |
| EMAIL_REPLY_TO        | Optional | support@yourdomain.com                                       |
| DATABASE_URL          | Yes      | RDS PostgreSQL connection string                             |
| DB_SECRET_ARN         | Optional | If using Secrets Manager for DB creds                        |
| NODE_ENV              | Yes      | production                                                   |
| PORT                  | Yes      | 8080 (App Runner/ECS will inject)                            |

## 3. SES Go-Live Gate List

- [ ] SES region selected and consistent with API/DB
- [ ] Domain identity or sender address verified in SES
- [ ] SES Easy DKIM CNAME records published and validated
- [ ] SES domain verification TXT published and validated (if using domain identity)
- [ ] SPF includes SES sender path
- [ ] DMARC policy set (recommended for production)
- [ ] Production access requested and approved (SES console)
- [ ] Sending/receiving quotas checked and monitored
- [ ] Bounce/complaint notifications configured (SNS or CloudWatch)
- [ ] Test send flows validated (sandbox first; production after access is approved)
- [ ] Remove all test/placeholder identities before go-live

## 4. BizAssist-Specific Notes

- All transactional email must flow through backend API (never from mobile)
- API must not expose SES credentials or allow arbitrary sender addresses
- `X-Active-Business-Id` and auth middleware must remain enforced
- Migration to AWS must not break existing API contract or business scoping
- Use pre-deploy/release step for DB migrations (never at runtime)

---

_See also: [memory.md](memory.md) for locked AWS setup rules and doc roots._
