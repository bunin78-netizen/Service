import { useState } from 'react';
import { Eye, EyeOff, LogIn, Wrench, AlertCircle, Shield } from 'lucide-react';
import { AppData, User } from '../types';

interface LoginProps {
  data: AppData;
  onLogin: (userId: string) => void;
}

export default function Login({ data, onLogin }: LoginProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    // Simulate a short loading delay for UX
    await new Promise(r => setTimeout(r, 600));

    const user = data.users.find(
      (u: User) =>
        u.username.toLowerCase() === username.toLowerCase() &&
        u.password === password
    );

    if (user) {
      if (rememberMe) {
        localStorage.setItem('smartkharkov_remember', user.id);
      }
      onLogin(user.id);
    } else {
      setError('Невірний логін або пароль. Спробуйте ще раз.');
    }

    setIsLoading(false);
  };

  const handleDemoLogin = (role: 'admin' | 'manager' | 'master') => {
    const demos = {
      admin: { username: 'admin', password: 'admin123' },
      manager: { username: 'manager', password: 'manager123' },
      master: { username: 'master1', password: 'master123' },
    };
    setUsername(demos[role].username);
    setPassword(demos[role].password);
    setError('');
  };

  return (
    <div className="min-h-screen bg-neutral-950 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-10 left-10 w-64 h-64 rounded-full bg-[#ffcc00] blur-3xl"></div>
        <div className="absolute bottom-10 right-10 w-96 h-96 rounded-full bg-[#ffcc00] blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-128 h-128 rounded-full bg-yellow-600 blur-3xl"></div>
      </div>

      {/* Gear decorations */}
      <div className="absolute top-8 right-8 opacity-10">
        <Wrench size={120} className="text-[#ffcc00] rotate-45" />
      </div>
      <div className="absolute bottom-8 left-8 opacity-10">
        <Wrench size={80} className="text-[#ffcc00] -rotate-12" />
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Logo & Title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-[#ffcc00] rounded-2xl shadow-2xl shadow-yellow-500/30 mb-5">
            <Wrench size={40} className="text-black" />
          </div>
          <h1 className="text-4xl font-black text-white tracking-tight">
            Smart<span className="text-[#ffcc00]">Kharkov</span>
          </h1>
          <p className="text-neutral-400 mt-2 text-sm">Система управління автомайстернею</p>
        </div>

        {/* Login Card */}
        <div className="bg-neutral-900 rounded-2xl shadow-2xl border border-neutral-800 overflow-hidden">
          <div className="p-6 border-b border-neutral-800 bg-neutral-800/50 flex items-center gap-3">
            <Shield size={20} className="text-[#ffcc00]" />
            <h2 className="text-white font-bold text-lg">Вхід до системи</h2>
          </div>

          <form onSubmit={handleLogin} className="p-6 space-y-5">
            {/* Error message */}
            {error && (
              <div className="flex items-center gap-3 bg-red-900/30 border border-red-700/50 rounded-xl p-4">
                <AlertCircle size={18} className="text-red-400 shrink-0" />
                <p className="text-red-300 text-sm">{error}</p>
              </div>
            )}

            {/* Username */}
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-2">
                Логін (ім'я користувача)
              </label>
              <input
                type="text"
                value={username}
                onChange={e => { setUsername(e.target.value); setError(''); }}
                placeholder="admin"
                autoComplete="username"
                autoFocus
                className="w-full bg-neutral-800 border border-neutral-700 text-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#ffcc00] focus:border-[#ffcc00] transition-all placeholder-neutral-500 text-sm"
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-2">
                Пароль
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => { setPassword(e.target.value); setError(''); }}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="w-full bg-neutral-800 border border-neutral-700 text-white rounded-xl px-4 py-3 pr-12 outline-none focus:ring-2 focus:ring-[#ffcc00] focus:border-[#ffcc00] transition-all placeholder-neutral-500 text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-200 transition-colors p-1"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Remember me */}
            <label className="flex items-center gap-3 cursor-pointer group">
              <div
                onClick={() => setRememberMe(!rememberMe)}
                className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                  rememberMe
                    ? 'bg-[#ffcc00] border-[#ffcc00]'
                    : 'border-neutral-600 group-hover:border-neutral-400'
                }`}
              >
                {rememberMe && (
                  <svg viewBox="0 0 12 12" className="w-3 h-3">
                    <path d="M2 6l3 3 5-5" stroke="black" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </div>
              <span className="text-sm text-neutral-400 group-hover:text-neutral-300 transition-colors">
                Запам'ятати мене
              </span>
            </label>

            {/* Submit button */}
            <button
              type="submit"
              disabled={isLoading || !username || !password}
              className="w-full bg-[#ffcc00] text-black py-3.5 rounded-xl font-black text-base flex items-center justify-center gap-3 hover:bg-yellow-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-yellow-500/20 active:scale-[0.98]"
            >
              {isLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                  Вхід...
                </>
              ) : (
                <>
                  <LogIn size={20} />
                  Увійти
                </>
              )}
            </button>
          </form>

          {/* Demo accounts */}
          <div className="px-6 pb-6">
            <div className="border-t border-neutral-800 pt-5">
              <p className="text-xs text-neutral-500 mb-3 text-center uppercase tracking-wider font-bold">
                Демо-доступ (швидкий вхід)
              </p>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { role: 'admin' as const, label: 'Адмін', color: 'bg-red-900/50 hover:bg-red-900/80 border-red-700/50 text-red-300' },
                  { role: 'manager' as const, label: 'Менеджер', color: 'bg-blue-900/50 hover:bg-blue-900/80 border-blue-700/50 text-blue-300' },
                  { role: 'master' as const, label: 'Майстер', color: 'bg-green-900/50 hover:bg-green-900/80 border-green-700/50 text-green-300' },
                ].map(demo => (
                  <button
                    key={demo.role}
                    type="button"
                    onClick={() => handleDemoLogin(demo.role)}
                    className={`py-2 px-3 rounded-lg border text-xs font-bold transition-all ${demo.color}`}
                  >
                    {demo.label}
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-neutral-600 text-center mt-2">
                Натисніть для автозаповнення, потім "Увійти"
              </p>
            </div>
          </div>

          {/* User credentials hint */}
          <div className="px-6 pb-6">
            <div className="bg-neutral-800/60 rounded-xl p-4 border border-neutral-700/50">
              <p className="text-xs text-neutral-500 font-bold mb-2 uppercase tracking-wider">Облікові записи:</p>
              <div className="space-y-1.5">
                {[
                  { role: '🔴 Адмін', creds: 'admin / admin123' },
                  { role: '🔵 Менеджер', creds: 'manager / manager123' },
                  { role: '🟢 Майстер', creds: 'master1 / master123' },
                ].map(item => (
                  <div key={item.role} className="flex justify-between text-xs">
                    <span className="text-neutral-400">{item.role}:</span>
                    <span className="text-neutral-300 font-mono">{item.creds}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-neutral-600 text-xs mt-6">
          © 2024 SmartKharkov · Система управління автомайстернею
        </p>
      </div>
    </div>
  );
}
