import React from 'react';
import { toast } from 'react-toastify';

export default function TaskInput({
    taskInput,
    setTaskInput,
    loading,
    setLoading,
    handleAIResponse,
    messageHistory,
    setMessageHistory,
    eventDateTime, // ✅ new prop
}) {
    async function handleSubmit(e) {
        if (e) e.preventDefault();

        if (!taskInput.trim()) {
            toast.error('Please enter a task before breaking it down.');
            return;
        }

        if (!eventDateTime) {
            toast.error(
                'Please select a planned date & time before continuing.'
            );
            return;
        }

        setLoading(true);

        const userMsg = { role: 'user', content: `User Task:\n${taskInput}` };
        const newHistory = [...messageHistory, userMsg];
        const API_BASE = import.meta.env.VITE_API_BASE_URL;

        try {
            const response = await fetch(`${API_BASE}/api/breakdown`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ messages: newHistory }),
            });

            const data = await response.json();
            const result = data.result || '';

            setMessageHistory([
                ...newHistory,
                { role: 'assistant', content: result },
            ]);
            handleAIResponse(result, taskInput, []);
        } catch (err) {
            toast.error('Something went wrong with the AI request.');
            console.error('[TaskInput] Breakdown error:', err);
        } finally {
            setLoading(false);
        }
    }

    return (
        <form
            onSubmit={handleSubmit}
            className="input-group"
            style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}
        >
            <input
                className="task-input"
                type="text"
                value={taskInput}
                onChange={(e) => setTaskInput(e.target.value)}
                placeholder="Enter a task (e.g., Finish essay draft)"
                disabled={loading}
            />
            <button
                type="submit"
                onClick={handleSubmit}
                className="submit-btn"
                disabled={loading}
            >
                {loading ? 'Thinking...' : 'Break It Down'}
            </button>
        </form>
    );
}
