import Image from 'next/image';
import s from './Illustrations.module.css';

// Hero scenes for the onboarding slides. Each one is drawn on a 320x256 stage
// (positions below are in stage pixels); the stylesheet scales the stage up
// on wider screens. The accent follows the white-label `--background` colour.

const COIN = {
  btc: 'https://assets.kimlgrow.com/common/btc.png',
  eth: 'https://assets.kimlgrow.com/common/eth.webp',
  sol: 'https://assets.kimlgrow.com/common/solana.png',
  usdc: 'https://assets.kimlgrow.com/common/usdc.png',
  usdt: 'https://assets.kimlgrow.com/common/USDT.png',
  lightning: 'https://assets.kimlgrow.com/common/bitcoin_lightning.png',
};

const float = (duration, reverse) => ({
  animationDuration: `${duration}s`,
  animationDirection: reverse ? 'alternate-reverse' : 'alternate',
});

const Blob = ({angle, radius}) => (
  <div
    className={s.blob}
    style={{
      borderRadius: radius,
      '--blob-angle': `${angle}deg`,
    }}
  />
);

const Ring = () => (
  <svg
    className={`${s.layer} ${s.ring}`}
    width='320'
    height='256'
    viewBox='0 0 320 256'
    fill='none'>
    <circle
      cx='160'
      cy='126'
      r='96'
      stroke='rgba(255,255,255,0.55)'
      strokeWidth='2'
      strokeDasharray='26 14 4 14'
    />
  </svg>
);

const Badge = ({dark, size = 44, pos, duration = 3.2, reverse, children}) => (
  <div
    className={`${s.badge} ${dark ? s.dark : ''} ${s.float}`}
    style={{width: size, height: size, ...pos, ...float(duration, reverse)}}>
    {children}
  </div>
);

const Pill = ({dark, mono, pos, duration = 3.4, reverse, children}) => (
  <div
    className={`${s.pill} ${dark ? s.dark : ''} ${mono ? s.mono : ''} ${
      s.float
    }`}
    style={{...pos, ...float(duration, reverse)}}>
    {children}
  </div>
);

const Coin = ({src, alt, cover}) => (
  <Image
    src={src}
    alt={alt}
    width={44}
    height={44}
    className={cover ? s.coinCover : s.coin}
  />
);

const Icon = ({size, stroke = 'currentColor', children}) => (
  <svg
    width={size}
    height={size}
    viewBox='0 0 24 24'
    fill='none'
    stroke={stroke}
    strokeWidth='2'
    strokeLinecap='round'
    strokeLinejoin='round'>
    {children}
  </svg>
);

const WalletScene = () => (
  <>
    <Blob angle={150} radius='46% 54% 58% 42% / 48% 42% 58% 52%' />
    <Ring />
    <div className={`${s.card} ${s.walletCard}`}>
      <div className={s.walletScreen}>
        <Icon size={34} stroke='#fff'>
          <path d='M19 7V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2' />
          <path d='M21 11h-5a2 2 0 0 0 0 4h5v-4z' />
        </Icon>
      </div>
      <div className={s.walletBarLong} />
      <div className={s.walletBarShort} />
    </div>
    <Badge size={46} pos={{top: 26, left: 44}} duration={3}>
      <Coin src={COIN.btc} alt='BTC' />
    </Badge>
    <Badge dark size={42} pos={{top: 14, right: 52}} duration={3.6} reverse>
      <Coin src={COIN.eth} alt='ETH' />
    </Badge>
    <Badge pos={{bottom: 34, right: 34}}>
      <Coin src={COIN.sol} alt='SOL' />
    </Badge>
    <Pill pos={{bottom: 22, left: 40}} duration={4} reverse>
      50+ coins
    </Pill>
  </>
);

const TradeScene = () => (
  <>
    <Blob angle={210} radius='55% 45% 44% 56% / 45% 56% 44% 55%' />
    <Ring />
    <div className={`${s.card} ${s.centerCircle}`}>
      <Icon size={56} stroke='var(--background)'>
        <path d='M17 3l4 4-4 4' />
        <path d='M21 7H8a4 4 0 0 0-4 4' />
        <path d='M7 21l-4-4 4-4' />
        <path d='M3 17h13a4 4 0 0 0 4-4' />
      </Icon>
    </div>
    <Pill dark pos={{top: 24, left: 40}}>
      Provider A · $64,210
    </Pill>
    <Pill pos={{top: 62, right: 22}} duration={3} reverse>
      Provider B · $64,455 ✓
    </Pill>
    <Badge pos={{bottom: 26, left: 52}} duration={3.8}>
      <Coin src={COIN.btc} alt='BTC' />
    </Badge>
    <Badge pos={{bottom: 30, right: 48}} duration={3.1} reverse>
      <Coin src={COIN.usdc} alt='USDC' cover />
    </Badge>
  </>
);

