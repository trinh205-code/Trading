import React, { useState } from 'react';
import { X, KeyRound, AlertCircle, CheckCircle2 } from 'lucide-react';
import { userApi } from '../../api/userApi';

interface ChangeTransferPinModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const ChangeTransferPinModal: React.FC<ChangeTransferPinModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [oldPin, setOldPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (oldPin.length !== 4 || newPin.length !== 4) {
      setErrorMessage('Mã OTP phải gồm đúng 4 chữ số');
      return;
    }

    if (newPin !== confirmPin) {
      setErrorMessage('Xác nhận mã OTP mới không khớp');
      return;
    }

    if (oldPin === newPin) {
      setErrorMessage('Mã OTP mới không được trùng với mã cũ');
      return;
    }

    setLoading(true);
    try {
      const res = await userApi.changeTransferPin({ oldPin, newPin });
      if (res.success) {
        setSuccessMessage('Đổi mã OTP chuyển tiền thành công!');
        setTimeout(() => {
          onClose();
          setOldPin('');
          setNewPin('');
          setConfirmPin('');
          setSuccessMessage(null);
          onSuccess?.();
        }, 1500);
      } else {
        setErrorMessage(res.message || 'Đổi mã OTP thất bại');
      }
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || err.message || 'Mã OTP cũ không chính xác');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm bg-[#181818] border border-[#262626] rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#262626]">
          <div className="flex items-center space-x-2">
            <KeyRound className="w-4 h-4 text-[#00c076]" />
            <h3 className="font-bold text-base text-white">Đổi mã OTP chuyển tiền</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-[#888888] hover:text-white hover:bg-[#262626] rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <p className="text-xs text-[#888888]">
            Mã OTP 4 số dùng để xác nhận mỗi khi bạn thực hiện chuyển tiền P2P (mã mặc định ban đầu là{' '}
            <span className="font-mono text-[#00c076] font-bold">1234</span>).
          </p>

          {errorMessage && (
            <div className="flex items-start space-x-2 p-3 bg-red-950/40 border border-red-800/60 rounded-xl text-red-400 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="flex items-start space-x-2 p-3 bg-emerald-950/40 border border-emerald-800/60 rounded-xl text-emerald-400 text-xs">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{successMessage}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-[#aaaaaa] mb-1.5">
              Mã OTP hiện tại (4 số)
            </label>
            <input
              type="password"
              maxLength={4}
              inputMode="numeric"
              value={oldPin}
              onChange={(e) => setOldPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
              placeholder="Ví dụ: 1234"
              className="w-full px-3.5 py-2.5 bg-[#121212] border border-[#333333] focus:border-[#00c076] rounded-xl text-sm text-white placeholder-[#666666] outline-none font-mono text-center tracking-widest text-lg"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#aaaaaa] mb-1.5">
              Mã OTP mới (4 số)
            </label>
            <input
              type="password"
              maxLength={4}
              inputMode="numeric"
              value={newPin}
              onChange={(e) => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
              placeholder="Nhập 4 chữ số mới"
              className="w-full px-3.5 py-2.5 bg-[#121212] border border-[#333333] focus:border-[#00c076] rounded-xl text-sm text-white placeholder-[#666666] outline-none font-mono text-center tracking-widest text-lg"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#aaaaaa] mb-1.5">
              Xác nhận mã OTP mới
            </label>
            <input
              type="password"
              maxLength={4}
              inputMode="numeric"
              value={confirmPin}
              onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
              placeholder="Nhập lại 4 chữ số mới"
              className="w-full px-3.5 py-2.5 bg-[#121212] border border-[#333333] focus:border-[#00c076] rounded-xl text-sm text-white placeholder-[#666666] outline-none font-mono text-center tracking-widest text-lg"
            />
          </div>

          <button
            type="submit"
            disabled={loading || oldPin.length !== 4 || newPin.length !== 4 || confirmPin.length !== 4}
            className="w-full py-3 bg-[#00c076] hover:bg-[#00d080] text-black font-bold rounded-xl text-sm transition-all shadow-lg shadow-[#00c076]/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Đang cập nhật...' : 'Lưu mã mới'}
          </button>
        </form>
      </div>
    </div>
  );
};
