import { useState, useEffect, useCallback } from 'react';
import { Truck, Send, CheckCircle, AlertCircle, Package } from 'lucide-react';
import {
  getApprovedPOs, getSentToVendorPOs, sendToVendor, markMaterialDispatched
} from '../api/apiClient';
import type { VendorDispatchItem } from '../api/apiClient';

function formatCurrency(v: number) {
  return v.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-GB').replace(/\//g, '-');
}

interface Toast { message: string; type: 'success' | 'error'; }

export default function VendorDispatch() {
  const [approvedPOs, setApprovedPOs] = useState<VendorDispatchItem[]>([]);
  const [sentPOs, setSentPOs] = useState<VendorDispatchItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState<number | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [approved, sent] = await Promise.all([getApprovedPOs(), getSentToVendorPOs()]);
      setApprovedPOs(approved);
      setSentPOs(sent);
    } catch { } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const showToast = (message: string, type: Toast['type']) => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const handleSendToVendor = async (item: VendorDispatchItem) => {
    try {
      setSubmitting(item.id);
      await sendToVendor(item.id);
      showToast(`PO ${item.poNumber} sent to vendor.`, 'success');
      load();
    } catch (e: any) {
      showToast(e.message, 'error');
    } finally { setSubmitting(null); }
  };

  const handleMarkDispatched = async (item: VendorDispatchItem) => {
    try {
      setSubmitting(item.id);
      await markMaterialDispatched(item.id);
      showToast(`Material dispatched for ${item.poNumber}.`, 'success');
      load();
    } catch (e: any) {
      showToast(e.message, 'error');
    } finally { setSubmitting(null); }
  };

  const totalValue = [...approvedPOs, ...sentPOs].reduce((a, i) => a + i.totalAmount, 0);

  return (
    <div>
      <div className="page-body">
        {/* Page Title Row */}
        <div className="page-title-row">
          <h1>Vendor Dispatch</h1>
          <div className="title-actions">
            <button className="btn btn-outline" onClick={load}>Refresh</button>
          </div>
        </div>

        {/* Stats */}
        <div className="stats-row">
          <div className="stat-card">
            <div className="stat-icon blue">
              <Send size={20} />
            </div>
            <div className="stat-content">
              <div className="stat-label">Ready to Send</div>
              <div className="stat-value">{approvedPOs.length}</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon amber">
              <Truck size={20} />
            </div>
            <div className="stat-content">
              <div className="stat-label">Awaiting Dispatch</div>
              <div className="stat-value">{sentPOs.length}</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon emerald">
              <Package size={20} />
            </div>
            <div className="stat-content">
              <div className="stat-label">Total In-Flight Value</div>
              <div className="stat-value" style={{ fontSize: 18 }}>{formatCurrency(totalValue)}</div>
            </div>
          </div>
        </div>

        {/* Panel 1: Approved → Send to Vendor */}
        <div className="card mb-6">
          <div className="card-header">
            <span className="card-title">
              <Send size={15} />
              Approved POs — Ready to Send to Vendor
            </span>
            <span className="badge badge-emerald">{approvedPOs.length} pending</span>
          </div>

          {loading ? (
            <div className="loading-spinner"><div className="spinner" /> Loading...</div>
          ) : approvedPOs.length === 0 ? (
            <div className="empty-state">
              <Send size={36} />
              <h3>No approved POs to send</h3>
              <p>Approved purchase orders will appear here.</p>
            </div>
          ) : (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>PO Number</th>
                    <th>Vendor</th>
                    <th>Type</th>
                    <th>Date</th>
                    <th>Amount</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {approvedPOs.map(item => (
                    <tr key={item.id}>
                      <td><span style={{ fontWeight: 600, color: 'var(--color-primary)' }}>{item.poNumber}</span></td>
                      <td>{item.vendorName}</td>
                      <td><span className="badge badge-slate">{item.purchaseType}</span></td>
                      <td className="text-secondary">{formatDate(item.poDate)}</td>
                      <td className="font-semibold">{formatCurrency(item.totalAmount)}</td>
                      <td>
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => handleSendToVendor(item)}
                          disabled={submitting === item.id}
                        >
                          <Send size={13} />
                          {submitting === item.id ? 'Sending...' : 'Send to Vendor'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Panel 2: SentToVendor → Mark Dispatched */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">
              <Truck size={15} />
              Sent POs — Awaiting Vendor Dispatch
            </span>
            <span className="badge badge-amber">{sentPOs.length} pending</span>
          </div>

          {loading ? (
            <div className="loading-spinner"><div className="spinner" /> Loading...</div>
          ) : sentPOs.length === 0 ? (
            <div className="empty-state">
              <Truck size={36} />
              <h3>No POs awaiting dispatch</h3>
              <p>POs sent to vendors will appear here once vendor confirms dispatch.</p>
            </div>
          ) : (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>PO Number</th>
                    <th>Vendor</th>
                    <th>Type</th>
                    <th>Date</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {sentPOs.map(item => (
                    <tr key={item.id}>
                      <td><span style={{ fontWeight: 600, color: 'var(--color-primary)' }}>{item.poNumber}</span></td>
                      <td>{item.vendorName}</td>
                      <td><span className="badge badge-slate">{item.purchaseType}</span></td>
                      <td className="text-secondary">{formatDate(item.poDate)}</td>
                      <td className="font-semibold">{formatCurrency(item.totalAmount)}</td>
                      <td><span className="badge badge-blue"><Truck size={10} /> Sent to Vendor</span></td>
                      <td>
                        <button
                          className="btn btn-success btn-sm"
                          onClick={() => handleMarkDispatched(item)}
                          disabled={submitting === item.id}
                        >
                          <CheckCircle size={13} />
                          {submitting === item.id ? 'Updating...' : 'Mark Dispatched'}
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
