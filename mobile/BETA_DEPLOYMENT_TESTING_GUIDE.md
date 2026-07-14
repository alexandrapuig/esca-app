# Esca Mobile App - Beta Deployment & Testing Guide

## 1. Local Testing On Simulators

### iOS Simulator Testing (Mac only)

Prerequisites:
- Mac with Xcode installed

Steps:
1. From the mobile directory, run:

```bash
npm run ios
```

2. This launches the iOS simulator automatically.
3. Once app loads, test these flows:
   1. Login flow: use test email `test@example.com` and password `testpassword123`
   2. Signup flow: create new account (will need to verify email via Supabase)
   3. After login, verify dashboard displays user email
   4. Test tab navigation: tap each tab (Fridge, Pantry, Recipes, Profile)
   5. Test add item: tap Add Item button, enter item name "Milk", category "Dairy", quantity 1, unit "L"
   6. Verify item appears in list with expiry date calculated
   7. Test delete: swipe or tap delete on item
   8. Test offline: turn off WiFi/airplane mode, verify cached items still display
   9. Turn WiFi back on, pull-to-refresh, verify sync
   10. Test risk badges: add items with different expiry dates and verify color coding (green >7 days, yellow 3-7 days, red <3 days)

### Android Emulator Testing (Windows/Mac/Linux)

Prerequisites:
- Android Studio with emulator configured

Steps:
1. From the mobile directory, run:

```bash
npm run android
```

2. This launches Android emulator automatically.
3. Run the same test flows as iOS.
4. Additionally test Android back button navigation (should work with expo-router).
5. Test on different screen sizes if possible.

### Troubleshooting

- If emulator does not start: open Android Studio -> Device Manager -> create new device
- If app crashes: check console for error messages (`npm start` shows them)
- If unable to login: verify backend API is running and accessible

### Testing Checklist To Document

- [ ] Auth screens render correctly
- [ ] Login with existing account works
- [ ] Signup with new account works
- [ ] Email verification works (check inbox)
- [ ] Tab navigation switches screens smoothly
- [ ] Fridge tab displays item list
- [ ] Add item button opens form
- [ ] Item form accepts input
- [ ] Save item button adds to list
- [ ] Delete item removes from list
- [ ] Pantry tab works same as Fridge
- [ ] Recipes tab displays (or empty state)
- [ ] Profile tab shows user email and stats
- [ ] Logout button works
- [ ] Offline mode shows cached data
- [ ] Online mode syncs automatically
- [ ] Risk badges display correct colors
- [ ] No console errors
- [ ] No app crashes

## 2. TestFlight Beta Deployment (iOS)

### Prerequisites

1. Apple Developer Account ($99/year) - https://developer.apple.com/account
2. App ID created in App Store Connect for Esca
3. EAS CLI installed:

```bash
npm install -g eas-cli
```

4. Authenticated with EAS (use Expo account, not Apple account):

```bash
eas login
```

5. Apple Developer certificate created in App Store Connect

### Build And Deploy Steps

1. From the mobile directory, run:

```bash
eas build --platform ios --profile preview
```

2. First build will prompt to create Apple signing certificates (EAS handles this).
3. Build takes 10-15 minutes.
4. Once complete, upload to TestFlight from EAS output (or auto-submit if your EAS submit flow is configured).
5. Go to App Store Connect -> Esca app -> TestFlight.
6. New build appears under Builds.
7. Create test group or use Internal Testing for quick testing.

### Add Beta Testers

1. In App Store Connect -> Esca -> TestFlight -> Internal Testing
2. Click Manage Testers
3. Add tester Apple IDs (must have iCloud accounts)
4. Can add up to 100 internal testers
5. Click Add to send invitations
6. Testers receive email invite

### Tester Instructions

1. Download TestFlight app from App Store
2. Open email with beta invite
3. Tap link in email
4. In TestFlight app, tap Install next to Esca
5. App downloads and installs on iPhone
6. Test on real device for 1-2 weeks
7. Provide feedback via TestFlight feedback button (shake device or tap feedback in app)

### Monitor Feedback

- In App Store Connect -> TestFlight -> Feedback
- Review crash logs and performance data
- Respond to tester feedback
- Create GitHub issues for bugs found

## 3. Google Play Beta Deployment (Android)

### Prerequisites

