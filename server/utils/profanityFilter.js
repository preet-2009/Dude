// Profanity filter for multiple languages
// Detects bad words and replaces them with "=-) better luck next time"

const badWords = [
  // English
  'fuck', 'shit', 'bitch', 'ass', 'damn', 'hell', 'bastard', 'crap', 'dick', 'pussy', 
  'cock', 'asshole', 'motherfucker', 'whore', 'slut', 'piss', 'cunt', 'fag', 'nigger',
  'retard', 'idiot', 'stupid', 'dumb', 'moron', 'imbecile',
  
  // Hindi/Gujarati (transliterated)
  'chutiya', 'madarchod', 'bhenchod', 'bhosdike', 'gandu', 'harami', 'kamina',
  'kutta', 'kutti', 'saala', 'saali', 'randi', 'lodu', 'lauda', 'gaandu',
  'bhadwa', 'bhadwe', 'chodu', 'chod', 'lund', 'jhant', 'bsdk', 'mc', 'bc',
  
  // Spanish
  'puta', 'mierda', 'pendejo', 'cabron', 'hijo de puta', 'coño', 'verga',
  'chingar', 'joder', 'puto', 'carajo', 'culo',
  
  // French
  'merde', 'putain', 'connard', 'salope', 'enculé', 'con', 'bite',
  
  // German
  'scheiße', 'scheisse', 'arschloch', 'fotze', 'hurensohn', 'fick',
  
  // Italian
  'cazzo', 'merda', 'stronzo', 'puttana', 'vaffanculo', 'culo',
  
  // Portuguese
  'porra', 'caralho', 'merda', 'puta', 'filho da puta', 'cu',
  
  // Russian (transliterated)
  'blyat', 'suka', 'pizdec', 'hui', 'chmo', 'debil',
  
  // Arabic (transliterated)
  'kos', 'kus', 'sharmouta', 'kalb', 'hmar', 'ayr',
  
  // Chinese (pinyin)
  'cao', 'tamade', 'shabi', 'bitch', 'fuck',
  
  // Japanese (romanized)
  'baka', 'kuso', 'chikusho', 'shine',
  
  // Korean (romanized)
  'shibal', 'ssibal', 'gaesekki', 'jot',
  
  // Common variations and leetspeak
  'f*ck', 'sh*t', 'b*tch', 'a$$', 'fuk', 'fck', 'sht', 'btch',
  'fvck', 'phuck', 'shyt', 'biatch', 'azz', 'arse',
  
  // Offensive slurs
  'faggot', 'tranny', 'dyke', 'homo', 'queer',
  
  // Hate speech
  'nazi', 'hitler', 'terrorist', 'jihad',
];

// Create regex patterns for each bad word (case-insensitive, word boundaries)
const patterns = badWords.map(word => {
  // Escape special regex characters
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`\\b${escaped}\\b`, 'gi');
});

/**
 * Check if text contains profanity
 * @param {string} text - Text to check
 * @returns {boolean} - True if profanity detected
 */
function containsProfanity(text) {
  if (!text || typeof text !== 'string') return false;
  
  const lowerText = text.toLowerCase();
  
  // Check against all patterns
  for (const pattern of patterns) {
    if (pattern.test(lowerText)) {
      return true;
    }
  }
  
  return false;
}

/**
 * Filter profanity from text
 * @param {string} text - Text to filter
 * @returns {string} - Filtered text or replacement message
 */
function filterProfanity(text) {
  if (!text || typeof text !== 'string') return text;
  
  // If profanity detected, return replacement message
  if (containsProfanity(text)) {
    return '=-) better luck next time';
  }
  
  return text;
}

/**
 * Get profanity severity (for logging/analytics)
 * @param {string} text - Text to check
 * @returns {object} - { hasProfanity: boolean, count: number }
 */
function getProfanitySeverity(text) {
  if (!text || typeof text !== 'string') {
    return { hasProfanity: false, count: 0 };
  }
  
  let count = 0;
  const lowerText = text.toLowerCase();
  
  for (const pattern of patterns) {
    const matches = lowerText.match(pattern);
    if (matches) {
      count += matches.length;
    }
  }
  
  return {
    hasProfanity: count > 0,
    count
  };
}

module.exports = {
  containsProfanity,
  filterProfanity,
  getProfanitySeverity
};
