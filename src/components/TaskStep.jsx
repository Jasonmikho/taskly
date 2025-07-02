// ✅ Updated TaskStep.jsx
import React, { useEffect, useRef, useState } from 'react';

const TaskStep = React.memo(({ el, idx, isEditing, onChange }) => {
    const inputRef = useRef(null);
    const [localTitle, setLocalTitle] = useState(el.title || '');
    const [localBody, setLocalBody] = useState(el.body || '');
    const [localBullets, setLocalBullets] = useState(el.bullets || []);
    const [hours, setHours] = useState('');
    const [minutes, setMinutes] = useState('');
    const [durationError, setDurationError] = useState('');

    useEffect(() => {
        if (el.type === 'timedBlock' && el.body) {
            const text = el.body.toLowerCase();
            let hrs = '',
                mins = '';
            const compound = text.match(
                /\(?\s*(\d+)\s*hours?\)?\s*(\d+)\s*minutes?\)?/i
            );
            if (compound) {
                hrs = compound[1];
                mins = compound[2];
            } else {
                const hourOnly = text.match(/([\d.]+)\s*(hrs?|hours?)/i);
                const minuteOnly = text.match(/([\d.]+)\s*(mins?|minutes?)/i);
                if (hourOnly && !isNaN(hourOnly[1])) {
                    const val = parseFloat(hourOnly[1]);
                    hrs = Math.floor(val).toString();
                    const leftover = Math.round((val % 1) * 60);
                    if (leftover) mins = leftover.toString();
                }
                if (minuteOnly && !isNaN(minuteOnly[1])) {
                    mins = parseFloat(minuteOnly[1]).toString();
                    if (!hrs) hrs = '0';
                }
            }
            setHours(hrs || '');
            setMinutes(mins || '');
        }
    }, [el.body]);

    useEffect(() => {
        setLocalBullets(el.bullets || []);
    }, [el.bullets]);

    useEffect(() => {
        setLocalTitle(el.title || '');
    }, [el.title]);

    useEffect(() => {
        if (inputRef.current) {
            inputRef.current.style.height = 'auto';
            inputRef.current.style.height = `${inputRef.current.scrollHeight}px`;
        }
    }, [localTitle, localBody]);

    const handleNumericChange = (field, value) => {
        const sanitized = value.replace(/\D/g, '');
        const h = field === 'hours' ? sanitized : hours;
        const m = field === 'minutes' ? sanitized : minutes;
        setHours(h);
        setMinutes(m);
        const hourNum = parseInt(h || '0', 10);
        const minNum = parseInt(m || '0', 10);
        if (hourNum === 0 && minNum === 0) {
            setDurationError('Duration must be greater than 0.');
            return;
        }
        setDurationError('');
        const hourLabel = hourNum === 1 ? 'hour' : 'hours';
        const minuteLabel = minNum === 1 ? 'minute' : 'minutes';
        let body = '(';
        if (hourNum > 0) body += `${hourNum} ${hourLabel}`;
        if (hourNum > 0 && minNum > 0) body += ' ';
        if (minNum > 0) body += `${minNum} ${minuteLabel}`;
        body += ')';
        onChange(idx, 'body', body);
    };

    const handleBulletChange = (bulletIdx, value) => {
        const updated = [...localBullets];
        updated[bulletIdx] = value;
        setLocalBullets(updated);
        onChange(idx, 'bullets', updated);
    };

    const handleAddBullet = () => {
        const updated = [...localBullets, ''];
        setLocalBullets(updated);
        onChange(idx, 'bullets', updated);
    };

    const handleDeleteBullet = (bulletIdx) => {
        const updated = localBullets.filter((_, i) => i !== bulletIdx);
        setLocalBullets(updated);
        onChange(idx, 'bullets', updated);
    };

    const logAndChange = (value, field) => {
        if (field === 'title') {
            setLocalTitle(value);
            onChange(idx, 'title', value);
        }
        if (field === 'body') {
            setLocalBody(value);
            onChange(idx, 'body', value);
        }
    };

    const inputStyle = {
        resize: 'none',
        overflowY: 'auto',
        maxHeight: '200px',
        minHeight: '40px',
        padding: '0.5rem',
        fontSize: '1rem',
        fontFamily: 'inherit',
        borderRadius: '0.5rem',
        border: '1px solid #cbd5e1',
        boxSizing: 'border-box',
        width: '100%',
    };

    if (el.type === 'summaryLine') return null;

    return (
        <div className="task-card">
            {isEditing ? (
                <>
                    {el.type === 'timedBlock' && (
                        <>
                            <div
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                }}
                            >
                                <span
                                    style={{
                                        fontWeight: 'bold',
                                        whiteSpace: 'nowrap',
                                    }}
                                >
                                    {localTitle.match(/^\d+\./)?.[0]}
                                </span>
                                <textarea
                                    ref={inputRef}
                                    className="task-input"
                                    value={localTitle.replace(/^\d+\.\s*/, '')}
                                    onChange={(e) =>
                                        logAndChange(
                                            `${localTitle.match(/^\d+\./)?.[0] || ''} ${e.target.value}`,
                                            'title'
                                        )
                                    }
                                    style={inputStyle}
                                />
                            </div>
                            <div
                                style={{
                                    display: 'flex',
                                    gap: '0.5rem',
                                    alignItems: 'center',
                                    marginTop: '0.5rem',
                                }}
                            >
                                <input
                                    type="text"
                                    value={hours}
                                    onChange={(e) =>
                                        handleNumericChange(
                                            'hours',
                                            e.target.value
                                        )
                                    }
                                    className="duration-input"
                                />
                                <span>hour(s)</span>
                                <input
                                    type="text"
                                    value={minutes}
                                    onChange={(e) =>
                                        handleNumericChange(
                                            'minutes',
                                            e.target.value
                                        )
                                    }
                                    className="duration-input"
                                />
                                <span>minute(s)</span>
                            </div>
                            {durationError && (
                                <div
                                    style={{
                                        color: '#dc2626',
                                        fontSize: '0.9rem',
                                        marginTop: '0.25rem',
                                    }}
                                >
                                    {durationError}
                                </div>
                            )}
                            <div style={{ marginTop: '1rem' }}>
                                <div
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.5rem',
                                        marginBottom: '0.5rem',
                                    }}
                                >
                                    <span
                                        style={{
                                            fontWeight: 'bold',
                                            fontSize: '0.9rem',
                                        }}
                                    >
                                        Bullet Points:
                                    </span>
                                    <button
                                        onClick={handleAddBullet}
                                        style={{
                                            background: '#3b82f6',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '0.25rem',
                                            padding: '0.25rem 0.5rem',
                                            fontSize: '0.8rem',
                                            cursor: 'pointer',
                                        }}
                                    >
                                        + Add Bullet
                                    </button>
                                </div>
                                {localBullets.map((bullet, bulletIdx) => (
                                    <div
                                        key={bulletIdx}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.5rem',
                                            marginBottom: '0.25rem',
                                        }}
                                    >
                                        <span>•</span>
                                        <input
                                            type="text"
                                            value={bullet}
                                            onChange={(e) =>
                                                handleBulletChange(
                                                    bulletIdx,
                                                    e.target.value
                                                )
                                            }
                                            style={{
                                                flex: 1,
                                                padding: '0.25rem',
                                                border: '1px solid #cbd5e1',
                                                borderRadius: '0.25rem',
                                            }}
                                            placeholder="Enter bullet point..."
                                        />
                                        <button
                                            onClick={() =>
                                                handleDeleteBullet(bulletIdx)
                                            }
                                            style={{
                                                background: '#dc2626',
                                                color: 'white',
                                                border: 'none',
                                                borderRadius: '0.25rem',
                                                padding: '0.25rem',
                                                fontSize: '0.8rem',
                                                cursor: 'pointer',
                                            }}
                                        >
                                            ✕
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </>
            ) : (
                <>
                    {el.type === 'timedBlock' && (
                        <>
                            <div
                                style={{
                                    fontWeight: 'bold',
                                    marginBottom: '0.25rem',
                                }}
                            >
                                {el.title}
                            </div>
                            <div
                                style={{
                                    marginLeft: '0.5rem',
                                    color: '#334155',
                                    marginBottom: '0.5rem',
                                }}
                            >
                                {el.body}
                            </div>
                            {el.bullets?.length > 0 && (
                                <ul
                                    style={{
                                        marginTop: '0.25rem',
                                        paddingLeft: '1.5rem',
                                    }}
                                >
                                    {el.bullets.map((b, i) => (
                                        <li key={i}>{b}</li>
                                    ))}
                                </ul>
                            )}
                        </>
                    )}
                </>
            )}
        </div>
    );
});

export default TaskStep;
