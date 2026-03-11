import { useState, useEffect, useCallback } from 'react';
import { CreditCard, DollarSign, CheckCircle, AlertCircle } from 'lucide-react';
import { getPendingPayments, processPayment } from '../api/apiClient';
import type { PaymentItem } from '../api/apiClient';

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-GB').replace(/\//g, '-');
}

function formatCurrency(v: number) {
  return v.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

const PAYMENT_METHODS = ['Bank Transfer', 'Check', 'ACH', 'Wire Transfer', 'Credit Card'];

interface PayModal { item: PaymentItem; }
interface Toast { message: string; type: 'success' | 'error'; }

export default function Payment() {
  const [items, setItems] = useState<PaymentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<PayModal | null>(null);
  const [paidBy, setPaidBy] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [payNotes, setPayNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try { setItems(await getPendingPayments()); } catch { } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const showToast = (message: string, type: Toast['type']) => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const handlePay = async () => {
    if (!modal) return;
    try {
      setSubmitting(true);
      await processPayment(modal.item.id, paidBy, paymentMethod, payNotes);
      showToast(`Payment processed for ${modal.item.poNumber}. PO is now Completed.`, 'success');
      setModal(null);
      setPaidBy('');
      setPaymentMethod('');
      setPayNotes('');
      load();
    } catch (e: any) {
      showToast(e.message, 'error');
    } finally { setSubmitting(false); }
  };

  const totalDue = items.reduce((a, i) => a + i.totalAmount, 0);

  return (
    <div>
      <div className="page-body">
        {/* Page Title */}
        <div className="page-title-row">
          <h1>Process Payments</h1>
        </div>

        {/* Stats — single card */}
        <div className="stats-row">
          <div className="stat-card" style={{ maxWidth: 280 }}>
            <div className="stat-icon emerald">
              <DollarSign size={20} />
            </div>
            <div className="stat-content">
              <div className="stat-label">Total Outstanding</div>
              <div className="stat-value" style={{ fontSize: 22 }}>{formatCurrency(totalDue)}</div>
            </div>
          </div>
        </div>

        {/* Accounts Payable Table */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">Accounts Payable</span>
          </div>

          {loading ? (
            <div className="loading-spinner"><div className="spinner" /> Loading...</div>
          ) : items.length === 0 ? (
            <div className="empty-state">
              <CreditCard size={40} />
              <h3>No pending payments</h3>
              <p>Final approved POs ready for payment will appear here.</p>
            </div>
          ) : (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>PO Number</th>
                    <th>Due Date</th>
                    <th>Amount</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map(item => {
                    const dueDate = new Date(item.dueDate);
                    const isOverdue = dueDate < new Date();
                    return (
                      <tr key={item.id}>
                        <td><span style={{ fontWeight: 600, color: 'var(--color-primary)' }}>{item.poNumber}</span></td>
                        <td>
                          <span style={{ color: isOverdue ? 'var(--color-danger)' : 'var(--text-secondary)' }}>
                            {formatDate(item.dueDate)}
                            {isOverdue && <span style={{ marginLeft: 6, fontSize: 11, fontWeight: 700 }}>OVERDUE</span>}
                          </span>
                        </td>
                        <td className="font-semibold">{formatCurrency(item.totalAmount)}</td>
                        <td>
                          <button
                            className="btn btn-pay btn-sm"
                            onClick={() => setModal({ item })}
                          >
                            <CreditCard size={13} /> Pay Now
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Pay Modal */}
      {modal && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-title">
              <CreditCard size={18} color="var(--color-primary)" />
              Process Payment — {modal.item.poNumber}
            </div>
            <div className="summary-box" style={{ marginBottom: 16 }}>
              <div className="summary-row">
                <span>Vendor</span>
                <span className="font-semibold">{modal.item.vendorName}</span>
              </div>
              <div className="summary-row total">
                <span>Amount to Pay</span>
                <span>{formatCurrency(modal.item.totalAmount)}</span>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Paid By</label>
              <input
                className="form-control"
                placeholder="Your name..."
                value={paidBy}
                onChange={e => setPaidBy(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Payment Method</label>
              <select
                className="form-control"
                value={paymentMethod}
                onChange={e => setPaymentMethod(e.target.value)}
              >
                <option value="">Select method...</option>
                {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Notes</label>
              <textarea
                className="form-control"
                rows={2}
                placeholder="Optional payment notes..."
                value={payNotes}
                onChange={e => setPayNotes(e.target.value)}
              />
            </div>
            <div className="modal-actions">
              <button className="btn btn-outline" onClick={() => setModal(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={handlePay} disabled={submitting}>
                {submitting ? 'Processing...' : '💳 Confirm Payment'}
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
