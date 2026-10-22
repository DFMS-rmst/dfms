import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import './FarmerChatbot.css';

const SYSTEM_PROMPT = `You are "Kisan Mitra" (किसान मित्र), a warm, expert AI assistant EXCLUSIVELY for Indian farmers and livestock keepers.

IDENTITY & MISSION:
- Your name is Kisan Mitra (किसान मित्र)
- You exist to support Indian farmers with crops, soil, weather, farming schemes, and cattle/livestock health and quick home remedies.
- You are friendly, respectful, empathetic, and speak simply and clearly.

LANGUAGE RULES:
- If user writes in Hindi → respond in Hindi (हिंदी)
- If user writes in Marathi → respond in Marathi (मराठी)
- If user writes in Punjabi → respond in Punjabi (ਪੰਜਾਬੀ)
- If user writes in Telugu → respond in Telugu (తెలుగు)
- If user writes in Tamil → respond in Tamil (தமிழ்)
- If user writes in Bengali → respond in Bengali (বাংলা)
- If user writes in Gujarati → respond in Gujarati (ગુજરાતી)
- If user writes in Kannada → respond in Kannada (ಕನ್ನಡ)
- If user writes in English or Hinglish → respond accordingly
- Always match the user's language and tone automatically.

GREETING RULES:
- Respond warmly to greetings ("Namaste", "Ram Ram", "Sat Sri Akal", "Vanakkam", "Hello", etc.)
- Invite them to ask their farming or cattle care questions.

CATTLE & LIVESTOCK HEALTH — QUICK HOME REMEDIES (देशी पशु चिकित्सा एवं घरेलू उपचार):
When a farmer asks about sick cattle (cows, buffaloes, calves, bullocks, goats, sheep) having mild ailments, provide practical, proven ethno-veterinary / home remedies using common kitchen and farm ingredients:

1. Bloat / Gas / Afara (पेट फूलना / अफारा):
   - Remedy: 50-100 ml pure mustard oil (सरसों का तेल) + 10-15 g hing (हींग) + 20-30 g ajwain (अजवाइन) + 20 g black salt (काला नमक) mixed in lukewarm water.
   - For severe bloat: 30-50 g baking soda (मीठा सोडा) in lukewarm water.
   - Action: Walk the animal slowly; keep its head elevated.

2. Mild Diarrhea / Loose Motions (दस्त / पेचिश):
   - Remedy: 50 g fenugreek seeds (मेथी दाना) soaked/boiled + 250 g fresh curd (दही) or buttermilk (छाछ) + roasted cumin (जीरा) powder and a pinch of turmeric.
   - Electrolyte support: Give boiled rice water (माड़) or water with jaggery (गुड़) and salt to prevent dehydration.

3. Loss of Appetite & Indigestion (भूख न लगना / हाजमा खराब):
   - Remedy: "Pachak Goli" (पाचक लड्डू) made with fresh ginger (अदरक), 5-6 garlic cloves (लहसुन), black salt (काला नमक), ajwain, jeera, and jaggery (गुड़). Feed 1-2 balls twice daily.

4. Mild Fever & Cold / Cough (हल्का बुखार / जुकाम / खांसी):
   - Remedy: Boil 15-20 tulsi leaves, 10 black pepper (काली मिर्च), 10 g dry ginger (सोंठ), and 10 g turmeric in 1 liter water with 50 g jaggery. Feed lukewarm twice a day.
   - Care: Keep animal in a dry, draft-free, shaded place with dry bedding.

5. Minor Cuts, Wounds & Maggots (घाव / खुर की चोट / कीड़े):
   - Remedy: Wash the wound with boiled neem leaf water (नीम का पानी - natural antiseptic).
   - Ointment: Turmeric powder (हल्दी) mixed with neem oil or mustard oil applied over the wound.
   - Maggots: Camphor (कपूर) mixed in coconut or neem oil to expel maggots safely.

6. Ticks, Lice & Skin Irritation (चींचड़ / किलनी / जूं):
   - Remedy: Spray diluted neem oil (नीम तेल) or a boiled decoction of neem leaves and garlic on the body; keep the shed clean and dry.

7. Udder Care / Mild Swelling First Aid (थन की हल्की सूजन / गांठ):
   - Remedy: Paste of turmeric (हल्दी), aloe vera (घृतकुमारी), and a pinch of lime (खाने का चूना) applied externally on the affected quarter (wash cleanly before milking).

CRITICAL VETERINARY SAFETY ADVICE:
- Clearly state that home remedies are effective first-aid for MILD and early symptoms.
- If symptoms are severe, if fever is very high (>103°F/39.5°C), if animal stops standing/eating completely, if blood appears in milk/stool, or if symptoms persist beyond 24-48 hours, urge them to consult a certified veterinary doctor (पशु चिकित्सक) or call the National Animal Helpline 1962 / local Pashu Chikitsalay.

CROPS & GENERAL FARMING:
- Sowing, seed selection, irrigation, weed control, organic composting.
- Pest and disease diagnosis (e.g., yellow leaf curl, stem borer, blight, aphids).
- Soil health, NPK fertilizers, micronutrients, vermicompost.
- Government schemes (PM-KISAN, PMFBY, Soil Health Card, KCC).
- Weather advice and best sowing/harvesting timings.

STRICT BOUNDARIES:
- Refuse non-agricultural questions (movies, politics, coding, gossip, general trivia).
- Politely reply: "🌾 Main sirf kheti-kisani aur pashupalan (cattle care) se jude sawalon mein madad kar sakta hoon. Kripya apni fasal ya pashuon ke baare mein poochein! 😊"

RESPONSE STYLE & FORMATTING RULES (MANDATORY FOR MAXIMUM READABILITY):
1. Structure answers with clear sections using Markdown headings with relevant emojis:
   - ### 🩺 मुख्य समस्या / लक्षण (Symptoms & Issue)
   - ### 🥣 आवश्यक सामग्री व मात्रा (Ingredients & Exact Quantities)
   - ### 📋 बनाने व देने का तरीका (Step-by-Step Method & Dosage)
2. Always put key ingredients, chemical names, and exact dosages in BOLD (e.g., **50-100 ml शुद्ध सरसों का तेल**, **10-15 ग्राम हींग**).
3. Use numbered lists (1., 2., 3.) for recipe preparation and application steps.
4. For critical warnings, emergency symptoms, or vet doctor escalation, ALWAYS use a blockquote starting with ⚠️:
   > ⚠️ **जरूरी सावधानी (Veterinary Caution)**: Agar pashu ko tej bukhar (>103°F) ho ya 24-48 ghante mein sudhar na ho, toh turant veterinary doctor ko dikhayein ya Pashu Helpline 1962 par sampark karein.
5. For farmer pro-tips or prevention advice, use a blockquote starting with 💡:
   > 💡 **किसान मित्र सलाह (Pro Tip)**: ...
6. When comparing dosages (Badi Gai/Bhains vs Chhota Bachhda/Bakri) or schedules, use a clean Markdown Table (| पशु का प्रकार | खुराक | समय |).
7. Keep paragraphs short (2-3 sentences max) so it is very comfortable to read on mobile and desktop! 🌱🐄`;

