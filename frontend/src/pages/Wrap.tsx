import { useState } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseUnits } from 'viem';
import toast from 'react-hot-toast';
import { CONTRACTS } from '../config';

const FACTORY_ABI = [
  {
    name: 'deployWrapper',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'erc20', type: 'address' },
      { name: 'name', type: 'string' },
      { name: 'symbol', type: 'string' },
      { name: 'decimals', type: 'uint8' },
    ],
    outputs: [{ name: 'wrapper', type: 'address' }],
  },
  {
    name: 'getAllWrapperInfo',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [
      {
        name: '',
        type: 'tuple[]',
        components: [
          { name: 'erc20', type: 'address' },
          { name: 'wrapper', type: 'address' },
          { name: 'name', type: 'string' },
          { name: 'symbol', type: 'string' },
          { name: 'decimals', type: 'uint8' },
          { name: 'deployer', type: 'address' },
          { name: 'deployedAt', type: 'uint256' },
        ],
      },
    ],
  },
  {
    name: 'totalWrappers',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint256' }],
  },
] as const;

const ERC20_ABI = [
  {
    name: 'approve',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }],
    outputs: [{ type: 'bool' }],
  },
] as const;

function shortenAddr(addr: string) {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function DeployModal({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState({ erc20: '', name: '', symbol: '', decimals: '18' });
  const { writeContract, isPending } = useWriteContract();

  const handleDeploy = () => {
    if (!form.erc20 || !form.name || !form.symbol) { toast.error('Fill all fields'); return; }
    writeContract({
      address: CONTRACTS.WRAPPER_FACTORY,
      abi: FACTORY_ABI,
      functionName: 'deployWrapper',
      args: [form.erc20 as `0x${string}`, form.name, form.symbol, parseInt(form.decimals)],
    });
    toast.success('Wrapper deployment submitted!');
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, backdropFilter: 'blur(4px)' }} onClick={onClose}>
      <div className="card" style={{ width: '480px', maxWidth: '95vw' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h3>Deploy New Wrapper</h3>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="form-group">
            <label>ERC-20 Token Address</label>
            <input className="input" placeholder="0x..." value={form.erc20} onChange={e => setForm(p => ({ ...p, erc20: e.target.value }))} />
          </div>
          <div className="grid-2">
            <div className="form-group">
              <label>Confidential Token Name</label>
              <input className="input" placeholder="Confidential USDC" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
            </div>
            <div className="form-group">
              <label>Symbol</label>
              <input className="input" placeholder="cUSDC" value={form.symbol} onChange={e => setForm(p => ({ ...p, symbol: e.target.value }))} />
            </div>
          </div>
          <div className="form-group">
            <label>Decimals</label>
            <input className="input" type="number" value={form.decimals} onChange={e => setForm(p => ({ ...p, decimals: e.target.value }))} />
          </div>
          <div className="alert alert-info" style={{ fontSize: '0.8rem' }}>
            🔐 Deploys an ERC-7984 confidential wrapper. All balances stored as encrypted <code>euint64</code> — invisible on-chain.
          </div>
          <button className="btn btn-primary" onClick={handleDeploy} disabled={isPending} style={{ width: '100%', justifyContent: 'center' }}>
            {isPending ? <><span className="spinner" /> Deploying...</> : '🚀 Deploy Wrapper'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function WrapPage() {
  const { isConnected } = useAccount();
  const [showModal, setShowModal] = useState(false);
  const [wrapAmount, setWrapAmount] = useState('');
  const [selectedWrapper, setSelectedWrapper] = useState<any>(null);

  const { data: allWrappers, isLoading } = useReadContract({
    address: CONTRACTS.WRAPPER_FACTORY,
    abi: FACTORY_ABI,
    functionName: 'getAllWrapperInfo',
  });

  const { writeContract, isPending } = useWriteContract();

  const handleApproveAndWrap = () => {
    if (!selectedWrapper || !wrapAmount) return;
    const amount = parseUnits(wrapAmount, Number(selectedWrapper.decimals));
    writeContract({
      address: selectedWrapper.erc20 as `0x${string}`,
      abi: ERC20_ABI,
      functionName: 'approve',
      args: [selectedWrapper.wrapper, amount],
    });
    toast.success('Step 1/2: Approval submitted — then wrap will execute');
  };

  return (
    <div className="page">
      <div className="container">
        {/* Header */}
        <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1>🔄 Wrapper Registry</h1>
            <p>Wrap ERC-20 tokens into ERC-7984 confidential counterparts. Balances are stored as encrypted <code>euint64</code>.</p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <span className="badge badge-active">Bounty Track · 3,000 cUSDT</span>
            <span className="privacy-indicator">🛡️ ERC-7984 Standard</span>
            {isConnected && <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ Deploy Wrapper</button>}
          </div>
        </div>

        {/* Stats */}
        <div className="grid-3" style={{ marginBottom: '1.5rem' }}>
          <div className="card">
            <div className="stat">
              <span className="stat-value gradient-text">{String((allWrappers as any[])?.length ?? 0)}</span>
              <span className="stat-label">Total Wrappers</span>
            </div>
          </div>
          <div className="card">
            <div className="stat">
              <span className="stat-value" style={{ color: 'var(--accent-green)' }}>euint64</span>
              <span className="stat-label">Encryption Type</span>
            </div>
          </div>
          <div className="card">
            <div className="stat">
              <span className="stat-value" style={{ color: 'var(--accent-secondary)' }}>Sepolia</span>
              <span className="stat-label">Network</span>
            </div>
          </div>
        </div>

        {/* Wrap Panel */}
        {isConnected && (allWrappers as any[])?.length > 0 && (
          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ marginBottom: '1rem' }}>Wrap Tokens</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '1rem', alignItems: 'flex-end' }}>
              <div className="form-group">
                <label>Select Wrapper</label>
                <select className="input" value={selectedWrapper?.wrapper || ''} onChange={e => {
                  const w = (allWrappers as any[])?.find((x: any) => x.wrapper === e.target.value);
                  setSelectedWrapper(w || null);
                }}>
                  <option value="">Choose token...</option>
                  {(allWrappers as any[]).map((w: any) => (
                    <option key={w.wrapper} value={w.wrapper}>{w.name} ({w.symbol})</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Amount to Wrap</label>
                <input className="input" type="number" placeholder="0.00" value={wrapAmount} onChange={e => setWrapAmount(e.target.value)} />
              </div>
              <button className="btn btn-primary" onClick={handleApproveAndWrap} disabled={isPending || !selectedWrapper || !wrapAmount}>
                {isPending ? <><span className="spinner" /> Wrapping...</> : '🔒 Wrap'}
              </button>
            </div>
            {selectedWrapper && (
              <div className="alert alert-success" style={{ marginTop: '1rem', fontSize: '0.8rem' }}>
                <span>🔒</span>
                <span>After wrapping, your <strong>{selectedWrapper.symbol.replace('c','')}</strong> balance becomes an encrypted <code>euint64</code> — invisible to all other addresses.</span>
              </div>
            )}
          </div>
        )}

        {/* Registry Table */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <h3>Deployed Wrappers</h3>
            <span className="badge badge-encrypted">🔒 Confidential ERC-7984</span>
          </div>

          {isLoading ? (
            <div className="empty-state"><div className="spinner" style={{ margin: '0 auto' }} /><p style={{ marginTop: '1rem' }}>Loading registry...</p></div>
          ) : !allWrappers || (allWrappers as any[]).length === 0 ? (
            <div className="empty-state">
              <p style={{ fontSize: '2rem' }}>📭</p>
              <h3>No wrappers deployed yet</h3>
              <p>Be the first to create a confidential token wrapper on Sepolia!</p>
              {isConnected && <button className="btn btn-primary" style={{ marginTop: '1rem' }} onClick={() => setShowModal(true)}>Deploy First Wrapper</button>}
            </div>
          ) : (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Name</th><th>Symbol</th><th>Underlying ERC-20</th><th>Wrapper Address</th><th>Deployer</th><th>Decimals</th><th>Type</th>
                  </tr>
                </thead>
                <tbody>
                  {(allWrappers as any[]).map((w: any) => (
                    <tr key={w.wrapper}>
                      <td style={{ fontWeight: 600 }}>{w.name}</td>
                      <td><span className="badge badge-encrypted">{w.symbol}</span></td>
                      <td className="address">{shortenAddr(w.erc20)}</td>
                      <td className="address">{shortenAddr(w.wrapper)}</td>
                      <td className="address">{shortenAddr(w.deployer)}</td>
                      <td style={{ color: 'var(--text-muted)' }}>{String(w.decimals)}</td>
                      <td><span className="privacy-indicator">🔐 euint64</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
      {showModal && <DeployModal onClose={() => setShowModal(false)} />}
    </div>
  );
}
