import { useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { Eye, EyeOff, Mail, Lock } from 'lucide-react';

export default function Login({ setUser, switchToRegister, switchToForgot, onClose }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [resetStatus, setResetStatus] = useState('');
    const [emailFocused, setEmailFocused] = useState(false);
    const [emailValid, setEmailValid] = useState(true);
    const [loading, setLoading] = useState(false);

    async function handleLogin(e) {
        e.preventDefault();
        setError('');
        setResetStatus('');
        setLoading(true);

        if (!email.trim() || !password.trim()) {
            setError('Please enter both email and password.');
            setLoading(false);
            return;
        }

        try {
            let userCredential;

            if (Capacitor.isNativePlatform()) {
                // Native platform - use dynamic import for Capacitor plugin
                const { FirebaseAuthentication } = await import('@capacitor-firebase/authentication');

                // console.log('⚡️ Native -> signInWithEmailAndPassword starting');
                userCredential = await FirebaseAuthentication.signInWithEmailAndPassword({
                    email: email.trim(),
                    password: password.trim(),
                });

                // Check if email is verified
                const currentUser = await FirebaseAuthentication.getCurrentUser();
                if (currentUser.user && !currentUser.user.emailVerified) {
                    setError('Email not verified. Please check your inbox.');
                    setLoading(false);
                    return;
                }

                // console.log('⚡️ [log] - Native login successful:', userCredential);
            } else {
                // Web platform - use dynamic import for Firebase web SDK
                const { signInWithEmailAndPassword } = await import('firebase/auth');
                const { auth } = await import('../firebase');

                // console.log('⚡️ Web -> signInWithEmailAndPassword starting');
                userCredential = await signInWithEmailAndPassword(auth, email.trim(), password.trim());
                const user = userCredential.user;

                if (!user.emailVerified) {
                    setError('Email not verified. Please check your inbox.');
                    setLoading(false);
                    return;
                }

                // console.log('⚡️ [log] - Web login successful:', userCredential);
            }
        } catch (err) {
            console.error('[Login Error]', err);
            const code = err?.code;

            switch (code) {
                case 'auth/invalid-email':
                    setError('Invalid email format.');
                    break;
                case 'auth/user-not-found':
                    setError('Email is incorrect or does not exist.');
                    break;
                case 'auth/wrong-password':
                    setError('Password is incorrect.');
                    break;
                case 'auth/invalid-credential':
                    setError('Invalid email or password.');
                    break;
                default:
                    setError('Login failed. Please try again.');
                    break;
            }

            setLoading(false);
        }
    }

    async function handleForgotPassword() {
        setResetStatus('');
        setError('');

        if (!email.trim()) {
            setError('Please enter your email to reset your password.');
            return;
        }

        try {
            if (Capacitor.isNativePlatform()) {
                const { FirebaseAuthentication } = await import('@capacitor-firebase/authentication');
                await FirebaseAuthentication.sendPasswordResetEmail({
                    email: email.trim(),
                });
            } else {
                const { sendPasswordResetEmail } = await import('firebase/auth');
                const { auth } = await import('../firebase');
                await sendPasswordResetEmail(auth, email.trim());
            }
            setResetStatus('Password reset email sent. Check your inbox.');
        } catch (err) {
            const code = err?.code;

            switch (code) {
                case 'auth/invalid-email':
                    setError('Invalid email format.');
                    break;
                case 'auth/user-not-found':
                    setError('No account found with this email.');
                    break;
                default:
                    setError('Failed to send reset email. Try again later.');
                    break;
            }
        }
    }

    return (
        <div className="login-wrapper centered">
            <form className="login-glass-card" onSubmit={handleLogin}>
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.5rem',
                        marginBottom: '1.25rem',
                    }}
                >
                    <img src="/croppedLogo.png" alt="Taskly Icon" style={{ height: '42px', width: '42px', objectFit: 'contain' }} />
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

                <h2>Welcome Back!</h2>

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
                        disabled={loading}
                    />
                    <span className="input-placeholder-button" />
                </div>

                <div className="input-icon-group">
                    <Lock size={18} />
                    <input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        disabled={loading}
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} disabled={loading}>
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                </div>

                {error && <div className="login-error">{error}</div>}
                {resetStatus && <div className="login-success">{resetStatus}</div>}

                <button type="submit" className="login-btn primary" disabled={loading}>
                    {loading ? 'Logging in...' : 'Login'}
                </button>
                <button type="button" className="login-btn link" onClick={switchToForgot} disabled={loading}>
                    Forgot Password?
                </button>
                <button type="button" className="login-btn secondary" onClick={switchToRegister} disabled={loading}>
                    Need an account?
                </button>
            </form>
        </div>
    );
}
