import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { User, Mail, Lock, Phone, AlertCircle, ArrowRight, ShieldCheck } from 'lucide-react';

export const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const register = useAuthStore((state) => state.register);
  const isLoading = useAuthStore((state) => state.isLoading);

  const [formData, setFormData] = useState({
    username: '',
    fullName: '',
    email: '',
    phoneNumber: '',
    password: '',
    confirmPassword: '',
  });

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (formData.password !== formData.confirmPassword) {
      setErrorMessage('Mật khẩu nhập lại không khớp!');
      return;
    }

    if (formData.password.length < 6) {
      setErrorMessage('Mật khẩu phải chứa ít nhất 6 ký tự!');
      return;
    }

    try {
      await register({
        username: formData.username,
        fullName: formData.fullName,
        email: formData.email,
        phoneNumber: formData.phoneNumber,
        password: formData.password,
      });
      navigate('/trade/BTCUSDT');
    } catch (err: any) {
      setErrorMessage(
        err.message || 'Đăng ký không thành công. Vui lòng kiểm tra lại thông tin.'
      );
    }
  };

  return (
    <div className="min-h-[calc(100vh-3.5rem-2.5rem)] flex items-center justify-center p-4 bg-radial from-[#181a20] to-[#0b0e11]">
      <div className="w-full max-w-lg bg-[#181a20] border border-[#2b313a] rounded-2xl p-8 shadow-2xl backdrop-blur-xl">
        {/* Title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-300 text-black font-extrabold text-2xl mb-3 shadow-lg shadow-amber-500/20">
            ⚡
          </div>
          <h2 className="text-2xl font-bold text-white tracking-wide">Tạo Tài Khoản Slayer</h2>
          <p className="text-xs text-gray-400 mt-1">
            Bắt đầu trải nghiệm sàn giao dịch Crypto chuyên nghiệp ngay hôm nay.
          </p>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="mb-6 p-3 rounded-lg bg-red-500/10 border border-red-500/30 flex items-start space-x-2 text-red-400 text-xs">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Username */}
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">
                Tên đăng nhập
              </label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3 top-3 text-gray-500" />
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  placeholder="john_doe"
                  required
                  className="w-full bg-[#0b0e11] border border-[#2b313a] rounded-lg py-2.5 pl-10 pr-3 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-amber-500 transition-colors"
                />
              </div>
            </div>

            {/* Full Name */}
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">
                Họ và Tên
              </label>
              <div className="relative">
                <ShieldCheck className="w-4 h-4 absolute left-3 top-3 text-gray-500" />
                <input
                  type="text"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleChange}
                  placeholder="Nguyễn Văn A"
                  required
                  className="w-full bg-[#0b0e11] border border-[#2b313a] rounded-lg py-2.5 pl-10 pr-3 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-amber-500 transition-colors"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Email */}
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">
                Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-3 text-gray-500" />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="user@example.com"
                  required
                  className="w-full bg-[#0b0e11] border border-[#2b313a] rounded-lg py-2.5 pl-10 pr-3 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-amber-500 transition-colors"
                />
              </div>
            </div>

            {/* Phone Number */}
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">
                Số điện thoại
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 absolute left-3 top-3 text-gray-500" />
                <input
                  type="tel"
                  name="phoneNumber"
                  value={formData.phoneNumber}
                  onChange={handleChange}
                  placeholder="0912345678"
                  required
                  className="w-full bg-[#0b0e11] border border-[#2b313a] rounded-lg py-2.5 pl-10 pr-3 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-amber-500 transition-colors"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Password */}
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">
                Mật khẩu
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-3 text-gray-500" />
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  required
                  className="w-full bg-[#0b0e11] border border-[#2b313a] rounded-lg py-2.5 pl-10 pr-3 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-amber-500 transition-colors"
                />
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">
                Nhập lại mật khẩu
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-3 text-gray-500" />
                <input
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="••••••••"
                  required
                  className="w-full bg-[#0b0e11] border border-[#2b313a] rounded-lg py-2.5 pl-10 pr-3 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-amber-500 transition-colors"
                />
              </div>
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 px-4 rounded-lg bg-gradient-to-r from-amber-500 to-amber-400 text-black font-bold text-xs uppercase tracking-wider hover:brightness-110 active:scale-[0.99] transition-all disabled:opacity-50 flex items-center justify-center space-x-2 shadow-lg shadow-amber-500/10 mt-2"
          >
            {isLoading ? (
              <span>Đang đăng ký...</span>
            ) : (
              <>
                <span>Tạo Tài Khoản</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Footer */}
        <div className="mt-6 text-center text-xs text-gray-400">
          Đã có tài khoản?{' '}
          <Link to="/login" className="text-amber-400 font-semibold hover:underline">
            Đăng nhập ngay
          </Link>
        </div>
      </div>
    </div>
  );
};
