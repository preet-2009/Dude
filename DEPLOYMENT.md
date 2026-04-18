# Deploying DUDE AI to Vercel

## Prerequisites
- GitHub repository connected to Vercel
- Neon PostgreSQL database
- OpenRouter/Groq API keys
- Google OAuth credentials

## Steps to Deploy

### 1. Push to GitHub
```bash
git add -A
git commit -m "Add Vercel configuration"
git push origin main
```

### 2. Configure Vercel

In your Vercel dashboard:

1. **Import your GitHub repository**
2. **Configure Environment Variables** - Add these in Vercel dashboard:
   - `OPENROUTER_API_KEY` - Your OpenRouter API key
   - `OPENROUTER_MODEL` - `qwen/qwen3-next-80b-a3b-instruct:free`
   - `GROQ_API_KEY` - Your Groq API key
   - `GROQ_MODEL` - `llama-3.1-8b-instant`
   - `DATABASE_URL` - Your Neon PostgreSQL connection string
   - `GOOGLE_CLIENT_ID` - Your Google OAuth client ID
   - `GOOGLE_CLIENT_SECRET` - Your Google OAuth client secret
   - `GOOGLE_CALLBACK_URL` - `https://your-app.vercel.app/auth/google/callback`
   - `SESSION_SECRET` - A random secret string
   - `PORT` - `3000`

3. **Update Google OAuth Callback URL**
   - Go to Google Cloud Console
   - Update authorized redirect URIs to include: `https://your-app.vercel.app/auth/google/callback`

### 3. Deploy
- Click "Deploy" in Vercel
- Wait for deployment to complete
- Your app will be live at `https://your-app.vercel.app`

## Important Notes

- Make sure your `.env` file is in `.gitignore` (it already is)
- Never commit API keys or secrets to GitHub
- Update the `GOOGLE_CALLBACK_URL` after you get your Vercel domain
- The database will persist across deployments (using Neon)

## Troubleshooting

If deployment fails:
1. Check Vercel logs for errors
2. Verify all environment variables are set correctly
3. Make sure your database is accessible
4. Check that Google OAuth callback URL matches your Vercel domain

## Local Development

To run locally:
```bash
npm install
npm run dev
```

Make sure you have a `.env` file with all required variables (see `.env.example`).
