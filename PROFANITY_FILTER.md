# 🛡️ Profanity Filter

## Overview
The profanity filter automatically detects and blocks bad words in **any language** when users send messages. Instead of processing the message, it returns: **"=-) better luck next time"**

## How It Works

### Detection
- Checks user messages **before** sending to AI
- Supports **multiple languages**: English, Hindi, Gujarati, Spanish, French, German, Italian, Portuguese, Russian, Arabic, Chinese, Japanese, Korean, and more
- Detects **variations**: leetspeak (f*ck, sh*t), misspellings (fuk, sht), and special characters

### Response
When profanity is detected:
1. ❌ Message is **not sent** to the AI
2. 💬 User sees: **"=-) better luck next time"**
3. 📝 Incident is **logged** on the server
4. 💰 **No credits** are deducted

## Supported Languages

### English
fuck, shit, bitch, ass, damn, hell, bastard, crap, dick, pussy, cock, asshole, motherfucker, whore, slut, piss, cunt, and more

### Hindi/Gujarati (Transliterated)
chutiya, madarchod, bhenchod, bhosdike, gandu, harami, kamina, kutta, saala, randi, lodu, bsdk, mc, bc, and more

### Spanish
puta, mierda, pendejo, cabron, hijo de puta, coño, verga, chingar, joder, and more

### French
merde, putain, connard, salope, enculé, con, bite, and more

### German
scheiße, arschloch, fotze, hurensohn, fick, and more

### Italian
cazzo, merda, stronzo, puttana, vaffanculo, and more

### Portuguese
porra, caralho, merda, puta, filho da puta, and more

### Russian (Transliterated)
blyat, suka, pizdec, hui, chmo, debil, and more

### Arabic (Transliterated)
kos, sharmouta, kalb, hmar, ayr, and more

### Chinese (Pinyin)
cao, tamade, shabi, and more

### Japanese (Romanized)
baka, kuso, chikusho, shine, and more

### Korean (Romanized)
shibal, ssibal, gaesekki, jot, and more

### Variations
- Leetspeak: f*ck, sh*t, b*tch, a$$
- Misspellings: fuk, fck, sht, btch
- Special chars: f@ck, sh!t, b1tch

## Technical Details

### Files
- **`server/utils/profanityFilter.js`** - Filter logic
- **`server/routes/chat.js`** - Integration point
- **`public/js/chat.js`** - Frontend handling

### Functions

#### `containsProfanity(text)`
Checks if text contains any bad words.
```javascript
const hasBadWords = containsProfanity("hello world"); // false
const hasBadWords = containsProfanity("bad word here"); // true
```

#### `filterProfanity(text)`
Returns filtered text or replacement message.
```javascript
const filtered = filterProfanity("hello world"); // "hello world"
const filtered = filterProfanity("bad word"); // "=-) better luck next time"
```

#### `getProfanitySeverity(text)`
Returns profanity count for analytics.
```javascript
const severity = getProfanitySeverity("text with bad words");
// { hasProfanity: true, count: 2 }
```

## User Experience

### Normal Message
```
User: "How do I learn Python?"
AI: "Here's how to get started with Python..."
```

### Blocked Message
```
User: "This is a bad word message"
AI: "=-) better luck next time"
```

### What Users See
1. They type a message with profanity
2. Click send
3. See their message appear
4. AI responds with: **"=-) better luck next time"**
5. No credits deducted
6. Can try again with clean language

## Admin Features

### Logging
Every blocked message is logged with:
- User email
- Original message (for review)
- Timestamp

Check server logs:
```bash
# In Render dashboard
Profanity detected from user user@example.com: "bad message here"
```

### Monitoring
You can track profanity attempts in:
- Server logs (Render dashboard)
- Admin dashboard (future feature)

## Customization

### Add More Words
Edit `server/utils/profanityFilter.js`:

```javascript
const badWords = [
  // ... existing words ...
  'newbadword',
  'anotherbadword',
];
```

### Change Response Message
Edit `server/routes/chat.js`:

```javascript
return res.json({ 
  reply: 'Your custom message here!',
  blocked: true 
});
```

### Disable Filter (Not Recommended)
Comment out the check in `server/routes/chat.js`:

```javascript
// if (containsProfanity(message)) {
//   return res.json({ 
//     reply: '=-) better luck next time',
//     blocked: true 
//   });
// }
```

## Testing

### Test Cases

**English:**
```
"fuck" → Blocked ✓
"hello" → Allowed ✓
```

**Hindi:**
```
"chutiya" → Blocked ✓
"namaste" → Allowed ✓
```

**Spanish:**
```
"puta" → Blocked ✓
"hola" → Allowed ✓
```

**Variations:**
```
"f*ck" → Blocked ✓
"f@ck" → Blocked ✓
"fuk" → Blocked ✓
```

### How to Test
1. Deploy the changes
2. Log in to your app
3. Try sending messages with bad words
4. Verify you see: "=-) better luck next time"
5. Check server logs for profanity detection

## Privacy & Ethics

### What Gets Logged
- ✅ User email
- ✅ Timestamp
- ✅ Original message (server-side only)

### What Doesn't Get Logged
- ❌ Not saved to database
- ❌ Not visible in admin dashboard
- ❌ Not sent to AI

### Best Practices
- Review logs periodically
- Update word list as needed
- Consider user privacy
- Don't over-filter (false positives)

## Limitations

### False Positives
Some legitimate words might be blocked:
- "Scunthorpe" (contains "cunt")
- "Penistone" (contains "penis")
- "Arsenal" (contains "arse")

**Solution:** Use word boundaries in regex to minimize false positives.

### Bypass Attempts
Users might try:
- Spaces: "f u c k"
- Unicode: "ｆｕｃｋ"
- Emojis: "f🌟ck"

**Solution:** Add more patterns to the filter as needed.

### Performance
- Filter runs on every message
- Minimal impact (< 1ms)
- No external API calls

## Future Enhancements

### Planned Features
- [ ] Severity levels (warning vs block)
- [ ] User warnings (3 strikes)
- [ ] Admin dashboard for blocked messages
- [ ] Whitelist for false positives
- [ ] Context-aware filtering
- [ ] Machine learning detection

### Suggestions
- Add rate limiting for repeat offenders
- Send email alerts for severe violations
- Allow users to appeal blocks
- Add profanity statistics to admin dashboard

## Support

### Issues
If the filter is:
- **Too strict**: Remove words from `badWords` array
- **Too lenient**: Add more words/patterns
- **Causing errors**: Check server logs

### Debugging
```bash
# Check if filter is working
# Send a test message with profanity
# Check Render logs for:
"Profanity detected from user..."
```

### Contact
For issues or suggestions:
- Check server logs in Render
- Review `server/utils/profanityFilter.js`
- Test with different languages

---

## Quick Reference

**File Locations:**
- Filter: `server/utils/profanityFilter.js`
- Integration: `server/routes/chat.js`
- Frontend: `public/js/chat.js`

**Response Message:**
```
"=-) better luck next time"
```

**Supported Languages:**
English, Hindi, Gujarati, Spanish, French, German, Italian, Portuguese, Russian, Arabic, Chinese, Japanese, Korean

**Credits Deducted:**
None (message blocked before processing)

---

**🎉 Your app is now protected from profanity!**

Users will see a friendly message instead of processing inappropriate content.
