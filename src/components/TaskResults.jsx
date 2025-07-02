import React, { useState, useEffect } from 'react';
import TaskStep from './TaskStep';
import {
    DndContext,
    closestCenter,
    PointerSensor,
    useSensor,
    useSensors,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    useSortable,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

function SortableItem({
    id,
    index,
    el,
    isEditing,
    onChange,
    onDelete,
    onToggleComplete,
}) {
    const { attributes, listeners, setNodeRef, transform, transition } =
        useSortable({ id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        position: 'relative',
        marginBottom: '1rem',
        cursor: !isEditing ? 'pointer' : 'default',
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            onClick={() => !isEditing && onToggleComplete(index)}
        >
            <div
                style={{
                    flex: 1,
                    textDecoration: el.completed ? 'line-through' : 'none',
                }}
            >
                <TaskStep
                    el={el}
                    idx={index}
                    isEditing={isEditing}
                    onChange={onChange}
                />
            </div>

            {isEditing && (
                <>
                    <div
                        {...listeners}
                        style={{
                            position: 'absolute',
                            left: '-1.5rem',
                            top: '1rem',
                            cursor: 'grab',
                            fontSize: '1.25rem',
                            color: '#94a3b8',
                        }}
                        title="Drag to reorder"
                    >
                        ☰
                    </div>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onDelete(index);
                        }}
                        style={{
                            position: 'absolute',
                            top: '0.5rem',
                            right: '0.5rem',
                            background: 'transparent',
                            border: 'none',
                            color: '#dc2626',
                            fontSize: '1.25rem',
                            cursor: 'pointer',
                        }}
                        title="Delete Step"
                    >
                        ✕
                    </button>
                </>
            )}
        </div>
    );
}

