// ==========================================================================
// NutriBot NLP Chatbot: Interactive Dialog, Entity Cards, Voice STT
// ==========================================================================

document.addEventListener('DOMContentLoaded', () => {
  const chatForm = document.getElementById('chatInputForm');
  const chatInput = document.getElementById('chatTextInput');
  const messagesContainer = document.getElementById('chatMessagesContainer');
  const typingIndicator = document.getElementById('chatTypingIndicator');
  const clearHistoryBtn = document.getElementById('clearChatHistoryBtn');
  const promptChips = document.querySelectorAll('.prompt-chip');
  const voiceBtn = document.getElementById('voiceInputBtn');
  const voiceBanner = document.getElementById('voiceListeningBanner');
  const cancelVoiceBtn = document.getElementById('cancelVoiceBtn');

  let isRecognizingVoice = false;
  let recognition = null;

  // --- AUDIO SYNTHESIS CHIME (Subtle web audio beep for bot responses) ---
  function playSoftChime() {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.12); // A5
      gain.gain.setValueAtTime(0.05, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.2);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.2);
    } catch (e) {
      // AudioContext not allowed or not supported; ignore gracefully
    }
  }

  // --- SUBMIT USER MESSAGE ---
  chatForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const message = chatInput.value.trim();
    if (!message) return;

    // Append User Bubble
    appendUserBubble(message);
    chatInput.value = '';

    // Trigger Bot Response
    await sendNLPMessage(message);
  });

  // --- QUICK PROMPT CHIPS ---
  promptChips.forEach(chip => {
    chip.addEventListener('click', () => {
      const text = chip.getAttribute('data-prompt');
      if (text) {
        appendUserBubble(text);
        sendNLPMessage(text);
      }
    });
  });

  // --- CLEAR CHAT HISTORY ---
  if (clearHistoryBtn) {
    clearHistoryBtn.addEventListener('click', () => {
      messagesContainer.innerHTML = `
        <div class="chat-bubble bot-bubble">
          <div class="bubble-avatar">🤖</div>
          <div class="bubble-content">
            <p>Chat cleared! How can I help you with your calorie tracking right now?</p>
            <div class="bubble-timestamp">Just now</div>
          </div>
        </div>
      `;
    });
  }

  // --- SEND NLP MESSAGE TO BACKEND ---
  async function sendNLPMessage(userText) {
    typingIndicator.classList.add('active');
    scrollChatToBottom();

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userText })
      });
      const data = await res.json();

      typingIndicator.classList.remove('active');

      if (data.success && data.nlp) {
        // Play gentle chime
        playSoftChime();

        // Render Bot Bubble with NLP structured payload
        appendBotBubble(data.nlp);

        // Update Dashboard state if summary returned
        if (data.summary && window.NutriApp) {
          window.NutriApp.summary = data.summary;
          window.NutriApp.updateUI();
        }
      } else {
        appendBotBubble({
          reply: data.error || "Sorry, I had trouble processing that. Could you try rephrasing?"
        });
      }
    } catch (err) {
      console.error('Chat error:', err);
      typingIndicator.classList.remove('active');
      appendBotBubble({
        reply: "Network connection lost. Please ensure the server is running."
      });
    }

    scrollChatToBottom();
  }

  // --- BUBBLE BUILDERS ---
  function appendUserBubble(text) {
    const bubble = document.createElement('div');
    bubble.className = 'chat-bubble user-bubble';
    bubble.innerHTML = `
      <div class="bubble-avatar">👤</div>
      <div class="bubble-content">
        <p>${escapeHTML(text)}</p>
        <div class="bubble-timestamp">${getCurrentTimeStr()}</div>
      </div>
    `;
    messagesContainer.appendChild(bubble);
    scrollChatToBottom();
  }

  function appendBotBubble(nlp) {
    const bubble = document.createElement('div');
    bubble.className = 'chat-bubble bot-bubble';

    // Build extra UI cards for entities or nutrition facts
    let extraHTML = '';

    // 1. Extracted Entities Card
    if (nlp.extractedCards && nlp.extractedCards.length > 0) {
      const totalCal = nlp.extractedCards.reduce((s, i) => s + i.totalCalories, 0);
      const rows = nlp.extractedCards.map(item => `
        <tr>
          <td><strong>${escapeHTML(item.foodName)}</strong> (${item.quantity} ${item.unit})</td>
          <td class="cal-highlight">+${item.totalCalories} kcal</td>
        </tr>
      `).join('');

      extraHTML += `
        <div class="nlp-feedback-card">
          <div class="nlp-tag-row">
            <span>🥗 Food Items Logged</span>
            <span>${Math.round((nlp.confidence || 0.92) * 100)}% match</span>
          </div>
          <table class="entity-items-table">
            <tbody>
              ${rows}
            </tbody>
          </table>
        </div>
      `;
    }

    // 2. Nutrition Info Card
    if (nlp.nutritionCard) {
      const food = nlp.nutritionCard;
      extraHTML += `
        <div class="nutrition-card-pill">
          <div class="nutrition-card-header">📊 Nutrition Facts: ${escapeHTML(food.name)}</div>
          <div class="nutrition-macros-row">
            <span>🔥 <strong>${food.calories}</strong> kcal</span>
            <span>🥩 P: <strong>${food.protein}</strong>g</span>
            <span>🌾 C: <strong>${food.carbs}</strong>g</span>
            <span>🥑 F: <strong>${food.fat}</strong>g</span>
          </div>
        </div>
      `;
    }

    // Convert newlines in reply to clean paragraphs
    const formattedReply = escapeHTML(nlp.reply || '')
      .split('\n')
      .map(line => line.trim() ? `<p>${line}</p>` : '')
      .join('');

    bubble.innerHTML = `
      <div class="bubble-avatar">🤖</div>
      <div class="bubble-content">
        ${formattedReply}
        ${extraHTML}
        <div class="bubble-timestamp">${getCurrentTimeStr()}</div>
      </div>
    `;

    messagesContainer.appendChild(bubble);
    scrollChatToBottom();
  }

  function scrollChatToBottom() {
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  function getCurrentTimeStr() {
    return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  function escapeHTML(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // --- SPEECH RECOGNITION (WEB SPEECH API) ---
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  if (SpeechRecognition) {
    recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      isRecognizingVoice = true;
      voiceBtn.classList.add('recording');
      voiceBanner.classList.add('active');
    };

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      if (transcript) {
        chatInput.value = transcript;
        appendUserBubble(transcript);
        sendNLPMessage(transcript);
      }
    };

    recognition.onerror = (event) => {
      console.warn('Speech recognition error:', event.error);
      stopVoice();
      if (window.NutriApp) {
        window.NutriApp.showToast(`Voice input error: ${event.error}`, 'error');
      }
    };

    recognition.onend = () => {
      stopVoice();
    };

    voiceBtn.addEventListener('click', () => {
      if (isRecognizingVoice) {
        recognition.stop();
      } else {
        try {
          recognition.start();
        } catch (e) {
          console.error(e);
        }
      }
    });

    if (cancelVoiceBtn) {
      cancelVoiceBtn.addEventListener('click', () => {
        if (recognition) recognition.abort();
        stopVoice();
      });
    }

    function stopVoice() {
      isRecognizingVoice = false;
      voiceBtn.classList.remove('recording');
      voiceBanner.classList.remove('active');
    }
  } else {
    // If browser doesn't support Web Speech API
    voiceBtn.title = "Voice recognition not supported in this browser";
    voiceBtn.style.opacity = '0.5';
  }
});
