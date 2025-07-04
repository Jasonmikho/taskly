import { useEffect, useState } from 'react';
import { signOut, signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase';

export default function EmailVerificationPending({ user, userCredentials, onVerified, onResend }) {
    const [polling, setPolling] = useState(true);
    const [timer, setTimer] = useState(300); // 5 min
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    useEffect(() => {
        const interval = setInterval(async () => {
            if (!polling) return;

            try {
                await user.reload();
                if (user.emailVerified) {
                    clearInterval(interval);
                    setPolling(false);

                    await signOut(auth);
                    await signInWithEmailAndPassword(auth, userCredentials.email, userCredentials.password);

                    onVerified();
                }
            } catch (err) {
                setError('Error checking verification status.');
                console.error('[Verification Poll Error]', err);
            }
        }, 2000);

        const timeout = setTimeout(() => {
            clearInterval(interval);
            setPolling(false);
            setError('Timeout. Please refresh after verifying your email.');
        }, 300000);

        return () => {
            clearInterval(interval);
            clearTimeout(timeout);
        };
    }, [polling, user]);

    return (
        <div className="login-wrapper centered" style={{ overflowY: 'auto', maxHeight: '100vh', padding: '1rem' }}>
            <div className="login-glass-card" style={{ maxWidth: '420px', width: '100%', margin: 'auto' }}>
                <h2>Verify Your Email</h2>
                <p>
                    A verification email was sent to <strong>{user.email}</strong>. Please check your inbox or spam folder and click the verification link.
                </p>
                <p style={{ marginTop: '1rem', fontWeight: '500', fontSize: '14px' }}>Waiting for verification...</p>

                {error && <div className="login-error">{error}</div>}
                {success && <div className="login-success">{success}</div>}

                <button type="button" className="login-btn primary" style={{ marginTop: '1rem', backgroundColor: '#d1d5db', color: '#1e293b' }} disabled>
                    Waiting for Verification...
                </button>

                <button type="button" className="login-btn secondary" style={{ backgroundColor: '#facc15', color: '#1e293b' }} onClick={onResend}>
                    Resend Verification Email
                </button>

                <button type="button" className="login-btn secondary" onClick={() => window.location.reload()}>
                    Back to Login
                </button>
            </div>
        </div>
    );
}
