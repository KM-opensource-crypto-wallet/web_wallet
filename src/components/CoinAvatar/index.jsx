import s from './CoinAvatar.module.css';

const CoinAvatar = ({icon, symbol, size = 'md'}) => {
  const initials = symbol?.slice(0, 2)?.toUpperCase() || '?';
  if (icon) {
    return <img src={icon} alt={symbol} className={`${s.avatar} ${s[size]}`} />;
  }
  return (
    <div className={`${s.avatar} ${s.fallback} ${s[size]}`}>{initials}</div>
  );
};

export default CoinAvatar;
