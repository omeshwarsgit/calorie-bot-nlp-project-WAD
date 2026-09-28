// Intent Classifier for NLP Calorie Tracker

const { normalizeText } = require('./tokenizer');

const INTENTS = {
  GREETING: 'greeting',
  HELP: 'help',
  LOG_FOOD: 'log_food',
  MANUAL_LOG_CALORIES: 'manual_log_calories',
  GET_SUMMARY: 'get_summary',
  GET_NUTRITION_INFO: 'get_nutrition_info',
  SET_GOAL: 'set_goal',
  LIST_MEALS: 'list_meals',
  CLEAR_MEALS: 'clear_meals',
  UNKNOWN: 'unknown'
};

/**
 * Classifies the intent of user input.
 * @param {string} text
 * @returns {{ intent: string, confidence: number }}
 */
function classifyIntent(text) {
  const normalized = normalizeText(text);

  // 1. Direct Calorie Logging Intent ("log 450 calories", "add 350 kcal for lunch")
  const manualLogRegex = /\b(log|add|record|enter|consumed|ate|had)\s+(\d+)\s*(cal|cals|calorie|calories|kcal)\b/i;
  const justCaloriesRegex = /^\s*(\d+)\s*(cal|cals|calorie|calories|kcal)\s*(for\s+[a-z]+)?$/i;
  if (manualLogRegex.test(normalized) || justCaloriesRegex.test(normalized)) {
    return { intent: INTENTS.MANUAL_LOG_CALORIES, confidence: 0.95 };
  }

  // 2. Set Goal Intent ("set goal to 2000", "my daily target is 2200 kcal")
  const goalRegex = /\b(set|change|update|make)\s+(my\s+)?(daily\s+)?(calorie\s+)?(goal|target|limit)\s+(to\s+)?(\d+)/i;
  const goalRegex2 = /\b(goal|target)\s*(is|=|:)\s*(\d+)/i;
  if (goalRegex.test(normalized) || goalRegex2.test(normalized)) {
    return { intent: INTENTS.SET_GOAL, confidence: 0.95 };
  }

  // 3. Clear/Reset Intent ("clear meals", "clear all", "reset day", "delete all meals")
  const clearRegex = /\b(clear|reset|delete|wipe|erase|empty|remove)\s+(all\s+)?(my\s+)?(all\s+)?(meals?|food|logs?|entries|today|day|history|intake)\b/i;
  const standaloneClear = /^(clear\s*all|reset\s*all|clear\s*today|reset\s*today|reset\s*day|clear\s*day|clear\s*meals|start\s*over|empty\s*meals|delete\s*all)$/i;
  if (clearRegex.test(normalized) || standaloneClear.test(normalized)) {
    return { intent: INTENTS.CLEAR_MEALS, confidence: 0.95 };
  }

  // 4. Daily Summary / Intake status ("how many calories did I eat today", "calories left", "daily summary")
  // Check this BEFORE nutrition info so "how many calories did I eat" matches summary!
  const summaryRegex = /\b(how many calories (did i|have i|i have|left|remaining)|calories left|remaining calories|my summary|daily summary|calorie status|how much have i eaten|total calories|calories so far)\b/i;
  if (summaryRegex.test(normalized)) {
    return { intent: INTENTS.GET_SUMMARY, confidence: 0.94 };
  }

  // 5. Calorie / Nutrition Query Intent ("how many calories in an apple?", "nutrition of banana", "what are the calories in pizza")
  const nutritionQueryRegex = /\b(calories in|nutrition of|nutrition info|nutrition in|calorie count of|how much calories in|how many calories does|how many calories in)\b/i;
  if (nutritionQueryRegex.test(normalized)) {
    return { intent: INTENTS.GET_NUTRITION_INFO, confidence: 0.92 };
  }

  // 6. List meals ("what did I eat", "show my meals", "list food", "today's meals")
  const listRegex = /\b(what did i eat|show (my )?meals|list (my )?meals|food log|view meals|show food log|what have i eaten)\b/i;
  if (listRegex.test(normalized)) {
    return { intent: INTENTS.LIST_MEALS, confidence: 0.9 };
  }

  // 7. Greeting ("hi", "hello", "good morning")
  const greetingRegex = /^(hi|hello|hey|greetings|good morning|good afternoon|good evening|yo|sup)$/i;
  if (greetingRegex.test(normalized)) {
    return { intent: INTENTS.GREETING, confidence: 0.95 };
  }

  // 8. Help / Capabilities ("help", "what can you do", "commands")
  const helpRegex = /\b(help|what can you do|features|how to use|commands|instructions)\b/i;
  if (helpRegex.test(normalized)) {
    return { intent: INTENTS.HELP, confidence: 0.95 };
  }

  // 9. Food Logging Intent (check for action verbs like "ate", "had", "drank", "eating", or food item mentions)
  const logVerbRegex = /\b(ate|had|eaten|eating|drank|drinking|drink|consumed|having|finished|log|add|snacked on)\b/i;
  if (logVerbRegex.test(normalized)) {
    return { intent: INTENTS.LOG_FOOD, confidence: 0.88 };
  }

  // Check if meal prefixes exist ("breakfast: 2 eggs", "for lunch I took...")
  const mealPrefixRegex = /\b(breakfast|lunch|dinner|snack|snacks)\b/i;
  if (mealPrefixRegex.test(normalized)) {
    return { intent: INTENTS.LOG_FOOD, confidence: 0.85 };
  }

  // Check if any food or combo in database is directly mentioned
  const { FOOD_DATABASE } = require('./foodDatabase');
  const hasFoodMention = FOOD_DATABASE.some(food =>
    food.synonyms.some(syn => {
      const r = new RegExp(`\\b${syn.replace(/\s+/g, '\\s+')}\\b`, 'i');
      return r.test(normalized);
    })
  );
  if (hasFoodMention) {
    return { intent: INTENTS.LOG_FOOD, confidence: 0.92 };
  }

  // Default fallback
  return { intent: INTENTS.UNKNOWN, confidence: 0.3 };
}

module.exports = {
  INTENTS,
  classifyIntent
};