1. Google Play Developer Account ($25 one-time) - https://play.google.com/console
2. App ID created in Google Play Console for Esca
3. EAS CLI installed (from iOS setup)
4. Authenticated with EAS:

```bash
eas login
```

### Build And Deploy Steps

1. From the mobile directory, run:

```bash
eas build --platform android --profile preview
```

2. First build will prompt to create Android keystore (EAS handles this; save backup file).
3. Build takes 15-20 minutes.
4. Creates AAB file (Android App Bundle).
5. Upload to Google Play Console (or auto-submit if EAS submit is configured).
6. Go to Google Play Console -> Esca -> Testing -> Internal testing.
7. New build appears under Releases.

### Add Beta Testers

1. In Google Play Console -> Esca -> Testing -> Internal testing
2. Click Manage testers
3. Enter tester email addresses (Gmail accounts)
4. Testers must use Google account associated with email
5. Click Save to add testers
6. Deployment typically takes 1-2 hours

### Tester Instructions

1. On Android phone, open Google Play Store app
2. Search for Esca
3. On app page, scroll down to Join the beta
4. Tap Join
5. Tap Install to download app
6. App installs and receives updates from Google Play
7. Test on real device for 1-2 weeks
8. Provide feedback via Play Store review or email

### Monitor Feedback

- In Google Play Console -> Reviews for beta reviews
- Check crash reports in Vitals
- Track crashes and ANRs
- Fix issues and release new beta builds
- Testers receive auto-updates

## 4. What Beta Testers Should Test

Share this checklist with all testers:

### Authentication

- [ ] Sign up with new email address
- [ ] Verify email (check spam folder)
- [ ] Log in with correct credentials
- [ ] Log in fails with wrong password
- [ ] Logout button works and returns to login

### Fridge Management

- [ ] Add item manually (name, category, quantity, unit)
- [ ] View item in list with all details
- [ ] Item expiry date is calculated correctly
- [ ] Delete item from list
- [ ] Mark item as consumed
- [ ] Edit item details
- [ ] See risk badge color: green (>7 days), yellow (3-7 days), red (<3 days)

### Pantry Management

- [ ] Same as fridge: add, view, delete, mark consumed

### Barcode Scanning (if device has camera)

- [ ] Tap Scan Barcode button
- [ ] Grant camera permission when prompted
- [ ] Scan product barcode (for example from food packaging)
- [ ] Product name auto-populates
- [ ] Category auto-populates
- [ ] Expiry date calculated correctly
- [ ] Manual override works if identification is wrong

### Recipes

- [ ] Recipes tab shows list (if any generated)
- [ ] Each recipe shows name, description, prep time, difficulty
- [ ] Mark as cooked button works
- [ ] Pull-to-refresh generates new recipes

### Profile

- [ ] Display user email address
- [ ] Show stats: items tracked, waste prevented, CO2 saved
- [ ] Logout button works

### Offline Mode

- [ ] Add item while online
- [ ] Turn off internet (airplane mode)
- [ ] Previous items still visible in list
- [ ] Turn internet back on
- [ ] Pull-to-refresh syncs with server
- [ ] No data loss

### Performance And Stability

- [ ] No crashes or freezes
- [ ] Buttons respond immediately
- [ ] Transitions between screens are smooth
- [ ] Text is readable on device screen
- [ ] Images load correctly (if any)

### Feedback Form For Testers

Device Information:
- Device model: [iPhone 15 / Samsung Galaxy S24 / etc.]
- OS version: [iOS 17.2 / Android 14 / etc.]
- App version: [1.0.0]

Bug Reports (if any):
- [ ] Did the app crash? If so, when?
- [ ] Any features that did not work as expected?
- [ ] Describe the issue in detail
- [ ] Steps to reproduce

User Experience:
- How would you rate the user experience? (1-5 stars)
- What works well?
- What could be improved?
- Any confusing screens or flows?

Overall:
- Would you recommend this app to friends? (Yes/No/Maybe)
- Any other feedback or suggestions?

## 5. Collecting And Organizing Feedback

Create a feedback tracking spreadsheet with columns:
- Date received
- Tester name
- Device/OS
- Issue type (bug/feature request/UX feedback)
- Description
- Severity (critical/high/medium/low)
- Status (new/in progress/fixed/wontfix)
- GitHub issue link

