# Complete GCP Native Migration Design

**Project:** Fish Rescue App (finventory)
**Date:** 2026-04-18
**Status:** Pending Approval
**Author:** Claude Code + Justin

---

## Overview

Migrate from Firebase to pure Google Cloud Platform services managed entirely by Terraform. This removes Firebase dependencies, provides complete infrastructure as code, and enables direct GCP API access.

---

## Architecture

```
GitHub Actions CI/CD → Terraform Apply → GCP Resources
```

---

## Service Replacements

| Firebase Service | GCP Native Replacement |
|-------------------|------------------------|
| Firebase Functions (1st gen) | Cloud Functions 2nd gen |
| Firebase Firestore | Firestore Native Mode |
| Firebase Auth | Cloud Identity Platform |
| FCM | Cloud Pub/Sub + Push |
| Firebase Storage | Cloud Storage |
| Firebase Hosting | Cloud Run + Cloud Load Balancer |
| Firebase Realtime Database | Firestore Native |

---

## Migration Phases

1. **Terraform Infrastructure** (1-2 weeks)
2. **Backend Migration** (3-4 weeks)
3. **Mobile App Migration** (4-6 weeks)
4. **Cutover** (1 week)

**Total: 3-4 months**

---

## Scope

**In scope:**
- Terraform for all GCP resources
- Cloud Functions 2nd gen
- Firestore Native
- Cloud Identity Platform
- Cloud Pub/Sub push
- Mobile app SDK migration

**Out scope:**
- Monitoring setup (post-migration)
- Cost optimization
- Multi-region deployment
