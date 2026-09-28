// Tokenizer, Normalizer and Text Preprocessing for NLP Chatbot

const NUMBER_WORDS = {
  'zero': 0, 'a': 1, 'an': 1, 'one': 1, 'single': 1,
  'two': 2, 'couple': 2, 'pair': 2, 'double': 2,
  'three': 3, 'four': 4, 'five': 5, 'six': 6,
  'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10,
  'half': 0.5, 'quarter': 0.25, 'third': 0.33,
  'dozen': 12, 'few': 3
};

const CONTRACTIONS = {
  "i've": "i have",
  "i'm": "i am",
  "i'll": "i will",
  "i'd": "i would",
  "what's": "what is",
  "how's": "how is",
  "can't": "can not",
  "don't": "do not",
  "didn't": "did not",
  "won't": "will not",
  "it's": "it is"
};

/**
 * Normalizes input text: lowercases, expands contractions, cleans punctuation.
 * @param {string} text
 * @returns {string}
 */
function normalizeText(text) {
  if (!text || typeof text !== 'string') return '';
  let cleaned = text.toLowerCase().trim();

  // Expand contractions
  for (const [key, expanded] of Object.entries(CONTRACTIONS)) {
    const regex = new RegExp(`\\b${key}\\b`, 'g');
    cleaned = cleaned.replace(regex, expanded);
  }

  // Remove trailing and leading punctuation, keep internal hyphens and decimals
  cleaned = cleaned.replace(/[!?.,;:@#$%^&*()_+={}\[\]<>\\\/~`"]/g, ' ');
  // Collapse whitespace
  cleaned = cleaned.replace(/\s+/g, ' ').trim();

  return cleaned;
}

/**
 * Tokenizes text into word array.
 * @param {string} text
 * @returns {string[]}
 */
function tokenize(text) {
  const normalized = normalizeText(text);
  if (!normalized) return [];
  return normalized.split(' ');
}

/**
 * Converts word numbers ("two", "a", "half") or digits ("2", "1.5") to a number.
 * @param {string} word
 * @returns {number|null}
 */
function parseQuantity(word) {
  if (!word) return null;
  const lower = word.toLowerCase().trim();
  if (NUMBER_WORDS[lower] !== undefined) {
    return NUMBER_WORDS[lower];
  }
  const num = parseFloat(lower);
  if (!isNaN(num) && num > 0) {
    return num;
  }
  return null;
}

module.exports = {
  normalizeText,
  tokenize,
  parseQuantity,
  NUMBER_WORDS
};