Feedback Sources:
- TestFlight: App Store Connect -> TestFlight -> Feedback
- Google Play: Google Play Console -> Reviews
- Email: set up beta@yourcompany.com
- GitHub: create issues for technical bugs

Responding to testers:
- Thank them for testing
- Acknowledge reported bugs
- Set expectations for fixes
- Ask clarifying questions if needed
- Notify when fixed versions are available

## 6. Fixing Issues And Releasing New Builds

Process:
1. Collect feedback for 3-5 days
2. Prioritize issues (critical > high > medium > low)
3. Create GitHub issues for each bug
4. Fix issues in feature branches
5. Merge to main branch
6. Commit and push
7. Build new beta with:

```bash
eas build --platform ios --profile preview
```

and/or

```bash
eas build --platform android --profile preview
```

8. New build uploads to TestFlight/Google Play based on your submit pipeline
9. Testers are notified of update (typically within 1-2 hours)
10. Testers reinstall/update and verify fixes

Build notes:
- Each build should include a version bump (for example 1.0.0 -> 1.0.1)
- Update version in app.json
- Include release notes describing what was fixed

## 7. Timeline And Readiness Checklist

Beta testing phase (2-4 weeks):
- Week 1: Deploy to internal testing (TestFlight/Google Play beta)
- Week 2-3: Gather feedback and fix critical issues
- Week 3-4: Polish UI, fix remaining issues, stabilize

Pre-launch checklist:
- [ ] All critical bugs fixed
- [ ] App does not crash
- [ ] Offline mode works reliably
- [ ] Sync works properly
- [ ] Performance is acceptable
- [ ] UI is polished
- [ ] No TypeScript errors
- [ ] All screens tested
- [ ] Beta testers happy (4+ star average)

Ready for app store submission:
- [ ] Privacy policy written
- [ ] Terms of service written
- [ ] App screenshots prepared (3-5 screenshots showing key features)
- [ ] App description written (short + long)
- [ ] App icon finalized (1024x1024 px source)
- [ ] Promotional artwork created

## 8. App Store Submission

### Prepare iOS Submission

1. In App Store Connect -> Esca -> Pricing and Availability
2. Set privacy policy URL
3. Set terms of use URL
4. Select category (Food and Drink or Lifestyle)
5. Add keywords: food, waste, AI, recipes, inventory
6. Write compelling description (up to 4000 chars)
7. Add app screenshots (5-6 screenshots showing key features)
8. Set version number to 1.0.0 (or latest approved target)
9. Review submission details
10. Click Submit for Review
11. Apple review usually takes 1-3 days
12. After approval, choose auto-release or manual release

### Prepare Android Submission

1. In Google Play Console -> Esca -> Content Rating
2. Complete content rating questionnaire
3. Open Store Listing
4. Add app description (title and full description)
5. Add keyword phrases in listing copy and metadata fields
6. Add app icon (512x512 px)
7. Add feature graphic (1024x500 px)
8. Add screenshots (phone screenshots, 1080x1920 px recommended)
9. Set app category (Food or Lifestyle)
10. Review all details
11. Click Review Release
12. Select production track
13. Click Create Release
14. Google review and approval may take hours to a few days

### Post-Launch Monitoring

- Monitor crash reports daily
- Respond to user reviews
- Plan next version updates
- Track user feedback trends
- Monitor performance metrics

## 9. Next Steps After Launch

### Monthly Updates

- Release new features and improvements
- Fix reported bugs
- Respond to user feedback
- Keep app compatible with OS updates

### User Support

- Monitor app reviews for support questions
- Respond to tester/user emails
- Create FAQ if needed
- Document common issues

### Marketing

- Share app launch announcement
- Encourage beta testers to leave reviews
- Apply app store optimization (keywords, screenshots)
- Promote on social media
- Publish a launch blog post

### Analytics

- Track DAU (daily active users)
- Monitor crash rates
- Track feature usage
- Gather feedback for v1.1 planning

### Version Planning

- v1.0: Core functionality (auth, inventory, predictions, recipes)
- v1.1: Gamification (badges, stats, milestones)
- v1.2: Push notifications
- v1.3: Social features (share recipes, leaderboards)
- v2.0: Smart fridge integration (Samsung SmartThings, LG)
