import React from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import HomePage from './pages/HomePage';
import ScanPage from './pages/ScanPage';
import ChatPage from './pages/ChatPage';
import ResultsPage from './pages/ResultsPage';

function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  if (location.pathname === '/scan') return null;
  const active = location.pathname;
  const items = [
    { path: '/', icon: '🏠', label: 'Home' },
    { path: '/scan', icon: '📡', label: 'Scan' },
    { path: '/chat', icon: '💬', label: 'Chat' },
  ];
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-2 py-2 z-50">
      <div className="flex justify-around max-w-md mx-auto">
        {items.map(item => (
          <button key={item.path} onClick={() => navigate(item.path)}
            className={`flex flex-col items-center gap-0.5 px-4 py-1 rounded-xl ${active === item.path ? 'text-amber-500' : 'text-gray-400'}`}>
            <span className={`text-xl ${item.path === '/scan' ? 'text-2xl -mt-3 bg-kera-dark w-14 h-14 rounded-full flex items-center justify-center text-white shadow-lg' : ''}`}>{item.icon}</span>
            <span className="text-[9px] font-black tracking-wider uppercase">{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/scan" element={<ScanPage />} />
        <Route path="/chat" element={<ChatPage />} />
        <Route path="/results" element={<ResultsPage />} />
      </Routes>
      <BottomNav />
    </Router>
  );
}
