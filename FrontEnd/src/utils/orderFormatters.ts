/**
 * Helper utility to format crypto order statuses, types, and sides into Vietnamese.
 */

export interface StatusBadge {
  label: string;
  color: string;
  bg: string;
}

export const formatOrderStatus = (status: string): StatusBadge => {
  switch (status?.toUpperCase()) {
    case 'NEW':
    case 'OPEN':
      return {
        label: 'Chờ khớp',
        color: 'text-amber-400',
        bg: 'bg-amber-400/10 border border-amber-400/20',
      };
    case 'PARTIALLY_FILLED':
      return {
        label: 'Khớp một phần',
        color: 'text-blue-400',
        bg: 'bg-blue-400/10 border border-blue-400/20',
      };
    case 'FILLED':
      return {
        label: 'Đã khớp',
        color: 'text-[#00c076]',
        bg: 'bg-[#00c076]/10 border border-[#00c076]/20',
      };
    case 'CANCELED':
    case 'CANCELLED':
      return {
        label: 'Đã hủy',
        color: 'text-[#888888]',
        bg: 'bg-[#222222] border border-[#333333]',
      };
    case 'REJECTED':
      return {
        label: 'Bị từ chối',
        color: 'text-[#ff5b5b]',
        bg: 'bg-[#ff5b5b]/10 border border-[#ff5b5b]/20',
      };
    case 'EXPIRED':
      return {
        label: 'Hết hạn',
        color: 'text-gray-400',
        bg: 'bg-gray-500/10 border border-gray-500/20',
      };
    default:
      return {
        label: status || 'Không rõ',
        color: 'text-gray-300',
        bg: 'bg-[#222222] border border-[#333333]',
      };
  }
};

export const formatOrderType = (type: string): string => {
  switch (type?.toUpperCase()) {
    case 'LIMIT':
      return 'Giới hạn';
    case 'MARKET':
      return 'Thị trường';
    case 'STOP_LIMIT':
      return 'Dừng giới hạn';
    case 'STOP_MARKET':
      return 'Dừng thị trường';
    default:
      return type || '--';
  }
};

export const formatOrderSide = (side: string): { label: string; color: string } => {
  if (side?.toUpperCase() === 'BUY') {
    return { label: 'MUA', color: 'text-[#00c076]' };
  }
  return { label: 'BÁN', color: 'text-[#ff5b5b]' };
};
