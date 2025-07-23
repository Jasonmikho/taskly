import { useEffect, useState } from 'react';
import { FirebaseAuthentication } from '@capacitor-firebase/authentication';

export default function EmailVerificationPending({ user, userCredentials, onVerified, onResend }) {
    const [polling, setPolling] = useState(true);
    const [timer, setTimer] = useState(300); // 5 min
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    useEffect(() => {
        const interval = setInterval(async () => {
            if (!polling) return;

            try {
                // Step 1: Reload user data to refresh emailVerified status
                await FirebaseAuthentication.reload();

                // Step 2: Get the refreshed user
                const currentUserResult = await FirebaseAuthentication.getCurrentUser();

                if (currentUserResult.user?.emailVerified) {
                    clearInterval(interval);
                    setPolling(false);

                    // console.log('[Verification] Email verified — refreshing session');

                    // Sign out to clear stale session
                    await FirebaseAuthentication.signOut();

                    // Sign in again to refresh session with verified state
                    const newCred = await FirebaseAuthentication.signInWithEmailAndPassword({
                        email: userCredentials.email,
                        password: userCredentials.password,
                    });

                    const refreshedUser = newCred.user;

                    // Optional: verify again that it's the right user and verified
                    if (refreshedUser?.emailVerified) {
                        // console.log('[Verification] Re-login successful and verified:', refreshedUser);

                        // Pass user back to App.jsx so it can set user + pull saved tasks
                        onVerified(refreshedUser);
                    } else {
                        setError('Re-login failed after verification. Try again.');
                    }
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
    }, [polling, onVerified]); // Removed user and userCredentials from dependencies

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
