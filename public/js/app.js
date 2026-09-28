// ==========================================================================
// NutriBot App Logic: State Management, Dashboard Rendering, Manual Entry
// ==========================================================================

const AppState = {
  summary: null,
  activeFilter: 'all',
  theme: localStorage.getItem('nutribot_theme') || 'dark-theme'
};

const MEAL_ICONS = {
  breakfast: '🌅',
  lunch: '☀️',
  dinner: '🌙',
  snack: '🍎'
};

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initDateDisplay();
  initModals();
  initFilterTabs();
  initManualEntryForm();
  initGoalForm();
  initClearDayBtn();

  // Initial Fetch of Data
  fetchSummary();
});

// --- THEME TOGGLE ---
function initTheme() {
  document.body.className = AppState.theme;
  const toggleBtn = document.getElementById('themeToggleBtn');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      AppState.theme = AppState.theme === 'dark-theme' ? 'light-theme' : 'dark-theme';
      document.body.className = AppState.theme;
      localStorage.setItem('nutribot_theme', AppState.theme);
    });
  }
}

// --- DATE DISPLAY ---
function initDateDisplay() {
  const dateEl = document.getElementById('navDateText');
  if (dateEl) {
    const today = new Date();
    const options = { weekday: 'short', month: 'short', day: 'numeric' };
    dateEl.textContent = today.toLocaleDateString(undefined, options);
  }
}

// --- API CLIENT ---
async function fetchSummary() {
  try {
    const res = await fetch('/api/summary');
    const result = await res.json();
    if (result.success) {
      AppState.summary = result.data;
      updateUI();
    }
  } catch (err) {
    console.error('Error fetching summary:', err);
    showToast('Failed to connect to NutriBot server', 'error');
  }
}

// Global update dispatcher
function updateUI() {
  if (!AppState.summary) return;
  renderCalorieHero();
  renderMacros();
  renderMealsList();
}

// --- CALORIE HERO RENDERING ---
function renderCalorieHero() {
  const s = AppState.summary;
  const consumed = s.totalCalories || 0;
  const goal = s.dailyGoal || 2000;
  const remaining = Math.max(0, goal - consumed);
  const percentage = Math.min(100, Math.round((consumed / goal) * 100));

  // Update text
  document.getElementById('consumedCaloriesNum').textContent = consumed.toLocaleString();
  document.getElementById('targetCaloriesVal').innerHTML = `${goal.toLocaleString()} <small>kcal</small>`;
  document.getElementById('remainingCaloriesVal').innerHTML = `${remaining.toLocaleString()} <small>kcal</small>`;
  document.getElementById('headerGoalDisplay').textContent = `${goal} kcal`;
  document.getElementById('caloriePercentageDisplay').textContent = `${percentage}% of goal`;
  document.getElementById('mealsLoggedCount').textContent = s.mealsCount || 0;

  // SVG Circular Ring Animation (Circumference: 2 * pi * 74 ≈ 465)
  const ring = document.getElementById('calorieProgressRing');
  const circumference = 465;
  const offset = circumference - (percentage / 100) * circumference;
  ring.style.strokeDashoffset = offset;

  // Change stroke color if over target
  if (consumed > goal) {
    ring.style.stroke = 'var(--accent-rose)';
  } else {
    ring.style.stroke = 'var(--primary)';
  }

  // Status Badge
  const badge = document.getElementById('progressStatusBadge');
  if (percentage > 100) {
    badge.className = 'badge badge-danger';
    badge.textContent = `Over Target (+${consumed - goal} kcal)`;
  } else if (percentage >= 80) {
    badge.className = 'badge badge-warning';
    badge.textContent = 'Nearly Reached';
  } else {
    badge.className = 'badge badge-success';
    badge.textContent = 'On Track';
  }
}

// --- MACRONUTRIENTS RENDERING ---
function renderMacros() {
  const s = AppState.summary;
  const p = s.totalProtein || 0;
  const c = s.totalCarbs || 0;
  const f = s.totalFat || 0;

  const targetP = 130;
  const targetC = 220;
  const targetF = 65;

  document.getElementById('proteinVal').textContent = p;
  document.getElementById('carbsVal').textContent = c;
  document.getElementById('fatVal').textContent = f;

  document.getElementById('proteinBar').style.width = `${Math.min(100, (p / targetP) * 100)}%`;
  document.getElementById('carbsBar').style.width = `${Math.min(100, (c / targetC) * 100)}%`;
  document.getElementById('fatBar').style.width = `${Math.min(100, (f / targetF) * 100)}%`;
}

