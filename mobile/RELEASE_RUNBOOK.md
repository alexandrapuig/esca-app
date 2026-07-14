# Esca Mobile App - Release Runbook (Internal)

Purpose: Step-by-step checklist for your team when releasing new versions.

## Pre-Release Checklist (1 day before)

- [ ] All critical issues fixed and merged to main
- [ ] Code reviewed and tested
- [ ] No TypeScript errors: cd mobile && npm run type-check
- [ ] Update version in mobile/app.json (for example 1.0.1)
- [ ] Update CHANGELOG.md with changes
- [ ] QA test on real devices (iPhone + Android)
- [ ] Write release notes for what changed

## Build And Deploy iOS (TestFlight)

1. cd mobile
2. npm run type-check (verify no errors)
3. eas build --platform ios --profile preview
4. Wait 10-15 minutes for build
5. Go to App Store Connect -> Esca -> TestFlight
6. New build appears under Builds
7. Add to Internal Testing group or specific testers
8. Write release notes: "Fixed [issue]. Improved [feature]."
9. Submit to testers

## Build And Deploy Android (Google Play)

1. cd mobile
2. npm run type-check (verify no errors)
3. eas build --platform android --profile preview
4. Wait 15-20 minutes for build
5. Go to Google Play Console -> Esca -> Testing -> Internal testing
6. New .aab automatically uploaded
7. Write release notes
8. Click Review Release -> Start Rollout -> 100%
9. Testers receive update within 1-2 hours

## Post-Deploy Checklist

- [ ] Notify testers: "New version available"
- [ ] Monitor crash reports (first 1 hour)
- [ ] Check feedback channel for immediate issues
- [ ] Document any unexpected behavior
- [ ] Have hotfix ready if critical issue found

## During Beta Period (1-2 weeks)

- [ ] Check App Store Connect daily for crashes
- [ ] Review Google Play Console for ANRs
- [ ] Collect tester feedback
- [ ] Prioritize bug fixes for next build
- [ ] Create GitHub issues for reported bugs

## Rollback Plan (if critical issue)

1. Revert problematic commit
2. Merge fix to main
3. Rebuild: eas build --platform ios --profile preview
4. Immediately deploy to internal testing
5. Notify testers of rollback
6. Investigate root cause

## Common Issues And Fixes

- App will not start: check API_URL in .env is correct
- Login fails: verify Supabase credentials in backend
- Items do not sync: check internet connection and API logs
- Barcode scanner fails: ensure camera permissions granted
- Crash on startup: check TypeScript errors and logs

## Release Versioning

- Major (1.0.0 -> 2.0.0): Major new features
- Minor (1.0.0 -> 1.1.0): New features, improvements
- Patch (1.0.0 -> 1.0.1): Bug fixes

## Timeline For Major Release (v1.0 -> v1.1)

- Week 1: Feature development
- Week 2: Testing and bug fixes
- Week 3: Beta testing with testers
- Week 4: Final polish and app store submission

## Key Contacts

- Backend Lead: [name]
- Mobile Lead: [name]
- QA Lead: [name]
- Product Manager: [name]

Slack Channel: #esca-mobile
GitHub Milestone: v1.0-beta

## Emergency Contact

If critical issue found during beta: contact [phone/slack]
