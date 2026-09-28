// Entity Extractor for Foods, Quantities, Units, Meal Types, and Calories

const { normalizeText, parseQuantity } = require('./tokenizer');
const { FOOD_DATABASE } = require('./foodDatabase');

const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack'];

/**
 * Infers default meal type based on current hour of day.
 * @returns {string}
 */
function inferDefaultMeal() {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 11) return 'breakfast';
  if (hour >= 11 && hour < 16) return 'lunch';
  if (hour >= 16 && hour < 19) return 'snack';
  return 'dinner';
}

/**
 * Extracts meal type from text.
 * @param {string} text
 * @returns {string}
 */
function extractMealType(text) {
  const lower = text.toLowerCase();
  if (/\bbreakfast\b/i.test(lower)) return 'breakfast';
  if (/\blunch\b/i.test(lower)) return 'lunch';
  if (/\bdinner\b/i.test(lower)) return 'dinner';
  if (/\b(snack|snacks|tea time|supper)\b/i.test(lower)) return 'snack';
  return inferDefaultMeal();
}

/**
 * Extracts explicit calorie amount if specified (e.g., "450 cal", "500 kcal", "300 calories").
 * @param {string} text
 * @returns {number|null}
 */
function extractExplicitCalories(text) {
  const match = text.match(/\b(\d+)\s*(cal|cals|calorie|calories|kcal)\b/i);
  if (match) {
    return parseInt(match[1], 10);
  }
  return null;
}

/**
 * Extracts goal calories from "set goal to 2200" or similar.
 * @param {string} text
 * @returns {number|null}
 */
function extractGoalCalories(text) {
  const match = text.match(/\b(\d{3,5})\b/);
  if (match) {
    const val = parseInt(match[1], 10);
    if (val >= 500 && val <= 10000) return val;
  }
  return null;
}

/**
 * Finds all matching food items in text and attempts to parse associated quantities.
 * Supports multiple items in a single sentence: "2 eggs and a banana".
 * @param {string} text
 * @returns {Array<{ food: object, quantity: number, totalCalories: number, protein: number, carbs: number, fat: number, matchedText: string }>}
 */
function extractFoodEntities(text) {
  const normalized = normalizeText(text);
  const words = normalized.split(' ');
  const extracted = [];
  const matchedSpans = [];

  // Sort food database by synonym length descending (match "grilled chicken breast" before "chicken")
  const synonymList = [];
  for (const food of FOOD_DATABASE) {
    for (const syn of food.synonyms) {
      synonymList.push({ synonym: syn.toLowerCase(), food });
    }
  }
  synonymList.sort((a, b) => b.synonym.length - a.synonym.length);

  for (const { synonym, food } of synonymList) {
    // Check if whole synonym appears as a substring/phrase
    const synRegex = new RegExp(`\\b${synonym.replace(/\s+/g, '\\s+')}\\b`, 'i');
    const match = normalized.match(synRegex);

    if (match && match.index !== undefined) {
      const startIdx = match.index;
      const endIdx = startIdx + match[0].length;

      // Check overlap with already extracted spans
      const overlaps = matchedSpans.some(span => 
        (startIdx >= span.start && startIdx < span.end) ||
        (endIdx > span.start && endIdx <= span.end)
      );

      if (!overlaps) {
        matchedSpans.push({ start: startIdx, end: endIdx, foodId: food.id });

        // Find quantity preceding this food
        const beforeText = normalized.substring(0, startIdx).trim();
        const beforeWords = beforeText.split(' ').filter(Boolean);

        let quantity = 1; // default 1
        if (beforeWords.length > 0) {
          // Check last 1-3 words before the food item for a number or quantity word
          const lastWord = beforeWords[beforeWords.length - 1];
          const secondLastWord = beforeWords.length >= 2 ? beforeWords[beforeWords.length - 2] : null;

          // Check if last word is a unit like "slices of", "cups of", "bowls of"
          if (['slices', 'slice', 'cups', 'cup', 'bowls', 'bowl', 'plates', 'plate', 'glasses', 'glass', 'pieces', 'piece', 'of'].includes(lastWord)) {
            if (secondLastWord) {
              const q = parseQuantity(secondLastWord);
              if (q !== null) quantity = q;
            }
          } else {
            const q = parseQuantity(lastWord);
            if (q !== null) quantity = q;
          }
        }

        const totalCalories = Math.round(food.calories * quantity);
        const protein = Math.round((food.protein * quantity) * 10) / 10;
        const carbs = Math.round((food.carbs * quantity) * 10) / 10;
        const fat = Math.round((food.fat * quantity) * 10) / 10;

        extracted.push({
          food,
          foodName: food.name,
          quantity,
          unit: food.servingUnit,
          totalCalories,
          protein,
          carbs,
          fat,
          matchedText: match[0]
        });
      }
    }
  }

  return extracted;
}

/**
 * Searches for a food item in the database for nutrition lookup questions.
 * @param {string} text
 * @returns {object|null}
 */
function findFoodForNutritionQuery(text) {
  const normalized = normalizeText(text);
  for (const food of FOOD_DATABASE) {
    for (const syn of food.synonyms) {
      const synRegex = new RegExp(`\\b${syn.replace(/\s+/g, '\\s+')}\\b`, 'i');
      if (synRegex.test(normalized)) {
        return food;
      }
    }
  }
  return null;
}

module.exports = {
  extractMealType,
  extractExplicitCalories,
  extractGoalCalories,
  extractFoodEntities,
  findFoodForNutritionQuery,
  MEAL_TYPES
};
