import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';

export const OAuth2RedirectHandler: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const setTokens = useAuthStore((state) => state.setTokens);

  useEffect(() => {
    const token = searchParams.get('token');
    const refreshToken = searchParams.get('refreshToken');
    const error = searchParams.get('error');

    if (token && refreshToken) {
      setTokens(token, refreshToken).then(() => {
        navigate('/trade/BTCUSDT', { replace: true });
      }).catch((err) => {
        console.error('Failed to initialize OAuth2 login:', err);
        navigate('/login?error=oauth2_failed', { replace: true });
      });
    } else if (error) {
      navigate(`/login?error=${encodeURIComponent(error)}`, { replace: true });
    } else {
      navigate('/login', { replace: true });
    }
  }, [searchParams, navigate, setTokens]);

  return (
    <div className="min-h-screen bg-[#0b0e11] flex items-center justify-center">
      <div className="text-center p-8 bg-[#181a20] rounded-xl border border-[#2b313a] shadow-xl max-w-sm w-full mx-4">
        <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <h2 className="text-white font-semibold text-base mb-1">Đang xử lý đăng nhập...</h2>
        <p className="text-gray-400 text-xs">Vui lòng chờ trong giây lát.</p>
      </div>
    </div>
  );
};
