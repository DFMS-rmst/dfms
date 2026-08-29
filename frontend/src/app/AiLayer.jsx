import { useState } from 'react';
import { api } from './api.js';

const suggestions = {
  PLATFORM_ADMIN: [
    'Which farms show unusual AMU patterns?',
    'Which eligibility cases require review?',
  ],
  VETERINARIAN: [
    'Which assigned animals have repeated antimicrobial exposure?',
    'Explain this farm AMU trend.',
  ],
  FARM: ['Can I collect milk from this animal?', 'What does this AMU risk score mean?'],
};

export function AiLayer({ farms, user }) {
  const [farmId, setFarmId] = useState(farms[0]?.id || '');
  const [animalId, setAnimalId] = useState('');
  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState([]);
  const [conversationId, setConversationId] = useState(null);
  const [error, setError] = useState('');
  const role = user.platformRoles.includes('PLATFORM_ADMIN')
    ? 'PLATFORM_ADMIN'
    : user.platformRoles.includes('VETERINARIAN')
      ? 'VETERINARIAN'
      : 'FARM';
  async function ask(event) {
    event.preventDefault();
    setError('');
    try {
      const result = await api('/advisor/ask', {
        method: 'POST',
        body: JSON.stringify({
          question,
          conversationId,
          farmId: farmId || undefined,
          animalId: animalId || undefined,
        }),
      });
      setConversationId(result.conversationId);
      setMessages((items) => [
        ...items,
        { role: 'You', text: question },
        { role: 'Advisor', text: result.answer, sources: result.sources },
      ]);
      setQuestion('');
    } catch (problem) {
      setError(problem.message);
    }
  }
  return (
    <section>
      <h1>AI Intelligence Layer</h1>
      <p className="notice">
        Decision support only. AI cannot diagnose, prescribe, change withdrawal rules, override milk
        eligibility, or issue certificates.
      </p>
      <section className="card form">
        <h2>AMU Pattern Risk</h2>
        <label>
          Farm
          <select value={farmId} onChange={(e) => setFarmId(e.target.value)}>
            {farms.map((farm) => (
              <option key={farm.id} value={farm.id}>
                {farm.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Animal ID (optional)
          <input
            value={animalId}
            onChange={(e) => setAnimalId(e.target.value)}
            placeholder="Use an authorized animal ID"
          />
        </label>
        <AmuRiskCard farmId={farmId} animalId={animalId} />
      </section>
      <section className="card">
        <h2>Smart Advisor</h2>
        <div className="actions">
          {suggestions[role].map((item) => (
            <button className="link" key={item} onClick={() => setQuestion(item)}>
              {item}
            </button>
          ))}
        </div>
        {messages.map((message, index) => (
          <article key={index}>
            <strong>{message.role}</strong>
            <p>{message.text}</p>
            {message.sources?.map((source) => (
              <small key={source.sourceReference}>
                {source.title} — {source.sourceReference}
              </small>
            ))}
          </article>
        ))}
        <form className="form" onSubmit={ask}>
          <label>
            Question
            <textarea value={question} onChange={(e) => setQuestion(e.target.value)} required />
          </label>
          <button>Ask using authorized records and approved sources</button>
        </form>
        {error && <p className="error">{error}</p>}
      </section>
    </section>
  );
}

export function AmuRiskCard({ farmId, animalId = '' }) {
  const [risk, setRisk] = useState(null);
  const [error, setError] = useState('');
  async function loadRisk() {
    setError('');
    try {
      setRisk(
        await api(animalId ? `/ml/animals/${animalId}/amu-risk` : `/ml/farms/${farmId}/amu-risk`),
      );
    } catch (problem) {
      setError(problem.message);
    }
  }
  return (
    <div>
      <button onClick={loadRisk} disabled={!animalId && !farmId}>
        Evaluate recorded AMU pattern
      </button>
      {risk && (
        <div>
          <strong>{risk.risk.category}</strong> · {risk.risk.displayRiskScore}/100
          <p>{risk.risk.disclaimer}</p>
          <ul>
            {risk.risk.contributingIndicators.map((item) => (
              <li key={item.feature}>
                {item.feature}: {item.direction}
              </li>
            ))}
          </ul>
        </div>
      )}
      {error && <p className="error">{error}</p>}
    </div>
  );
}
