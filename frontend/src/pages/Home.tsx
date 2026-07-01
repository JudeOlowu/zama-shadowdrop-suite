import { Link } from 'react-router-dom';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount } from 'wagmi';

const features = [
  {
    icon: '🔄',
    track: 'Bounty Track · 3,000 cUSDT',
    title: 'Confidential Wrapper',
    description:
      'Wrap any ERC-20 into an ERC-7984 encrypted token. Balances are stored as euint64 — invisible on-chain to all parties except the owner.',
    link: '/wrap',
    cta: 'Open Wrapper Registry →',
    gradient: 'from-indigo-500 to-violet-600',
  },
  {
    icon: '📬',
    track: 'Special Bounty · 2,500 cUSDT',
    title: 'Confidential Airdrop',
    description:
      'Upload a CSV of recipients. Each allocation is encrypted individually. Recipients claim their tokens without anyone seeing how much they got.',
    link: '/airdrop',
    cta: 'Create a Drop →',
    gradient: 'from-violet-500 to-cyan-500',
  },
  {
    icon: '🏦',
    track: 'Builder Track · 7,000 cUSDT',
    title: 'Confidential Treasury',
    description:
      'DAO-grade treasury management. Admins allocate encrypted budgets to members. Members spend privately. No one sees another member\'s allocation.',
    link: '/treasury',
    cta: 'Manage Treasury →',
    gradient: 'from-cyan-500 to-emerald-500',
  },
];

const stats = [
  { label: 'Prize Tracks', value: '3' },
  { label: 'Total Prize Pool', value: '12.5K cUSDT' },
  { label: 'FHE Operations', value: 'euint64' },
  { label: 'Network', value: 'Sepolia' },
];

export default function HomePage() {
  const { isConnected } = useAccount();

  return (
    <div className="page">
      {/* ── Hero ─────────────────────────────────────────── */}
      <section style={{ textAlign: 'center', padding: '4rem 1.5rem 3rem' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', marginBottom: '1.25rem' }}>
          <span className="badge badge-active">
            🏆 Zama Developer Program · Season 3
          </span>
        </div>

        <h1 style={{ fontSize: 'clamp(2.5rem, 5vw, 4rem)', lineHeight: 1.1, marginBottom: '1.25rem' }}>
          Composable Privacy{' '}
          <span className="gradient-text">for On-Chain Finance</span>
        </h1>

        <p
          style={{
            color: 'var(--text-secondary)',
            fontSize: '1.15rem',
            maxWidth: '640px',
            margin: '0 auto 2rem',
            lineHeight: 1.7,
          }}
        >
          ShadowDrop brings <strong style={{ color: 'var(--text-primary)' }}>Fully Homomorphic Encryption</strong> to
          token distribution, treasury management, and asset wrapping — built on Zama's FHEVM.
        </p>

        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          {isConnected ? (
            <Link to="/wrap" className="btn btn-primary btn-lg">
              🔄 Start Wrapping
            </Link>
          ) : (
            <ConnectButton label="Connect Wallet to Start" />
          )}
          <a
            href="https://github.com/zama-ai/developer-program"
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-ghost btn-lg"
          >
            Zama Dev Program ↗
          </a>
        </div>

        {/* Privacy indicator */}
        <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <span className="privacy-indicator">🔒 TFHE Encrypted</span>
          <span className="privacy-indicator">⚡ euint64 Balances</span>
          <span className="privacy-indicator">🛡️ ERC-7984 Standard</span>
        </div>
      </section>

      {/* ── Stats ────────────────────────────────────────── */}
      <section className="container" style={{ marginBottom: '3rem' }}>
        <div className="grid-4">
          {stats.map((s) => (
            <div key={s.label} className="card" style={{ textAlign: 'center' }}>
              <div className="stat">
                <span className="stat-value gradient-text">{s.value}</span>
                <span className="stat-label">{s.label}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────── */}
      <section className="container">
        <div className="grid-3">
          {features.map((f) => (
            <div key={f.title} className="card animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <span style={{ fontSize: '2.5rem' }}>{f.icon}</span>
              </div>
              <div>
                <span className="badge badge-active" style={{ marginBottom: '0.75rem' }}>
                  {f.track}
                </span>
                <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', marginTop: '0.5rem' }}>{f.title}</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.6 }}>
                  {f.description}
                </p>
              </div>
              <div style={{ marginTop: 'auto' }}>
                <Link to={f.link} className="btn btn-secondary" style={{ width: '100%', justifyContent: 'center' }}>
                  {f.cta}
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── How It Works ─────────────────────────────────── */}
      <section className="container" style={{ marginTop: '4rem' }}>
        <h2 style={{ fontSize: '1.75rem', marginBottom: '0.5rem', textAlign: 'center' }}>
          How Composable Privacy Works
        </h2>
        <p style={{ color: 'var(--text-secondary)', textAlign: 'center', marginBottom: '2rem' }}>
          Each module composes into the next — wrap once, use everywhere
        </p>

        <div className="card card-glass" style={{ padding: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
            {[
              { step: '1', label: 'Wrap ERC-20', desc: 'ERC-7984 confidential token' },
              { step: '→', label: '', desc: '' },
              { step: '2', label: 'Create Drop', desc: 'CSV → encrypted allocations' },
              { step: '→', label: '', desc: '' },
              { step: '3', label: 'Fund Treasury', desc: 'Allocate budgets privately' },
              { step: '→', label: '', desc: '' },
              { step: '4', label: 'Members Spend', desc: 'FHE verified, no leakage' },
            ].map((item, i) =>
              item.label === '' ? (
                <span key={i} style={{ color: 'var(--text-muted)', fontSize: '1.5rem' }}>{item.step}</span>
              ) : (
                <div key={i} style={{ textAlign: 'center', flex: '1', minWidth: '120px' }}>
                  <div
                    style={{
                      width: '40px', height: '40px',
                      borderRadius: '50%',
                      background: 'var(--gradient-brand)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      margin: '0 auto 0.5rem',
                      fontWeight: 800, fontSize: '0.875rem',
                    }}
                  >
                    {item.step}
                  </div>
                  <div style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: '0.2rem' }}>{item.label}</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{item.desc}</div>
                </div>
              )
            )}
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────── */}
      <footer style={{ textAlign: 'center', padding: '3rem 1.5rem 1rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
        <p>Built for <strong style={{ color: 'var(--text-secondary)' }}>Zama Developer Program Season 3</strong> · Theme: Composable Privacy</p>
        <p style={{ marginTop: '0.25rem' }}>
          Powered by{' '}
          <a href="https://docs.zama.ai/fhevm" target="_blank" rel="noopener" style={{ color: 'var(--accent-primary)' }}>
            Zama FHEVM
          </a>{' '}
          · ERC-7984 · Sepolia Testnet
        </p>
      </footer>
    </div>
  );
}