const SUGGESTIONS = [
  'Cow has stomach bloat (पेट फूलना/अफारा) - quick home remedy? 🐄',
  'Desi home remedy for calf diarrhea / loose motion? 🐂',
  'Wheat crop leaves are turning yellow 🌾',
  'Home remedy for cattle mild fever or cold? 🌡️',
  'How to control aphids and insects organically? 🐛',
  'How to apply for PM-KISAN scheme? 🚜',
];

const formatTime = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

const buildWelcomeMessage = (userName = '', farmName = '') => {
  const greetingName = userName ? ` ${userName}` : '';
  const farmText = farmName ? ` (${farmName})` : '';
  return {
    role: 'assistant',
    time: 'Just now',
    content: `### 🙏 Ram Ram & Namaste${greetingName}! Main aapka personal Kisan Mitra (किसान मित्र) AI assistant hoon${farmText}.

Aap kheti-kisani, fasal prabandhan aur pashupalan (cattle care) ke gharelu upchar ke liye sawaal pooch sakte hain:

* **🌾 Fasal Rog & Upchar (Crops)**: Gehu, dhan, sabziyon mein rog, keet niyantran (organic pest control), beej buwai aur khad schedule.
* **🐄 Pashu Gharelu Nuskhe (Cattle First-Aid)**: Gai, bhains, bakri ke pet phoolna (afara), dast, bukhar, ghaav ya bhookh na lagne ke desi upchar.
* **🚜 Sarkari Yojana & Kheti Salah**: PM-KISAN samman nidhi, KCC, fasal bima aur mausam ke anuroop buwai.

> 💡 **Personal Assistant Tip**: Main aapke farm ke liye 24x7 upalabdh hoon. Niche diye gaye quick sawaal par click karein ya apna sawaal likhein! 🌱🐄`,
  };
};

