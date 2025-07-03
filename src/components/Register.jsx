import { useState, useEffect } from 'react';
import { createUserWithEmailAndPassword, sendEmailVerification, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { auth } from '../firebase';
import { Eye, EyeOff, Mail, Lock } from 'lucide-react';

export default function Register({ setUser, switchToLogin, onClose }) {
    const [email, setEmail] = useState('');
    const [pw1, setPw1] = useState('');
    const [pw2, setPw2] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [showPw1, setShowPw1] = useState(false);
    const [showPw2, setShowPw2] = useState(false);
    const [loading, setLoading] = useState(false);
    const [verificationSent, setVerificationSent] = useState(false);
    const [pendingUser, setPendingUser] = useState(null);
    const [polling, setPolling] = useState(false);
    const [userCredentials, setUserCredentials] = useState(null);

    const [emailFocused, setEmailFocused] = useState(false);
    const [emailValid, setEmailValid] = useState(true);
    const [pwValid, setPwValid] = useState(true);
    const [pwStrength, setPwStrength] = useState('');
    const [pw1Focused, setPw1Focused] = useState(false);

    const passwordRegex = /^(?=.*[0-9])(?=.*[!@#$%^&*])[A-Za-z\d!@#$%^&*]{8,}$/;

    useEffect(() => {
        if (verificationSent && pendingUser && polling && userCredentials) {
            const interval = setInterval(async () => {
                try {
                    await pendingUser.reload();
                    const currentUser = auth.currentUser;

                    if (currentUser && currentUser.emailVerified) {
                        clearInterval(interval);
                        setPolling(false);
                        try {
                            await signOut(auth);
                            await signInWithEmailAndPassword(auth, userCredentials.email, userCredentials.password);
                        } catch (signInError) {
                            console.error('Auto sign-in failed:', signInError);
                            setError('Verification successful! Please sign in manually.');
                        }
                    }
                } catch (error) {
                    console.error('Error checking verification status:', error);
                }
            }, 2000);

            const timeout = setTimeout(() => {
                clearInterval(interval);
                setPolling(false);
                setSuccess('Verification check timed out. Please refresh the page after verifying your email.');
            }, 300000);

            return () => {
                clearInterval(interval);
                clearTimeout(timeout);
            };
        }
    }, [verificationSent, pendingUser, polling, userCredentials]);

    async function handleRegister(e) {
        e.preventDefault();
        setError('');
        setSuccess('');
        setLoading(true);
        setVerificationSent(false);
        setPendingUser(null);
        setPolling(false);
        setUserCredentials(null);

        if (!email.trim() || !pw1.trim() || !pw2.trim()) {
            setError('Please fill out all fields.');
            setLoading(false);
            return;
        }

        if (!passwordRegex.test(pw1)) {
            setPwValid(false);
            setError('Password must be 8+ characters with 1 number & 1 special character.');
            setLoading(false);
            return;
        }

        if (pw1 !== pw2) {
            setError('Passwords do not match.');
            setLoading(false);
            return;
        }

        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, pw1);

            setUserCredentials({ email: email.trim(), password: pw1 });

            await sendEmailVerification(userCredential.user);

            setSuccess(
                'Registration successful! Please check your email (including spam folder) to verify your account. You will be automatically logged in once verified.'
            );
            setPendingUser(userCredential.user);
            setVerificationSent(true);
            setPolling(true);
            setLoading(false);
        } catch (err) {
            setLoading(false);
            switch (err.code) {
                case 'auth/invalid-email':
                    setError('Invalid email format.');
                    break;
                case 'auth/email-already-in-use':
                    setError('This email is already in use.');
                    break;
                case 'auth/weak-password':
                    setError('Password should be at least 6 characters.');
                    break;
                case 'auth/operation-not-allowed':
                    setError('Email/password accounts are not enabled.');
                    break;
                default:
                    setError(`Registration failed: ${err.message}`);
                    break;
            }
        }
    }

    function calculateStrength(password) {
        if (!password) return '';
        const length = password.length;
        const hasNumber = /\d/.test(password);
        const hasSpecial = /[!@#$%^&*]/.test(password);
        const hasUpper = /[A-Z]/.test(password);

        const score = [length >= 8, hasNumber, hasSpecial, hasUpper].filter(Boolean).length;

        if (score === 4) return 'strong';
        if (score >= 2) return 'medium';
        return 'weak';
    }

    async function handleResend() {
        if (!pendingUser) return;
        setLoading(true);
        setError('');
        try {
            await sendEmailVerification(pendingUser);
            setSuccess('Verification email resent! Please check your email (including spam folder). You will be automatically logged in once verified.');
            setPolling(true);
            setLoading(false);
        } catch (err) {
            setLoading(false);
            setError('Failed to resend verification email. Please try again.');
        }
    }

    return (
        <div className="login-wrapper centered">
            <form className="login-glass-card" onSubmit={handleRegister}>
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.5rem',
                        marginBottom: '1.25rem',
                    }}
                >
                    <img
                        src="/croppedLogo.png"
                        alt="Taskly Icon"
                        style={{
                            height: '42px',
                            width: '42px',
                            objectFit: 'contain',
                        }}
                    />
                    <h1
                        style={{
                            fontSize: '2rem',
                            fontWeight: '800',
                            margin: 0,
                            background: 'linear-gradient(45deg, #cc5c4c, #3a3f91)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            backgroundClip: 'text',
                            display: 'inline-block',
                            textShadow: '0 1px 1px rgba(0, 0, 0, 0.05)',
                        }}
                    >
                        Taskly
                    </h1>
                </div>

                <h2>Create an Account</h2>

                <div className={`input-icon-group ${emailFocused && !emailValid ? 'input-error' : ''}`}>
                    <Mail size={18} />
                    <input
                        type="email"
                        placeholder="Email"
                        value={email}
                        onChange={(e) => {
                            const value = e.target.value;
                            setEmail(value);
                            setEmailValid(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value));
                        }}
                        onFocus={() => setEmailFocused(true)}
                        onBlur={() => setEmailFocused(false)}
                        disabled={loading || polling}
                    />
                    <span className="input-placeholder-button" />
                </div>

                <div className={`input-icon-group ${pw1Focused && !pwValid ? 'input-error' : ''}`}>
                    <Lock size={18} />
                    <input
                        type={showPw1 ? 'text' : 'password'}
                        placeholder="Password"
                        value={pw1}
                        onChange={(e) => {
                            const value = e.target.value;
                            setPw1(value);
                            setPwValid(passwordRegex.test(value));
                            setPwStrength(calculateStrength(value));
                        }}
                        onFocus={() => setPw1Focused(true)}
                        onBlur={() => setPw1Focused(false)}
                        disabled={loading || polling}
                    />
                    <button type="button" onClick={() => setShowPw1(!showPw1)} disabled={loading || polling}>
                        {showPw1 ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                </div>

                <div className="pw-requirements">
                    <p>Password must include:</p>
                    <ul>
                        <li className={pw1.length >= 8 ? 'valid' : ''}>✔️ At least 8 characters</li>
                        <li className={/\d/.test(pw1) ? 'valid' : ''}>✔️ A number</li>
                        <li className={/[!@#$%^&*]/.test(pw1) ? 'valid' : ''}>✔️ A special character</li>
                    </ul>
                    {pwStrength && (
                        <div className={`strength-bar ${pwStrength}`}>
                            <div className="fill" />
                        </div>
                    )}
                </div>

                <div className="input-icon-group">
                    <Lock size={18} />
                    <input
                        type={showPw2 ? 'text' : 'password'}
                        placeholder="Confirm Password"
                        value={pw2}
                        onChange={(e) => setPw2(e.target.value)}
                        disabled={loading || polling}
                    />
                    <button type="button" onClick={() => setShowPw2(!showPw2)} disabled={loading || polling}>
                        {showPw2 ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                </div>

                {error && <div className="login-error">{error}</div>}
                {success && (
                    <div className="login-success">
                        {success}
                        {polling && <div style={{ marginTop: '10px', fontSize: '14px' }}>🔄 Waiting for email verification...</div>}
                    </div>
                )}

                <button type="submit" className="login-btn primary" disabled={loading || polling}>
                    {loading ? 'Creating Account...' : polling ? 'Waiting for Verification...' : 'Register'}
                </button>

                {verificationSent && (
                    <button
                        type="button"
                        className="login-btn secondary"
                        style={{ backgroundColor: '#facc15', color: '#1e293b' }}
                        onClick={handleResend}
                        disabled={loading}
                    >
                        {loading ? 'Sending...' : 'Resend Verification Email'}
                    </button>
                )}

                <button type="button" className="login-btn secondary" onClick={switchToLogin} disabled={loading || polling}>
                    Back to Login
                </button>
            </form>
        </div>
    );
}
