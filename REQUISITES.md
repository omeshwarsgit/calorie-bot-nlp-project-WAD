# Project Requisites & System Requirements

> **Project Title**: NutriBot — NLP-Based Intelligent Calorie Tracking Assistant  
> **Course / Purpose**: Web Application Development (WAD) — ISE 3  
> **Repository**: `calorie-bot-nlp-project-WAD`

This document details all the required programming languages, runtime environments, core modules, system requirements, and the complete file breakdown needed to run and evaluate this project.

---

## 1. Programming Languages & Technologies

| Layer | Language / Standard | Purpose |
|---|---|---|
| **Backend** | **JavaScript (ES6+)** | REST API endpoints, NLP pipeline, and local persistence |
| **Frontend Structure** | **HTML5** | Accessible semantic elements, modal dialogs, SVG progress ring |
| **Frontend Styling** | **CSS3** | Glassmorphism, CSS variables, Dark/Light modes, responsive grid |
| **Frontend Logic** | **JavaScript (ES6+)** | Dynamic DOM rendering, state management, audio synthesis, speech STT |
| **Data Format** | **JSON** | File-based database storage and REST API communication |

---

## 2. Runtime & Environment Requirements

* **Node.js**: `v16.0.0` or higher (Recommended: `v18+` or `v22+`).
  * Check version: `node -v`
* **NPM**: `v8.0.0` or higher (Comes pre-installed with Node.js).
  * Check version: `npm -v`
* **Operating System**: Platform-independent (Works seamlessly on **macOS**, **Windows**, and **Linux**).
* **Web Browser**: Any modern browser (Google Chrome, Firefox, Edge, Safari, Brave).
  * *Note: Voice input uses the browser's native Web Speech API, best supported on Chromium-based browsers (Chrome, Edge, Brave) and Safari.*

---

## 3. Libraries & External Dependencies

### 🌟 Zero External Dependencies (Zero-Install Architecture)
To ensure that **anyone who downloads this project can run it immediately without dependency installation failures or firewall/network issues**, this project was designed with **zero third-party npm package dependencies**.

* You do **NOT** need to run `npm install` or download hundreds of megabytes of `node_modules`.
* It runs straight out of the box using Node.js built-in standard library.

---

## 4. Node.js Core Modules Utilized

| Module | Built-in | Usage in Project |
|---|---|---|
| `http` | Yes (`node:http`) | Powers the HTTP web server, routing, REST API endpoints, and CORS handling |
| `fs` | Yes (`node:fs`) | Reads and writes the persistent JSON file database (`data/meals.json`) and streams static assets |
| `path` | Yes (`node:path`) | Safe cross-platform filepath resolution and directory security validation |
| `url` | Yes (`node:url`) | URL parsing and query parameter extraction (e.g. food search `/api/foods?q=...`) |
| `crypto` | Yes (`node:crypto`) | Generates collision-free cryptographically random IDs for meal entries |

---

## 5. Web & Browser APIs Utilized

| Browser API | Purpose |
|---|---|
| **Fetch API** | Asynchronous HTTP requests (`GET`, `POST`, `DELETE`) between UI and Node.js server |
| **Web Speech API** | Hands-free voice recognition (`SpeechRecognition` / `webkitSpeechRecognition`) |
| **Web Audio API** | Real-time audio oscillator for synthesized message chime (zero external audio files) |
| **LocalStorage API** | Persists user theme preference (Dark Mode vs Light Mode) |
| **Scalable Vector Graphics (SVG)** | Interactive circular progress ring with animated stroke-dashoffset |

---

## 6. Project Files & Directory Structure

```
wad ise 3/
│
├── server.js               # Main entry point: Node.js HTTP server, router & static file handler
├── package.json            # Project manifest, metadata, and start scripts
├── README.md               # Main project documentation & user manual
├── REQUISITES.md           # System requisites, language, and module documentation (this file)
├── requisites.txt          # Plain text summary of requirements
├── .gitignore              # Git ignore rules for logs and temporary files
│
├── data/                   # Data Storage Layer
│   ├── storage.js          # Persistence controller (CRUD operations, daily summary calculator)
│   └── meals.json          # Persistent JSON database (sample meals and daily targets)
│
├── nlp/                    # Natural Language Processing Engine
│   ├── index.js            # NLP Pipeline coordinator and action executor
│   ├── tokenizer.js        # Text cleaner, contractions expander, number word converter
│   ├── intentClassifier.js # Intent classifier (food logging, queries, summaries, goal setting)
│   ├── entityExtractor.js  # Entities parser (food items, quantities, meal types, explicit calories)
│   └── foodDatabase.js     # 150+ item nutrition dictionary, combos & synonym mappings
│
└── public/                 # Frontend Web Application (Client Assets)
    ├── index.html          # Semantic dashboard structure, modals, and chatbot window
    ├── css/
    │   └── style.css       # Complete modern design system (variables, animations, responsive layout)
    └── js/
        ├── app.js          # Core app controller: State, dashboard metrics, manual entry form
        └── chat.js         # Chatbot dialog manager: NLP cards, typing state, voice STT
```

---

## 7. How to Run the Project

1. **Download or Clone the Project Folder**:
   ```bash
   cd "wad ise 3"
   ```

2. **Start the Application**:
   ```bash
   npm start
   # or
   node server.js
   ```

3. **Open the Application**:
   Open your browser and navigate to:
   ```
   http://localhost:3000
   ```
