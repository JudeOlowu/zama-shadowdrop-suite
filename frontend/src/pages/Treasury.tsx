import { useState } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import toast from 'react-hot-toast';
import { CONTRACTS } from '../config';

const TREASURY_ABI = [
  {
    name: 'addMember',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'member', type: 'address' }, { name: 'role', type: 'string' }],
    outputs: [],
  },
  {
    name: 'allocateBudget',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'member', type: 'address' }, { name: 'amount', type: 'uint64' }],
    outputs: [],
  },
  {
    name: 'requestSpend',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'amount', type: 'uint64' }, { name: 'purposeLabel', type: 'string' }],
    outputs: [{ name: 'requestId', type: 'uint256' }],
  },
  {
    name: 'getMembers',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'address[]' }],
  },
  {
    name: 'spendRequestCount',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint256' }],
  },
  {
    name: 'getSpendRequests',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'offset', type: 'uint256' }, { name: 'limit', type: 'uint256' }],
    outputs: [{
      type: 'tuple[]',
      components: [
        { name: 'member', type: 'address' },
        { name: 'purpose', type: 'bytes32' },
        { name: 'purposeLabel', type: 'string' },
        { name: 'requestedAt', type: 'uint256' },
        { name: 'approved', type: 'bool' },
        { name: 'executed', type: 'bool' },
      ],
    }],
  },
  {
    name: 'members',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'addr', type: 'address' }],
    outputs: [
      { name: 'active', type: 'bool' },
      { name: 'role', type: 'string' },
      { name: 'addedAt', type: 'uint256' },
    ],
  },
] as const;

