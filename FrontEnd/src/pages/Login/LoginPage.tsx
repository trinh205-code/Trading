import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { Lock, Mail, AlertCircle, ArrowRight } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const login = useAuthStore((state) => state.login);
  const isLoading = useAuthStore((state) => state.isLoading);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!email.trim() || !password.trim()) {
      setErrorMessage('Vui lòng nhập đầy đủ Email và Mật khẩu.');
      return;
    }

    try {
      await login({ email, password });
      navigate('/trade/BTCUSDT');
    } catch (err: any) {
      setErrorMessage(
        err.message || 'Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin.'
      );
    }
  };

  return (
    <div className="min-h-[calc(100vh-3.5rem-2.5rem)] flex items-center justify-center p-4 bg-radial from-[#181a20] to-[#0b0e11]">
      <div className="w-full max-w-md bg-[#181a20] border border-[#2b313a] rounded-2xl p-8 shadow-2xl backdrop-blur-xl">
        {/* Title & Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-300 text-black font-extrabold text-2xl mb-3 shadow-lg shadow-amber-500/20">
            ⚡
          </div>
          <h2 className="text-2xl font-bold text-white tracking-wide">Đăng Nhập Slayer</h2>
          <p className="text-xs text-gray-400 mt-1">
            Chào mừng trở lại! Nhập thông tin để tiếp tục giao dịch.
          </p>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="mb-6 p-3 rounded-lg bg-red-500/10 border border-red-500/30 flex items-start space-x-2 text-red-400 text-xs">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Email */}
          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1.5">
              Địa chỉ Email
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3 top-3 text-gray-500" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                required
                className="w-full bg-[#0b0e11] border border-[#2b313a] rounded-lg py-2.5 pl-10 pr-4 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-amber-500 transition-colors"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1.5">
              Mật khẩu
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3 top-3 text-gray-500" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full bg-[#0b0e11] border border-[#2b313a] rounded-lg py-2.5 pl-10 pr-4 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-amber-500 transition-colors"
              />
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 px-4 rounded-lg bg-gradient-to-r from-amber-500 to-amber-400 text-black font-bold text-xs uppercase tracking-wider hover:brightness-110 active:scale-[0.99] transition-all disabled:opacity-50 flex items-center justify-center space-x-2 shadow-lg shadow-amber-500/10"
          >
            {isLoading ? (
              <span>Đang xử lý...</span>
            ) : (
              <>
                <span>Đăng Nhập</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Footer link */}
        <div className="mt-8 text-center text-xs text-gray-400">
          Chưa có tài khoản?{' '}
          <Link to="/register" className="text-amber-400 font-semibold hover:underline">
            Đăng ký ngay
          </Link>
        </div>
      </div>
    </div>
  );
};
