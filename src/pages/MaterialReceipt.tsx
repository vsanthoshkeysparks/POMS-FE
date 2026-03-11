import { useState, useEffect, useCallback } from 'react';
import { Package, CheckCircle, AlertCircle, Truck, ShieldCheck } from 'lucide-react';
import {
  getPendingReceipts, receiveGoods, getVerificationPendingPOs, submitFinalApproval
} from '../api/apiClient';
import type { ReceiptItem, VerificationItem } from '../api/apiClient';

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-GB').replace(/\//g, '-');
}

function formatCurrency(v: number) {
  return v.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

interface ReceiveModal { item: ReceiptItem; }
interface VerifyModal { item: VerificationItem; }
interface Toast { message: string; type: 'success' | 'error'; }

export default function MaterialReceipt() {
  const [items, setItems] = useState<ReceiptItem[]>([]);
  const [verifyItems, setVerifyItems] = useState<VerificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<ReceiveModal | null>(null);
  const [verifyModal, setVerifyModal] = useState<VerifyModal | null>(null);
  const [receivedBy, setReceivedBy] = useState('');
  const [receiptNotes, setReceiptNotes] = useState('');
  const [verifiedBy, setVerifiedBy] = useState('');
  const [verifyNotes, setVerifyNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [receipts, verifications] = await Promise.all([
        getPendingReceipts(),
        getVerificationPendingPOs()
      ]);
      setItems(receipts);
      setVerifyItems(verifications);
    } catch { } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const showToast = (message: string, type: Toast['type']) => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const handleReceive = async () => {
    if (!modal) return;
    try {
      setSubmitting(true);
      await receiveGoods(modal.item.id, receivedBy, receiptNotes);
      showToast(`Goods received for ${modal.item.poNumber}. Pending final verification.`, 'success');
      setModal(null);
      setReceivedBy('');
      setReceiptNotes('');
      load();
    } catch (e: any) {
      showToast(e.message, 'error');
    } finally { setSubmitting(false); }
  };

  const handleFinalApproval = async () => {
    if (!verifyModal) return;
    try {
      setSubmitting(true);
      await submitFinalApproval(verifyModal.item.id, verifiedBy, verifyNotes);
      showToast(`Final approval granted for ${verifyModal.item.poNumber}. Ready for payment.`, 'success');
      setVerifyModal(null);
      setVerifiedBy('');
      setVerifyNotes('');
      load();
    } catch (e: any) {
      showToast(e.message, 'error');
    } finally { setSubmitting(false); }
  };

  // Status badge helper — map status string to a style class
  function statusBadge(status: string) {
    const s = status.toLowerCase();
    if (s.includes('transit')) return 'badge-blue';
    if (s.includes('pickup') || s.includes('ready')) return 'badge-green';
    if (s.includes('dispatched')) return 'badge-violet';
    return 'badge-slate';
  }

  return (
    <div>
      <div className="page-body">
        {/* Page Title */}
        <div className="page-title-row">
          <h1>Material Receipts</h1>
        </div>

        {/* Stats — single card */}
        <div className="stats-row">
          <div className="stat-card" style={{ maxWidth: 280 }}>
            <div className="stat-icon violet">
              <Truck size={20} />
            </div>
            <div className="stat-content">
              <div className="stat-label">Pending Deliveries</div>
              <div className="stat-value">{items.length + verifyItems.length}</div>
            </div>
          </div>
        </div>

        {/* Incoming Purchase Orders table */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">Incoming Purchase Orders</span>
          </div>

          {loading ? (
            <div className="loading-spinner"><div className="spinner" /> Loading...</div>
          ) : items.length === 0 && verifyItems.length === 0 ? (
            <div className="empty-state">
              <Package size={40} />
              <h3>No pending receipts</h3>
              <p>Dispatched purchase orders will appear here.</p>
            </div>
          ) : (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>PO Number</th>
                    <th>Expected Date</th>
                    <th>Vendor</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {/* Dispatched items — Receive Goods */}
                  {items.map(item => (
                    <tr key={item.id}>
                      <td><span style={{ fontWeight: 600, color: 'var(--color-primary)' }}>{item.poNumber}</span></td>
                      <td className="text-secondary">{formatDate(item.expectedDate)}</td>
                      <td>{item.vendorName}</td>
                      <td>
                        <span className={`badge ${statusBadge(item.status)}`}>
                          {item.status}
                        </span>
                      </td>
                      <td>
                        <button
                          className="btn btn-success btn-sm"
                          onClick={() => setModal({ item })}
                        >
                          <CheckCircle size={13} /> Receive Goods
                        </button>
                      </td>
                    </tr>
                  ))}
                  {/* Verification-pending items — Final Approve */}
                  {verifyItems.map(item => (
                    <tr key={item.id}>
                      <td><span style={{ fontWeight: 600, color: 'var(--color-primary)' }}>{item.poNumber}</span></td>
                      <td className="text-secondary">{item.receivedDate ? formatDate(item.receivedDate) : '—'}</td>
                      <td>{item.vendorName}</td>
                      <td>
                        <span className="badge badge-emerald">
                          <CheckCircle size={10} /> Received
                        </span>
                      </td>
                      <td>
                        <button
                          className="btn btn-success btn-sm"
                          onClick={() => setVerifyModal({ item })}
                        >
                          <ShieldCheck size={13} /> Final Approve
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Receive Goods Modal */}
      {modal && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-title">
              <Package size={18} color="var(--color-success)" />
              Receive Goods — {modal.item.poNumber}
            </div>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>
              Vendor: <strong>{modal.item.vendorName}</strong> — {formatCurrency(modal.item.totalAmount)}
            </p>
            <div className="form-group">
              <label className="form-label">Received By</label>
              <input
                className="form-control"
                placeholder="Your name..."
                value={receivedBy}
                onChange={e => setReceivedBy(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Notes</label>
              <textarea
                className="form-control"
                rows={3}
                placeholder="Condition of goods, discrepancies..."
                value={receiptNotes}
                onChange={e => setReceiptNotes(e.target.value)}
              />
            </div>
            <div className="modal-actions">
              <button className="btn btn-outline" onClick={() => setModal(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleReceive} disabled={submitting}>
                {submitting ? 'Processing...' : '✓ Confirm Receipt'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Final Approval Modal */}
      {verifyModal && (
        <div className="modal-overlay" onClick={() => setVerifyModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-title">
              <ShieldCheck size={18} color="var(--color-primary)" />
              Final Approval — {verifyModal.item.poNumber}
            </div>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>
              Vendor: <strong>{verifyModal.item.vendorName}</strong> — {formatCurrency(verifyModal.item.totalAmount)}
            </p>
            <div className="form-group">
              <label className="form-label">Verified By</label>
              <input
                className="form-control"
                placeholder="Verifier name..."
                value={verifiedBy}
                onChange={e => setVerifiedBy(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Verification Notes</label>
              <textarea
                className="form-control"
                rows={3}
                placeholder="Verification comments..."
                value={verifyNotes}
                onChange={e => setVerifyNotes(e.target.value)}
              />
            </div>
            <div className="modal-actions">
              <button className="btn btn-outline" onClick={() => setVerifyModal(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleFinalApproval} disabled={submitting}>
                {submitting ? 'Processing...' : '✓ Grant Final Approval'}
              </button>
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