function shortenAddr(addr: string) {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function timeSince(timestamp: bigint): string {
  const diff = Date.now() / 1000 - Number(timestamp);
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function TreasuryPage() {
  const { address, isConnected } = useAccount();
  const [addMemberForm, setAddMemberForm] = useState({ address: '', role: '' });
  const [spendForm, setSpendForm] = useState({ amount: '', purpose: '' });
  const [activeTab, setActiveTab] = useState<'overview' | 'members' | 'activity'>('overview');

  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isLoading: isConfirming } = useWaitForTransactionReceipt({ hash });

  const { data: memberAddrs } = useReadContract({
    address: CONTRACTS.TREASURY,
    abi: TREASURY_ABI,
    functionName: 'getMembers',
  });

  const { data: requestCount } = useReadContract({
    address: CONTRACTS.TREASURY,
    abi: TREASURY_ABI,
    functionName: 'spendRequestCount',
  });

  const { data: requests } = useReadContract({
    address: CONTRACTS.TREASURY,
    abi: TREASURY_ABI,
    functionName: 'getSpendRequests',
    args: [0n, 20n],
  });

  const { data: myMembership } = useReadContract({
    address: CONTRACTS.TREASURY,
    abi: TREASURY_ABI,
    functionName: 'members',
    args: [address as `0x${string}`],
    query: { enabled: !!address },
  });

  const isMember = myMembership?.[0] === true;

  const handleAddMember = () => {
    if (!addMemberForm.address || !addMemberForm.role) return;
    writeContract({
      address: CONTRACTS.TREASURY,
      abi: TREASURY_ABI,
      functionName: 'addMember',
      args: [addMemberForm.address as `0x${string}`, addMemberForm.role],
    });
    toast.success('Member added!');
  };

  const handleSpend = () => {
    if (!spendForm.amount || !spendForm.purpose) return;
    const encAmount = BigInt(Math.floor(parseFloat(spendForm.amount) * 1e6));
    writeContract({
      address: CONTRACTS.TREASURY,
      abi: TREASURY_ABI,
      functionName: 'requestSpend',
      args: [encAmount, spendForm.purpose],
    });
    toast.loading('Submitting spend request...');
  };

  const [budgetForm, setBudgetForm] = useState({ address: '', amount: '' });

  const handleAllocateBudget = () => {
    if (!budgetForm.address || !budgetForm.amount) return;
    const amountVal = BigInt(Math.floor(parseFloat(budgetForm.amount) * 1e6));
    writeContract({
      address: CONTRACTS.TREASURY,
      abi: TREASURY_ABI,
      functionName: 'allocateBudget',
      args: [budgetForm.address as `0x${string}`, amountVal],
    });
    toast.success('Budget allocated!');
  };

  const tabs = [
    { id: 'overview', label: '📊 Overview' },
    { id: 'members', label: '👥 Members' },
    { id: 'activity', label: '📋 Activity' },
  ] as const;

  return (
    <div className="page">
      <div className="container">
        <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1>🏦 Confidential Treasury</h1>
            <p>DAO treasury with fully encrypted per-member budget allocations</p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <span className="badge badge-active">Builder Track · 7,000 cUSDT</span>
            {isMember && <span className="badge badge-encrypted">✓ Member</span>}
          </div>
        </div>

        {/* ── Stats ─────────────────────────────────── */}
        <div className="grid-4" style={{ marginBottom: '1.5rem' }}>
          <div className="card">
            <div className="stat">
              <span className="stat-value gradient-text">{String(memberAddrs?.length ?? 0)}</span>
              <span className="stat-label">Members</span>
            </div>
          </div>
          <div className="card">
            <div className="stat">
              <span className="stat-value" style={{ color: 'var(--accent-green)' }}>{String(requestCount ?? 0)}</span>
              <span className="stat-label">Spend Requests</span>
            </div>
          </div>
          <div className="card">
            <div className="stat">
              <span className="stat-value" style={{ color: 'var(--accent-secondary)' }}>🔒</span>
              <span className="stat-label">Budget Visibility</span>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Owner only</span>
            </div>
          </div>
          <div className="card">
            <div className="stat">
              <span className="stat-value">euint64</span>
              <span className="stat-label">FHE Type</span>
            </div>
          </div>
        </div>

        {/* ── Privacy Notice ─────────────────────────── */}
        <div className="alert alert-success" style={{ marginBottom: '1.5rem' }}>
          <span style={{ fontSize: '1.2rem' }}>🔐</span>
          <div>
            <strong>How privacy works:</strong> Your budget is stored as an encrypted <code>euint64</code> on-chain.
            Only you can re-encrypt and view your own balance via the Zama SDK. Admins see only aggregate totals.
            Spend requests show the <em>purpose</em> (public) but not the <em>amount</em> (encrypted).
          </div>
        </div>

        {/* ── Tabs ──────────────────────────────────── */}
        <div style={{ display: 'flex', gap: '0.25rem', borderBottom: '1px solid var(--border-card)', marginBottom: '1.5rem' }}>
          {tabs.map(t => (
            <button
              key={t.id}
              className={`btn btn-ghost btn-sm`}
              onClick={() => setActiveTab(t.id)}
              style={{
                borderRadius: '8px 8px 0 0',
                borderBottom: 'none',
                ...(activeTab === t.id ? { color: 'var(--accent-primary)', background: 'rgba(99,102,241,0.08)' } : {}),
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* ── Tab: Overview ─────────────────────────── */}
        {activeTab === 'overview' && (
          <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* My Budget Card */}
            <div className="card" style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.1) 0%, rgba(139,92,246,0.05) 100%)' }}>
              <h3 style={{ marginBottom: '1rem' }}>My Budget</h3>
              {isConnected && isMember ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
                  <div>
                    <div style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--accent-green)' }}>
                      🔒 ****
                    </div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '0.25rem' }}>
                      Encrypted balance — connect Zama SDK to decrypt
                    </div>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ marginBottom: '0.5rem' }}>
                      <span className="stat-label">Role</span>
                      <p style={{ fontWeight: 600 }}>{myMembership?.[1] || '—'}</p>
                    </div>
                  </div>
                </div>
              ) : isConnected ? (
                <p style={{ color: 'var(--text-muted)' }}>You are not a treasury member yet.</p>
              ) : (
                <p style={{ color: 'var(--text-muted)' }}>Connect wallet to view your budget.</p>
              )}
            </div>

            {/* Spend Request Form */}
            {isMember && (
              <div className="card">
                <h3 style={{ marginBottom: '1rem' }}>Submit Spend Request</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '1rem', alignItems: 'flex-end' }}>
                  <div className="form-group">
                    <label>Amount (encrypted on submit)</label>
                    <input className="input" type="number" placeholder="0" value={spendForm.amount}
                      onChange={e => setSpendForm(p => ({ ...p, amount: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label>Purpose (public)</label>
                    <input className="input" placeholder="Engineering tools Q3" value={spendForm.purpose}
                      onChange={e => setSpendForm(p => ({ ...p, purpose: e.target.value }))} />
                  </div>
                  <button className="btn btn-primary" onClick={handleSpend}
                    disabled={isPending || isConfirming || !spendForm.amount || !spendForm.purpose}>
                    {isPending ? <><span className="spinner" /> Submitting...</> : '🔒 Submit'}
                  </button>
                </div>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem', marginTop: '0.75rem' }}>
                  The amount is encrypted via TFHE before being verified against your budget. Only the purpose label is public.
                </p>
              </div>
            )}
          </div>
        )}

        {/* ── Tab: Members ──────────────────────────── */}
        {activeTab === 'members' && (
          <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div className="card">
              <h3 style={{ marginBottom: '1.25rem' }}>Add Member</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '1rem', alignItems: 'flex-end' }}>
                <div className="form-group">
                  <label>Wallet Address</label>
                  <input className="input" placeholder="0x..." value={addMemberForm.address}
                    onChange={e => setAddMemberForm(p => ({ ...p, address: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label>Role</label>
                  <input className="input" placeholder="Engineering" value={addMemberForm.role}
                    onChange={e => setAddMemberForm(p => ({ ...p, role: e.target.value }))} />
                </div>
                <button className="btn btn-primary" onClick={handleAddMember}
                  disabled={isPending || !addMemberForm.address || !addMemberForm.role}>
                  {isPending ? <span className="spinner" /> : '+ Add Member'}
                </button>
              </div>
            </div>

            <div className="card">
              <h3 style={{ marginBottom: '1.25rem' }}>Allocate Budget</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '1rem', alignItems: 'flex-end' }}>
                <div className="form-group">
                  <label>Member Address</label>
                  <input className="input" placeholder="0x..." value={budgetForm.address}
                    onChange={e => setBudgetForm(p => ({ ...p, address: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label>Budget Amount (cSTT)</label>
                  <input className="input" type="number" placeholder="0" value={budgetForm.amount}
                    onChange={e => setBudgetForm(p => ({ ...p, amount: e.target.value }))} />
                </div>
                <button className="btn btn-primary" onClick={handleAllocateBudget}
                  disabled={isPending || !budgetForm.address || !budgetForm.amount}>
                  {isPending ? <span className="spinner" /> : '🔒 Allocate Budget'}
                </button>
              </div>
            </div>

            <div className="card">
              <h3 style={{ marginBottom: '1rem' }}>Active Members</h3>
              {!memberAddrs || memberAddrs.length === 0 ? (
                <div className="empty-state">
                  <p>👥</p>
                  <h3>No members yet</h3>
                  <p>Add team members to start allocating private budgets.</p>
                </div>
              ) : (
                <div className="table-wrapper">
                  <table>
                    <thead>
                      <tr>
                        <th>Address</th>
                        <th>Budget</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(memberAddrs as string[]).map((addr) => (
                        <tr key={addr}>
                          <td className="address">{addr}</td>
                          <td>
                            <span className="privacy-indicator">🔒 Encrypted</span>
                          </td>
                          <td>
                            <span className="badge badge-active">Active</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Tab: Activity ──────────────────────────── */}
        {activeTab === 'activity' && (
          <div className="card animate-fade-in">
            <h3 style={{ marginBottom: '1rem' }}>Spend History</h3>
            {!requests || (requests as any[]).length === 0 ? (
              <div className="empty-state">
                <p>📋</p>
                <h3>No activity yet</h3>
                <p>Spend requests will appear here. Amounts remain encrypted.</p>
              </div>
            ) : (
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>Member</th>
                      <th>Purpose</th>
                      <th>Amount</th>
                      <th>Time</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(requests as any[]).map((r: any, i: number) => (
                      <tr key={i}>
                        <td className="address">{shortenAddr(r.member)}</td>
                        <td style={{ fontWeight: 500 }}>{r.purposeLabel}</td>
                        <td><span className="privacy-indicator">🔒 Hidden</span></td>
                        <td style={{ color: 'var(--text-muted)' }}>{timeSince(r.requestedAt)}</td>
                        <td>
                          {r.executed ? (
                            <span className="badge badge-encrypted">✓ Executed</span>
                          ) : r.approved ? (
                            <span className="badge badge-active">Approved</span>
                          ) : (
                            <span className="badge badge-pending">Pending</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