export default function TaskResults({
    subtasks,
    isEditing = false,
    onUpdate,
    skipMessage,
    onNewTask,
}) {
    const [elements, setElements] = useState([]);
    const [totalMinutes, setTotalMinutes] = useState([0, 0]);
    const sensors = useSensors(useSensor(PointerSensor));

    useEffect(() => {
        if (!Array.isArray(subtasks)) return;

        const isAlreadyParsed =
            subtasks.length > 0 &&
            typeof subtasks[0] === 'object' &&
            'title' in subtasks[0];

        if (isAlreadyParsed) {
            setElements(subtasks);
            const mins = subtasks.reduce((sum, el) => {
                const match = el.body?.match(
                    /\((?:(\d+)\s*hours?)?\s*(?:(\d+)\s*minutes?)?\)/i
                );
                if (match) {
                    const hrs = parseInt(match[1]) || 0;
                    const mins = parseInt(match[2]) || 0;
                    return sum + hrs * 60 + mins;
                }
                return sum;
            }, 0);
            setTotalMinutes([mins, mins]);
        } else {
            const parsed = parseSubtasks(subtasks);
            setElements(parsed.elements);
            setTotalMinutes([parsed.minTotal, parsed.maxTotal]);
        }
    }, [subtasks]);

    function parseSubtasks(subtasks) {
        const parsed = [];
        let minTotal = 0;
        let maxTotal = 0;
        const compoundRegex =
            /\((?:(\d+(?:\.\d+)?)\s*hours?)?\s*(?:(\d+(?:\.\d+)?)\s*minutes?)?(?:\s*\w+)?\)/i;
        let currentTimedBlock = null;

        for (let i = 0; i < subtasks.length; i++) {
            let line =
                typeof subtasks[i] === 'string'
                    ? (subtasks[i] || '').trim()
                    : '';
            if (!line || line.startsWith('BREAKDOWN:')) continue;

            const cleanLine = line.replace(/^\*+|\*+$/g, '').trim();
            const normalizedLine = cleanLine
                .replace(
                    /\((?:\s*)?(?:approx\.?|approximately|about|~)\s*/gi,
                    '('
                )
                .replace(/\s+/g, ' ')
                .trim();

            const nextLine =
                typeof subtasks[i + 1] === 'string'
                    ? subtasks[i + 1]?.trim()
                    : '';
            const isDurationOnly =
                /^\((?:(\d+)\s*hours?)?\s*(?:(\d+)\s*minutes?)?\)$/i.test(
                    nextLine
                );

            const makeId = (prefix) =>
                `${prefix}-${i}-${line.slice(0, 20).replace(/\s+/g, '_')}`;

            if (line.startsWith('*') || line.startsWith('•')) {
                const bulletText = normalizedLine.replace(/^[*•]\s*/, '');
                if (currentTimedBlock) {
                    currentTimedBlock.bullets = currentTimedBlock.bullets || [];
                    currentTimedBlock.bullets.push(bulletText);
                }
                continue;
            }

            if (/^\d+\./.test(normalizedLine) && isDurationOnly) {
                const title = normalizedLine.replace(/:+$/, '');
                const body = nextLine;
                currentTimedBlock = {
                    id: makeId('next'),
                    type: 'timedBlock',
                    title,
                    body,
                    bullets: [],
                    completed: false,
                };
                parsed.push(currentTimedBlock);

                const match = nextLine.match(compoundRegex);
                if (match && (match[1] || match[2])) {
                    const hrs = match[1] ? parseInt(match[1], 10) : 0;
                    const mins = match[2] ? parseInt(match[2], 10) : 0;
                    minTotal += hrs * 60 + mins;
                    maxTotal += hrs * 60 + mins;
                }

                i++;
                continue;
            }

            const inlineDurationMatch = normalizedLine.match(compoundRegex);
            if (/^\d+\./.test(normalizedLine) && inlineDurationMatch) {
                const durationText = inlineDurationMatch[0];
                const title = normalizedLine
                    .replace(durationText, '')
                    .trim()
                    .replace(/:+$/, '');
                const body = durationText.trim();
                currentTimedBlock = {
                    id: makeId('inline'),
                    type: 'timedBlock',
                    title,
                    body,
                    bullets: [],
                    completed: false,
                };
                parsed.push(currentTimedBlock);

                const hrs = inlineDurationMatch[1]
                    ? parseInt(inlineDurationMatch[1], 10)
                    : 0;
                const mins = inlineDurationMatch[2]
                    ? parseInt(inlineDurationMatch[2], 10)
                    : 0;
                minTotal += hrs * 60 + mins;
                maxTotal += hrs * 60 + mins;
                continue;
            }

            currentTimedBlock = null;
        }

        return {
            elements: parsed,
            minTotal: Math.round(minTotal),
            maxTotal: Math.round(maxTotal),
        };
    }

    function handleChange(index, field, value) {
        const updated = [...elements];
        updated[index][field] = value;
        setElements(updated);
        propagateUpdate(updated);
    }

    function handleDelete(index) {
        const updated = elements.filter((_, i) => i !== index);
        setElements(updated);
        propagateUpdate(updated);
    }

    function handleAddStep() {
        const nextNum =
            elements.filter((e) => e.type === 'timedBlock').length + 1;
        setElements([
            ...elements,
            {
                id: `step-${Date.now()}-${nextNum}`,
                type: 'timedBlock',
                title: `${nextNum}. `,
                body: '(0 hours 0 minutes)',
                bullets: [],
                completed: false,
            },
        ]);
    }

    function handleToggleComplete(index) {
        const updated = [...elements];
        updated[index].completed = !updated[index].completed;
        setElements(updated);
        propagateUpdate(updated);
    }

    function handleDragEnd(event) {
        const { active, over } = event;
        if (!over || active.id === over.id) return;

        const oldIndex = elements.findIndex((el) => el.id === active.id);
        const newIndex = elements.findIndex((el) => el.id === over.id);
        if (oldIndex === -1 || newIndex === -1) return;

        const reordered = arrayMove(elements, oldIndex, newIndex);
        let count = 1;
        const renumbered = reordered.map((el) => {
            if (el.type === 'timedBlock') {
                const rest = el.title.replace(/^\d+\.\s*/, '');
                return { ...el, title: `${count++}. ${rest}` };
            }
            return el;
        });

        setElements(renumbered);
        propagateUpdate(renumbered);
    }

    function formatTime(mins) {
        const hrs = Math.floor(mins / 60);
        const m = mins % 60;
        if (hrs > 0 && m > 0) return `${hrs} hrs ${m} mins`;
        if (hrs > 0) return `${hrs} hrs`;
        return `${m} mins`;
    }

    function propagateUpdate(updated) {
        if (!onUpdate) return;
        onUpdate(updated);
    }

    const sortableElements = elements.filter((el) => el.type === 'timedBlock');
    const completedCount = sortableElements.filter((el) => el.completed).length;

    return (
        <div className="results-section">
            {sortableElements.length > 0 && (
                <div
                    style={{
                        marginBottom: '1rem',
                        fontWeight: 'bold',
                        color: '#1e293b',
                    }}
                >
                    {completedCount}/{sortableElements.length} steps completed
                </div>
            )}

            <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
            >
                <SortableContext
                    items={sortableElements.map((el) => el.id)}
                    strategy={verticalListSortingStrategy}
                >
                    {sortableElements.map((el, idx) => (
                        <SortableItem
                            key={el.id}
                            id={el.id}
                            index={idx}
                            el={el}
                            isEditing={isEditing}
                            onChange={handleChange}
                            onDelete={handleDelete}
                            onToggleComplete={handleToggleComplete}
                        />
                    ))}
                </SortableContext>
            </DndContext>

            {totalMinutes[0] > 0 && (
                <div
                    className="task-card"
                    style={{
                        backgroundColor: '#ecfdf5',
                        color: '#065f46',
                        fontWeight: 'bold',
                    }}
                >
                    Total Estimated Time: {formatTime(totalMinutes[0])}
                </div>
            )}

            {isEditing && (
                <button
                    className="submit-btn secondary"
                    onClick={handleAddStep}
                    style={{ marginTop: '1rem', alignSelf: 'flex-start' }}
                >
                    + Add Step
                </button>
            )}

            {onNewTask && !isEditing && (
                <button
                    onClick={onNewTask}
                    className="submit-btn secondary"
                    style={{ marginTop: '1rem', alignSelf: 'flex-start' }}
                >
                    Create New Task
                </button>
            )}
        </div>
    );
}