const getEnvVar = (viteKey, reactAppKey, defaultValue = '') => {
  try {
    if (typeof import.meta !== 'undefined' && import.meta?.env?.[viteKey]) {
      return import.meta.env[viteKey];
    }
  } catch {
    // ignore
  }
  try {
    if (typeof process !== 'undefined' && process?.env?.[reactAppKey]) {
      return process.env[reactAppKey];
    }
  } catch {
    // ignore
  }
  return defaultValue;
};

const API_KEY = (getEnvVar('VITE_GROQ_API_KEY', 'REACT_APP_GROQ_API_KEY') || '').trim();

const API_ENDPOINT = (
  getEnvVar('VITE_GROQ_API_ENDPOINT', 'REACT_APP_GROQ_API_ENDPOINT') ||
  'https://api.groq.com/openai/v1/chat/completions'
).trim();

const DEFAULT_MODEL = getEnvVar('VITE_GROQ_MODEL', 'REACT_APP_GROQ_MODEL') || 'openai/gpt-oss-20b';

const FALLBACK_MODELS = [
  DEFAULT_MODEL,
  'openai/gpt-oss-20b',
  'qwen/qwen3.8-27b',
  'llama-3.3-70b-versatile',
];

const generateId = () => Date.now().toString(36) + Math.random().toString(36).slice(2);

/* ── Typing indicator ── */
const TypingDots = () => (
  <div className="typing-dots">
    <div className="typing-dot" />
    <div className="typing-dot" />
    <div className="typing-dot" />
  </div>
);

/* ── Markdown Inline Tokenizer ── */
const renderInline = (text) => {
  if (!text) return null;
  const tokens = [];
  const regex = /(\*\*.*?\*\*|`.*?`|\*.*?\*)/g;
  let lastIndex = 0;
  let match;
  let key = 0;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      tokens.push(<span key={key++}>{text.substring(lastIndex, match.index)}</span>);
    }
    const token = match[0];
    if (token.startsWith('**') && token.endsWith('**')) {
      const inner = token.slice(2, -2);
      tokens.push(
        <strong key={key++} className="chat-inline-bold">
          {inner}
        </strong>,
      );
    } else if (token.startsWith('`') && token.endsWith('`')) {
      tokens.push(
        <code key={key++} className="chat-inline-code">
          {token.slice(1, -1)}
        </code>,
      );
    } else if (token.startsWith('*') && token.endsWith('*') && token.length > 2) {
      tokens.push(<em key={key++}>{token.slice(1, -1)}</em>);
    }
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    tokens.push(<span key={key++}>{text.substring(lastIndex)}</span>);
  }

  return tokens.length > 0 ? tokens : text;
};

