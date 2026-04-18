# Deploy DUDE AI to Firebase

## Step-by-Step Deployment Guide

### 1. Install Firebase CLI

```bash
npm install -g firebase-tools
```

### 2. Login to Firebase

```bash
firebase login
```

This will open a browser window for you to sign in with your Google account.

### 3. Initialize Firebase Project

```bash
firebase init
```

When prompted, select:
- **Functions**: Configure a Cloud Functions directory and its files
- **Hosting**: Configure files for Firebase Hosting

Then:
- **Use an existing project** or **Create a new project**
- **Language**: JavaScript
- **ESLint**: No (or Yes if you want)
- **Install dependencies**: Yes
- **Public directory**: `public`
- **Single-page app**: Yes
- **Automatic builds**: No

### 4. Install Dependencies

```bash
npm install
```

### 5. Set Environment Variables

Set your environment variables in Firebase:

```bash
firebase functions:config:set \
  openrouter.api_key="YOUR_OPENROUTER_API_KEY" \
  openrouter.model="qwen/qwen3-next-80b-a3b-instruct:free" \
  groq.api_key="YOUR_GROQ_API_KEY" \
  groq.model="llama-3.1-8b-instant" \
  database.url="YOUR_POSTGRESQL_CONNECTION_STRING" \
  google.client_id="YOUR_GOOGLE_CLIENT_ID" \
  google.client_secret="YOUR_GOOGLE_CLIENT_SECRET" \
  session.secret="YOUR_RANDOM_SESSION_SECRET"
```

Or set them one by one:

```bash
firebase functions:config:set openrouter.api_key="your_key_here"
firebase functions:config:set openrouter.model="qwen/qwen3-next-80b-a3b-instruct:free"
firebase functions:config:set groq.api_key="your_groq_key"
firebase functions:config:set groq.model="llama-3.1-8b-instant"
firebase functions:config:set database.url="your_database_url"
firebase functions:config:set google.client_id="your_client_id"
firebase functions:config:set google.client_secret="your_client_secret"
firebase functions:config:set session.secret="your_session_secret"
```

### 6. Update Google OAuth Callback URL

After deployment, you'll get a Firebase URL like:
`https://your-project.web.app`

Update your Google OAuth settings:
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Navigate to APIs & Services > Credentials
3. Edit your OAuth 2.0 Client ID
4. Add to Authorized redirect URIs:
   - `https://your-project.web.app/auth/google/callback`
   - `https://your-project.firebaseapp.com/auth/google/callback`

### 7. Deploy to Firebase

```bash
firebase deploy
```

This will deploy both:
- **Hosting**: Your static files (HTML, CSS, JS)
- **Functions**: Your Node.js backend

### 8. View Your App

After deployment completes, you'll see URLs like:
- **Hosting URL**: `https://your-project.web.app`
- **Functions URL**: `https://us-central1-your-project.cloudfunctions.net/app`

Visit the Hosting URL to see your app!

## Important Notes

### Firebase Pricing
- **Spark Plan (Free)**: Limited to 125K function invocations/month
- **Blaze Plan (Pay as you go)**: Required for external API calls (OpenRouter, Groq)
  - You'll need to upgrade to Blaze plan for this app to work

### Environment Variables in Code

Update your server code to read from Firebase config:

```javascript
const functions = require('firebase-functions');

// Instead of process.env, use:
const config = functions.config();
const apiKey = config.openrouter.api_key;
```

### Database Connection
- Your Neon PostgreSQL database will work with Firebase
- Make sure the connection string is set correctly

### Logs and Monitoring
View logs:
```bash
firebase functions:log
```

Or in Firebase Console:
- Go to Functions section
- Click on your function
- View logs tab

## Troubleshooting

### Issue: "Billing account not configured"
**Solution**: Upgrade to Blaze plan in Firebase Console

### Issue: "Function deployment failed"
**Solution**: Check logs with `firebase functions:log`

### Issue: "Database connection timeout"
**Solution**: Ensure your Neon database allows connections from Firebase IPs

### Issue: "OAuth redirect mismatch"
**Solution**: Update Google OAuth callback URLs to match your Firebase domain

## Local Testing

Test functions locally:
```bash
firebase emulators:start
```

## Useful Commands

```bash
# View current config
firebase functions:config:get

# Delete a config
firebase functions:config:unset openrouter.api_key

# Deploy only functions
firebase deploy --only functions

# Deploy only hosting
firebase deploy --only hosting

# View project info
firebase projects:list
```

## Alternative: Use .env with Firebase

If you prefer using .env file, you can use `dotenv` in your functions:

1. Create `.env.production` file
2. Load it in your function:
```javascript
require('dotenv').config({ path: '.env.production' });
```

But Firebase config is recommended for production.
