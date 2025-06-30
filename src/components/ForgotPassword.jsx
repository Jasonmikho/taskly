import { useState } from 'react';
import { Eye, EyeOff, Lock, Mail } from 'lucide-react';

export default function ForgotPassword({ switchToLogin }) {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPw1, setShowPw1] = useState(false);
  const [showPw2, setShowPw2] = useState(false);
  const [pwValid, setPwValid] = useState(true);
  const [pwStrength, setPwStrength] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [verifyAttempts, setVerifyAttempts] = useState(0);
  const maxAttempts = 3;

  const passwordRegex = /^(?=.*[0-9])(?=.*[!@#$%^&*])[A-Za-z\d!@#$%^&*]{8,}$/;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  function calculateStrength(password) {
    if (!password) return '';
    const score = [
      password.length >= 8,
      /\d/.test(password),
      /[!@#$%^&*]/.test(password),
      /[A-Z]/.test(password)
    ].filter(Boolean).length;

    if (score === 4) return 'strong';
    if (score >= 2) return 'medium';
    return 'weak';
  }

  async function handleSendCode(e) {
    e.preventDefault();
    setError('');
    if (!emailRegex.test(email.trim())) {
      setError('Invalid email format.');
      return;
    }

    setLoading(true);
    const API_BASE = import.meta.env.VITE_API_BASE_URL;
    try {
      const res = await fetch(`${API_BASE}/api/send-reset-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      if (!res.ok) throw new Error(await res.text());
      setStep(2);
      setVerifyAttempts(0); // reset attempt count on resend
    } catch (err) {
      setError(err.message || 'Failed to send code');
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyCode(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
  const API_BASE = import.meta.env.VITE_API_BASE_URL;
    try {
      const res = await fetch(`${API_BASE}/api//verify-reset-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code })
      });

      if (!res.ok) {
        setVerifyAttempts(prev => prev + 1);
        throw new Error(await res.text());
      }

      setStep(3);
    } catch (err) {
      setError(err.message || 'Verification failed');
    } finally {
      setLoading(false);
    }
  }

  async function handleResetPassword(e) {
    e.preventDefault();
    setError('');

    if (!passwordRegex.test(newPassword)) {
      setPwValid(false);
      setError('Password must be 8+ characters with 1 number & 1 special character.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    const API_BASE = import.meta.env.VITE_API_BASE_URL;

    try {
      const res = await fetch(`${API_BASE}/api/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, newPassword })
      });
      if (!res.ok) throw new Error(await res.text());
      setSuccess('Password updated. You can now log in.');
      setTimeout(switchToLogin, 2000);
    } catch (err) {
      setError(err.message || 'Password reset failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-wrapper">
      <div className="login-left">
        <h1>Taskly</h1>
        <p>Reset your password securely</p>
      </div>

      <div className="login-right">
        <div className="login-glass-card forgot-password-card">
          <h2>Forgot Password</h2>

          {step === 1 && (
            <form className="forgot-password-form" onSubmit={handleSendCode}>
              <div className="input-icon-group">
                <Mail size={18} />
                <input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                />
                <span className="input-placeholder-button" />
              </div>

              <button className="login-btn primary" type="submit" disabled={loading}>
                {loading ? 'Sending...' : 'Send Verification Code'}
              </button>
            </form>
          )}

          {step === 2 && (
            <form className="forgot-password-form" onSubmit={handleVerifyCode}>
              <input
                className="login-input"
                placeholder="Enter 6-digit code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                disabled={loading}
              />

              <button
                className="login-btn primary"
                type="submit"
                disabled={loading || verifyAttempts >= maxAttempts}
              >
                {loading ? 'Verifying...' : 'Verify Code'}
              </button>

              {verifyAttempts >= maxAttempts && (
                <button
                  type="button"
                  className="login-btn secondary"
                  onClick={handleSendCode}
                  disabled={loading}
                >
                  Resend Verification Code
                </button>
              )}
            </form>
          )}

          {step === 3 && (
            <form className="forgot-password-form" onSubmit={handleResetPassword}>
              <div className={`input-icon-group ${!pwValid ? 'input-error' : ''}`}>
                <Lock size={18} />
                <input
                  type={showPw1 ? 'text' : 'password'}
                  placeholder="Enter new password"
                  value={newPassword}
                  onChange={(e) => {
                    const value = e.target.value;
                    setNewPassword(value);
                    setPwValid(passwordRegex.test(value));
                    setPwStrength(calculateStrength(value));
                  }}
                  disabled={loading}
                />
                <button type="button" onClick={() => setShowPw1(!showPw1)} disabled={loading}>
                  {showPw1 ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              <div className="input-icon-group">
                <Lock size={18} />
                <input
                  type={showPw2 ? 'text' : 'password'}
                  placeholder="Confirm password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={loading}
                />
                <button type="button" onClick={() => setShowPw2(!showPw2)} disabled={loading}>
                  {showPw2 ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              <div className="pw-requirements">
                <p>Password must include:</p>
                <ul>
                  <li className={newPassword.length >= 8 ? 'valid' : ''}>✔️ At least 8 characters</li>
                  <li className={/\d/.test(newPassword) ? 'valid' : ''}>✔️ A number</li>
                  <li className={/[!@#$%^&*]/.test(newPassword) ? 'valid' : ''}>✔️ A special character</li>
                </ul>
                {pwStrength && (
                  <div className={`strength-bar ${pwStrength}`}>
                    <div className="fill" />
                  </div>
                )}
              </div>

              <button className="login-btn primary" type="submit" disabled={loading}>
                {loading ? 'Resetting...' : 'Reset Password'}
              </button>
            </form>
          )}

          {error && <div className="login-error">{error}</div>}
          {success && <div className="login-success">{success}</div>}

          <button className="login-btn secondary" onClick={switchToLogin} disabled={loading}>
            Back to Login
          </button>
        </div>
      </div>
    </div>
  );
}
