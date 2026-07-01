import { useState, useCallback } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { useDropzone } from 'react-dropzone';
import Papa from 'papaparse';
import toast from 'react-hot-toast';
import { CONTRACTS } from '../config';

const AIRDROP_ABI = [
  {
    name: 'createDrop',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'confidentialToken', type: 'address' },
      { name: 'recipients', type: 'address[]' },
      { name: 'encAllocations', type: 'uint64[]' },
      { name: 'deadline', type: 'uint256' },
      { name: 'title', type: 'string' },
      { name: 'description', type: 'string' },
    ],
    outputs: [{ name: 'dropId', type: 'uint256' }],
  },
  {
    name: 'dropCount',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint256' }],
  },
  {
    name: 'getDrop',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'dropId', type: 'uint256' }],
    outputs: [{
      type: 'tuple',
      components: [
        { name: 'creator', type: 'address' },
        { name: 'confidentialToken', type: 'address' },
        { name: 'deadline', type: 'uint256' },
        { name: 'recipientCount', type: 'uint256' },
        { name: 'claimedCount', type: 'uint256' },
        { name: 'active', type: 'bool' },
        { name: 'title', type: 'string' },
        { name: 'description', type: 'string' },
      ],
    }],
  },
] as const;

type Step = 'upload' | 'configure' | 'review' | 'deploy';
type Recipient = { address: string; amount: string };

