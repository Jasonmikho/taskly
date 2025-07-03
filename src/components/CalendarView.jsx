import React, { useMemo, useRef, useState, useEffect } from 'react';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import format from 'date-fns/format';
import parse from 'date-fns/parse';
import startOfWeek from 'date-fns/startOfWeek';
import getDay from 'date-fns/getDay';
import enUS from 'date-fns/locale/en-US';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import TaskResults from './TaskResults';
import './CalendarView.css';

const locales = { 'en-US': enUS };
const localizer = dateFnsLocalizer({
    format,
    parse,
    startOfWeek,
    getDay,
    locales,
});

export default function CalendarView({ tasks }) {
    const [selectedEvent, setSelectedEvent] = useState(null);
    const [currentView, setCurrentView] = useState('month');
    const [currentDate, setCurrentDate] = useState(new Date());
    const taskCardRef = useRef(null);

    // Updated duration calculation logic for your CalendarView component

    const events = useMemo(() => {
        const filtered = tasks
            .filter((t) => t.dateTime || t.timestamp)
            .map((t) => {
                const raw = t.dateTime || t.timestamp;

                let baseTime;
                if (t.dateTime?.toDate) {
                    baseTime = t.dateTime.toDate();
                } else if (typeof raw === 'string') {
                    baseTime = new Date(raw);
                } else {
                    console.warn('[Calendar] Invalid or missing dateTime/timestamp for task:', t);
                    return null;
                }

                if (isNaN(baseTime.getTime())) {
                    console.warn('[Calendar] Skipping task with invalid date:', t);
                    return null;
                }

                let durationMs = 60 * 60 * 1000; // default to 1 hour

                // Try multiple sources for duration in priority order
                if (t.totalDurationOverride) {
                    // Explicit override field
                    const [h, m] = t.totalDurationOverride.split(':').map(Number);
                    const overrideMinutes = (h || 0) * 60 + (m || 0);
                    if (overrideMinutes > 0) {
                        durationMs = overrideMinutes * 60 * 1000;
                    }
                } else if (t.totalEstimatedTime) {
                    // Check if there's a totalEstimatedTime field
                    const timeMatch = t.totalEstimatedTime.match(/(\d+)\s*hrs?\s*(\d+)\s*mins?/i);
                    if (timeMatch) {
                        const hours = parseInt(timeMatch[1]) || 0;
                        const minutes = parseInt(timeMatch[2]) || 0;
                        const totalMinutes = hours * 60 + minutes;
                        if (totalMinutes > 0) {
                            durationMs = totalMinutes * 60 * 1000;
                        }
                    }
                } else if (t.estimatedTime) {
                    // Check if there's an estimatedTime field
                    const timeMatch = t.estimatedTime.match(/(\d+)\s*hrs?\s*(\d+)\s*mins?/i);
                    if (timeMatch) {
                        const hours = parseInt(timeMatch[1]) || 0;
                        const minutes = parseInt(timeMatch[2]) || 0;
                        const totalMinutes = hours * 60 + minutes;
                        if (totalMinutes > 0) {
                            durationMs = totalMinutes * 60 * 1000;
                        }
                    }
                } else {
                    // Calculate from subtasks - handle both formats
                    let totalMinutes = 0;
                    (t.subtasks || []).forEach((sub) => {
                        // Handle case where subtask is a string (your current format)
                        const subtaskText = typeof sub === 'string' ? sub : sub?.body || '';

                        // Look for time patterns like "(15 minutes)" or "(2 hours)" or "(1 hour 30 minutes)"
                        const timeMatch = subtaskText.match(/\((?:(\d+)\s*hours?)?\s*(?:(\d+)\s*minutes?)?\)/i);
                        if (timeMatch) {
                            const h = parseInt(timeMatch[1]) || 0;
                            const m = parseInt(timeMatch[2]) || 0;
                            totalMinutes += h * 60 + m;
                        }
                    });
                    if (totalMinutes > 0) {
                        durationMs = totalMinutes * 60 * 1000;
                    }
                }

                const event = {
                    id: t.id,
                    title: t.task,
                    start: baseTime,
                    end: new Date(baseTime.getTime() + durationMs),
                    allDay: false,
                    ...t,
                };
                return event;
            })
            .filter(Boolean);

        if (filtered.length === 0) {
            console.warn('[CalendarView] No valid events found.');
        }

        return filtered;
    }, [tasks]);

    useEffect(() => {
        if (selectedEvent && taskCardRef.current) {
            setTimeout(() => {
                taskCardRef.current.scrollIntoView({
                    behavior: 'smooth',
                    block: 'center',
                });
            }, 50);
        }
    }, [selectedEvent]);

    return (
        <div className="results-section">
            <div
                style={{
                    minHeight: '650px',
                    background: 'white',
                    borderRadius: '1rem',
                    padding: '1rem',
                    overflow: 'auto',
                }}
            >
                <Calendar
                    localizer={localizer}
                    events={events}
                    startAccessor="start"
                    endAccessor="end"
                    onSelectEvent={setSelectedEvent}
                    style={{ height: '100%' }}
                    views={['month', 'week', 'day', 'agenda']}
                    view={currentView}
                    onView={setCurrentView}
                    date={currentDate}
                    onNavigate={setCurrentDate}
                    popup
                />
            </div>

            {selectedEvent && (
                <div ref={taskCardRef} className="task-card" style={{ marginTop: '1.5rem' }}>
                    <h3>{selectedEvent.title}</h3>
                    <div
                        style={{
                            fontSize: '0.9rem',
                            color: '#64748b',
                            marginBottom: '0.5rem',
                        }}
                    >
                        {new Date(selectedEvent.start).toLocaleString()}
                    </div>
                    <TaskResults subtasks={selectedEvent.subtasks} />
                    <button className="submit-btn secondary" onClick={() => setSelectedEvent(null)} style={{ marginTop: '1rem' }}>
                        Close
                    </button>
                </div>
            )}
        </div>
    );
}
