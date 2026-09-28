// File-based Storage Engine for Meals and User Preferences

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA_FILE = path.join(__dirname, 'meals.json');

const DEFAULT_STATE = {
  dailyGoal: 2000,
  meals: [
    {
      id: 'demo_1',
      foodName: 'Oatmeal with Blueberries',
      mealType: 'breakfast',
      quantity: 1,
      unit: 'bowl',
      calories: 234,
      protein: 6.1,
      carbs: 48.4,
      fat: 3.0,
      timestamp: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
      source: 'nlp_chat'
    },
    {
      id: 'demo_2',
      foodName: 'Boiled Egg',
      mealType: 'breakfast',
      quantity: 2,
      unit: 'large',
      calories: 156,
      protein: 12.6,
      carbs: 1.2,
      fat: 10.6,
      timestamp: new Date(Date.now() - 3 * 3600 * 1000 + 300000).toISOString(),
      source: 'nlp_chat'
    },
    {
      id: 'demo_3',
      foodName: 'Grilled Chicken Breast',
      mealType: 'lunch',
      quantity: 1,
      unit: '100g',
      calories: 165,
      protein: 31.0,
      carbs: 0.0,
      fat: 3.6,
      timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      source: 'manual'
    },
    {
      id: 'demo_4',
      foodName: 'White Rice (cooked)',
      mealType: 'lunch',
      quantity: 1,
      unit: 'cup',
      calories: 205,
      protein: 4.2,
      carbs: 45.0,
      fat: 0.4,
      timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      source: 'manual'
    }
  ]
};

function ensureDataFile() {
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(DEFAULT_STATE, null, 2), 'utf-8');
  }
}

function loadData() {
  try {
    ensureDataFile();
    const content = fs.readFileSync(DATA_FILE, 'utf-8');
    const data = JSON.parse(content);
    if (!data.meals || !Array.isArray(data.meals)) data.meals = [];
    if (!data.dailyGoal) data.dailyGoal = 2000;
    return data;
  } catch (err) {
    console.error('Error reading meals.json, returning default state:', err.message);
    return JSON.parse(JSON.stringify(DEFAULT_STATE));
  }
}

function saveData(data) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error('Error writing meals.json:', err.message);
    return false;
  }
}

function isToday(dateString) {
  const d = new Date(dateString);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

function addMeals(newMealsArray) {
  const data = loadData();
  const added = [];

  for (const m of newMealsArray) {
    const meal = {
      id: 'm_' + Date.now() + '_' + crypto.randomBytes(4).toString('hex'),
      foodName: m.foodName || 'Meal',
      mealType: m.mealType || 'snack',
      quantity: Number(m.quantity) || 1,
      unit: m.unit || 'serving',
      calories: Math.round(Number(m.calories) || 0),
      protein: Math.round((Number(m.protein) || 0) * 10) / 10,
      carbs: Math.round((Number(m.carbs) || 0) * 10) / 10,
      fat: Math.round((Number(m.fat) || 0) * 10) / 10,
      timestamp: m.timestamp || new Date().toISOString(),
      source: m.source || 'manual'
    };
    data.meals.unshift(meal);
    added.push(meal);
  }

  saveData(data);
  return added;
}

function deleteMeal(id) {
  const data = loadData();
  const initialLen = data.meals.length;
  data.meals = data.meals.filter(m => m.id !== id);
  if (data.meals.length !== initialLen) {
    saveData(data);
    return true;
  }
  return false;
}

function setDailyGoal(goal) {
  const data = loadData();
  const num = parseInt(goal, 10);
  if (!isNaN(num) && num > 0) {
    data.dailyGoal = num;
    saveData(data);
    return data.dailyGoal;
  }
  return data.dailyGoal;
}

function clearMeals() {
  const data = loadData();
  data.meals = [];
  saveData(data);
  return true;
}

function getSummary() {
  const data = loadData();
  const todayMeals = data.meals.filter(m => isToday(m.timestamp));

  const totalCalories = todayMeals.reduce((sum, m) => sum + (m.calories || 0), 0);
  const totalProtein = Math.round(todayMeals.reduce((sum, m) => sum + (m.protein || 0), 0) * 10) / 10;
  const totalCarbs = Math.round(todayMeals.reduce((sum, m) => sum + (m.carbs || 0), 0) * 10) / 10;
  const totalFat = Math.round(todayMeals.reduce((sum, m) => sum + (m.fat || 0), 0) * 10) / 10;

  const mealTypeBreakdown = {
    breakfast: { calories: 0, count: 0 },
    lunch: { calories: 0, count: 0 },
    dinner: { calories: 0, count: 0 },
    snack: { calories: 0, count: 0 }
  };

  for (const m of todayMeals) {
    const type = m.mealType && mealTypeBreakdown[m.mealType] ? m.mealType : 'snack';
    mealTypeBreakdown[type].calories += m.calories || 0;
    mealTypeBreakdown[type].count += 1;
  }

  const remaining = Math.max(0, data.dailyGoal - totalCalories);
  const percentage = Math.min(100, Math.round((totalCalories / data.dailyGoal) * 100));

  return {
    dailyGoal: data.dailyGoal,
    totalCalories,
    remainingCalories: remaining,
    goalPercentage: percentage,
    totalProtein,
    totalCarbs,
    totalFat,
    mealsCount: todayMeals.length,
    mealTypeBreakdown,
    mealsToday: todayMeals,
    allMeals: data.meals
  };
}

module.exports = {
  loadData,
  saveData,
  addMeals,
  deleteMeal,
  setDailyGoal,
  clearMeals,
  getSummary
};