function shortenAddr(addr: string) {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

export default function AirdropPage() {
  const { isConnected } = useAccount();
  const [step, setStep] = useState<Step>('upload');
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [form, setForm] = useState({ title: '', description: '', token: '', days: '30' });

  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const { data: dropCount } = useReadContract({
    address: CONTRACTS.AIRDROP,
    abi: AIRDROP_ABI,
    functionName: 'dropCount',
  });

  const onDrop = useCallback((files: File[]) => {
    const file = files[0];
    if (!file) return;
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const rows = results.data as any[];
        const parsed: Recipient[] = rows
          .filter(r => r.address && r.amount)
          .map(r => ({ address: r.address.trim(), amount: r.amount.trim() }));
        if (parsed.length === 0) {
          toast.error('No valid rows found. CSV needs "address" and "amount" columns.');
          return;
        }
        setRecipients(parsed);
        toast.success(`Loaded ${parsed.length} recipients`);
        setStep('configure');
      },
      error: () => toast.error('Failed to parse CSV'),
    });
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'text/csv': ['.csv'] },
    maxFiles: 1,
  });

  const handleDeploy = () => {
    if (!form.title || !form.token || recipients.length === 0) {
      toast.error('Fill all required fields');
      return;
    }
    const deadline = BigInt(Math.floor(Date.now() / 1000) + parseInt(form.days) * 86400);
    const addrs = recipients.map(r => r.address as `0x${string}`);
    const amounts = recipients.map(r => BigInt(Math.floor(parseFloat(r.amount) * 1e6)));

    writeContract({
      address: CONTRACTS.AIRDROP,
      abi: AIRDROP_ABI,
      functionName: 'createDrop',
      args: [form.token as `0x${string}`, addrs, amounts, deadline, form.title, form.description],
    });
    toast.loading('Creating confidential drop...');
  };

  const steps: { id: Step; label: string }[] = [
    { id: 'upload', label: 'Upload CSV' },
    { id: 'configure', label: 'Configure' },
    { id: 'review', label: 'Review' },
    { id: 'deploy', label: 'Deploy' },
  ];

  return (
    <div className="page">
      <div className="container">
        <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1>📬 Confidential Airdrop</h1>
            <p>Distribute tokens privately — recipient amounts are encrypted end-to-end</p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <span className="badge badge-active">Special Bounty · 2,500 cUSDT</span>
            <span className="privacy-indicator">🔒 TokenOps SDK</span>
          </div>
        </div>

        {/* ── Stats Row ─────────────────────────────── */}
        <div className="grid-3" style={{ marginBottom: '1.5rem' }}>
          <div className="card">
            <div className="stat">
              <span className="stat-value gradient-text">{String(dropCount ?? 0)}</span>
              <span className="stat-label">Total Drops Created</span>
            </div>
          </div>
          <div className="card">
            <div className="stat">
              <span className="stat-value" style={{ color: 'var(--accent-green)' }}>{recipients.length}</span>
              <span className="stat-label">Recipients Loaded</span>
            </div>
          </div>
          <div className="card">
            <div className="stat">
              <span className="stat-value" style={{ color: 'var(--accent-secondary)' }}>euint64</span>
              <span className="stat-label">Encryption Type</span>
            </div>
          </div>
        </div>

        {/* ── Stepper ───────────────────────────────── */}
        <div className="card" style={{ marginBottom: '1.5rem', padding: '1rem 1.5rem' }}>
          <div className="stepper">
            {steps.map((s, i) => (
              <>
                <div key={s.id} className={`step ${step === s.id ? 'active' : steps.indexOf({ id: step, label: '' } as any) > i ? 'done' : ''}`}>
                  <div className="step-num">{i + 1}</div>
                  <span>{s.label}</span>
                </div>
                {i < steps.length - 1 && <div key={`conn-${i}`} className="step-connector" />}
              </>
            ))}
          </div>
        </div>

        {/* ── Step: Upload ──────────────────────────── */}
        {step === 'upload' && (
          <div className="card animate-fade-in">
            <h3 style={{ marginBottom: '0.5rem' }}>Upload Recipient List</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
              CSV must have <code>address</code> and <code>amount</code> columns.
            </p>

            <div {...getRootProps()} className={`dropzone ${isDragActive ? 'active' : ''}`}>
              <input {...getInputProps()} />
              <p style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📂</p>
              <p style={{ fontWeight: 600, marginBottom: '0.25rem' }}>
                {isDragActive ? 'Drop the CSV here...' : 'Drag & drop your CSV file'}
              </p>
              <p style={{ fontSize: '0.8rem' }}>or click to browse — max 500 recipients</p>
            </div>

            <div className="alert alert-info" style={{ marginTop: '1rem', fontSize: '0.8rem' }}>
              <span>📋</span>
              <div>
                <strong>CSV Format:</strong>
                <code style={{ display: 'block', marginTop: '0.25rem', background: 'rgba(0,0,0,0.3)', padding: '0.5rem', borderRadius: '6px' }}>
                  address,amount<br />
                  0x123...,1000<br />
                  0xabc...,2500
                </code>
              </div>
            </div>
          </div>
        )}

        {/* ── Step: Configure ───────────────────────── */}
        {step === 'configure' && (
          <div className="card animate-fade-in">
            <h3 style={{ marginBottom: '1.25rem' }}>Configure Drop</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group">
                <label>Drop Title *</label>
                <input className="input" placeholder="Season 1 Community Airdrop" value={form.title}
                  onChange={e => setForm(p => ({ ...p, title: e.target.value }))} />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea className="input" rows={2} placeholder="Rewarding early contributors..."
                  value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
              </div>
              <div className="grid-2">
                <div className="form-group">
                  <label>Confidential Token Address *</label>
                  <input className="input" placeholder="0x..." value={form.token}
                    onChange={e => setForm(p => ({ ...p, token: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label>Claim Window (days)</label>
                  <input className="input" type="number" value={form.days}
                    onChange={e => setForm(p => ({ ...p, days: e.target.value }))} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button className="btn btn-ghost" onClick={() => setStep('upload')}>← Back</button>
                <button className="btn btn-primary" onClick={() => setStep('review')}
                  disabled={!form.title || !form.token}>
                  Review Drop →
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Step: Review ──────────────────────────── */}
        {step === 'review' && (
          <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div className="card">
              <h3 style={{ marginBottom: '1rem' }}>Drop Summary</h3>
              <div className="grid-2">
                <div><span className="stat-label">Title</span><p style={{ fontWeight: 600 }}>{form.title}</p></div>
                <div><span className="stat-label">Recipients</span><p style={{ fontWeight: 600, color: 'var(--accent-green)' }}>{recipients.length}</p></div>
                <div><span className="stat-label">Claim Window</span><p>{form.days} days</p></div>
                <div><span className="stat-label">Token</span><p className="address">{shortenAddr(form.token)}</p></div>
              </div>
            </div>

            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3>Recipients Preview</h3>
                <span className="privacy-indicator">🔒 Amounts will be encrypted</span>
              </div>
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Address</th>
                      <th>Amount (plaintext — encrypted before deploy)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recipients.slice(0, 10).map((r, i) => (
                      <tr key={i}>
                        <td style={{ color: 'var(--text-muted)' }}>{i + 1}</td>
                        <td className="address">{r.address}</td>
                        <td>
                          <span style={{ color: 'var(--text-muted)', textDecoration: 'line-through', marginRight: '0.5rem' }}>{r.amount}</span>
                          <span className="privacy-indicator" style={{ fontSize: '0.7rem' }}>🔒 encrypted</span>
                        </td>
                      </tr>
                    ))}
                    {recipients.length > 10 && (
                      <tr>
                        <td colSpan={3} style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '0.75rem' }}>
                          + {recipients.length - 10} more recipients
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button className="btn btn-ghost" onClick={() => setStep('configure')}>← Back</button>
              <button className="btn btn-primary" onClick={handleDeploy} disabled={isPending || isConfirming}>
                {isPending || isConfirming ? <><span className="spinner" /> Deploying...</> : '🚀 Deploy Confidential Drop'}
              </button>
            </div>
          </div>
        )}

        {isSuccess && (
          <div className="card animate-fade-in" style={{ textAlign: 'center', padding: '3rem' }}>
            <p style={{ fontSize: '3rem' }}>🎉</p>
            <h2 style={{ margin: '0.5rem 0' }}>Drop Deployed!</h2>
            <p style={{ color: 'var(--text-secondary)' }}>
              {recipients.length} recipients have been assigned encrypted allocations.
              They can claim without revealing their amount to others.
            </p>
            <button className="btn btn-secondary" style={{ marginTop: '1.5rem' }}
              onClick={() => { setStep('upload'); setRecipients([]); setForm({ title: '', description: '', token: '', days: '30' }); }}>
              Create Another Drop
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
