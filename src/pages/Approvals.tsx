import { useState, useEffect, useCallback } from 'react';
import {
  Check, X, AlertCircle, CheckCircle, Info, Clock
} from 'lucide-react';
import {
  getPendingApprovals, getApprovalStats, submitApprovalAction, getPurchaseOrder
} from '../api/apiClient';
import type { ApprovalQueueItem, ApprovalStats, PurchaseOrder } from '../api/apiClient';

function formatCurrency(v: number) {
  return v.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-GB').replace(/\//g, '-');
}

interface ActionModal {
  item: ApprovalQueueItem;
  action: 'Approved' | 'Rejected';
}

interface DetailModal { po: PurchaseOrder; }
interface Toast { message: string; type: 'success' | 'error' | 'info'; }

export default function Approvals() {
  const [items, setItems] = useState<ApprovalQueueItem[]>([]);
  const [stats, setStats] = useState<ApprovalStats>({ pendingCount: 0, urgentCount: 0 });
  const [loading, setLoading] = useState(true);
  const [actionModal, setActionModal] = useState<ActionModal | null>(null);
  const [detailModal, setDetailModal] = useState<DetailModal | null>(null);
  const [approverName, setApproverName] = useState('');
  const [comments, setComments] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [q, s] = await Promise.all([getPendingApprovals(), getApprovalStats()]);
      setItems(q);
      setStats(s);
    } catch { } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const showToast = (message: string, type: Toast['type'] = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const handleView = async (item: ApprovalQueueItem) => {
    try {
      const po = await getPurchaseOrder(item.id);
      setDetailModal({ po });
    } catch (e: any) { showToast(e.message, 'error'); }
  };

  const handleAction = async () => {
    if (!actionModal) return;
    try {
      setSubmitting(true);
      const res: any = await submitApprovalAction(
        actionModal.item.id,
        actionModal.action,
        approverName,
        comments
      );
      showToast(res.message || `PO ${actionModal.action.toLowerCase()} successfully.`, 'success');
      setActionModal(null);
      setApproverName('');
      setComments('');
      load();
    } catch (e: any) {
      showToast(e.message, 'error');
    } finally { setSubmitting(false); }
  };

  return (
    <div>
      <div className="page-body">
        {/* Page Title */}
        <div className="page-title-row">
          <h1>Pending Approvals</h1>
        </div>

        {/* Stats */}
        <div className="stats-row">
          <div className="stat-card">
            <div className="stat-icon blue">
              <Clock size={20} />
            </div>
            <div className="stat-content">
              <div className="stat-label">Pending Approvals</div>
              <div className="stat-value">{stats.pendingCount}</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon amber">
              <AlertCircle size={20} />
            </div>
            <div className="stat-content">
              <div className="stat-label">Urgent Requests</div>
              <div className="stat-value">{stats.urgentCount}</div>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">Purchase Orders Requiring Your Approval</span>
          </div>
          {loading ? (
            <div className="loading-spinner"><div className="spinner" /> Loading...</div>
          ) : items.length === 0 ? (
            <div className="empty-state">
              <CheckCircle size={40} />
              <h3>No pending approvals</h3>
              <p>All purchase orders are up to date.</p>
            </div>
          ) : (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>PO Number</th>
                    <th>Date</th>
                    <th>Amount</th>
                    <th>Routing</th>
                    <th style={{ textAlign: 'center' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map(item => (
                    <tr key={item.id}>
                      <td>
                        <span
                          style={{ color: 'var(--color-primary)', fontWeight: 600, cursor: 'pointer' }}
                          onClick={() => handleView(item)}
                        >
                          {item.poNumber}
                        </span>
                      </td>
                      <td className="text-secondary">{formatDate(item.poDate)}</td>
                      <td className="font-semibold">{formatCurrency(item.totalAmount)}</td>
                      <td>
                        <span className={`badge ${item.requiredApprovalLevels === 1 ? 'badge-emerald' : 'badge-amber'}`}>
                          {item.requiredApprovalLevels === 1 ? '1-Level' : '2-Level'}
                        </span>
                      </td>
                      <td>
                        <div className="flex items-center gap-2" style={{ justifyContent: 'center' }}>
                          <button className="btn-icon" title="View" onClick={() => handleView(item)}>
                            {/* Eye icon */}
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                            </svg>
                          </button>
                          <button
                            className="btn-icon approve"
                            title="Approve"
                            onClick={() => setActionModal({ item, action: 'Approved' })}
                          >
                            <Check size={15} />
                          </button>
                          <button
                            className="btn-icon reject"
                            title="Reject"
                            onClick={() => setActionModal({ item, action: 'Rejected' })}
                          >
                            <X size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Action Modal */}
      {actionModal && (
        <div className="modal-overlay" onClick={() => setActionModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-title">
              {actionModal.action === 'Approved' ? (
                <CheckCircle size={18} color="var(--color-success)" />
              ) : (
                <X size={18} color="var(--color-danger)" />
              )}
              {actionModal.action === 'Approved' ? 'Approve' : 'Reject'} Purchase Order
            </div>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>
              <strong>{actionModal.item.poNumber}</strong> — {formatCurrency(actionModal.item.totalAmount)}
              {actionModal.item.requiredApprovalLevels === 2 && actionModal.item.currentApprovalLevel === 0 && (
                <span style={{ display: 'block', marginTop: 4, color: 'var(--color-warning)' }}>
                  ⚠ This is a 2-level approval. Approving will advance to Level 2 (Director).
                </span>
              )}
            </p>
            <div className="form-group">
              <label className="form-label">Your Name</label>
              <input
                className="form-control"
                placeholder="e.g. John Smith"
                value={approverName}
                onChange={e => setApproverName(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Comments</label>
              <textarea
                className="form-control"
                rows={3}
                placeholder="Optional comments..."
                value={comments}
                onChange={e => setComments(e.target.value)}
              />
            </div>
            <div className="modal-actions">
              <button className="btn btn-outline" onClick={() => setActionModal(null)}>Cancel</button>
              <button
                className={`btn ${actionModal.action === 'Approved' ? 'btn-primary' : 'btn-danger'}`}
                onClick={handleAction}
                disabled={submitting}
              >
                {submitting ? 'Processing...' : actionModal.action === 'Approved' ? 'Confirm Approve' : 'Confirm Reject'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {detailModal && (
        <div className="modal-overlay" onClick={() => setDetailModal(null)}>
          <div className="modal" style={{ maxWidth: 600 }} onClick={e => e.stopPropagation()}>
            <div className="modal-title"><Info size={18} /> PO Details — {detailModal.po.poNumber}</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
              {[
                ['Vendor', detailModal.po.vendorName],
                ['Type', detailModal.po.purchaseType],
                ['Date', formatDate(detailModal.po.poDate)],
                ['Status', detailModal.po.status],
                ['Total Amount', formatCurrency(detailModal.po.totalAmount)],
                ['Approval', detailModal.po.requiredApprovalLevels === 1 ? '1-Level' : '2-Level'],
              ].map(([k, v]) => (
                <div key={k}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{k}</div>
                  <div style={{ fontWeight: 600, marginTop: 2 }}>{v}</div>
                </div>
              ))}
            </div>
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 8 }}>Line Items</div>
              <table style={{ width: '100%', fontSize: 12 }}>
                <thead><tr style={{ background: 'var(--bg-table-header)' }}><th>Description</th><th>Qty</th><th>Unit Price</th><th>Amount</th></tr></thead>
                <tbody>
                  {detailModal.po.lineItems.map(li => (
                    <tr key={li.id}>
                      <td>{li.description}</td>
                      <td>{li.quantity}</td>
                      <td>{formatCurrency(li.unitPrice)}</td>
                      <td>{formatCurrency(li.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="modal-actions">
              <button className="btn btn-outline" onClick={() => setDetailModal(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className={`toast ${toast.type}`}>
          {toast.type === 'success' && <CheckCircle size={16} color="var(--color-success)" />}
          {toast.type === 'error' && <AlertCircle size={16} color="var(--color-danger)" />}
          {toast.message}
        </div>
      )}
    </div>
  );
}
