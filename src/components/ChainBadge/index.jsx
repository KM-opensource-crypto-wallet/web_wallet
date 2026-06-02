import s from './ChainBadge.module.css';

const ChainBadge = ({chain}) => {
  if (!chain) return null;
  return <span className={s.badge}>{chain}</span>;
};

export default ChainBadge;
