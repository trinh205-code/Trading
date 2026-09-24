import React, { useState } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { userApi } from '../../api/userApi';
import { User, Mail, Phone, ShieldCheck, Key, CheckCircle2, AlertCircle } from 'lucide-react';

export const ProfilePage: React.FC = () => {
  const { user, fetchProfile } = useAuthStore();

  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    if (newPassword !== confirmNewPassword) {
      setFeedback({ type: 'error', message: 'Mật khẩu mới không trùng khớp!' });
      return;
    }

    if (newPassword.length < 6) {
      setFeedback({ type: 'error', message: 'Mật khẩu mới phải từ 6 ký tự trở lên.' });
      return;
    }

    setIsSubmitting(true);
    try {
      await userApi.changePassword({ oldPassword, newPassword });
      setFeedback({ type: 'success', message: 'Đổi mật khẩu thành công!' });
      setOldPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'Đổi mật khẩu không thành công.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-[1200px] mx-auto px-4 py-8 text-xs">
      <h1 className="text-2xl font-bold text-white mb-6 flex items-center space-x-2">
        <User className="w-6 h-6 text-amber-400" />
        <span>Thông Tin Tài Khoản</span>
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Left Column: User Profile Card */}
        <div className="md:col-span-1 bg-[#181a20] border border-[#2b313a] rounded-2xl p-6 shadow-xl">
          <div className="text-center pb-6 border-b border-[#2b313a]">
            <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-amber-500 to-amber-300 flex items-center justify-center text-3xl font-extrabold text-black mx-auto mb-3 shadow-lg shadow-amber-500/20">
              {user?.fullName ? user.fullName[0].toUpperCase() : 'U'}
            </div>
            <h2 className="text-lg font-bold text-white">{user?.fullName || 'Người dùng Slayer'}</h2>
            <p className="text-xs text-gray-400 mt-0.5">{user?.email}</p>
            <span className="inline-block mt-3 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-semibold">
              ✓ Tài Khoản Đã Xác Thực
            </span>
          </div>

          <div className="pt-6 space-y-4">
            <div className="flex items-center space-x-3 text-gray-300">
              <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0" />
              <div>
                <div className="text-[10px] text-gray-500">ID Người Dùng</div>
                <div className="font-mono font-bold text-white">{user?.id || 'N/A'}</div>
              </div>
            </div>

            <div className="flex items-center space-x-3 text-gray-300">
              <Mail className="w-4 h-4 text-amber-400 shrink-0" />
              <div>
                <div className="text-[10px] text-gray-500">Địa chỉ Email</div>
                <div className="font-mono text-white">{user?.email || 'N/A'}</div>
              </div>
            </div>

            <div className="flex items-center space-x-3 text-gray-300">
              <Phone className="w-4 h-4 text-amber-400 shrink-0" />
              <div>
                <div className="text-[10px] text-gray-500">Số Điện Thoại</div>
                <div className="font-mono text-white">{user?.phoneNumber || 'N/A'}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Security & Password Change */}
        <div className="md:col-span-2 bg-[#181a20] border border-[#2b313a] rounded-2xl p-6 shadow-xl">
          <h2 className="text-base font-bold text-white mb-4 flex items-center space-x-2 border-b border-[#2b313a] pb-3">
            <Key className="w-4 h-4 text-amber-400" />
            <span>Bảo Mật & Mật Khẩu</span>
          </h2>

          {feedback && (
            <div
              className={`mb-4 p-3 rounded-lg flex items-center space-x-2 text-xs ${
                feedback.type === 'success'
                  ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
                  : 'bg-rose-500/10 border border-rose-500/30 text-rose-400'
              }`}
            >
              {feedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0" />
              )}
              <span>{feedback.message}</span>
            </div>
          )}

          <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
            <div>
              <label className="block text-gray-400 text-xs mb-1">Mật khẩu hiện tại</label>
              <input
                type="password"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full bg-[#0b0e11] border border-[#2b313a] rounded-lg py-2 px-3 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-gray-400 text-xs mb-1">Mật khẩu mới</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full bg-[#0b0e11] border border-[#2b313a] rounded-lg py-2 px-3 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-gray-400 text-xs mb-1">Nhập lại mật khẩu mới</label>
              <input
                type="password"
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full bg-[#0b0e11] border border-[#2b313a] rounded-lg py-2 px-3 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-amber-500"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-lg bg-amber-500 text-black font-bold text-xs uppercase tracking-wider hover:bg-amber-400 transition-all disabled:opacity-50"
            >
              {isSubmitting ? 'Đang cập nhật...' : 'Cập Nhật Mật Khẩu'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
