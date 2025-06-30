import React, { useState } from 'react';

export default function ClarificationForm({
  clarification,
  setClarification,
  currentQuestion,
  clarificationHistory,
  setClarificationHistory,
  taskInput,
  setLoading,
  handleAIResponse,
  loading,
  setSkipCount,
  messageHistory,
  setMessageHistory
}) {
  const [activeAction, setActiveAction] = useState(null); // 'submit' or 'skip'

  async function handleSubmit(e, skip = false) {
    e.preventDefault();
    setActiveAction(skip ? 'skip' : 'submit');

    const newEntry = `Q: ${currentQuestion}\nA: ${skip ? '[skipped]' : clarification}`;
    const updatedHistory = [...clarificationHistory, newEntry];
    setClarificationHistory(updatedHistory);

    if (skip && setSkipCount) {
      setSkipCount(prev => prev + 1);
    } else if (setSkipCount) {
      setSkipCount(0);
    }

    const userMessage = {
      role: 'user',
      content: `Task: ${taskInput}\n\n${updatedHistory.join('\n')}`
    };
    const newHistory = [...messageHistory, userMessage];

    setLoading(true);
    const API_BASE = import.meta.env.VITE_API_BASE_URL;

    try {
      const response = await fetch(`${API_BASE}/api/breakdown`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newHistory })
      });

      const data = await response.json();
      const result = data.result || '';

      setMessageHistory([...newHistory, { role: 'assistant', content: result }]);
      handleAIResponse(result, taskInput, updatedHistory);
    } catch (error) {
      console.error('Error submitting clarification:', error);
    } finally {
      setLoading(false);
      setActiveAction(null);
    }
  }

  return (
    <div className="clarification-form">
      <div className="clarification-label">
        <p>To help break down the task "<strong>{taskInput}</strong>", I have a question:</p>
      </div>

      <div className="task-card" style={{ marginBottom: '1rem' }}>{currentQuestion}</div>

      <form onSubmit={(e) => handleSubmit(e)} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <input
          className="task-input"
          type="text"
          value={clarification}
          onChange={(e) => setClarification(e.target.value)}
          placeholder="Your answer..."
          autoFocus
          disabled={loading}
        />
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            type="submit"
            className="submit-btn"
            disabled={loading || !clarification.trim()}
          >
            {loading && activeAction === 'submit' ? 'Thinking...' : 'Submit Answer'}
          </button>
          <button
            type="button"
            className="submit-btn secondary"
            onClick={(e) => handleSubmit(e, true)}
            disabled={loading}
          >
            {loading && activeAction === 'skip' ? 'Skipping...' : 'Skip Question'}
          </button>
        </div>
      </form>
    </div>
  );
}
