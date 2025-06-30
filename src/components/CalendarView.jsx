import React, { useMemo, useRef, useState, useEffect } from 'react';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import format from 'date-fns/format';
import parse from 'date-fns/parse';
import startOfWeek from 'date-fns/startOfWeek';
import getDay from 'date-fns/getDay';
import enUS from 'date-fns/locale/en-US';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import TaskResults from './TaskResults';

const locales = { 'en-US': enUS };
const localizer = dateFnsLocalizer({ format, parse, startOfWeek, getDay, locales });

export default function CalendarView({ tasks }) {
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [currentView, setCurrentView] = useState('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  const taskCardRef = useRef(null); // ✅ Ref for the selected task section

  console.log('[CalendarView] Raw tasks received:', tasks);

  const events = useMemo(() => {
    const filtered = tasks
      .filter(t => t.dateTime || t.timestamp)
      .map(t => {
        const raw = t.dateTime || t.timestamp;

        const baseTime = t.dateTime?.toDate
          ? t.dateTime.toDate()
          : new Date(raw);

        if (isNaN(baseTime.getTime())) {
          console.warn('[CalendarView] Skipping invalid date for task:', t);
          return null;
        }

        let totalMinutes = 0;
        (t.subtasks || []).forEach(sub => {
          const match = sub?.body?.match(/\((?:(\d+)\s*hours?)?\s*(?:(\d+)\s*minutes?)?\)/i);
          if (match) {
            const h = parseInt(match[1]) || 0;
            const m = parseInt(match[2]) || 0;
            totalMinutes += h * 60 + m;
          }
        });

        const durationMs = totalMinutes > 0 ? totalMinutes * 60 * 1000 : 60 * 60 * 1000;

        const event = {
          id: t.id,
          title: t.task,
          start: baseTime,
          end: new Date(baseTime.getTime() + durationMs),
          allDay: false,
          ...t
        };

        console.log('[CalendarView] Final event:', event);
        return event;
      })
      .filter(Boolean);

    if (filtered.length === 0) {
      console.warn('[CalendarView] No valid events found.');
    }

    return filtered;
  }, [tasks]);

  // ✅ Scroll to selected task card on open
  useEffect(() => {
    if (selectedEvent && taskCardRef.current) {
      setTimeout(() => {
        taskCardRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 50);
    }
  }, [selectedEvent]);

  return (
    <div className="results-section">
      <div style={{ height: 'calc(100vh - 180px)', background: 'white', borderRadius: '1rem', padding: '1rem' }}>
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
          <div style={{ fontSize: '0.9rem', color: '#64748b', marginBottom: '0.5rem' }}>
            {new Date(selectedEvent.start).toLocaleString()}
          </div>
          <TaskResults subtasks={selectedEvent.subtasks} />
          <button
            className="submit-btn secondary"
            onClick={() => setSelectedEvent(null)}
            style={{ marginTop: '1rem' }}
          >
            Close
          </button>
        </div>
      )}
    </div>
  );
}
