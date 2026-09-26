import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { User, Mail, Lock, AlertCircle, ArrowRight, Eye, EyeOff } from 'lucide-react';

export const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const register = useAuthStore((state) => state.register);
  const isLoading = useAuthStore((state) => state.isLoading);

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Field-level error messages
  const [errors, setErrors] = useState<{
    fullName?: string | null;
    email?: string | null;
    password?: string | null;
    confirmPassword?: string | null;
  }>({});

  const [generalError, setGeneralError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    // Real-time validation
    if (name === 'fullName') {
      if (value.trim()) {
        setErrors((prev) => ({ ...prev, fullName: null }));
      }
    }

    if (name === 'email') {
      if (errors.email) {
        setErrors((prev) => ({ ...prev, email: null }));
      }
    }

    if (name === 'password') {
      if (!value) {
        setErrors((prev) => ({ ...prev, password: null }));
      } else if (value.length < 6) {
        setErrors((prev) => ({ ...prev, password: 'Mật khẩu phải có ít nhất 6 ký tự.' }));
      } else {
        setErrors((prev) => ({ ...prev, password: null }));
      }

      if (formData.confirmPassword && value !== formData.confirmPassword) {
        setErrors((prev) => ({ ...prev, confirmPassword: 'Mật khẩu nhập lại không khớp!' }));
      } else if (formData.confirmPassword && value === formData.confirmPassword) {
        setErrors((prev) => ({ ...prev, confirmPassword: null }));
      }
    }

    if (name === 'confirmPassword') {
      if (value && value !== formData.password) {
        setErrors((prev) => ({ ...prev, confirmPassword: 'Mật khẩu nhập lại không khớp!' }));
      } else {
        setErrors((prev) => ({ ...prev, confirmPassword: null }));
      }
    }
  };

  const handleEmailBlur = () => {
    const trimmed = formData.email.trim();
    if (!trimmed) return;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmed)) {
      setErrors((prev) => ({ ...prev, email: 'Định dạng email không hợp lệ (ví dụ: user@example.com).' }));
    } else {
      setErrors((prev) => ({ ...prev, email: null }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError(null);

    const newErrors: {
      fullName?: string | null;
      email?: string | null;
      password?: string | null;
      confirmPassword?: string | null;
    } = {};

    let hasError = false;

    if (!formData.fullName.trim()) {
      newErrors.fullName = 'Tên không được để trống.';
      hasError = true;
    }

    const trimmedEmail = formData.email.trim();
    if (!trimmedEmail) {
      newErrors.email = 'Email không được để trống.';
      hasError = true;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      newErrors.email = 'Định dạng email không hợp lệ (ví dụ: user@example.com).';
      hasError = true;
    }

    if (!formData.password) {
      newErrors.password = 'Mật khẩu không được để trống.';
      hasError = true;
    } else if (formData.password.length < 6) {
      newErrors.password = 'Mật khẩu phải có ít nhất 6 ký tự.';
      hasError = true;
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Mật khẩu nhập lại không khớp!';
      hasError = true;
    }

    if (hasError) {
      setErrors(newErrors);
      return;
    }

    try {
      await register({
        fullName: formData.fullName.trim(),
        email: trimmedEmail,
        password: formData.password,
      });
      navigate('/trade/BTCUSDT');
    } catch (err: any) {
      // Map server-side validation errors
      if (err.errors) {
        setErrors((prev) => ({
          ...prev,
          fullName: err.errors.fullName || prev.fullName,
          email: err.errors.email || prev.email,
          password: err.errors.password || prev.password,
        }));
      }

      const msg = err.message || '';
      if (msg.includes('Email đã được sử dụng')) {
        setErrors((prev) => ({ ...prev, email: 'Email này đã được sử dụng. Vui lòng chọn email khác.' }));
        setGeneralError('Email này đã tồn tại trong hệ thống.');
      } else if (err.errors?.fullName || err.errors?.email || err.errors?.password) {
        // Field errors are already displayed inline
      } else {
        setGeneralError(msg || 'Đăng ký không thành công. Vui lòng kiểm tra lại thông tin.');
      }
    }
  };

  return (
    <div className="min-h-[calc(100vh-3.5rem-2.5rem)] flex items-center justify-center p-4 bg-radial from-[#181a20] to-[#0b0e11]">
      <div className="w-full max-w-md bg-[#181a20] border border-[#2b313a] rounded-2xl p-8 shadow-2xl backdrop-blur-xl">
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

        {/* General Error Alert */}
        {generalError && (
          <div className="mb-6 p-3 rounded-lg bg-red-500/10 border border-red-500/30 flex items-start space-x-2 text-red-400 text-xs animate-fadeIn">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{generalError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          {/* Full Name */}
          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1.5">
              Họ và Tên
            </label>
            <div className="relative">
              <User className="w-4 h-4 absolute left-3 top-3 text-gray-500 pointer-events-none" />
              <input
                type="text"
                name="fullName"
                value={formData.fullName}
                onChange={handleChange}
                placeholder="Nguyễn Văn A"
                className={`w-full bg-[#0b0e11] border rounded-lg py-2.5 pl-10 pr-4 text-xs text-white placeholder-gray-600 focus:outline-none transition-colors ${
                  errors.fullName
                    ? 'border-red-500 focus:border-red-500 focus:ring-1 focus:ring-red-500/50'
                    : 'border-[#2b313a] focus:border-amber-500'
                }`}
              />
            </div>
            {errors.fullName && (
              <div className="flex items-center space-x-1.5 mt-1.5 text-xs text-red-400">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{errors.fullName}</span>
              </div>
            )}
          </div>

          {/* Email */}
          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1.5">
              Địa chỉ Email
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3 top-3 text-gray-500 pointer-events-none" />
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                onBlur={handleEmailBlur}
                placeholder="user@example.com"
                className={`w-full bg-[#0b0e11] border rounded-lg py-2.5 pl-10 pr-4 text-xs text-white placeholder-gray-600 focus:outline-none transition-colors ${
                  errors.email
                    ? 'border-red-500 focus:border-red-500 focus:ring-1 focus:ring-red-500/50'
                    : 'border-[#2b313a] focus:border-amber-500'
                }`}
              />
            </div>
            {errors.email && (
              <div className="flex items-center space-x-1.5 mt-1.5 text-xs text-red-400">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{errors.email}</span>
              </div>
            )}
          </div>

          {/* Password */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-gray-300">
                Mật khẩu
              </label>
              <span className="text-[11px] text-gray-500">Tối thiểu 6 ký tự</span>
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3 top-3 text-gray-500 pointer-events-none" />
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Nhập mật khẩu"
                className={`w-full bg-[#0b0e11] border rounded-lg py-2.5 pl-10 pr-10 text-xs text-white placeholder-gray-600 focus:outline-none transition-colors ${
                  errors.password
                    ? 'border-red-500 focus:border-red-500 focus:ring-1 focus:ring-red-500/50'
                    : 'border-[#2b313a] focus:border-amber-500'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-200 transition-colors focus:outline-none"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.password && (
              <div className="flex items-center space-x-1.5 mt-1.5 text-xs text-red-400">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{errors.password}</span>
              </div>
            )}
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1.5">
              Xác nhận mật khẩu
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3 top-3 text-gray-500 pointer-events-none" />
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="Nhập lại mật khẩu"
                className={`w-full bg-[#0b0e11] border rounded-lg py-2.5 pl-10 pr-10 text-xs text-white placeholder-gray-600 focus:outline-none transition-colors ${
                  errors.confirmPassword
                    ? 'border-red-500 focus:border-red-500 focus:ring-1 focus:ring-red-500/50'
                    : 'border-[#2b313a] focus:border-amber-500'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-200 transition-colors focus:outline-none"
                tabIndex={-1}
              >
                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.confirmPassword && (
              <div className="flex items-center space-x-1.5 mt-1.5 text-xs text-red-400">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{errors.confirmPassword}</span>
              </div>
            )}
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 px-4 rounded-lg bg-gradient-to-r from-amber-500 to-amber-400 text-black font-bold text-xs uppercase tracking-wider hover:brightness-110 active:scale-[0.99] transition-all disabled:opacity-50 flex items-center justify-center space-x-2 shadow-lg shadow-amber-500/10 mt-2 cursor-pointer"
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