// --- MEALS LIST RENDERING ---
function renderMealsList() {
  const container = document.getElementById('mealsListContainer');
  const summaryText = document.getElementById('mealsSummaryText');
  const meals = (AppState.summary && AppState.summary.mealsToday) ? AppState.summary.mealsToday : [];

  const filtered = AppState.activeFilter === 'all'
    ? meals
    : meals.filter(m => m.mealType === AppState.activeFilter);

  summaryText.textContent = `${filtered.length} item${filtered.length === 1 ? '' : 's'} recorded`;

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🍽️</div>
        <p class="empty-title">No ${AppState.activeFilter === 'all' ? '' : AppState.activeFilter} meals logged yet</p>
        <p class="empty-subtitle">Use the NLP chatbot on the right or click "Manual Entry" above to log meals!</p>
      </div>
    `;
    return;
  }

  container.innerHTML = filtered.map(meal => {
    const icon = MEAL_ICONS[meal.mealType] || '🍴';
    const sourceClass = meal.source && meal.source.startsWith('nlp') ? 'nlp' : 'manual';
    const sourceLabel = meal.source && meal.source.startsWith('nlp') ? '🤖 NLP' : '✍️ Manual';
    const timeStr = meal.timestamp ? formatTime(meal.timestamp) : 'Today';

    return `
      <div class="meal-item" id="meal-${meal.id}">
        <div class="meal-info-col">
          <div class="meal-category-icon">${icon}</div>
          <div class="meal-title-group">
            <h4>${escapeHTML(meal.foodName)}</h4>
            <div class="meal-meta">
              <span>${meal.quantity ? meal.quantity + ' ' : ''}${meal.unit || 'serving'}</span>
              <span>•</span>
              <span class="source-pill ${sourceClass}">${sourceLabel}</span>
              <span>•</span>
              <span>${timeStr}</span>
            </div>
          </div>
        </div>

        <div class="meal-calories-col">
          <div class="meal-macros-pills">
            <span>P:${meal.protein || 0}g</span>
            <span>C:${meal.carbs || 0}g</span>
            <span>F:${meal.fat || 0}g</span>
          </div>
          <div class="meal-cal-badge">+${meal.calories} <small>kcal</small></div>
          <button class="meal-delete-btn" onclick="handleDeleteMeal('${meal.id}')" title="Delete entry">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
            </svg>
          </button>
        </div>
      </div>
    `;
  }).join('');
}

// --- FILTER TABS ---
function initFilterTabs() {
  const tabs = document.querySelectorAll('#mealFilterTabs .tab-btn');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      AppState.activeFilter = tab.getAttribute('data-filter');
      renderMealsList();
    });
  });
}

// --- MODAL CONTROLS ---
function initModals() {
  // Manual Entry Modal
  const openManualBtn = document.getElementById('openManualEntryBtn');
  const closeManualBtn = document.getElementById('closeManualModalBtn');
  const cancelManualBtn = document.getElementById('cancelManualModalBtn');
  const manualModal = document.getElementById('manualEntryModal');

  if (openManualBtn && manualModal) {
    openManualBtn.addEventListener('click', () => {
      manualModal.classList.add('active');
      document.getElementById('manualFoodName').focus();
    });
  }

  [closeManualBtn, cancelManualBtn].forEach(btn => {
    if (btn) {
      btn.addEventListener('click', () => {
        manualModal.classList.remove('active');
      });
    }
  });

  // Goal Modal
  const openGoalBtn = document.getElementById('openGoalModalBtn');
  const closeGoalBtn = document.getElementById('closeGoalModalBtn');
  const cancelGoalBtn = document.getElementById('cancelGoalModalBtn');
  const goalModal = document.getElementById('goalModal');

  if (openGoalBtn && goalModal) {
    openGoalBtn.addEventListener('click', () => {
      if (AppState.summary) {
        document.getElementById('goalInput').value = AppState.summary.dailyGoal;
      }
      goalModal.classList.add('active');
    });
  }

  [closeGoalBtn, cancelGoalBtn].forEach(btn => {
    if (btn) {
      btn.addEventListener('click', () => {
        goalModal.classList.remove('active');
      });
    }
  });

  // Close modals on clicking backdrop
  [manualModal, goalModal].forEach(modal => {
    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.classList.remove('active');
      });
    }
  });

  // Toggle Optional Macros Accordion
  const toggleMacrosBtn = document.getElementById('toggleMacrosOptional');
  const macrosBody = document.getElementById('macrosOptionalBody');
  if (toggleMacrosBtn && macrosBody) {
    toggleMacrosBtn.addEventListener('click', () => {
      macrosBody.classList.toggle('open');
      const arrow = toggleMacrosBtn.querySelector('.toggle-arrow');
      if (arrow) arrow.textContent = macrosBody.classList.contains('open') ? '▴' : '▾';
    });
  }
}

// --- MANUAL ENTRY FORM & AUTOCOMPLETE ---
function initManualEntryForm() {
  const form = document.getElementById('manualEntryForm');
  const foodInput = document.getElementById('manualFoodName');
  const dropdown = document.getElementById('foodAutocompleteDropdown');
  const calInput = document.getElementById('manualCalories');
  const qtyInput = document.getElementById('manualQuantity');
  const unitInput = document.getElementById('manualUnit');
  const proteinInput = document.getElementById('manualProtein');
  const carbsInput = document.getElementById('manualCarbs');
  const fatInput = document.getElementById('manualFat');

  let activeFoodBase = null;

  // Autocomplete search
  foodInput.addEventListener('input', async (e) => {
    const q = e.target.value.trim();
    if (q.length < 2) {
      dropdown.classList.remove('active');
      return;
    }

    try {
      const res = await fetch(`/api/foods?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      if (data.success && data.foods.length > 0) {
        dropdown.innerHTML = data.foods.slice(0, 6).map(f => `
          <div class="autocomplete-item" data-food='${JSON.stringify(f).replace(/'/g, "&#39;")}'>
            <span><strong>${escapeHTML(f.name)}</strong> <small>(${f.servingUnit})</small></span>
            <span class="cal-highlight">${f.calories} kcal</span>
          </div>
        `).join('');
        dropdown.classList.add('active');

        dropdown.querySelectorAll('.autocomplete-item').forEach(item => {
          item.addEventListener('click', () => {
            const food = JSON.parse(item.getAttribute('data-food'));
            activeFoodBase = food;
            foodInput.value = food.name;
            unitInput.value = food.servingUnit;
            recalculateCalories();
            dropdown.classList.remove('active');
          });
        });
      } else {
        dropdown.classList.remove('active');
      }
    } catch (err) {
      console.error(err);
    }
  });

  // Close dropdown on outside click
  document.addEventListener('click', (e) => {
    if (!foodInput.contains(e.target) && !dropdown.contains(e.target)) {
      dropdown.classList.remove('active');
    }
  });

  // Quantity change recalculates if chosen from database
  qtyInput.addEventListener('input', recalculateCalories);

  function recalculateCalories() {
    if (activeFoodBase) {
      const q = parseFloat(qtyInput.value) || 1;
      calInput.value = Math.round(activeFoodBase.calories * q);
      proteinInput.value = Math.round(activeFoodBase.protein * q * 10) / 10;
      carbsInput.value = Math.round(activeFoodBase.carbs * q * 10) / 10;
      fatInput.value = Math.round(activeFoodBase.fat * q * 10) / 10;
    }
  }

  // Submit Manual Entry
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const payload = {
      foodName: foodInput.value.trim(),
      mealType: document.getElementById('manualMealType').value,
      quantity: parseFloat(qtyInput.value) || 1,
      unit: unitInput.value.trim() || 'serving',
      calories: parseInt(calInput.value, 10),
      protein: parseFloat(proteinInput.value) || 0,
      carbs: parseFloat(carbsInput.value) || 0,
      fat: parseFloat(fatInput.value) || 0
    };

    try {
      const res = await fetch('/api/meals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (data.success) {
        AppState.summary = data.summary;
        updateUI();
        document.getElementById('manualEntryModal').classList.remove('active');
        form.reset();
        activeFoodBase = null;
        showToast(`Added ${payload.foodName} (+${payload.calories} kcal)`, 'success');
      } else {
        showToast(data.error || 'Failed to add meal', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Network error saving meal', 'error');
    }
  });
}

