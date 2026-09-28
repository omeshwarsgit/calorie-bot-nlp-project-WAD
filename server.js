// Node.js HTTP Server for NLP Calorie Tracker
// Pure Node.js zero-dependency implementation

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const storage = require('./data/storage');
const { processNLP } = require('./nlp');
const { FOOD_DATABASE } = require('./nlp/foodDatabase');

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');

const MIME_TYPES = {
  '.html': 'text/html; charset=UTF-8',
  '.css': 'text/css; charset=UTF-8',
  '.js': 'application/javascript; charset=UTF-8',
  '.json': 'application/json; charset=UTF-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

function sendJSON(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  });
  res.end(JSON.stringify(data));
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
      // Guard against huge payloads
      if (body.length > 1e6) {
        req.destroy();
        reject(new Error('Payload too large'));
      }
    });
    req.on('end', () => {
      try {
        const parsed = body ? JSON.parse(body) : {};
        resolve(parsed);
      } catch (err) {
        resolve({});
      }
    });
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  const method = req.method;

  // Handle CORS Preflight
  if (method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    return res.end();
  }

  // --- API ROUTES ---

  // GET /api/summary
  if (pathname === '/api/summary' && method === 'GET') {
    const summary = storage.getSummary();
    return sendJSON(res, 200, { success: true, data: summary });
  }

  // GET /api/foods (Search & Autocomplete)
  if (pathname === '/api/foods' && method === 'GET') {
    const query = (parsedUrl.query.q || '').toLowerCase();
    let foods = FOOD_DATABASE;
    if (query) {
      foods = FOOD_DATABASE.filter(f =>
        f.name.toLowerCase().includes(query) ||
        f.synonyms.some(s => s.toLowerCase().includes(query))
      );
    }
    return sendJSON(res, 200, { success: true, count: foods.length, foods });
  }

  // GET /api/meals
  if (pathname === '/api/meals' && method === 'GET') {
    const data = storage.loadData();
    return sendJSON(res, 200, { success: true, meals: data.meals });
  }

  // POST /api/meals (Manual Entry)
  if (pathname === '/api/meals' && method === 'POST') {
    try {
      const body = await parseBody(req);
      if (!body.foodName || body.calories === undefined) {
        return sendJSON(res, 400, { success: false, error: 'Food name and calories are required.' });
      }

      const added = storage.addMeals([{
        foodName: body.foodName.trim(),
        mealType: body.mealType || 'snack',
        quantity: Number(body.quantity) || 1,
        unit: body.unit || 'serving',
        calories: Number(body.calories) || 0,
        protein: Number(body.protein) || 0,
        carbs: Number(body.carbs) || 0,
        fat: Number(body.fat) || 0,
        timestamp: body.timestamp || new Date().toISOString(),
        source: 'manual'
      }]);

      const summary = storage.getSummary();
      return sendJSON(res, 201, { success: true, added: added[0], summary });
    } catch (err) {
      return sendJSON(res, 500, { success: false, error: err.message });
    }
  }

  // DELETE /api/meals/:id
  if (pathname.startsWith('/api/meals/') && method === 'DELETE') {
    const id = pathname.replace('/api/meals/', '');
    const deleted = storage.deleteMeal(id);
    const summary = storage.getSummary();
    return sendJSON(res, 200, { success: deleted, summary });
  }

  // POST /api/goal
  if (pathname === '/api/goal' && method === 'POST') {
    try {
      const body = await parseBody(req);
      const newGoal = storage.setDailyGoal(body.dailyGoal);
      const summary = storage.getSummary();
      return sendJSON(res, 200, { success: true, dailyGoal: newGoal, summary });
    } catch (err) {
      return sendJSON(res, 500, { success: false, error: err.message });
    }
  }

  // POST /api/clear
  if (pathname === '/api/clear' && method === 'POST') {
    storage.clearMeals();
    const summary = storage.getSummary();
    return sendJSON(res, 200, { success: true, summary });
  }

  // POST /api/chat (NLP Chatbot Processing)
  if (pathname === '/api/chat' && method === 'POST') {
    try {
      const body = await parseBody(req);
      const message = body.message || '';
      if (!message.trim()) {
        return sendJSON(res, 400, { success: false, error: 'Empty message' });
      }

      // Context for conversational awareness
      const currentSummary = storage.getSummary();
      const context = {
        dailyGoal: currentSummary.dailyGoal,
        totalCaloriesToday: currentSummary.totalCalories,
        mealsToday: currentSummary.mealsToday
      };

      // Run NLP pipeline
      const nlpResult = processNLP(message, context);

      // Execute side-effects if required by NLP action
      if (nlpResult.action === 'ADD_MEALS' && nlpResult.payload && nlpResult.payload.meals) {
        nlpResult.addedMeals = storage.addMeals(nlpResult.payload.meals);
      } else if (nlpResult.action === 'SET_GOAL' && nlpResult.payload && nlpResult.payload.dailyGoal) {
        storage.setDailyGoal(nlpResult.payload.dailyGoal);
      } else if (nlpResult.action === 'CLEAR_MEALS') {
        storage.clearMeals();
      }

      const updatedSummary = storage.getSummary();

      return sendJSON(res, 200, {
        success: true,
        nlp: nlpResult,
        summary: updatedSummary
      });
    } catch (err) {
      console.error('Error handling /api/chat:', err);
      return sendJSON(res, 500, { success: false, error: err.message });
    }
  }

  // --- STATIC FILE SERVING ---
  let safePath = path.normalize(pathname).replace(/^(\.\.[\/\\])+/, '');
  if (safePath === '/' || safePath === '\\') {
    safePath = '/index.html';
  }

  const filePath = path.join(PUBLIC_DIR, safePath);

  // Security check: ensure path is within PUBLIC_DIR
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    return res.end('Access Denied');
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      return res.end('File Not Found');
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, { 'Content-Type': contentType });
    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  });
});

server.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(` NutriBot - NLP Calorie Tracker Server Running!`);
  console.log(` Local URL: http://localhost:${PORT}`);
  console.log(` Node.js: ${process.version}`);
  console.log(` Mode: Zero external dependencies (Pure Node.js + JS)`);
  console.log(`=======================================================`);
});
