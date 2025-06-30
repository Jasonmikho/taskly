import { useState } from 'react';
import { signInWithEmailAndPassword, sendPasswordResetEmail } from "firebase/auth";
import { auth } from '../firebase';
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
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      if (!userCredential.user.emailVerified) {
        setError('Email not verified. Please check your inbox.');
        setLoading(false);
        return;
      }
      
      // Don't manually set user here - let onAuthStateChanged handle it
      console.log('Login successful, waiting for auth state change...');
      
    } catch (err) {
      setLoading(false);
      switch (err.code) {
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
      await sendPasswordResetEmail(auth, email.trim());
      setResetStatus('Password reset email sent. Check your inbox.');
    } catch (err) {
      switch (err.code) {
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
    <div className="login-wrapper">
      <div className="login-left">
        <h1>Taskly</h1>
        <p>Your AI-powered productivity assistant</p>
      </div>

      <div className="login-right">
        <form className="login-glass-card" onSubmit={handleLogin}>
          <h2>Welcome Back!</h2>

          <div className={`input-icon-group ${(emailFocused && !emailValid) ? 'input-error' : ''}`}>
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
              onChange={e => setPassword(e.target.value)}
              disabled={loading}
            />
            <button 
              type="button" 
              onClick={() => setShowPassword(!showPassword)}
              disabled={loading}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          {error && <div className="login-error">{error}</div>}
          {resetStatus && <div className="login-success">{resetStatus}</div>}

          <button type="submit" className="login-btn primary" disabled={loading}>
            {loading ? 'Logging in...' : 'Login'}
          </button>
          <button 
            type="button"
            className="login-btn link" 
            onClick={switchToForgot}
            disabled={loading}
          >
            Forgot Password?
          </button>
          <button 
            type="button"
            className="login-btn secondary" 
            onClick={switchToRegister}
            disabled={loading}
          >
            Need an account?
          </button>
        </form>
      </div>
    </div>
  );
}
