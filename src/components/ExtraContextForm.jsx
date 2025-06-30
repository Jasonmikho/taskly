import React, { useEffect, useRef } from 'react';
import { saveTask, getSavedTasks } from '../utils/firebaseUtils';

export default function ExtraContextForm({
  extraContext,
  setExtraContext,
  clarificationHistory,
  taskInput,
  setLoading,
  handleAIResponse,
  setClarificationHistory,
  setAwaitingExtraContext,
  setSubtasks,
  setSavedTasks,
  loading,
  messageHistory,
  setMessageHistory,
  userId,
  eventDateTime
}) {
  const formRef = useRef(null);

  // Auto-submit if extraContext exists
  useEffect(() => {
    if (extraContext.trim() && formRef.current) {
      console.log('[Debug] Auto-submitting extra context:', extraContext);
      const submitBtn = formRef.current.querySelector('button[type="submit"]');
      submitBtn?.click();
    }
  }, []);

  async function handleSubmitWithContext(e) {
    e.preventDefault();
    console.log('[Debug] Submitting with extra context:', extraContext);

    if (extraContext.trim()) {
      setLoading(true);

      const contextText = clarificationHistory
        .filter(line => !line.startsWith('PREVIEW_BREAKDOWN:'))
        .join('\n');

      const contextPrompt = `${contextText}\n\nAdditional context: ${extraContext}\n\nBased on all the above information and the additional context provided, please provide an updated BREAKDOWN:`;

      console.log('[Debug] Sending updated prompt to AI:', contextPrompt);

      const userMessage = { role: 'user', content: contextPrompt };
      const newHistory = [...messageHistory, userMessage];
      const API_BASE = import.meta.env.VITE_API_BASE_URL;

      try {
        const response = await fetch(`${API_BASE}/api/breakdown`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: newHistory })
        });

        const data = await response.json();
        const result = data.result || '';
        console.log('[Debug] AI Raw Result After Context:', result);

        if (result.toUpperCase().startsWith('BREAKDOWN:')) {
          const breakdownContent = result.replace(/BREAKDOWN:/i, '').trim();
          const lines = breakdownContent
            .split('\n')
            // .map(line => line.replace(/^•/, '*')) // Convert • to *
            .filter(line => line.trim() !== '');
          setSubtasks(lines);

          setSubtasks(lines);

          if (userId) {
            const taskObj = {
              id: Date.now(),
              task: taskInput,
              subtasks: lines,
              timestamp: new Date().toISOString(),
              dateTime: eventDateTime || null
            };
            saveTask(userId, taskObj).then(setSavedTasks);
          }

          setAwaitingExtraContext();
          setClarificationHistory([]);
          setExtraContext('');
        }

        setMessageHistory([...newHistory, { role: 'assistant', content: result }]);
      } catch (error) {
        console.error('Error getting updated breakdown:', error);
        handleSkipContext();
      }

      setLoading(false);
    } else {
      handleSkipContext();
    }
  }

  function handleSkipContext() {
    const previewBreakdown = clarificationHistory.find(h => h.startsWith('PREVIEW_BREAKDOWN:'));

    if (previewBreakdown) {
      const breakdownContent = previewBreakdown.replace('PREVIEW_BREAKDOWN:', '').replace(/BREAKDOWN:/i, '').trim();
      const lines = breakdownContent
        .split('\n')
        .map(line => line.replace(/^•/, '*')) // Convert • to *
        .filter(line => line.trim() !== '');
      setSubtasks(lines);

      setSubtasks(lines);

      if (userId) {
        const taskObj = {
          id: Date.now(),
          task: taskInput,
          subtasks: lines,
          timestamp: new Date().toISOString(),
          dateTime: eventDateTime || null
        };
        saveTask(userId, taskObj).then(setSavedTasks);
      }

      setAwaitingExtraContext();
      setClarificationHistory([]);
      setExtraContext('');
    }
  }

  return (
    <div className="extra-context-container">
      <div className="clarification-label" style={{ marginBottom: '1rem' }}>
        <strong>Optional: Add More Context</strong>
        <br />
        Would you like to provide additional details to improve your task breakdown?
        <br />
        <small style={{ color: '#666' }}>
          (e.g., constraints, preferences, timeline details, or any other relevant information)
        </small>
      </div>

      <form
        ref={formRef}
        onSubmit={handleSubmitWithContext}
        style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
      >
        <textarea
          value={extraContext}
          onChange={(e) => setExtraContext(e.target.value)}
          className="task-input"
          style={{
            fontFamily: 'inherit',
            fontSize: '1rem',
            lineHeight: '1.5',
            letterSpacing: '0',
            padding: '0.75rem 1rem',
            color: '#374151',
            border: '2px solid #e5e7eb',
            borderRadius: '0.75rem',
            background: 'rgba(255, 255, 255, 0.98)',
            boxSizing: 'border-box',
            width: '100%',
            resize: 'none',
            minHeight: '40px',
          }}
        />

        {extraContext.trim() ? (
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button
              type="submit"
              disabled={loading}
              className="submit-btn primary"
              style={{ flex: '1', minWidth: '120px' }}
            >
              {loading ? 'Updating...' : 'Update Breakdown'}
            </button>

            <button
              type="button"
              onClick={handleSkipContext}
              disabled={loading}
              className="submit-btn secondary"
              style={{ flex: '1', minWidth: '120px' }}
            >
              Skip & Continue
            </button>
          </div>
        ) : (
          <div>
            <button
              type="submit"
              disabled={loading}
              className="submit-btn primary"
              style={{ width: '100%', minWidth: '120px' }}
            >
              {loading ? 'Updating...' : 'Use Current Breakdown'}
            </button>
          </div>
        )}
      </form>
    </div>
  );
}
