import { useState } from 'react';
import { FirebaseAuthentication } from '@capacitor-firebase/authentication';
import { Eye, EyeOff, Mail, Lock } from 'lucide-react';

export default function Register({ setUser, switchToLogin, onClose, setShowVerificationScreen, setPendingUser, setUserCredentials, setIsRegistering }) {
    const [email, setEmail] = useState('');
    const [pw1, setPw1] = useState('');
    const [pw2, setPw2] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [showPw1, setShowPw1] = useState(false);
    const [showPw2, setShowPw2] = useState(false);
    const [loading, setLoading] = useState(false);
    const [emailFocused, setEmailFocused] = useState(false);
    const [emailValid, setEmailValid] = useState(true);
    const [pwValid, setPwValid] = useState(true);
    const [pwStrength, setPwStrength] = useState('');
    const [pw1Focused, setPw1Focused] = useState(false);

    const passwordRegex = /^(?=.*[0-9])(?=.*[!@#$%^&*])[A-Za-z\d!@#$%^&*]{8,}$/;

    function calculateStrength(password) {
        if (!password) {
            return '';
        }

        const length = password.length;
        const hasNumber = /\d/.test(password);
        const hasSpecial = /[!@#$%^&*]/.test(password);
        const hasUpper = /[A-Z]/.test(password);

        const score = [length >= 8, hasNumber, hasSpecial, hasUpper].filter(Boolean).length;

        if (score === 4) {
            return 'strong';
        }

        if (score >= 2) {
            return 'medium';
        }

        return 'weak';
    }

    async function handleRegister(e) {
        e.preventDefault();
        setError('');
        setSuccess('');
        setLoading(true);

        if (!email.trim() || !pw1.trim() || !pw2.trim()) {
            setError('Please fill out all fields.');
            setLoading(false);
            setIsRegistering(false); // Add this line
            return;
        }

        if (!passwordRegex.test(pw1)) {
            setPwValid(false);
            setError('Password must be 8+ characters with 1 number & 1 special character.');
            setLoading(false);
            setIsRegistering(false); // Add this line
            return;
        }

        if (pw1 !== pw2) {
            setError('Passwords do not match.');
            setLoading(false);
            setIsRegistering(false); // Add this line
            return;
        }

        try {
            const userCredential = await FirebaseAuthentication.createUserWithEmailAndPassword({
                email: email.trim(),
                password: pw1,
            });

            setIsRegistering(true);
            setUserCredentials({ email: email.trim(), password: pw1 });
            setPendingUser(userCredential.user);
            setShowVerificationScreen(true);

            await FirebaseAuthentication.sendEmailVerification();
        } catch (err) {
            console.error('[Firebase Registration Error]', err.code, err.message, err);
            setIsRegistering(false); // Add this line for error cases
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
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="login-wrapper centered">
            <form className="login-glass-card" onSubmit={handleRegister}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
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
                        disabled={loading}
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
                        disabled={loading}
                    />
                    <button type="button" onClick={() => setShowPw1(!showPw1)} disabled={loading}>
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
                        disabled={loading}
                    />
                    <button type="button" onClick={() => setShowPw2(!showPw2)} disabled={loading}>
                        {showPw2 ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                </div>

                {error && <div className="login-error">{error}</div>}
                {success && <div className="login-success">{success}</div>}

                <button type="submit" className="login-btn primary" disabled={loading}>
                    {loading ? 'Creating Account...' : 'Register'}
                </button>

                <button type="button" className="login-btn secondary" onClick={switchToLogin} disabled={loading}>
                    Back to Login
                </button>
            </form>
        </div>
    );
}
