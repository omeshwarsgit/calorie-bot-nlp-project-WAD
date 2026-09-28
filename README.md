# NutriBot - NLP-Based Intelligent Calorie Tracking Assistant

> **WAD ISE 3 Project**: "NLP-Based Intelligent Chatbot Integrated with a Node.js and JavaScript Application for Calorie Tracking with Manual Entry"

NutriBot is a full-stack, zero-dependency Node.js and JavaScript web application that combines **Natural Language Processing (NLP)** with calorie tracking, macronutrient balance analytics, and direct manual entry.

---

## 🌟 Key Features

1. **Intelligent NLP Chatbot ("NutriBot AI")**:
   - **Natural Food Logging**: Parses everyday conversational phrases into structured meal logs:
     - *"I ate 2 bananas for breakfast"*
     - *"Had 2 boiled eggs and 1 slice of toast"*
     - *"Ate a slice of pizza and a can of coke for lunch"*
   - **Entity Extraction**: Recognizes food items, quantities (words & digits: "two", "half", "1.5"), units, and meal categories (breakfast, lunch, dinner, snack).
   - **Direct Calorie Recording**: Automatically parses quick entries like *"Log 450 calories for lunch"* or *"Add 300 kcal snack"*.
   - **Nutrition Facts Lookup**: Inquires about calories & macronutrients (e.g., *"How many calories in an avocado?"*).
   - **Intake Summaries & Status**: Answers queries like *"How many calories did I eat today?"* or *"How many calories left?"*.
   - **Interactive Entity Cards**: Displays parsed food items, quantity breakdown, confidence scores, and instant meal summary inside the chat.
   - **Speech-to-Text (Voice Input)**: Voice input via Web Speech API with real-time listening animation.

2. **Calorie & Macronutrient Dashboard**:
   - **Dynamic SVG Calorie Balance Ring**: Real-time circular progress indicator showing consumed vs. target calories.
   - **Macronutrient Tracking**: Live visual breakdown for Protein, Carbohydrates, and Fats.
   - **Daily Status Badges**: Automatically displays status (*On Track*, *Nearly Reached*, *Over Target*).

3. **Manual Food Entry**:
   - Clean, accessible modal for custom foods and home-cooked recipes.
   - **Live 150+ Food Autocomplete**: Real-time suggestions with pre-filled standard calories, serving sizes, and macros.
   - Flexible quantity multipliers and optional macronutrient inputs (Protein, Carbs, Fats).

4. **Logged Intake Timeline**:
   - Filter by meal type: **All**, **Breakfast**, **Lunch**, **Dinner**, **Snacks**.
   - Displays time, calorie count, macronutrient pill tags, and source badge (**🤖 NLP** vs. **✍️ Manual**).
   - Instant delete and single-click day reset.

5. **Zero External Dependencies**:
   - Powered purely by Node.js built-in modules (`http`, `fs`, `path`, `url`, `crypto`).
   - Runs out of the box on any system with `node server.js`—no `npm install` connection issues or heavy dependencies.
   - Persistent JSON storage in `data/meals.json`.
   - Dark mode & Light mode with persistent user preference.

---

## 🏗️ Architecture

```
wad-ise-3/
├── server.js               # Pure Node.js HTTP server & REST API router
├── package.json            # Project manifest & start script
├── README.md               # Project documentation
├── data/
│   ├── storage.js          # File persistence engine
│   └── meals.json          # Persistent JSON storage
├── nlp/
│   ├── index.js            # NLP Pipeline coordinator
│   ├── tokenizer.js        # Normalization, contractions, & number parser
│   ├── intentClassifier.js # Pattern matching & intent recognition
│   ├── entityExtractor.js  # Food entity linking & quantity extraction
│   └── foodDatabase.js     # 150+ food nutrition database
└── public/
    ├── index.html          # Semantic HTML5 UI
    ├── css/
    │   └── style.css       # Modern CSS design system (Dark & Light theme)
    └── js/
        ├── app.js          # State management, dashboard, manual entry
        └── chat.js         # Chatbot dialog, entity cards, & voice STT
```

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v16.0.0 or higher)

### Run the Application
1. Clone the repository:
   ```bash
   git clone <repo-url>
   cd "wad ise 3"
   ```
2. Start the server (zero dependencies needed!):
   ```bash
   node server.js
   # or
   npm start
   ```
3. Open your browser and navigate to:
   ```
   http://localhost:3000
   ```

---

## 📡 REST API Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/summary` | Get current calorie balance, macros, and today's meals |
| `GET` | `/api/foods?q=...` | Search food database for autocomplete suggestions |
| `GET` | `/api/meals` | Retrieve all logged meals |
| `POST` | `/api/meals` | Add manual meal `{ foodName, mealType, calories, ... }` |
| `DELETE` | `/api/meals/:id` | Delete a logged meal by ID |
| `POST` | `/api/goal` | Update daily calorie target `{ dailyGoal: 2200 }` |
| `POST` | `/api/clear` | Clear today's logged meals |
| `POST` | `/api/chat` | Send message to NLP engine `{ message: "..." }` |

---

## 🧪 Example Chatbot Commands

- `I ate 2 bananas for breakfast`
- `Had 2 boiled eggs and 1 bread slice`
- `Ate 1 slice of pizza for lunch`
- `Log 400 calories for dinner`
- `How many calories in an avocado?`
- `How many calories did I eat today?`
- `Set my goal to 2200 kcal`
- `Show my meals`

---

## 🎓 Academic Submission
- **Subject**: Web Application Development (WAD)
- **Evaluation**: ISE 3 Project
- **Tech Stack**: Node.js, JavaScript, HTML5, CSS3, Natural Language Processing
