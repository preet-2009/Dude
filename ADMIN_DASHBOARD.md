# Admin Dashboard Guide

## Overview
The Admin Dashboard allows you (the owner) to view all user activity, chat history, and manage users on your deployed DUDE AI application.

## Access

### Method 1: Admin Button (Recommended)
1. Log in with your owner account: `preet.shaileshbhai.desai1@gmail.com`
2. Look for the **Admin Dashboard** button (🗂️ icon) in the top-left corner of the main app
3. Click it to open the admin dashboard in a new tab

### Method 2: Direct URL
Navigate to: `https://your-app-url.onrender.com/admin`

## Features

### 📊 Dashboard Statistics
View real-time statistics at the top:
- **Total Users**: Number of registered users
- **Total Chats**: All chat sessions created
- **Total Messages**: All messages sent (user + AI)
- **Messages Today**: Messages sent in the last 24 hours
- **Active Users (7d)**: Unique users who chatted in the last 7 days

### 👥 Users Tab
View all registered users with:
- Name and email
- Current credit balance
- Number of chats and messages
- Join date
- Actions:
  - **View Chats**: See all chat sessions for a user
  - **Delete**: Remove user and all their data (⚠️ irreversible)

### 💬 View User Chats
Click "View Chats" on any user to see:
- All their chat sessions
- Chat titles and creation dates
- Message count per chat
- Folder organization
- Click "View Messages" to read the full conversation

### 📝 View Chat Messages
See the complete conversation:
- User messages (👤)
- AI responses (🤖)
- Timestamps for each message
- User information (name and email)

### 🔍 Search Messages
Use the search bar at the top to:
- Search across ALL messages from ALL users
- Find specific keywords or phrases
- See which user asked what
- View context with highlighted search terms

**How to use:**
1. Type at least 3 characters in the search box
2. Wait 0.5 seconds (auto-search)
3. Results show in the "Search Results" tab

## Security

### Access Control
- Only the owner email (`preet.shaileshbhai.desai1@gmail.com`) can access the admin dashboard
- All admin routes require authentication
- Non-admin users are automatically redirected

### What You Can See
- All user information (names, emails, credits)
- All chat sessions and messages
- Complete conversation history
- User activity statistics

## Database Queries (Alternative Method)

If you prefer using SQL directly in Neon Console:

### See all users
```sql
SELECT id, email, name, credits, created_at 
FROM users 
ORDER BY created_at DESC;
```

### See all messages from a specific user
```sql
SELECT 
  u.email,
  u.name,
  cs.title as chat_title,
  cm.role,
  cm.content,
  cm.created_at
FROM chat_messages cm
JOIN chat_sessions cs ON cm.session_id = cs.id
JOIN users u ON cs.user_id = u.id
WHERE u.email = 'friend@example.com'
ORDER BY cm.created_at;
```

### See ALL messages from ALL users
```sql
SELECT 
  u.email,
  u.name,
  cs.title as chat_title,
  cm.role,
  cm.content,
  cm.created_at
FROM chat_messages cm
JOIN chat_sessions cs ON cm.session_id = cs.id
JOIN users u ON cs.user_id = u.id
ORDER BY cm.created_at DESC
LIMIT 100;
```

### Count messages per user
```sql
SELECT 
  u.email,
  u.name,
  COUNT(cm.id) as total_messages
FROM users u
LEFT JOIN chat_sessions cs ON u.id = cs.user_id
LEFT JOIN chat_messages cm ON cs.id = cm.session_id
GROUP BY u.id, u.email, u.name
ORDER BY total_messages DESC;
```

## Tips

1. **Regular Monitoring**: Check the dashboard regularly to see how users are engaging
2. **Search for Issues**: Use search to find problematic queries or errors
3. **User Management**: Delete spam or test accounts to keep data clean
4. **Privacy**: Remember that you're viewing private conversations - use responsibly
5. **Backup**: Before deleting users, consider exporting their data if needed

## Troubleshooting

### Can't Access Admin Dashboard
- Verify you're logged in with the owner email
- Check browser console for errors
- Ensure your Render deployment is running

### No Data Showing
- Check if users have actually used the app
- Verify database connection in Render logs
- Run health check: `https://your-app-url.onrender.com/health`

### Search Not Working
- Ensure you type at least 3 characters
- Check for typos in search query
- Try simpler search terms

## Privacy & Ethics

⚠️ **Important Reminders:**
- You have access to all user conversations
- Use this power responsibly and ethically
- Consider user privacy when reviewing chats
- Only access data when necessary for:
  - Debugging issues
  - Improving the service
  - Handling user reports
  - System maintenance

## Support

If you encounter issues with the admin dashboard:
1. Check Render logs for errors
2. Verify database connection
3. Test with a fresh browser session
4. Check that all environment variables are set

---

**Owner Email**: preet.shaileshbhai.desai1@gmail.com  
**Dashboard URL**: `/admin`  
**Created**: May 2026