// --- GOAL FORM ---
function initGoalForm() {
  const form = document.getElementById('setGoalForm');
  const goalInput = document.getElementById('goalInput');

  // Preset Buttons
  document.querySelectorAll('.preset-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      goalInput.value = btn.getAttribute('data-goal');
    });
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const newGoal = parseInt(goalInput.value, 10);

    try {
      const res = await fetch('/api/goal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dailyGoal: newGoal })
      });
      const data = await res.json();

      if (data.success) {
        AppState.summary = data.summary;
        updateUI();
        document.getElementById('goalModal').classList.remove('active');
        showToast(`Target updated to ${newGoal} kcal! 🎯`, 'success');
      }
    } catch (err) {
      console.error(err);
      showToast('Error saving goal', 'error');
    }
  });
}

// --- DELETE SINGLE MEAL ENTRY (INSTANT & GLOBAL) ---
window.handleDeleteMeal = async function(id) {
  if (!id) return;

  // Visual feedback: animate row
  const row = document.getElementById(`meal-${id}`);
  if (row) {
    row.style.transition = 'all 0.25s ease';
    row.style.opacity = '0.3';
    row.style.transform = 'translateX(15px)';
  }

  try {
    const res = await fetch(`/api/meals/${encodeURIComponent(id)}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.success) {
      AppState.summary = data.summary;
      updateUI();
      showToast('Meal removed from log', 'success');
    } else {
      if (row) {
        row.style.opacity = '1';
        row.style.transform = 'none';
      }
      showToast('Could not remove meal', 'error');
    }
  } catch (err) {
    console.error('Delete meal error:', err);
    if (row) {
      row.style.opacity = '1';
      row.style.transform = 'none';
    }
    showToast('Failed to delete meal entry', 'error');
  }
};

// Also expose as local function alias
const { handleDeleteMeal } = window;

// --- CLEAR ALL MEALS (INSTANT & GLOBAL) ---
window.handleClearMeals = async function() {
  const clearModal = document.getElementById('clearConfirmModal');
  if (clearModal) clearModal.classList.remove('active');

  const navClearBtn = document.getElementById('openClearModalNavBtn');
  const headerClearBtn = document.getElementById('openClearModalHeaderBtn');
  const footerClearBtn = document.getElementById('clearAllMealsBtn');

  [navClearBtn, headerClearBtn, footerClearBtn].forEach(btn => {
    if (btn) btn.disabled = true;
  });

  try {
    const res = await fetch('/api/clear', { method: 'POST' });
    const data = await res.json();

    [navClearBtn, headerClearBtn, footerClearBtn].forEach(btn => {
      if (btn) btn.disabled = false;
    });

    if (data.success) {
      AppState.summary = data.summary;
      updateUI();
      showToast('All meals cleared! Calorie counter reset to 0 kcal 🥗', 'success');
    } else {
      showToast('Failed to clear meals', 'error');
    }
  } catch (err) {
    console.error('Clear meals error:', err);
    [navClearBtn, headerClearBtn, footerClearBtn].forEach(btn => {
      if (btn) btn.disabled = false;
    });
    showToast('Network error resetting meals', 'error');
  }
};

window.executeClearMeals = window.handleClearMeals;

function initClearDayBtn() {
  const navClearBtn = document.getElementById('openClearModalNavBtn');
  const headerClearBtn = document.getElementById('openClearModalHeaderBtn');
  const footerClearBtn = document.getElementById('clearAllMealsBtn');

  [navClearBtn, headerClearBtn, footerClearBtn].forEach(btn => {
    if (btn) btn.addEventListener('click', window.handleClearMeals);
  });
}

// --- TOAST UTILITY ---
function showToast(message, type = 'success') {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <span>${type === 'success' ? '✅' : '⚠️'}</span>
    <span>${escapeHTML(message)}</span>
  `;

  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// Helper: Format Time
function formatTime(isoString) {
  try {
    const d = new Date(isoString);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch (e) {
    return '';
  }
}

// Helper: Escape HTML
function escapeHTML(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Export for chat.js
window.NutriApp = {
  fetchSummary,
  updateUI,
  showToast,
  get summary() { return AppState.summary; },
  set summary(val) { AppState.summary = val; }
};
