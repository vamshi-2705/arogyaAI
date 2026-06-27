import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';

export default function NurseLogin() {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const { login } = useAuth();
  const navigate  = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) return;
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/api/nurse/login', { email, password });
      login(res.data.token, res.data.nurse);
      navigate('/nurse/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid credentials. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="cl-login-root">
      {/* Left panel */}
      <div className="cl-login-left">
        <div className="cl-login-brand">
          <div className="cl-login-brand-icon">🏥</div>
          <div>
            <div className="cl-login-brand-name">AROGYA WATCH AI</div>
            <div className="cl-login-brand-sub">Emergency Triage Management System</div>
          </div>
        </div>
        <div className="cl-login-tagline">
          <h2>Real-time patient triage,<br/>powered by AI.</h2>
          <p>Helping nurses at government hospitals prioritize patients faster and save lives.</p>
          <ul className="cl-login-features">
            <li>✔ AI-powered severity scoring</li>
            <li>✔ Multilingual — Telugu, Hindi, English</li>
            <li>✔ Live queue management</li>
            <li>✔ Instant critical alerts</li>
          </ul>
        </div>
        <div className="cl-login-hospital">
          🏛 Osmania General Hospital, Hyderabad
        </div>
      </div>

      {/* Right panel — login form */}
      <div className="cl-login-right">
        <div className="cl-login-card">
          <div className="cl-login-header">
            <h1 className="cl-login-title">Staff Sign In</h1>
            <p className="cl-login-hint">Use your hospital-issued credentials</p>
          </div>

          <form onSubmit={handleLogin} className="cl-login-form" autoComplete="on">
            <div className="cl-field">
              <label htmlFor="nurse-email" className="cl-label">Email address</label>
              <input
                id="nurse-email"
                type="email"
                className="cl-input"
                placeholder="nurse@hospital.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </div>

            <div className="cl-field">
              <label htmlFor="nurse-password" className="cl-label">Password</label>
              <div className="cl-input-wrap">
                <input
                  id="nurse-password"
                  type={showPass ? 'text' : 'password'}
                  className="cl-input"
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />
                <button type="button" className="cl-eye-btn" onClick={() => setShowPass(!showPass)} tabIndex={-1}>
                  {showPass ? '🙈' : '👁'}
                </button>
              </div>
            </div>

            {error && (
              <div className="cl-login-error">
                <span>⚠</span> {error}
              </div>
            )}

            <button type="submit" id="nurse-login-submit" className="cl-login-btn" disabled={loading}>
              {loading ? 'Signing in…' : 'Sign In to Dashboard'}
            </button>
          </form>

          <div className="cl-login-demo">
            <span className="cl-demo-label">Demo credentials</span>
            <code>nurse@demo.com</code> &nbsp;/&nbsp; <code>password123</code>
          </div>
        </div>

        <div className="cl-login-footer">
          AROGYA WATCH AI · Government of Telangana · All rights reserved
        </div>
      </div>
    </div>
  );
}
