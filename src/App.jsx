import { useState, useEffect, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import './Login.css';
import './MainApp.css';
import TaskInput from './components/TaskInput';
import ClarificationForm from './components/ClarificationForm';
import ExtraContextForm from './components/ExtraContextForm';
import TaskResults from './components/TaskResults';
import SavedTasks from './components/SavedTasks';
import Login from './components/Login';
import Register from './components/Register';
import ForgotPassword from './components/ForgotPassword';
import { FirebaseAuthentication } from '@capacitor-firebase/authentication';
import { getSavedTasks, saveTask, deleteTaskById } from './utils/firebaseUtils';
import { LogOut, Plus, Archive, Calendar } from 'lucide-react';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import DateTimePicker from './components/DateTimePicker';
import CalendarView from './components/CalendarView';
import EmailVerificationPending from './components/EmailVerificationPending';

function App() {
    const [user, setUser] = useState(null);
    const [loadingUser, setLoadingUser] = useState(true);
    const [authMode, setAuthMode] = useState(null);
    const [showMenu, setShowMenu] = useState(false);
    const [taskInput, setTaskInput] = useState('');
    const [subtasks, setSubtasks] = useState([]);
    const [loading, setLoading] = useState(false);
    const [currentQuestion, setCurrentQuestion] = useState('');
    const [clarification, setClarification] = useState('');
    const [clarificationHistory, setClarificationHistory] = useState([]);
    const [skipCount, setSkipCount] = useState(0);
    const [extraContext, setExtraContext] = useState('');
    const [savedTasks, setSavedTasks] = useState([]);
    const [viewingSavedTask, setViewingSavedTask] = useState(null);
    const [activeTab, setActiveTab] = useState('new');
    const [screenState, setScreenState] = useState('idle');
    const [eventDateTime, setEventDateTime] = useState(null);
    const [skipMessage, setSkipMessage] = useState('');
    const [showVerificationScreen, setShowVerificationScreen] = useState(false);
    const [pendingUser, setPendingUser] = useState(null);
    const [userCredentials, setUserCredentials] = useState(null);
    const [isRegistering, setIsRegistering] = useState(false);
    const [authCheckComplete, setAuthCheckComplete] = useState(false);

    const [messageHistory, setMessageHistory] = useState([
        {
            role: 'system',
            content: `
You are an AI assistant helping users break vague tasks into actionable subtasks with estimated durations and helpful structure.

Clarify unclear tasks by asking **up to 3** follow-up questions — one at a time.

🚨 IMPORTANT:
- If 2 questions were already asked and the task still lacks detail, **you MUST ask a 3rd question**.
- Only stop at 2 if the task is now 100% clear and ready for breakdown.

Rules:
- Prefix follow-up questions with: QUESTION:
- Prefix final task breakdowns with: BREAKDOWN:

Format for BREAKDOWN:
1. [Task title]  
(Duration on the next line: in the form of (X hours Y minutes))  
(Optional: 1–2 bullet tips below each task)

💡 If the user asks for suggestions or recommendations (e.g., books, tools, methods), include up to 3 **specific examples** with the most relevant task step (IN SAME CARD).

DO NOT:
- Write duration on the same line as the task
- Use dashes or colons for time
- Add commentary before or after the breakdown

Example:
1. Research history books  
(30 minutes)  
• Consider "SPQR", "Sapiens", or "The Guns of August"  
• Choose one based on your area of interest

BREAKDOWN MUST FOLLOW THIS FORMAT EXACTLY.
`.trim(),
        },
    ]);

    const menuRef = useRef(null);

    const resetAllTaskStates = () => {
        setTaskInput('');
        setSubtasks([]);
        setClarification('');
        setClarificationHistory([]);
        setSkipCount(0);
        setExtraContext('');
        setEventDateTime(null);
        setScreenState('idle');
        setViewingSavedTask(null);
        setSkipMessage('');
        setMessageHistory([messageHistory[0]]);
    };

    useEffect(() => {
        const setupAuthListener = async () => {
            if (Capacitor.isNativePlatform()) {
                // Native platform - use Capacitor Firebase Authentication plugin
                const { FirebaseAuthentication } = await import('@capacitor-firebase/authentication');

                const removeListener = await FirebaseAuthentication.addListener('authStateChange', (result) => {
                    setLoadingUser(false);

                    if (result.user?.emailVerified) {
                        setUser(result.user);
                        setActiveTab('new');
                        resetAllTaskStates();
                        getSavedTasks(result.user.uid).then(setSavedTasks);
                        setAuthMode(null);
                        setIsRegistering(false);
                    } else {
                        if (showVerificationScreen || pendingUser || isRegistering) {
                            console.log('[App] Verification flow active — skipping fallback login screen');
                            return;
                        }

                        if (!authMode) {
                            setUser(null);
                            setSavedTasks([]);
                            setActiveTab('new');
                            resetAllTaskStates();
                            setAuthMode('login');
                        }
                    }
                });

                // Check current user on app start
                try {
                    const result = await FirebaseAuthentication.getCurrentUser();
                    setLoadingUser(false);

                    if (result.user?.emailVerified) {
                        setUser(result.user);
                        getSavedTasks(result.user.uid).then(setSavedTasks);
                    } else if (!authMode && !showVerificationScreen && !pendingUser && !isRegistering) {
                        setUser(null);
                        setSavedTasks([]);
                        setAuthMode('login');
                    }
                } catch (error) {
                    console.error('Error getting current user (native):', error);
                    setLoadingUser(false);

                    if (!authMode && !showVerificationScreen && !pendingUser && !isRegistering) {
                        setAuthMode('login');
                    }
                }
                setAuthCheckComplete(true);

                return () => removeListener.remove();
            } else {
                // Web platform - use Firebase web SDK
                const firebaseModule = await import('./firebase.js');
                const { onAuthStateChanged } = await import('firebase/auth');

                const auth = firebaseModule.auth;

                let called = false;

                const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
                    if (!called) {
                        called = true;
                        setAuthCheckComplete(true);
                    }

                    setLoadingUser(false);

                    if (currentUser?.emailVerified) {
                        setUser(currentUser);
                        setActiveTab('new');
                        resetAllTaskStates();
                        getSavedTasks(currentUser.uid).then(setSavedTasks);
                        setAuthMode(null);
                        setIsRegistering(false);
                    } else {
                        if (!authMode && !showVerificationScreen && !pendingUser && !isRegistering) {
                            setUser(null);
                            setSavedTasks([]);
                            setActiveTab('new');
                            resetAllTaskStates();
                            setAuthMode('login');
                        }
                    }
                });

                return unsubscribe;
            }
        };

        setupAuthListener();
    }, []);

    useEffect(() => {
        function handleClickOutside(event) {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setShowMenu(false);
            }
        }

        if (showMenu) {
            document.addEventListener('mousedown', handleClickOutside);
        } else {
            document.removeEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showMenu]);

    function normalizeBreakdownFormat(breakdown) {
        return breakdown
            .split('\n')
            .flatMap((line) => {
                const match = line.match(/^(\d+\.\s+.+?)\s*(\(\d+\s*hours?.*?\d*\s*minutes?\))$/i);
                if (match) {
                    return [match[1], match[2]]; // Separate into two lines
                }
                return [line];
            })
            .join('\n');
    }

    function handleAIResponse(result, task, history = []) {
        if (!eventDateTime) {
            toast.error('Please select a planned date & time before continuing.');
            return;
        }

        const trimmedResult = result.trim();
        const updatedHistory = messageHistory.concat({ role: 'assistant', content: result });

        const isQuestion = trimmedResult.toUpperCase().startsWith('QUESTION:');
        const isBreakdown = trimmedResult.toUpperCase().startsWith('BREAKDOWN:');
        const fallback = history.find((h) => h.startsWith('PREVIEW_BREAKDOWN:'));
        const questionCount = history.filter((line) => line.startsWith('Q:') && !line.includes('[skipped]')).length;
        const lastWasSkipped = history.at(-1)?.includes('[skipped]');
        const prevWasSkipped = history.at(-2)?.includes('[skipped]');
        const twoConsecutiveSkips = lastWasSkipped && prevWasSkipped;
        const questionLimitReached = questionCount >= 3;

        if (isQuestion) {
            const extracted = trimmedResult.replace(/QUESTION:/i, '').trim();

            if (!extracted || extracted === '()') {
                if (fallback) {
                    const raw = fallback
                        .replace('PREVIEW_BREAKDOWN:', '')
                        .replace(/BREAKDOWN:/i, '')
                        .trim();
                    const normalized = normalizeBreakdownFormat(raw);
                    const lines = (extraContext ? [`* Extra context: ${extraContext}`, ...normalized.split('\n')] : normalized.split('\n')).filter(Boolean);

                    setSubtasks([]);
                    setMessageHistory((prev) =>
                        prev.concat({
                            role: 'system',
                            content: 'Used fallback breakdown after malformed question',
                        })
                    );

                    if (user) {
                        const taskObj = {
                            id: Date.now(),
                            task,
                            subtasks: lines,
                            timestamp: eventDateTime?.toISOString() || new Date().toISOString(),
                            dateTime: eventDateTime ? eventDateTime.toISOString().slice(0, 16) : null,
                        };
                        saveTask(user.uid, taskObj).then(setSavedTasks);
                    }

                    setSkipCount(0);
                    setScreenState('context');
                    return;
                }

                setSkipMessage('The AI response was invalid. Please try a new task.');
                setSubtasks([]);
                setSkipCount(0);
                setScreenState('skip-message');
                return;
            }

            if (questionLimitReached || twoConsecutiveSkips) {
                if (fallback) {
                    const raw = fallback
                        .replace('PREVIEW_BREAKDOWN:', '')
                        .replace(/BREAKDOWN:/i, '')
                        .trim();
                    const normalized = normalizeBreakdownFormat(raw);
                    const lines = (extraContext ? [`* Extra context: ${extraContext}`, ...normalized.split('\n')] : normalized.split('\n')).filter(Boolean);

                    setSubtasks([]);
                    setMessageHistory((prev) =>
                        prev.concat({
                            role: 'system',
                            content: 'Used fallback breakdown after skip/question limit',
                        })
                    );

                    if (user) {
                        const taskObj = {
                            id: Date.now(),
                            task,
                            subtasks: lines,
                            timestamp: eventDateTime?.toISOString() || new Date().toISOString(),
                            dateTime: eventDateTime ? eventDateTime.toISOString().slice(0, 16) : null,
                        };
                        saveTask(user.uid, taskObj).then(setSavedTasks);
                    }

                    setSkipCount(0);
                    setScreenState('context');
                    return;
                }

                if (user) {
                    const taskObj = {
                        id: Date.now(),
                        task,
                        subtasks: [`1. ${task}`],
                        timestamp: eventDateTime?.toISOString() || new Date().toISOString(),
                        dateTime: eventDateTime || null,
                    };
                    saveTask(user.uid, taskObj).then(setSavedTasks);
                }

                setSkipMessage(`Task Created: ${task}. You can always create a new task for a more detailed breakdown.`);
                setSubtasks([]);
                setSkipCount(0);
                setScreenState('skip-message');
                return;
            }

            setScreenState('question');
            setCurrentQuestion(extracted);
            setClarification('');
            setClarificationHistory(history);
            setSubtasks([]);
            setMessageHistory(updatedHistory);
            return;
        }

        if (isBreakdown) {
            const raw = trimmedResult.replace(/BREAKDOWN:/i, '').trim();
            const normalized = normalizeBreakdownFormat(raw);
            const newHistory = [...history, `PREVIEW_BREAKDOWN:BREAKDOWN:\n${normalized}`];
            const lines = (extraContext ? [`* Extra context: ${extraContext}`, ...normalized.split('\n')] : normalized.split('\n')).filter(Boolean);

            setSubtasks(lines);
            setClarificationHistory(newHistory);
            setScreenState('context');
            setClarification('');
            setMessageHistory(updatedHistory);
            return;
        }

        // Fallback if it's not a valid breakdown or question
        setScreenState('question');
        setCurrentQuestion("Sorry, that wasn't a valid breakdown. Can you clarify your task a bit?");
        setClarification('');
        setMessageHistory(updatedHistory);
    }

    function handleDeleteTask(id) {
        deleteTaskById(user.uid, id).then(setSavedTasks);
        if (viewingSavedTask?.id === id) setViewingSavedTask(null);
    }

    function resetToNewTask() {
        setActiveTab('new');
        resetAllTaskStates();
    }

    const handleLogout = async () => {
        try {
            await FirebaseAuthentication.signOut();
            toast.success('Logged out successfully', {
                position: 'top-right',
                autoClose: 2000,
                hideProgressBar: true,
                closeOnClick: true,
                pauseOnHover: false,
                draggable: false,
            });
            setShowMenu(false);
        } catch (error) {
            console.error('Logout error:', error);
            toast.error('Logout failed. Please try again.');
        }
    };

    if (loadingUser || !authCheckComplete) return null;

    if (showVerificationScreen && pendingUser && userCredentials) {
        return (
            <EmailVerificationPending
                user={pendingUser}
                userCredentials={userCredentials}
                onVerified={(verifiedUser) => {
                    setUser(verifiedUser);
                    getSavedTasks(verifiedUser.uid).then(setSavedTasks);
                    setShowVerificationScreen(false);
                    setPendingUser(null);
                    setUserCredentials(null);
                    setAuthMode(null);
                    setIsRegistering(false);
                }}
                onResend={async () => {
                    try {
                        await FirebaseAuthentication.sendEmailVerification();
                        toast.success('Verification email resent!');
                    } catch (err) {
                        toast.error('Failed to resend. Try again.');
                    }
                }}
            />
        );
    }

    return (
        <>
            {/* Auth Modal */}
            {authMode && (
                <div
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        width: '100vw',
                        height: '100vh',
                        backgroundColor: 'rgba(0,0,0,0.6)',
                        zIndex: 9999,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                >
                    {authMode === 'login' && (
                        <Login
                            setUser={setUser}
                            switchToRegister={() => setAuthMode('register')}
                            switchToForgot={() => setAuthMode('forgot')}
                            onClose={() => setAuthMode(null)}
                        />
                    )}
                    {authMode === 'register' && (
                        <Register
                            setUser={setUser}
                            switchToLogin={() => setAuthMode('login')}
                            onClose={() => setAuthMode(null)}
                            setShowVerificationScreen={setShowVerificationScreen}
                            setPendingUser={setPendingUser}
                            setUserCredentials={setUserCredentials}
                            setIsRegistering={setIsRegistering}
                        />
                    )}
                    {authMode === 'forgot' && <ForgotPassword switchToLogin={() => setAuthMode('login')} onClose={() => setAuthMode(null)} />}
                </div>
            )}

            <div className="app-wrapper">
                <div className="app-container">
                    <div className="app-header">
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '0.65rem',
                                flexWrap: 'wrap',
                            }}
                        >
                            <img
                                src="/croppedLogo.png"
                                alt="Taskly Icon"
                                style={{
                                    height: '42px',
                                    width: '42px',
                                    objectFit: 'contain',
                                    verticalAlign: 'middle',
                                    display: 'inline-block',
                                }}
                            />
                            <h1 className="app-title" style={{ margin: 0, padding: 0, lineHeight: 1 }}>
                                Taskly
                            </h1>
                        </div>
                        <p className="app-subtitle">Break down complex tasks into manageable steps</p>
                    </div>

                    <div className="app-nav">
                        <div className="nav-wrapper">
                            <div className="nav-buttons">
                                <button onClick={resetToNewTask} className={`nav-btn ${activeTab === 'new' ? 'active' : ''}`}>
                                    <Plus size={18} /> New Task
                                </button>
                                <button
                                    onClick={() => {
                                        setActiveTab('saved');
                                        setViewingSavedTask(null);
                                    }}
                                    className={`nav-btn ${activeTab === 'saved' ? 'active' : ''}`}
                                >
                                    <Archive size={18} /> Saved Tasks
                                </button>
                                <button
                                    onClick={() => {
                                        setActiveTab('calendar');
                                        setViewingSavedTask(null);
                                    }}
                                    className={`nav-btn ${activeTab === 'calendar' ? 'active' : ''}`}
                                >
                                    <Calendar size={18} /> Calendar
                                </button>
                            </div>
                        </div>
                        <div className="top-right-menu" ref={menuRef}>
                            <div className="menu-button-wrapper">
                                <button onClick={() => setShowMenu((prev) => !prev)} className="nav-btn">
                                    ☰
                                </button>
                                {showMenu && (
                                    <div className="dropdown-menu">
                                        {!user && (
                                            <>
                                                <button onClick={() => setAuthMode('login')}>Log In</button>
                                                <button onClick={() => setAuthMode('register')}>Sign Up</button>
                                            </>
                                        )}
                                        {user && (
                                            <>
                                                <button onClick={() => alert('My Account – TBD')}>My Account</button>
                                                <button onClick={handleLogout}>Log Out</button>
                                            </>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="app-content">
                        {activeTab === 'saved' && (
                            <SavedTasks
                                tasks={savedTasks}
                                onSelect={(t) => {
                                    setViewingSavedTask(t);
                                    setScreenState('results');
                                }}
                                onDelete={handleDeleteTask}
                                viewingTask={viewingSavedTask}
                                onBack={() => setViewingSavedTask(null)}
                                setSavedTasks={setSavedTasks}
                                userId={user?.uid}
                            />
                        )}

                        {activeTab === 'new' && (
                            <>
                                {screenState === 'idle' && (
                                    <div className="task-creation-container">
                                        <TaskInput
                                            taskInput={taskInput}
                                            setTaskInput={setTaskInput}
                                            loading={loading}
                                            setLoading={setLoading}
                                            handleAIResponse={handleAIResponse}
                                            messageHistory={messageHistory}
                                            setMessageHistory={setMessageHistory}
                                            eventDateTime={eventDateTime}
                                        />
                                        <div className="datetime-input-group">
                                            <DateTimePicker value={eventDateTime} onChange={setEventDateTime} />
                                        </div>
                                    </div>
                                )}

                                {screenState === 'question' && (
                                    <ClarificationForm
                                        clarification={clarification}
                                        setClarification={setClarification}
                                        currentQuestion={currentQuestion}
                                        clarificationHistory={clarificationHistory}
                                        setClarificationHistory={setClarificationHistory}
                                        taskInput={taskInput}
                                        setLoading={setLoading}
                                        handleAIResponse={handleAIResponse}
                                        loading={loading}
                                        setSkipCount={setSkipCount}
                                        messageHistory={messageHistory}
                                        setMessageHistory={setMessageHistory}
                                    />
                                )}

                                {screenState === 'context' && (
                                    <ExtraContextForm
                                        extraContext={extraContext}
                                        setExtraContext={setExtraContext}
                                        clarificationHistory={clarificationHistory}
                                        taskInput={taskInput}
                                        setLoading={setLoading}
                                        handleAIResponse={handleAIResponse}
                                        setClarificationHistory={setClarificationHistory}
                                        setAwaitingExtraContext={() => setScreenState('results')}
                                        setSubtasks={setSubtasks}
                                        setSavedTasks={setSavedTasks}
                                        loading={loading}
                                        messageHistory={messageHistory}
                                        setMessageHistory={setMessageHistory}
                                        userId={user?.uid}
                                        eventDateTime={eventDateTime}
                                    />
                                )}

                                {screenState === 'results' && <TaskResults subtasks={subtasks} />}

                                {screenState === 'skip-message' && (
                                    <div className="skip-message-container">
                                        <div
                                            className="skip-message"
                                            style={{
                                                marginBottom: '1rem',
                                                padding: '1rem',
                                                backgroundColor: '#f3f4f6',
                                                borderRadius: '0.5rem',
                                                border: '1px solid #d1d5db',
                                                color: '#374151',
                                            }}
                                        >
                                            <p>{skipMessage}</p>
                                        </div>
                                        <button onClick={resetToNewTask} className="submit-btn secondary" style={{ marginTop: '1rem' }}>
                                            Create New Task
                                        </button>
                                    </div>
                                )}
                            </>
                        )}
                        {activeTab === 'calendar' && (
                            <>
                                <CalendarView tasks={savedTasks} />
                            </>
                        )}
                    </div>
                </div>
            </div>

            <ToastContainer
                position="top-right"
                autoClose={2000}
                hideProgressBar
                newestOnTop={false}
                closeOnClick
                rtl={false}
                pauseOnFocusLoss={false}
                draggable={false}
                pauseOnHover={false}
                theme="light"
                style={{ zIndex: 10000 }}
            />
        </>
    );
}

export default App;
