import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { Lock, Mail, AlertCircle, ArrowRight, Eye, EyeOff } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const login = useAuthStore((state) => state.login);
  const isLoading = useAuthStore((state) => state.isLoading);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [generalError, setGeneralError] = useState<string | null>(null);

  const [searchParams] = useSearchParams();

  useEffect(() => {
    const errorParam = searchParams.get('error');
    if (errorParam) {
      setGeneralError('Đăng nhập bằng Google không thành công: ' + decodeURIComponent(errorParam));
    }
  }, [searchParams]);

  const handleEmailChange = (val: string) => {
    setEmail(val);
    if (emailError) {
      setEmailError(null);
    }
  };

  const handleEmailBlur = () => {
    const trimmed = email.trim();
    if (!trimmed) return;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmed)) {
      setEmailError('Địa chỉ email không đúng định dạng (ví dụ: name@example.com).');
    } else {
      setEmailError(null);
    }
  };

  const handlePasswordChange = (val: string) => {
    setPassword(val);
    if (!val) {
      setPasswordError(null);
    } else if (val.length < 6) {
      setPasswordError('Mật khẩu phải có tối thiểu 6 ký tự.');
    } else {
      setPasswordError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError(null);

    let hasError = false;
    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      setEmailError('Email không được để trống.');
      hasError = true;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setEmailError('Địa chỉ email không đúng định dạng (ví dụ: name@example.com).');
      hasError = true;
    } else {
      setEmailError(null);
    }

    if (!password) {
      setPasswordError('Mật khẩu không được để trống.');
      hasError = true;
    } else if (password.length < 6) {
      setPasswordError('Mật khẩu phải có tối thiểu 6 ký tự.');
      hasError = true;
    } else {
      setPasswordError(null);
    }

    if (hasError) {
      return;
    }

    try {
      await login({ email: trimmedEmail, password });
      navigate('/trade/BTCUSDT');
    } catch (err: any) {
      // Backend validation error mapping (from @Valid on LoginRequest)
      if (err.errors) {
        if (err.errors.email) {
          setEmailError(err.errors.email);
        }
        if (err.errors.password) {
          setPasswordError(err.errors.password);
        }
      }

      // Check specific error messages
      const msg = err.message || '';
      if (msg.includes('Mật khẩu không đúng')) {
        setPasswordError('Mật khẩu không chính xác. Vui lòng kiểm tra lại.');
        setGeneralError('Mật khẩu không chính xác. Vui lòng thử lại.');
      } else if (msg.includes('Không tìm thấy người dùng')) {
        setEmailError('Tài khoản email này chưa được đăng ký.');
        setGeneralError('Tài khoản không tồn tại trên hệ thống.');
      } else if (err.errors?.password || err.errors?.email) {
        // Field errors are already displayed inline
      } else {
        setGeneralError(msg || 'Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin.');
      }
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

        {/* General Error Alert */}
        {generalError && (
          <div className="mb-6 p-3 rounded-lg bg-red-500/10 border border-red-500/30 flex items-start space-x-2 text-red-400 text-xs animate-fadeIn">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{generalError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="space-y-5">
          {/* Email */}
          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1.5">
              Địa chỉ Email
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3 top-3 text-gray-500 pointer-events-none" />
              <input
                type="email"
                value={email}
                onChange={(e) => handleEmailChange(e.target.value)}
                onBlur={handleEmailBlur}
                placeholder="name@example.com"
                className={`w-full bg-[#0b0e11] border rounded-lg py-2.5 pl-10 pr-4 text-xs text-white placeholder-gray-600 focus:outline-none transition-colors ${
                  emailError
                    ? 'border-red-500 focus:border-red-500 focus:ring-1 focus:ring-red-500/50'
                    : 'border-[#2b313a] focus:border-amber-500'
                }`}
              />
            </div>
            {emailError && (
              <div className="flex items-center space-x-1.5 mt-1.5 text-xs text-red-400">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{emailError}</span>
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
                value={password}
                onChange={(e) => handlePasswordChange(e.target.value)}
                placeholder="Nhập mật khẩu"
                className={`w-full bg-[#0b0e11] border rounded-lg py-2.5 pl-10 pr-10 text-xs text-white placeholder-gray-600 focus:outline-none transition-colors ${
                  passwordError
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
            {passwordError && (
              <div className="flex items-center space-x-1.5 mt-1.5 text-xs text-red-400">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{passwordError}</span>
              </div>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 px-4 rounded-lg bg-gradient-to-r from-amber-500 to-amber-400 text-black font-bold text-xs uppercase tracking-wider hover:brightness-110 active:scale-[0.99] transition-all disabled:opacity-50 flex items-center justify-center space-x-2 shadow-lg shadow-amber-500/10 cursor-pointer"
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

        {/* Divider */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-[#2b313a]"></div>
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-[#181a20] px-3 text-gray-500 font-medium">Hoặc tiếp tục với</span>
          </div>
        </div>

        {/* Google Login Button */}
        <button
          type="button"
          onClick={() => {
            window.location.href = 'http://localhost:8080/oauth2/authorization/google';
          }}
          className="w-full py-2.5 px-4 rounded-lg bg-[#22262e] hover:bg-[#2b313a] text-white text-xs font-semibold flex items-center justify-center space-x-3 transition-all border border-[#2b313a] hover:border-gray-600 shadow-sm cursor-pointer"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"/>
            <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"/>
            <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"/>
            <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
          </svg>
          <span>Đăng nhập với Google</span>
        </button>

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