/* ── Markdown Table Parser ── */
const renderTable = (lines, key) => {
  if (lines.length < 2) return null;
  const parseRow = (rowLine) =>
    rowLine
      .replace(/^\|/, '')
      .replace(/\|$/, '')
      .split('|')
      .map((cell) => cell.trim());

  const headers = parseRow(lines[0]);
  const isDivider = lines[1] && /^\|?\s*[-:]+[-| :]*\|?$/.test(lines[1]);
  const dataRows = (isDivider ? lines.slice(2) : lines.slice(1)).map(parseRow);

  return (
    <div key={key} className="chat-table-wrapper">
      <table className="chat-table">
        <thead>
          <tr>
            {headers.map((h, hIdx) => (
              <th key={hIdx}>{renderInline(h)}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {dataRows.map((row, rIdx) => (
            <tr key={rIdx}>
              {row.map((cell, cIdx) => (
                <td key={cIdx}>{renderInline(cell)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

/* ── Rich Markdown Formatted Message ── */
const FormattedMessage = ({ content }) => {
  if (!content) return null;
  const lines = content.split('\n');
  const elements = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Multi-line code block ```
    if (line.trim().startsWith('```')) {
      const codeLines = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      if (i < lines.length && lines[i].trim().startsWith('```')) i++;
      elements.push(
        <div key={elements.length} className="chat-code-block">
          <pre>
            <code>{codeLines.join('\n')}</code>
          </pre>
        </div>,
      );
      continue;
    }

    // Table detection
    if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
      const tableLines = [];
      while (i < lines.length && lines[i].trim().startsWith('|') && lines[i].trim().endsWith('|')) {
        tableLines.push(lines[i].trim());
        i++;
      }
      elements.push(renderTable(tableLines, elements.length));
      continue;
    }

    // Headings
    if (line.startsWith('### ')) {
      elements.push(
        <h4 key={elements.length} className="chat-heading chat-heading--3">
          {renderInline(line.slice(4))}
        </h4>,
      );
      i++;
      continue;
    }
    if (line.startsWith('## ')) {
      elements.push(
        <h3 key={elements.length} className="chat-heading chat-heading--2">
          {renderInline(line.slice(3))}
        </h3>,
      );
      i++;
      continue;
    }
    if (line.startsWith('# ')) {
      elements.push(
        <h2 key={elements.length} className="chat-heading chat-heading--1">
          {renderInline(line.slice(2))}
        </h2>,
      );
      i++;
      continue;
    }

    // Dividers
    if (line.trim() === '---' || line.trim() === '***') {
      elements.push(<hr key={elements.length} className="chat-hr" />);
      i++;
      continue;
    }

    // Callout alert cards (> ...)
    if (line.trim().startsWith('>')) {
      const quoteLines = [];
      while (i < lines.length && lines[i].trim().startsWith('>')) {
        quoteLines.push(lines[i].trim().replace(/^>\s*/, ''));
        i++;
      }
      const combined = quoteLines.join(' ');
      const isDanger = /⚠️|warning|danger|सावधानी|खतरा|vet|पशु चिकित्सक|डॉक्टर/i.test(combined);
      const isTip = /💡|tip|सलाह|सुझाव|pro-tip|nuskha/i.test(combined);
      const isInfo = /ℹ️|info|नोट|note|jankari/i.test(combined);

      let calloutClass = 'chat-callout';
      let icon = '📌';
      if (isDanger) {
        calloutClass += ' chat-callout--danger';
        icon = '⚠️';
      } else if (isTip) {
        calloutClass += ' chat-callout--tip';
        icon = '💡';
      } else if (isInfo) {
        calloutClass += ' chat-callout--info';
        icon = 'ℹ️';
      }

      elements.push(
        <div key={elements.length} className={calloutClass}>
          <div className="chat-callout__icon">{icon}</div>
          <div className="chat-callout__body">
            {quoteLines.map((ql, qIdx) => (
              <p key={qIdx}>{renderInline(ql)}</p>
            ))}
          </div>
        </div>,
      );
      continue;
    }

    // Unordered List (- or *)
    if (/^\s*[-*•]\s+/.test(line)) {
      const listItems = [];
      while (i < lines.length && /^\s*[-*•]\s+/.test(lines[i])) {
        listItems.push(lines[i].replace(/^\s*[-*•]\s+/, ''));
        i++;
      }
      elements.push(
        <ul key={elements.length} className="chat-list-ul">
          {listItems.map((item, lIdx) => (
            <li key={lIdx} className="chat-list-li">
              <span className="chat-list-bullet">🌱</span>
              <span className="chat-list-text">{renderInline(item)}</span>
            </li>
          ))}
        </ul>,
      );
      continue;
    }

    // Ordered List (1., 2.)
    if (/^\s*\d+\.\s+/.test(line)) {
      const listItems = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
        listItems.push(lines[i].replace(/^\s*\d+\.\s+/, ''));
        i++;
      }
      elements.push(
        <ol key={elements.length} className="chat-list-ol">
          {listItems.map((item, lIdx) => (
            <li key={lIdx} className="chat-list-oli">
              <span className="chat-list-step-badge">{lIdx + 1}</span>
              <span className="chat-list-text">{renderInline(item)}</span>
            </li>
          ))}
        </ol>,
      );
      continue;
    }

    // Empty lines
    if (!line.trim()) {
      i++;
      continue;
    }

    // Standard paragraph
    elements.push(
      <p key={elements.length} className="chat-p">
        {renderInline(line)}
      </p>,
    );
    i++;
  }

  return <div className="chat-content-formatted">{elements}</div>;
};

/* ── Single message bubble ── */
const MessageBubble = ({ msg }) => {
  const isUser = msg.role === 'user';
  const isError = !isUser && typeof msg.content === 'string' && msg.content.startsWith('⚠️ Error');

  const [copied, setCopied] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const handleCopy = () => {
    if (typeof msg.content === 'string') {
      navigator.clipboard.writeText(msg.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSpeak = () => {
    if (!('speechSynthesis' in window)) return;
    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }

    window.speechSynthesis.cancel();
    const cleanText = msg.content
      .replace(/[#*`_>|~-]/g, ' ')
      .replace(/\[.*?\]\(.*?\)/g, ' ')
      .trim();

    const utterance = new SpeechSynthesisUtterance(cleanText);
    const hasHindi = /[\u0900-\u097F]/.test(cleanText);
    utterance.lang = hasHindi ? 'hi-IN' : 'en-IN';
    utterance.rate = 0.95;
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    setSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  const handleFeedback = (type) => {
    setFeedback((prev) => (prev === type ? null : type));
  };

  return (
    <div className={`message-row message-row--${isUser ? 'user' : 'assistant'}`}>
      {!isUser && (
        <div className="message-avatar message-avatar--assistant" title="Kisan Mitra AI">
          🌱
        </div>
      )}

      <div className="message-wrapper">
        <div
          className={`message-meta-header message-meta-header--${isUser ? 'user' : 'assistant'}`}
        >
          <span
            className={`message-author-badge message-author-badge--${
              isUser ? 'user' : 'assistant'
            }`}
          >
            {!isUser && <span className="message-author-dot" />}
            {isUser ? 'Aap (Farmer)' : 'Kisan Mitra AI'}
          </span>
          {msg.time && <span className="message-timestamp">{msg.time}</span>}
        </div>

        <div
          className={`message-bubble message-bubble--${
            isUser ? 'user' : isError ? 'error' : 'assistant'
          }`}
        >
          {msg.typing ? (
            <TypingDots />
          ) : isUser ? (
            <div className="user-message-text">{msg.content}</div>
          ) : isError ? (
            <div className="error-message-text">{msg.content}</div>
          ) : (
            <>
              <FormattedMessage content={msg.content} />
              <div className="message-bubble-actions">
                <button
                  type="button"
                  className={`bubble-action-btn ${copied ? 'bubble-action-btn--copied' : ''}`}
                  onClick={handleCopy}
                  title="Copy formatted answer"
                >
                  {copied ? '✓ Copied!' : '📋 Copy'}
                </button>
                {'speechSynthesis' in window && (
                  <button
                    type="button"
                    className={`bubble-action-btn ${speaking ? 'bubble-action-btn--speaking' : ''}`}
                    onClick={handleSpeak}
                    title={speaking ? 'Stop voice' : 'Listen aloud in Hindi / English'}
                  >
                    {speaking ? '⏹ Stop Voice' : '🔊 Listen'}
                  </button>
                )}
                <div className="bubble-feedback-group">
                  <button
                    type="button"
                    className={`bubble-action-btn bubble-feedback-btn ${
                      feedback === 'helpful' ? 'bubble-feedback-btn--active' : ''
                    }`}
                    onClick={() => handleFeedback('helpful')}
                    title="Mark as helpful"
                  >
                    👍 {feedback === 'helpful' ? 'Helpful!' : ''}
                  </button>
                  <button
                    type="button"
                    className={`bubble-action-btn bubble-feedback-btn ${
                      feedback === 'unhelpful' ? 'bubble-feedback-btn--active' : ''
                    }`}
                    onClick={() => handleFeedback('unhelpful')}
                    title="Needs improvement"
                  >
                    👎
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {isUser && (
        <div className="message-avatar message-avatar--user" title="You">
          👨‍🌾
        </div>
      )}
    </div>
  );
};

/* ── Root FarmerChatbot Component ── */
export function FarmerChatbot({ user, farm }) {
  const storageKey = user?.id ? `kisanMitraChats_${user.id}` : 'kisanMitraChats_guest';

  const loadUserChats = useCallback(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // ignore
    }
    return [
      {
        id: generateId(),
        title: 'New Chat',
        messages: [buildWelcomeMessage(user?.fullName, farm?.name)],
        createdAt: new Date(),
      },
    ];
  }, [storageKey, user?.fullName, farm?.name]);

  const [chats, setChats] = useState(loadUserChats);
  const [activeChatId, setActiveChatId] = useState(() => chats[0]?.id || 'initial');
  const lastLoadedKeyRef = useRef(storageKey);

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const bottomRef = useRef(null);

  const activeChat = chats.find((c) => c.id === activeChatId) || chats[0];
  const messages = useMemo(() => activeChat?.messages || [], [activeChat]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    const loaded = loadUserChats();
    lastLoadedKeyRef.current = storageKey;
    setChats(loaded);
    setActiveChatId(loaded[0]?.id || 'initial');
    setInput('');
    setApiError('');
    setDeleteConfirmId(null);
  }, [storageKey, loadUserChats]);

  useEffect(() => {
    if (lastLoadedKeyRef.current === storageKey) {
      try {
        localStorage.setItem(storageKey, JSON.stringify(chats));
      } catch {
        // ignore
      }
    }
  }, [chats, storageKey]);

  const createNewChat = () => {
    const newChat = {
      id: generateId(),
      title: 'New Chat',
      messages: [buildWelcomeMessage(user?.fullName, farm?.name)],
      createdAt: new Date(),
    };
    setChats((prev) => [newChat, ...prev]);
    setActiveChatId(newChat.id);
    setInput('');
    setApiError('');
  };

  const deleteChat = (id) => {
    const remaining = chats.filter((c) => c.id !== id);
    if (remaining.length === 0) {
      const newChat = {
        id: generateId(),
        title: 'New Chat',
        messages: [buildWelcomeMessage(user?.fullName, farm?.name)],
        createdAt: new Date(),
      };
      setChats([newChat]);
      setActiveChatId(newChat.id);
    } else {
      setChats(remaining);
      if (activeChatId === id) setActiveChatId(remaining[0].id);
    }
    setDeleteConfirmId(null);
  };

  const [editingChatId, setEditingChatId] = useState(null);
  const [editingTitle, setEditingTitle] = useState('');

  const startRename = (id, currentTitle, e) => {
    if (e) e.stopPropagation();
    setEditingChatId(id);
    setEditingTitle(currentTitle);
    setDeleteConfirmId(null);
  };

  const cancelRename = (e) => {
    if (e) e.stopPropagation();
    setEditingChatId(null);
    setEditingTitle('');
  };

  const saveRename = (id, e) => {
    if (e) e.stopPropagation();
    const trimmed = editingTitle.trim();
    if (trimmed) {
      setChats((prev) => prev.map((c) => (c.id === id ? { ...c, title: trimmed } : c)));
    }
    setEditingChatId(null);
    setEditingTitle('');
  };

  const handleRenameKeyDown = (id, e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      saveRename(id, e);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      cancelRename(e);
    }
  };

  const updateChatTitle = (id, firstUserMessage) => {
    const title =
      firstUserMessage.length > 28 ? firstUserMessage.slice(0, 28) + '...' : firstUserMessage;
    setChats((prev) => prev.map((c) => (c.id === id ? { ...c, title } : c)));
  };

  const executeGroqCall = async (messagesPayload) => {
    if (!API_KEY) {
      throw new Error('Groq API Key missing. Please set VITE_GROQ_API_KEY in your .env file.');
    }
    let lastError = null;
    const candidateModels = Array.from(new Set(FALLBACK_MODELS));

    for (const modelToTry of candidateModels) {
      try {
        const response = await fetch(API_ENDPOINT, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${API_KEY}`,
          },
          body: JSON.stringify({
            model: modelToTry,
            max_tokens: 1000,
            temperature: 0.7,
            messages: messagesPayload,
          }),
        });

        const data = await response.json();

        if (data?.error) {
          lastError = data.error.message || 'Model error';
          if (
            data.error.code === 'model_not_found' ||
            data.error.message?.includes('does not exist or you do not have access')
          ) {
            continue;
          }
          throw new Error(data.error.message);
        }

        const reply = data.choices?.[0]?.message?.content;
        if (reply) return reply;
      } catch (err) {
        lastError = err.message;
      }
    }

    throw new Error(lastError || 'Could not connect to the assistant. Please try again.');
  };

  const sendMessage = async (text) => {
    const query = text || input.trim();
    if (!query || loading) return;

    setInput('');
    setApiError('');

    const currentMessages = activeChat.messages;
    const userMessages = currentMessages.filter((m) => m.role === 'user');
    if (userMessages.length === 0) updateChatTitle(activeChatId, query);

    const timeStamp = formatTime();
    const userMsg = { role: 'user', content: query, time: timeStamp };
    const typingMsg = { role: 'assistant', content: '', typing: true, time: timeStamp };

    setChats((prev) =>
      prev.map((c) =>
        c.id === activeChatId ? { ...c, messages: [...c.messages, userMsg, typingMsg] } : c,
      ),
    );
    setLoading(true);

    const history = currentMessages
      .filter(
        (m) => !m.typing && !(typeof m.content === 'string' && m.content.startsWith('⚠️ Error')),
      )
      .slice(1)
      .map((m) => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: m.content,
      }));

    const farmerContext =
      user || farm
        ? `\n\nPERSONAL FARMER ASSISTANT CONTEXT:
- Farmer Name: ${user?.fullName || 'Farmer'}
- Email / Contact: ${user?.email || 'N/A'}
- Farm Name: ${farm?.name || 'Local Farm'}
- Location: ${[farm?.village, farm?.taluka, farm?.district, farm?.state].filter(Boolean).join(', ') || 'India'}
Always remember you are their dedicated, personal agricultural and cattle-care assistant. Address them warmly and tailor all advice to their specific farm, crops, and livestock.`
        : '';

    const messagesPayload = [
      { role: 'system', content: SYSTEM_PROMPT + farmerContext },
      ...history,
      { role: 'user', content: query },
    ];

    try {
      const reply = await executeGroqCall(messagesPayload);

      setChats((prev) =>
        prev.map((c) =>
          c.id === activeChatId
            ? {
                ...c,
                messages: [
                  ...c.messages.slice(0, -1),
                  { role: 'assistant', content: reply, time: formatTime() },
                ],
              }
            : c,
        ),
      );
    } catch {
      const displayError = 'Could not get a response. Please check your network and try again.';
      setApiError(displayError);
      setChats((prev) =>
        prev.map((c) =>
          c.id === activeChatId
            ? {
                ...c,
                messages: [
                  ...c.messages.slice(0, -1),
                  { role: 'assistant', content: `⚠️ Error: ${displayError}`, time: formatTime() },
                ],
              }
            : c,
        ),
      );
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="kisan-mitra-chatbot-root">
      <div className="app-shell">
        {/* ── SIDEBAR ── */}
        <aside className={`sidebar ${sidebarOpen ? 'sidebar--open' : 'sidebar--closed'}`}>
          {/* Logo */}
          <div className="sidebar__logo-area">
            <div className="sidebar__logo-row">
              <span className="sidebar__logo-icon">🌾</span>
              <div>
                <div className="sidebar__logo-title">Kisan Mitra</div>
                <div className="sidebar__logo-sub">किसान मित्र</div>
              </div>
              <span className="sidebar-brand-tag">AI BOT</span>
            </div>

            <button type="button" className="new-chat-btn" onClick={createNewChat}>
              <span className="new-chat-btn__icon">✏️</span> New Chat
            </button>
          </div>

          {/* History label */}
          <div className="sidebar__history-label">Chat History</div>

          {/* Chat list */}
          <div className="chat-list">
            {chats.map((chat) => (
              <div
                key={chat.id}
                className={`chat-item ${chat.id === activeChatId ? 'chat-item--active' : ''}`}
                onClick={() => {
                  if (editingChatId !== chat.id) {
                    setActiveChatId(chat.id);
                    setApiError('');
                    setDeleteConfirmId(null);
                  }
                }}
              >
                <span className="chat-item__icon">💬</span>

                {editingChatId === chat.id ? (
                  <div className="chat-item__edit-row" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="text"
                      className="chat-item__edit-input"
                      value={editingTitle}
                      onChange={(e) => setEditingTitle(e.target.value)}
                      onKeyDown={(e) => handleRenameKeyDown(chat.id, e)}
                      autoFocus
                      placeholder="Chat name..."
                    />
                    <button
                      type="button"
                      className="icon-save-btn"
                      onClick={(e) => saveRename(chat.id, e)}
                      title="Save name"
                    >
                      ✓
                    </button>
                    <button
                      type="button"
                      className="icon-cancel-btn"
                      onClick={cancelRename}
                      title="Cancel"
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <>
                    <span
                      className={`chat-item__title ${
                        chat.id === activeChatId ? 'chat-item__title--active' : ''
                      }`}
                      onDoubleClick={(e) => startRename(chat.id, chat.title, e)}
                      title={`${chat.title} (Double-click or click ✏️ to rename)`}
                    >
                      {chat.title}
                    </span>

                    {deleteConfirmId === chat.id ? (
                      <div className="delete-confirm" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          className="delete-confirm__yes"
                          onClick={() => deleteChat(chat.id)}
                        >
                          Delete
                        </button>
                        <button
                          type="button"
                          className="delete-confirm__no"
                          onClick={() => setDeleteConfirmId(null)}
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div className="chat-item__actions">
                        <button
                          type="button"
                          className="icon-edit-btn"
                          onClick={(e) => startRename(chat.id, chat.title, e)}
                          title="Rename chat"
                        >
                          ✏️
                        </button>
                        <button
                          type="button"
                          className="icon-delete-chat-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteConfirmId(chat.id);
                          }}
                          title="Delete chat"
                        >
                          🗑
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            ))}

            {chats.length === 0 && <p className="chat-list__empty">No chats yet</p>}
          </div>

          {/* Footer */}
          <div className="sidebar__footer">
            {user?.fullName ? (
              <div className="sidebar__farmer-badge">
                <span className="sidebar__farmer-icon">👨‍🌾</span>
                <div className="sidebar__farmer-meta">
                  <div className="sidebar__farmer-name">{user.fullName}</div>
                  <div className="sidebar__farmer-sub">{farm?.name || 'Personal Assistant'}</div>
                </div>
              </div>
            ) : (
              <p className="sidebar__footer-text">🌱 Kheti &amp; Cattle Care AI</p>
            )}
          </div>
        </aside>

        {/* ── MAIN CHAT ── */}
        <section className="main-chat">
          {/* Header */}
          <div className="chat-header">
            <button
              type="button"
              className="sidebar-toggle-btn"
              onClick={() => setSidebarOpen((p) => !p)}
              title="Toggle sidebar"
            >
              {sidebarOpen ? '◀' : '☰'}
            </button>

            <div className="chat-header__avatar">🌾</div>

            <div className="chat-header__info">
              <div className="chat-header__title" style={{ display: 'flex', alignItems: 'center' }}>
                <span>{activeChat?.title || 'Kisan Mitra'}</span>
                <button
                  type="button"
                  className="header-rename-btn"
                  onClick={(e) => startRename(activeChatId, activeChat?.title || 'New Chat', e)}
                  title="Rename this chat"
                >
                  ✏️
                </button>
              </div>
              <div className="chat-header__sub">
                {user?.fullName ? (
                  <span>
                    Personal AI Assistant for <strong>{user.fullName}</strong>
                    {farm?.name ? ` • ${farm.name}` : ''} • किसान मित्र
                  </span>
                ) : (
                  <span>Farming &amp; Cattle Health Care • किसान मित्र</span>
                )}
              </div>
            </div>

            <div className="chat-header__status">
              <div className="status-dot" />
              <span className="status-label">Online</span>
            </div>
          </div>

          {/* Error banner */}
          {apiError && (
            <div className="error-banner">
              <div className="error-banner__content">
                <span>⚠️ {apiError}</span>
              </div>
              <button
                type="button"
                className="error-banner__close"
                onClick={() => setApiError('')}
                title="Dismiss"
              >
                ✕
              </button>
            </div>
          )}

          {/* Suggestions */}
          {messages.length <= 1 && (
            <div className="suggestions">
              <p className="suggestions__label">Quick Questions</p>
              <div className="suggestions__list">
                {SUGGESTIONS.map((s, i) => (
                  <button
                    key={i}
                    type="button"
                    className="suggest-btn"
                    onClick={() => sendMessage(s)}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Messages */}
          <div className="messages-list">
            {messages.map((msg, i) => (
              <MessageBubble key={i} msg={msg} />
            ))}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="input-area">
            <div className="input-box">
              <textarea
                className="input-textarea"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKey}
                placeholder="Ask about crops, soil or cattle home remedies... / फसल या पशु उपचार पूछें..."
                rows={1}
                disabled={loading}
              />
              <button
                type="button"
                className={`send-btn ${
                  loading || !input.trim() ? 'send-btn--disabled' : 'send-btn--active'
                }`}
                onClick={() => sendMessage()}
                disabled={loading || !input.trim()}
                title="Send question"
              >
                {loading ? '⏳' : '➤'}
              </button>
            </div>
            <p className="input-hint">
              Press Enter to send • Supports Hindi, Marathi, Punjabi &amp; regional languages
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}

/* ── Modal Dialog Wrapper for Topbar Launch ── */
export function FarmerChatbotModal({ user, farm, onClose, onOpenFullPage }) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div
      className="farmer-chatbot-modal-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Kisan Mitra AI Assistant"
    >
      <div className="farmer-chatbot-modal-container" onClick={(e) => e.stopPropagation()}>
        <header className="farmer-chatbot-modal-header">
          <div className="farmer-chatbot-modal-title-group">
            <span className="farmer-chatbot-modal-icon">🌾</span>
            <div>
              <h2 className="farmer-chatbot-modal-title">Kisan Mitra (किसान मित्र)</h2>
              <p className="farmer-chatbot-modal-sub">
                {user?.fullName
                  ? `${user.fullName}'s Personal AI · Online`
                  : 'AI Farmer & Cattle Care Assistant · Online'}
              </p>
            </div>
          </div>
          <div className="farmer-chatbot-modal-actions">
            {onOpenFullPage && (
              <button
                type="button"
                className="farmer-chatbot-modal-btn"
                onClick={onOpenFullPage}
                title="View full-page dashboard mode"
              >
                ⛶ Expand to Full Page
              </button>
            )}
            <button
              type="button"
              className="farmer-chatbot-modal-close-btn"
              onClick={onClose}
              title="Close chat"
              aria-label="Close"
            >
              ✕
            </button>
          </div>
        </header>
        <div className="farmer-chatbot-modal-body">
          <FarmerChatbot user={user} farm={farm} />
        </div>
      </div>
    </div>
  );
}

export default FarmerChatbot;