const SendScene = () => (
  <>
    <Blob angle={120} radius='44% 56% 52% 48% / 56% 44% 56% 44%' />
    <svg
      className={s.layer}
      width='320'
      height='256'
      viewBox='0 0 320 256'
      fill='none'>
      <path
        d='M70 190 C 110 150, 150 170, 190 120 S 250 70, 262 62'
        stroke='rgba(255,255,255,0.8)'
        strokeWidth='2.5'
        strokeDasharray='10 9'
        strokeLinecap='round'
      />
    </svg>
    <Badge size={92} pos={{top: 38, right: 40}} duration={3.4}>
      <Icon size={46} stroke='var(--background)'>
        <path d='M21.5 2.5 10.8 13.2' />
        <path d='M21.5 2.5 14.5 21.5l-3.7-8.3L2.5 9.5l19-7z' />
      </Icon>
    </Badge>
    <Badge dark size={46} pos={{top: 30, left: 42}} duration={3} reverse>
      <Icon size={24} stroke='#fff'>
        <circle cx='12' cy='12' r='9' />
        <path d='M12 7v5l3.5 2' />
      </Icon>
    </Badge>
    <Pill pos={{bottom: 60, left: 40}} duration={3.6}>
      <Image src={COIN.lightning} alt='' width={18} height={18} />
      Lightning
    </Pill>
    <Pill dark pos={{bottom: 24, right: 44}} duration={4} reverse>
      Gas paid in USDT
    </Pill>
    <Badge pos={{bottom: 108, left: 58}}>
      <Coin src={COIN.usdt} alt='USDT' />
    </Badge>
  </>
);

const Slider = ({value}) => (
  <div className={s.track}>
    <div className={s.trackFill} style={{width: `${value}%`}} />
    <div className={s.trackKnob} style={{left: `${value}%`}} />
  </div>
);

const ProScene = () => (
  <>
    <Blob angle={320} radius='58% 42% 46% 54% / 42% 58% 42% 58%' />
    <Ring />
    <div className={`${s.card} ${s.slidersCard}`}>
      <Slider value={70} />
      <Slider value={35} />
      <Slider value={55} />
    </div>
    <Pill dark mono pos={{top: 26, left: 46}}>
      m/44&apos;/60&apos;/0&apos;/0
    </Pill>
    <Pill pos={{bottom: 30, right: 40}} duration={3} reverse>
      Pick your UTXOs
    </Pill>
    <Badge pos={{bottom: 36, left: 46}} duration={3.7}>
      <Coin src={COIN.btc} alt='BTC' />
    </Badge>
  </>
);

const PrivacyScene = () => (
  <>
    <Blob angle={20} radius='48% 52% 56% 44% / 52% 48% 52% 48%' />
    <Ring />
    <div className={s.shield}>
      <svg width='100' height='112' viewBox='0 0 24 26' fill='none'>
        <path
          d='M12 24s9-4 9-11V6l-9-4-9 4v7c0 7 9 11 9 11z'
          fill='#fff'
          stroke='#1A1613'
          strokeWidth='1.6'
          strokeLinejoin='round'
        />
        <path
          d='M8 12.5l2.8 2.8 5.2-5.2'
          stroke='var(--background)'
          strokeWidth='2'
          strokeLinecap='round'
          strokeLinejoin='round'
        />
      </svg>
    </div>
    <Badge size={48} pos={{top: 30, right: 44}}>
      <Icon size={26} stroke='#1A1613'>
        <path d='M17.5 19a4.5 4.5 0 0 0 .42-8.98 6 6 0 0 0-11.7 1.4A3.5 3.5 0 0 0 6.5 19h11z' />
      </Icon>
    </Badge>
    <Badge dark size={46} pos={{top: 40, left: 40}} duration={3.6} reverse>
      <Icon size={24} stroke='#fff'>
        <path d='M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z' />
        <circle cx='12' cy='12' r='3' />
        <line x1='4' y1='20' x2='20' y2='4' />
      </Icon>
    </Badge>
    <Pill pos={{bottom: 26, left: 46}} duration={3.9}>
      Hide wallets
    </Pill>
    <Pill dark pos={{bottom: 32, right: 38}} duration={3.3} reverse>
      Drive backup
    </Pill>
  </>
);

const SCENES = {
  wallet: WalletScene,
  trade: TradeScene,
  send: SendScene,
  pro: ProScene,
  privacy: PrivacyScene,
};

const Illustration = ({id}) => {
  const Scene = SCENES[id];
  return (
    <div className={s.frame} aria-hidden='true'>
      <div className={s.stage}>{Scene ? <Scene /> : null}</div>
    </div>
  );
};

export default Illustration;
