// NLP Pipeline Coordinator for Calorie Tracker Chatbot

const { classifyIntent, INTENTS } = require('./intentClassifier');
const {
  extractMealType,
  extractExplicitCalories,
  extractGoalCalories,
  extractFoodEntities,
  findFoodForNutritionQuery
} = require('./entityExtractor');

/**
 * Processes a user message through the NLP pipeline.
 * @param {string} text - Raw user input text
 * @param {object} context - Current state context { mealsToday, dailyGoal, totalCaloriesToday }
 * @returns {object} Processed NLP result
 */
function processNLP(text, context = {}) {
  const { intent, confidence } = classifyIntent(text);
  const mealType = extractMealType(text);
  const explicitCalories = extractExplicitCalories(text);

  const result = {
    originalText: text,
    intent,
    confidence,
    mealType,
    reply: '',
    action: null, // 'ADD_MEALS' | 'SET_GOAL' | 'CLEAR_MEALS' | null
    payload: null
  };

  switch (intent) {
    case INTENTS.LOG_FOOD: {
      const foodEntities = extractFoodEntities(text);

      if (foodEntities.length > 0) {
        result.action = 'ADD_MEALS';
        result.payload = {
          meals: foodEntities.map(item => ({
            foodName: item.foodName,
            mealType,
            quantity: item.quantity,
            unit: item.unit,
            calories: item.totalCalories,
            protein: item.protein,
            carbs: item.carbs,
            fat: item.fat,
            source: 'nlp_chat'
          }))
        };

        const totalCalories = foodEntities.reduce((sum, item) => sum + item.totalCalories, 0);
        const itemDescriptions = foodEntities.map(i => `${i.quantity}x ${i.foodName} (${i.totalCalories} kcal)`).join(', ');

        result.reply = `Logged for ${mealType.toUpperCase()}: ${itemDescriptions}. Total: +${totalCalories} kcal.`;
        result.extractedCards = foodEntities;
      } else if (explicitCalories) {
        // Fallback: action verb with explicit calories like "ate a sandwich 400 cal"
        result.action = 'ADD_MEALS';
        result.payload = {
          meals: [{
            foodName: 'Custom Meal',
            mealType,
            quantity: 1,
            unit: 'serving',
            calories: explicitCalories,
            protein: 0,
            carbs: 0,
            fat: 0,
            source: 'nlp_chat'
          }]
        };
        result.reply = `Logged ${explicitCalories} kcal for your ${mealType}.`;
      } else {
        result.reply = `I noticed you're logging food, but I couldn't recognize the specific item. You can say something like "I ate 2 eggs and toast for breakfast" or use the Manual Entry form!`;
      }
      break;
    }

    case INTENTS.MANUAL_LOG_CALORIES: {
      if (explicitCalories) {
        result.action = 'ADD_MEALS';
        result.payload = {
          meals: [{
            foodName: 'Quick Calorie Log',
            mealType,
            quantity: 1,
            unit: 'serving',
            calories: explicitCalories,
            protein: 0,
            carbs: 0,
            fat: 0,
            source: 'nlp_manual_quick'
          }]
        };
        result.reply = `Added ${explicitCalories} kcal to your ${mealType} log!`;
      } else {
        result.reply = `Please specify the calorie amount (e.g., "log 400 calories for lunch").`;
      }
      break;
    }

    case INTENTS.GET_NUTRITION_INFO: {
      const food = findFoodForNutritionQuery(text);
      if (food) {
        result.reply = `1 ${food.servingUnit} of ${food.name} has ${food.calories} kcal (Protein: ${food.protein}g, Carbs: ${food.carbs}g, Fat: ${food.fat}g). Say "I ate ${food.name}" to log it!`;
        result.nutritionCard = food;
      } else {
        result.reply = `I don't have that specific item in my quick database yet, but you can log any custom item with calories using "Log [calories] kcal for [meal]" or the Manual Entry form!`;
      }
      break;
    }

    case INTENTS.GET_SUMMARY: {
      const total = context.totalCaloriesToday || 0;
      const goal = context.dailyGoal || 2000;
      const remaining = goal - total;
      const count = (context.mealsToday || []).length;

      if (remaining > 0) {
        result.reply = `Daily Progress: You have consumed ${total} / ${goal} kcal (${count} meals logged). You have ${remaining} kcal left for today! Keep it up! 💪`;
      } else {
        result.reply = `Daily Progress: You have reached ${total} / ${goal} kcal (${count} meals logged). You are ${Math.abs(remaining)} kcal over your target!`;
      }
      break;
    }

    case INTENTS.LIST_MEALS: {
      const meals = context.mealsToday || [];
      if (meals.length === 0) {
        result.reply = `You haven't logged any meals today yet! Tell me what you ate or use the Manual Entry form to get started.`;
      } else {
        const mealList = meals.map(m => `• ${m.quantity ? m.quantity + 'x ' : ''}${m.foodName} (${m.calories} kcal, ${m.mealType})`).join('\n');
        result.reply = `Here is what you logged today:\n${mealList}`;
      }
      break;
    }

    case INTENTS.SET_GOAL: {
      const newGoal = extractGoalCalories(text);
      if (newGoal) {
        result.action = 'SET_GOAL';
        result.payload = { dailyGoal: newGoal };
        result.reply = `Daily calorie goal updated to ${newGoal} kcal! 🎯`;
      } else {
        result.reply = `Please provide a valid calorie number (e.g., "Set my calorie goal to 2000").`;
      }
      break;
    }

    case INTENTS.CLEAR_MEALS: {
      result.action = 'CLEAR_MEALS';
      result.reply = `Cleared today's meal records. You're starting with a fresh plate! 🥗`;
      break;
    }

    case INTENTS.GREETING: {
      result.reply = `Hello! 👋 I'm NutriBot, your intelligent calorie tracking assistant. You can tell me what you ate (e.g. "I ate 2 bananas for breakfast"), ask for nutrition info, or use the Manual Entry form. How can I help you today?`;
      break;
    }

    case INTENTS.HELP: {
      result.reply = `Here is what I can do for you:\n• "I ate 2 boiled eggs and toast for breakfast" (Smart food logging)\n• "Log 450 calories for lunch" (Quick manual calorie entry)\n• "How many calories in an avocado?" (Nutrition lookup)\n• "How many calories left today?" (Daily summary)\n• "Set my goal to 2200 kcal" (Goal configuration)\n• "What did I eat today?" (List all meals)`;
      break;
    }

    default: {
      // Check if maybe user just typed a single food item like "banana" or "2 eggs"
      const foodEntities = extractFoodEntities(text);
      if (foodEntities.length > 0) {
        result.intent = INTENTS.LOG_FOOD;
        result.confidence = 0.92;
        result.action = 'ADD_MEALS';
        result.payload = {
          meals: foodEntities.map(item => ({
            foodName: item.foodName,
            mealType,
            quantity: item.quantity,
            unit: item.unit,
            calories: item.totalCalories,
            protein: item.protein,
            carbs: item.carbs,
            fat: item.fat,
            source: 'nlp_implicit'
          }))
        };
        const totalCalories = foodEntities.reduce((sum, item) => sum + item.totalCalories, 0);
        const itemDescriptions = foodEntities.map(i => `${i.quantity}x ${i.foodName} (${i.totalCalories} kcal)`).join(', ');
        result.reply = `Added ${itemDescriptions} to ${mealType.toUpperCase()} (${totalCalories} kcal).`;
        result.extractedCards = foodEntities;
      } else {
        result.reply = `I didn't quite catch that. Try saying something like: "I ate 2 apples for snack", "Log 300 kcal for dinner", or click "Manual Entry" above to add custom foods!`;
      }
    }
  }

  return result;
}

module.exports = {
  processNLP
};
