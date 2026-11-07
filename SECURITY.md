# Security Policy

The `inversify-typeorm` maintainers take the security of our library and its downstream applications seriously. This document outlines our vulnerability disclosure process and supported release lines.

---

## 🛡️ Supported Versions

We provide security updates and bug fixes for the following versions:

| Version | Supported | Notes |
| :--- | :---: | :--- |
| `1.x.x` | ✅ Yes | Current active release line (TypeORM 1.x, Inversify 8.x, Node 20+) |
| `0.x.x` | ❌ No | Deprecated / End-of-Life. Please upgrade to `1.x.x`. |

---

## 🔒 Reporting a Vulnerability

If you discover a potential security vulnerability in `inversify-typeorm`, **please DO NOT create a public GitHub issue.** Publicly disclosing vulnerabilities exposes applications using this library to risk before a patch is available.

### Responsible Disclosure Process

1. **Submit via GitHub Private Vulnerability Reporting** (Preferred):
   - Navigate to the repository's **Security** tab.
   - Click **Report a vulnerability** to submit an advisory draft directly to maintainers.

2. **Email the Maintainer directly**:
   - Contact: **`yinjingping2022@gmail.com`**
   - Please include:
     - A summary and potential impact of the vulnerability.
     - Affected versions of `inversify-typeorm`.
     - Step-by-step instructions or a minimal reproducible code snippet demonstrating the issue.
     - Any suggested mitigations or patches, if available.

### Our Response Commitment

- **Acknowledgment**: We will acknowledge receipt of your report within **48 hours**.
- **Assessment**: We will evaluate the report, verify the severity, and keep you informed throughout the investigation.
- **Resolution**: Once a fix is verified, we will release a patch release and publish a security advisory crediting you (unless you request anonymity).

---

## 💡 Consumer Security Best Practices

When using `inversify-typeorm` in production:

1. **Protect Database Credentials**:
   - Never commit database credentials or connection strings into version control. Use environment variables (e.g., via `dotenv` or secret managers).
2. **Disable `synchronize: true` in Production**:
   - `synchronize: true` should only be used in local development. In staging and production environments, always use TypeORM migrations.
3. **Keep Dependencies Updated**:
   - Periodically audit and update `inversify-typeorm`, `typeorm`, `inversify`, and your database driver (e.g., `mysql2`, `pg`, `mongodb`) to benefit from upstream security patches.

