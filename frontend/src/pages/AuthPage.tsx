// frontend/src/pages/AuthPage.jsx
import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';

const getApiUrl = () => {
  const saved = localStorage.getItem('VITE_API_URL');
  if (saved) return saved;
  const env = process.env.REACT_APP_API_URL;
  if (env) return env;
  if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') return window.location.origin;
  return 'http://127.0.0.1:5000';
};

export default function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');

    // Client-side validation
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail) { setError('Email is required'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) { setError('Please enter a valid email'); return; }
    if (!password || password.length < 6) { setError('Password must be at least 6 characters'); return; }
    if (mode === 'signup' && !name.trim()) { setError('Name is required'); return; }

    setLoading(true);

    const endpoint = mode === 'login' ? '/api/auth/login' : '/api/auth/signup';
    const reqBody = mode === 'login'
      ? { email: trimmedEmail, password }
      : { email: trimmedEmail, name: name.trim(), password };

    try {
      const res = await fetch(`${getApiUrl()}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reqBody),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Something went wrong');
        setLoading(false);
        return;
      }

      // Store auth data
      localStorage.setItem('kera_token', data.token);
      localStorage.setItem('kera_user_id', data.user.id);
      localStorage.setItem('kera_user_name', data.user.name);
      if (data.user.hair_type) {
        localStorage.setItem('kera_hair_type', data.user.hair_type);
      }

      navigate('/');
    } catch (err) {
      setError('Could not connect to server. Is the backend running?');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#1A1A1A] flex flex-col items-center justify-center px-6">
      {/* Logo */}
      <div className="mb-8 text-center">
        <div className="w-20 h-20 rounded-full bg-amber-400/20 border-2 border-amber-400/40 mx-auto flex items-center justify-center mb-4">
          <span className="text-4xl font-black text-amber-400">K</span>
        </div>
        <h1 className="text-3xl font-black text-white">Kera <span className="text-amber-400">AI</span></h1>
        <p className="text-gray-500 text-sm mt-1">Your AI Hair Expert</p>
      </div>

      {/* Toggle */}
      <div className="flex bg-white/5 rounded-2xl p-1 mb-6 w-full max-w-sm">
        <button
          onClick={() => { setMode('login'); setError(''); }}
          className={`flex-1 py-2.5 rounded-xl text-sm font-black tracking-wider transition-all ${
            mode === 'login' ? 'bg-amber-400 text-[#1A1A1A]' : 'text-gray-400'
          }`}
        >
          Log In
        </button>
        <button
          onClick={() => { setMode('signup'); setError(''); }}
          className={`flex-1 py-2.5 rounded-xl text-sm font-black tracking-wider transition-all ${
            mode === 'signup' ? 'bg-amber-400 text-[#1A1A1A]' : 'text-gray-400'
          }`}
        >
          Sign Up
        </button>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-3">
        {mode === 'signup' && (
          <input
            type="text"
            placeholder="Your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-amber-400/50"
            required
          />
        )}
        <input
          type="email"
          placeholder="Email address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-amber-400/50"
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-amber-400/50"
          required
          minLength={6}
        />

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
            <p className="text-red-400 text-xs font-bold">{error}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-4 rounded-2xl bg-amber-400 text-[#1A1A1A] font-black text-sm tracking-wider uppercase disabled:opacity-50 active:scale-[0.98] transition-transform"
        >
          {loading ? 'Please wait...' : mode === 'login' ? 'Log In' : 'Create Account'}
        </button>
      </form>

      {/* Skip for demo */}
      <button
        onClick={() => {
          localStorage.setItem('kera_user_id', '1');
          localStorage.setItem('kera_user_name', 'Demo User');
          navigate('/');
        }}
        className="mt-6 text-gray-500 text-xs font-bold hover:text-gray-300 transition-colors"
      >
        Skip for now (demo mode)
      </button>
    </div>
  );
}
