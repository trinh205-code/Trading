import React, { useState } from 'react';

interface CoinIconProps {
  symbol: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const sizeMap = {
  xs: 'w-4 h-4 text-[9px]',
  sm: 'w-5 h-5 text-[10px]',
  md: 'w-6 h-6 text-xs',
  lg: 'w-8 h-8 text-sm',
  xl: 'w-10 h-10 text-base',
};

// Known coin brand colors for fallback badge
const coinColors: Record<string, { bg: string; text: string; label: string }> = {
  BTC: { bg: 'bg-[#F7931A]', text: 'text-white', label: '₿' },
  ETH: { bg: 'bg-[#627EEA]', text: 'text-white', label: 'Ξ' },
  BNB: { bg: 'bg-[#F3BA2F]', text: 'text-black', label: 'B' },
  SOL: { bg: 'bg-gradient-to-tr from-[#9945FF] to-[#14F195]', text: 'text-white', label: 'S' },
  XRP: { bg: 'bg-[#23292F]', text: 'text-white', label: 'X' },
  DOGE: { bg: 'bg-[#C2A633]', text: 'text-white', label: 'Ð' },
  ADA: { bg: 'bg-[#0033AD]', text: 'text-white', label: '₳' },
  AVAX: { bg: 'bg-[#E84142]', text: 'text-white', label: 'A' },
  LINK: { bg: 'bg-[#375BD2]', text: 'text-white', label: '⬡' },
  DOT: { bg: 'bg-[#E6007A]', text: 'text-white', label: '●' },
  LTC: { bg: 'bg-[#345D9D]', text: 'text-white', label: 'Ł' },
  TRX: { bg: 'bg-[#EF0027]', text: 'text-white', label: 'T' },
  NEAR: { bg: 'bg-[#000000] border border-[#333333]', text: 'text-white', label: 'N' },
  USDT: { bg: 'bg-[#26A17B]', text: 'text-white', label: '₮' },
  USDC: { bg: 'bg-[#2775CA]', text: 'text-white', label: '$' },
  MATIC: { bg: 'bg-[#8247E5]', text: 'text-white', label: 'M' },
  ATOM: { bg: 'bg-[#2E3148]', text: 'text-white', label: '⚛' },
  ARB: { bg: 'bg-[#28A0F0]', text: 'text-white', label: 'A' },
  OP: { bg: 'bg-[#FF0420]', text: 'text-white', label: 'O' },
  APT: { bg: 'bg-[#000000] border border-[#444444]', text: 'text-white', label: 'A' },
};

export const CoinIcon: React.FC<CoinIconProps> = ({
  symbol,
  size = 'md',
  className = '',
}) => {
  const [imgError, setImgError] = useState(false);

  // Normalize pair symbol, e.g. "BTCUSDT" -> "BTC", "BTC/USDT" -> "BTC"
  let clean = symbol.toUpperCase().replace('/USDT', '').replace('USDT', '').trim();
  if (!clean) clean = symbol.toUpperCase();

  const coinInfo = coinColors[clean] || {
    bg: 'bg-[#222222] border border-[#333333]',
    text: 'text-[#cccccc]',
    label: clean.slice(0, 2),
  };

  // CDN image source
  const cdnUrl = `https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/128/color/${clean.toLowerCase()}.png`;

  if (!imgError) {
    return (
      <img
        src={cdnUrl}
        alt={clean}
        onError={() => setImgError(true)}
        className={`rounded-full shrink-0 object-contain ${sizeMap[size]} ${className}`}
        loading="lazy"
      />
    );
  }

  // Graceful Fallback with official coin background color & glyph
  return (
    <div
      className={`rounded-full shrink-0 flex items-center justify-center font-bold font-mono select-none ${coinInfo.bg} ${coinInfo.text} ${sizeMap[size]} ${className}`}
      title={clean}
    >
      {coinInfo.label}
    </div>
  );
};
