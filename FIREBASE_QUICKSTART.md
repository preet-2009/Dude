# Firebase Deployment - Quick Start

## Prerequisites
- Node.js installed
- Google account
- Firebase project created (or will create during init)

## Quick Commands

```bash
# 1. Install Firebase CLI
npm install -g firebase-tools

# 2. Login
firebase login

# 3. Initialize (select Functions + Hosting)
firebase init

# 4. Install dependencies
npm install

# 5. Deploy
firebase deploy
```

## After Deployment

1. **Get your Firebase URL** (shown after deployment)
2. **Update Google OAuth**:
   - Go to Google Cloud Console
   - Add Firebase URL to authorized redirect URIs
   - Format: `https://your-project.web.app/auth/google/callback`

3. **Set Environment Variables**:
```bash
firebase functions:config:set openrouter.api_key="YOUR_KEY"
firebase functions:config:set database.url="YOUR_DB_URL"
# ... (see FIREBASE_DEPLOYMENT.md for all variables)
```

4. **Redeploy**:
```bash
firebase deploy
```

## Important
⚠️ **You need Firebase Blaze Plan (Pay-as-you-go)** for external API calls
- Upgrade in Firebase Console > Upgrade Project
- Don't worry, it's very cheap for small apps

## Need Help?
See detailed guide: `FIREBASE_DEPLOYMENT.md`
