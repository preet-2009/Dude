# 🚀 Quick Setup Guide

## Prerequisites
- Node.js 16+ installed
- PostgreSQL database
- Groq API key (for AI chat)

## Installation Steps

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables
Create/update `.env` file:

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/dbname

# Session
SESSION_SECRET=your-random-secret-key-here

# AI API
GROQ_API_KEY=your-groq-api-key
GROQ_MODEL=llama-3.3-70b-versatile

# Google OAuth (optional)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=http://localhost:3000/auth/google/callback

# Server
PORT=3000
NODE_ENV=development
```

### 3. Initialize Database
The database tables will be created automatically on first run. Just make sure your PostgreSQL database exists.

### 4. Start the Server
```bash
# Development mode (with auto-reload)
npm run dev

# Production mode
npm start
```

### 5. Access the App
Open your browser and go to:
```
http://localhost:3000
```

## 🎯 All Features Work Out of the Box!

### ✅ No Additional Setup Required:
- Voice Input/Output (uses browser API)
- Message Editing & Regeneration
- Stop Generation
- Message Reactions (like/dislike)
- Export Chat (TXT, MD, PDF)
- Dark/Light Theme Toggle
- Custom Avatars
- Code Syntax Highlighting
- Search in Chat
- Pin Messages
- Folders/Tags
- Share Conversations
- Keyboard Shortcuts
- Context Memory
- Multi-File Upload
- Auto-Delete Chats
- Private Mode
- 2FA Authentication

### 🔑 Optional API Keys (For Future Features):

#### Image Generation (Choose One):
```env
# OpenAI DALL-E
OPENAI_API_KEY=sk-...

# OR Stability AI
STABILITY_API_KEY=...

# OR Replicate
REPLICATE_API_TOKEN=...
```

#### Web Search (Choose One):
```env
# SerpAPI (100 free searches/month)
SERPAPI_KEY=...

# OR Brave Search (2000 free queries/month)
BRAVE_SEARCH_KEY=...

# OR Google Custom Search (100 free queries/day)
GOOGLE_SEARCH_KEY=...
GOOGLE_SEARCH_CX=...
```

## 🧪 Testing Features

### Test Voice Input:
1. Click microphone button
2. Say "Hello, how are you?"
3. Message appears in input box

### Test Theme Toggle:
1. Click sun/moon icon in topbar
2. Theme switches instantly
3. Preference saved to database

### Test Export:
1. Have a conversation
2. Open history sidebar
3. Right-click chat → Export → Choose format
4. File downloads automatically

### Test 2FA:
1. Go to Settings
2. Click "Two-Factor Authentication" → "Setup"
3. Scan QR code with Google Authenticator
4. Enter 6-digit code
5. 2FA enabled!

### Test Keyboard Shortcuts:
- `Ctrl+K` - Creates new chat
- `Ctrl+/` - Opens search
- `Ctrl+E` - Exports current chat
- `Ctrl+Shift+T` - Toggles theme
- `Esc` - Stops AI generation

### Test Message Actions:
1. Send a message and get AI response
2. Hover over AI message
3. See action buttons: Copy, Regenerate, Like, Dislike, Pin, Speak
4. Click any to test

### Test Multi-File Upload:
1. Click + button
2. Select multiple files (max 5)
3. Files appear as chips
4. Send message with attachments

## 📱 Mobile Support

All features work on mobile:
- Responsive design
- Touch-friendly buttons
- Swipe gestures
- Mobile-optimized keyboard shortcuts

## 🔒 Security Features

### Default Security:
- ✅ Secure sessions (PostgreSQL store)
- ✅ Password hashing (bcrypt)
- ✅ HTTPS ready
- ✅ SQL injection protection
- ✅ XSS protection

### Optional Security:
- 2FA (enable in settings)
- Private mode (chats not saved)
- Auto-delete (set expiration)
- E2E encryption (infrastructure ready)

## 🎨 Customization

### Change Theme Colors:
Edit `public/css/style.css`:
```css
:root {
  --accent: #DFFF00;  /* Change accent color */
  --bg: #0f0f0f;      /* Change background */
}
```

### Change AI Model:
Edit `.env`:
```env
GROQ_MODEL=llama-3.3-70b-versatile  # or any Groq model
```

### Change Credits System:
Edit `server/routes/chat.js`:
```javascript
const COST_PER_MESSAGE = 5;  // Change credit cost
```

## 🐛 Troubleshooting

### Voice Input Not Working:
- Use Chrome or Edge (best support)
- Allow microphone permissions
- Check browser console for errors

### Database Connection Failed:
- Verify PostgreSQL is running
- Check DATABASE_URL in .env
- Ensure database exists

### 2FA QR Code Not Showing:
- Check browser console
- Verify speakeasy and qrcode packages installed
- Try refreshing the page

### Export PDF Not Working:
- Check if jsPDF loaded (see browser console)
- Try exporting as TXT or MD first
- Clear browser cache

### Theme Not Persisting:
- Check if cookies enabled
- Verify session working
- Check database connection

## 📊 Database Schema

Tables created automatically:
- `users` - User accounts
- `chat_sessions` - Conversations
- `chat_messages` - Individual messages
- `user_preferences` - User settings
- `shared_chats` - Shared conversation links
- `session` - Express sessions

## 🚀 Deployment

### Deploy to Render/Railway/Heroku:
1. Push code to GitHub
2. Connect repository
3. Add environment variables
4. Deploy!

### Environment Variables for Production:
```env
NODE_ENV=production
DATABASE_URL=your-production-db-url
SESSION_SECRET=strong-random-secret
GROQ_API_KEY=your-key
```

## 📞 Need Help?

All features are documented in `FEATURES.md`

Check the code:
- Backend: `server/routes/features.js`
- Frontend: `public/js/features.js`
- UI: `public/js/ui.js`
- Chat: `public/js/chat.js`

## 🎉 You're All Set!

Start the server and enjoy all 19 working features! 🚀

When you're ready to add image generation or web search, just add the API keys to `.env` and I'll help you implement them.
