import { useState, useEffect, useRef } from 'react';
import TaskResults from './TaskResults';
import { saveTask } from '../utils/firebaseUtils';

export default function SavedTasks({ tasks, onSelect, onDelete, viewingTask, onBack, setSavedTasks, userId }) {
    const [isEditing, setIsEditing] = useState(false);
    const [editedTask, setEditedTask] = useState(viewingTask || null);
    const [originalTask, setOriginalTask] = useState(viewingTask || null);
    const [confirmDeleteId, setConfirmDeleteId] = useState(null);
    const [warningMessage, setWarningMessage] = useState('');
    const warningRef = useRef(null);
    const saveTaskDebounced = useRef(null);

    useEffect(() => {
        const debounce = (fn, delay) => {
            let timer;
            return function (...args) {
                clearTimeout(timer);
                timer = setTimeout(() => fn(...args), delay);
            };
        };

        saveTaskDebounced.current = debounce((task) => {
            saveTask(userId, task).then(setSavedTasks);
        }, 300);
    }, [userId, setSavedTasks]);

    useEffect(() => {
        if (viewingTask) {
            const normalizedSubtasks = Array.isArray(viewingTask.subtasks)
                ? viewingTask.subtasks
                      .map((line) => {
                          if (typeof line === 'string') {
                              return {
                                  title: line.split(':')[0]?.trim() || '',
                                  body: line.match(/\(.*?\)/)?.[0] || '',
                                  bullets: [],
                                  completed: false,
                                  type: 'timedBlock',
                                  id: `imported-${Date.now()}-${Math.random()}`,
                              };
                          } else if (typeof line === 'object' && line !== null) {
                              return {
                                  ...line,
                                  completed: line.completed ?? false,
                              };
                          }
                          return null;
                      })
                      .filter(Boolean)
                : [];

            const fullTask = {
                ...viewingTask,
                subtasks: normalizedSubtasks,
            };

            setEditedTask(fullTask);
            setOriginalTask(fullTask);
        }
    }, [viewingTask]);

    function scrollToWarning() {
        setTimeout(() => {
            warningRef.current?.scrollIntoView({
                behavior: 'smooth',
                block: 'center',
            });
        }, 50);
    }

    async function handleSave(updateExisting = true) {
        if (!editedTask.task.trim()) {
            setWarningMessage('Task title cannot be empty.');
            scrollToWarning();
            return;
        }

        const isTitleDuplicate = tasks.some(
            (t) => t.task.trim().toLowerCase() === editedTask.task.trim().toLowerCase() && t.id !== (updateExisting ? originalTask.id : null)
        );

        if (!updateExisting && isTitleDuplicate) {
            setWarningMessage('A task with this title already exists. Please use a unique title.');
            scrollToWarning();
            return;
        }

        if (!editedTask.dateTime && !editedTask.timestamp) {
            setWarningMessage('Planned date & time is required.');
            scrollToWarning();
            return;
        }

        let totalMinutes = 0;
        (editedTask.subtasks || []).forEach((sub) => {
            const match = sub?.body?.match(/\((?:(\d+)\s*hours?)?\s*(?:(\d+)\s*minutes?)?\)/i);
            if (match) {
                const h = parseInt(match[1]) || 0;
                const m = parseInt(match[2]) || 0;
                totalMinutes += h * 60 + m;
            }
        });

        let totalDurationOverride = null;
        if (totalMinutes > 0) {
            const h = Math.floor(totalMinutes / 60);
            const m = totalMinutes % 60;
            totalDurationOverride = `${h}:${m.toString().padStart(2, '0')}`;
        }

        const taskRecord = {
            ...editedTask,
            id: updateExisting ? originalTask.id : Date.now(),
            timestamp: editedTask.dateTime || new Date().toISOString(),
            totalDurationOverride,
        };

        const updated = await saveTask(userId, taskRecord);
        setSavedTasks(updated);
        setIsEditing(false);
        setWarningMessage('');

        if (!updateExisting) {
            onBack();
        } else {
            setOriginalTask(taskRecord);
            setEditedTask(taskRecord);
            onSelect(taskRecord);
        }
    }

    function handleChangeTitle(value) {
        setWarningMessage('');
        setEditedTask({ ...editedTask, task: value });
    }

    function handleCancelEdit() {
        setEditedTask(originalTask);
        setIsEditing(false);
        setWarningMessage('');
    }

    function confirmDelete(id) {
        onDelete(id);
        setConfirmDeleteId(null);
        if (viewingTask?.id === id) onBack();
    }

    function formatDateTime(date) {
        return date.toLocaleString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true,
        });
    }

    if (!userId) {
        return (
            <div className="results-section">
                <div className="task-card">🔒 Please log in to view and manage saved tasks.</div>
            </div>
        );
    }

    if (viewingTask) {
        return (
            <div className="task-detail-view">
                <div className="results-section">
                    <button
                        onClick={() => {
                            setIsEditing(false);
                            setWarningMessage('');
                            onBack();
                        }}
                        className="submit-btn secondary"
                        style={{ marginBottom: '1rem' }}
                    >
                        ← Back to Saved Tasks
                    </button>

                    {!isEditing ? (
                        <>
                            <div className="task-card">
                                <strong>{viewingTask.task}</strong>
                                <div
                                    style={{
                                        fontSize: '0.85rem',
                                        color: '#64748b',
                                    }}
                                >
                                    {viewingTask.dateTime && viewingTask.dateTime.toDate
                                        ? formatDateTime(viewingTask.dateTime.toDate())
                                        : viewingTask.dateTime
                                          ? formatDateTime(new Date(viewingTask.dateTime))
                                          : 'No date selected'}
                                </div>
                            </div>

                            <TaskResults
                                subtasks={viewingTask.subtasks}
                                onUpdate={(updatedSubtasks) => {
                                    const updatedTask = {
                                        ...viewingTask,
                                        subtasks: updatedSubtasks,
                                    };
                                    setEditedTask(updatedTask);
                                    setOriginalTask(updatedTask);
                                    saveTaskDebounced.current(updatedTask);
                                }}
                            />

                            {confirmDeleteId === viewingTask.id ? (
                                <div style={{ marginTop: '1rem' }}>
                                    <div
                                        style={{
                                            color: '#ef4444',
                                            marginBottom: '0.5rem',
                                        }}
                                    >
                                        Are you sure you want to delete this task?
                                    </div>
                                    <div
                                        style={{
                                            display: 'flex',
                                            gap: '0.5rem',
                                        }}
                                    >
                                        <button className="submit-btn secondary" onClick={() => setConfirmDeleteId(null)}>
                                            Cancel
                                        </button>
                                        <button
                                            className="submit-btn"
                                            style={{
                                                backgroundColor: '#ef4444',
                                            }}
                                            onClick={() => confirmDelete(viewingTask.id)}
                                        >
                                            Confirm Delete
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div
                                    style={{
                                        display: 'flex',
                                        gap: '0.5rem',
                                        marginTop: '1rem',
                                    }}
                                >
                                    <button
                                        className="submit-btn"
                                        onClick={() => {
                                            setIsEditing(true);
                                            setEditedTask(viewingTask);
                                            setOriginalTask(viewingTask);
                                        }}
                                    >
                                        Edit
                                    </button>
                                    <button className="submit-btn secondary" style={{ color: '#ef4444' }} onClick={() => setConfirmDeleteId(viewingTask.id)}>
                                        Delete
                                    </button>
                                </div>
                            )}
                        </>
                    ) : (
                        <>
                            <input
                                className="task-input"
                                value={editedTask.task}
                                onChange={(e) => handleChangeTitle(e.target.value)}
                                style={{ marginBottom: '1rem' }}
                                placeholder="Enter task title"
                            />

                            {warningMessage && (
                                <div
                                    ref={warningRef}
                                    className="task-card"
                                    style={{
                                        backgroundColor: '#fef2f2',
                                        color: '#b91c1c',
                                    }}
                                >
                                    {warningMessage}
                                </div>
                            )}

                            <TaskResults
                                subtasks={editedTask.subtasks}
                                isEditing={true}
                                onUpdate={(updatedSubtasks) => {
                                    const updatedTask = {
                                        ...editedTask,
                                        subtasks: updatedSubtasks,
                                    };
                                    setEditedTask(updatedTask);
                                }}
                            />

                            <div
                                style={{
                                    display: 'flex',
                                    flexWrap: 'wrap',
                                    gap: '0.5rem',
                                    marginTop: '1rem',
                                }}
                            >
                                <button className="submit-btn" onClick={() => handleSave(true)}>
                                    Save Changes
                                </button>
                                <button className="submit-btn secondary" onClick={() => handleSave(false)}>
                                    Save as New
                                </button>
                                <button className="submit-btn secondary" onClick={handleCancelEdit}>
                                    Cancel
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="saved-tasks-list">
            <div className="results-section">
                {tasks.length === 0 ? (
                    <div className="task-card">No saved tasks yet.</div>
                ) : (
                    tasks.map((t) => (
                        <div key={t.id} className="task-card" style={{ position: 'relative' }}>
                            <div onClick={() => onSelect(t)} style={{ cursor: 'pointer' }}>
                                <strong>{t.task}</strong>
                                <div
                                    style={{
                                        fontSize: '0.85rem',
                                        color: '#64748b',
                                    }}
                                >
                                    {t.dateTime && t.dateTime.toDate
                                        ? formatDateTime(t.dateTime.toDate())
                                        : t.dateTime
                                          ? formatDateTime(new Date(t.dateTime))
                                          : 'No date selected'}
                                </div>
                            </div>

                            {confirmDeleteId === t.id ? (
                                <div style={{ marginTop: '0.5rem' }}>
                                    <div
                                        style={{
                                            fontSize: '0.9rem',
                                            color: '#ef4444',
                                            marginBottom: '0.5rem',
                                        }}
                                    >
                                        Are you sure you want to delete?
                                    </div>
                                    <div
                                        style={{
                                            display: 'flex',
                                            gap: '0.5rem',
                                        }}
                                    >
                                        <button onClick={() => setConfirmDeleteId(null)} className="submit-btn secondary">
                                            Cancel
                                        </button>
                                        <button
                                            onClick={() => confirmDelete(t.id)}
                                            className="submit-btn"
                                            style={{
                                                backgroundColor: '#ef4444',
                                            }}
                                        >
                                            Confirm
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <button
                                    className="delete-btn"
                                    onClick={() => setConfirmDeleteId(t.id)}
                                    style={{
                                        position: 'absolute',
                                        top: '0.5rem',
                                        right: '0.5rem',
                                        background: 'transparent',
                                        border: 'none',
                                        color: '#ef4444',
                                        fontWeight: 'bold',
                                        cursor: 'pointer',
                                    }}
                                    title="Delete Task"
                                >
                                    ✕
                                </button>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
