import { useState, useEffect } from 'react';
import {
  ShoppingCart, Plus, Trash2, AlertCircle, CheckCircle, Info,
  RotateCcw, Save, Send, FileText
} from 'lucide-react';
import {
  getSuppliers, createPurchaseOrder, getRoutingInfo
} from '../api/apiClient';
import type { Supplier, RoutingInfo } from '../api/apiClient';

interface LineItemForm {
  id: string;
  description: string;
  quantity: number | '';
  unitPrice: number | '';
}

interface Toast { message: string; type: 'success' | 'error' | 'info'; }

const PURCHASE_TYPES = ['Equipment', 'Services', 'Software', 'Supplies', 'Maintenance', 'Construction', 'Direct Purchase'];

const ITEM_SUGGESTIONS = [
  "Laptop",
  "Mouse",
  "Keyboard",
  "Monitor",
  "Printer",
  "USB Cable",
  "HDMI Cable",
  "External Hard Drive",
  "Docking Station"
];

function AutocompleteInput({ value, onChange }: { value: string; onChange: (val: string) => void }) {
  const [isOpen, setIsOpen] = useState(false);

  const filtered = value
    ? ITEM_SUGGESTIONS.filter(s => s.toLowerCase().includes(value.toLowerCase()))
    : ITEM_SUGGESTIONS;

  return (
    <div style={{ position: 'relative' }}>
      <input
        className="form-control"
        placeholder="Enter item description..."
        value={value}
        onChange={e => {
          onChange(e.target.value);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        onBlur={() => setIsOpen(false)}
      />
      {isOpen && filtered.length > 0 && (
        <ul className="autocomplete-dropdown">
          {filtered.map(s => (
            <li
              key={s}
              onMouseDown={(e) => {
                e.preventDefault(); // prevents input onBlur from firing
                onChange(s);
                setIsOpen(false);
              }}
              className="autocomplete-item"
            >
              {s}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function makeRow(): LineItemForm {
  return { id: crypto.randomUUID(), description: '', quantity: '', unitPrice: '' };
}

function formatCurrency(v: number) {
  return v.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

export default function CreatePO() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [vendorName, setVendorName] = useState('');
  const [purchaseType, setPurchaseType] = useState('');
  const [poDate, setPoDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<LineItemForm[]>([makeRow()]);
  const [routingInfo, setRoutingInfo] = useState<RoutingInfo | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);

  // Computed totals
  const subtotal = items.reduce((acc, it) => {
    const q = typeof it.quantity === 'number' ? it.quantity : 0;
    const p = typeof it.unitPrice === 'number' ? it.unitPrice : 0;
    return acc + q * p;
  }, 0);
  const tax = Math.round(subtotal * 0 * 100) / 100; // 0% tax as per reference screenshot
  const grandTotal = subtotal + tax;

  const [suppliersLoading, setSuppliersLoading] = useState(true);
  const [suppliersError, setSuppliersError] = useState(false);

  // Load suppliers with retry (backend may take a moment to start)
  useEffect(() => {
    let cancelled = false;
    const load = async (attempt = 1) => {
      try {
        const data = await getSuppliers();
        if (!cancelled) {
          setSuppliers(data);
          setSuppliersLoading(false);
          setSuppliersError(false);
        }
      } catch {
        if (!cancelled) {
          if (attempt < 4) {
            // Retry after 1.5s (backend might still be starting)
            setTimeout(() => load(attempt + 1), 1500);
          } else {
            setSuppliersLoading(false);
            setSuppliersError(true);
          }
        }
      }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  // Fetch routing info when total changes
  useEffect(() => {
    if (grandTotal <= 0) { setRoutingInfo(null); return; }
    const t = setTimeout(() => {
      getRoutingInfo(grandTotal).then(setRoutingInfo).catch(() => { });
    }, 300);
    return () => clearTimeout(t);
  }, [grandTotal]);

  const showToast = (message: string, type: Toast['type'] = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const updateItem = (id: string, field: keyof LineItemForm, value: string | number) => {
    setItems(prev => prev.map(it => it.id === id ? { ...it, [field]: value } : it));
  };

  const addItem = () => setItems(prev => [...prev, makeRow()]);

  const removeItem = (id: string) => {
    if (items.length === 1) return;
    setItems(prev => prev.filter(it => it.id !== id));
  };

  const handleClear = () => {
    setVendorName('');
    setPurchaseType('');
    setPoDate(new Date().toISOString().split('T')[0]);
    setNotes('');
    setItems([makeRow()]);
    setRoutingInfo(null);
  };

  const buildPayload = (submit: boolean) => ({
    vendorName,
    purchaseType,
    poDate,
    notes,
    createdBy: 'Saravanan G R',
    submitForApproval: submit,
    lineItems: submit
      ? items
        .filter(it => it.description && it.quantity && it.unitPrice)
        .map(it => ({
          description: it.description,
          quantity: Number(it.quantity),
          unitPrice: Number(it.unitPrice),
        }))
      : items
        .filter(it => it.description || it.quantity || it.unitPrice) // Keep partially filled items for draft
        .map(it => ({
          description: it.description || '',
          quantity: Number(it.quantity) || 0,
          unitPrice: Number(it.unitPrice) || 0,
        })),
  });

  const handleSaveDraft = async () => {
    try {
      setSubmitting(true);
      await createPurchaseOrder(buildPayload(false));
      showToast('Draft saved successfully!', 'success');
      handleClear();
    } catch (e: any) {
      showToast(e.message, 'error');
    } finally { setSubmitting(false); }
  };

  const handleSubmit = async () => {
    if (!vendorName || !purchaseType) { showToast('Please fill Vendor and Purchase Type.', 'error'); return; }
    const validItems = items.filter(it => it.description && it.quantity && it.unitPrice);
    if (validItems.length === 0) { showToast('Add at least one line item.', 'error'); return; }
    try {
      setSubmitting(true);
      await createPurchaseOrder(buildPayload(true));
      showToast('PO submitted for approval!', 'success');
      handleClear();
    } catch (e: any) {
      showToast(e.message, 'error');
    } finally { setSubmitting(false); }
  };

  return (
    <div>
      <div className="page-body">
        {/* Page Title Row */}
        <div className="page-title-row">
          <h1>Create Purchase Order</h1>
          <div className="title-actions">
            <button className="btn btn-outline" onClick={handleClear} disabled={submitting}>
              <RotateCcw size={14} /> Clear Form
            </button>
            <button className="btn btn-outline" onClick={handleSaveDraft} disabled={submitting}>
              <Save size={14} /> Save Draft
            </button>
            <button className="btn btn-primary" onClick={handleSubmit} disabled={submitting}>
              <Send size={14} />
              {submitting ? 'Submitting...' : 'Submit for Approval'}
            </button>
          </div>
        </div>

        {/* Basic Details Section */}
        <div className="card mb-6">
          <div className="card-body">
            <div className="section-label" style={{ marginBottom: 16 }}>
              <FileText size={15} />
              Basic Details
            </div>
            <div className="form-grid form-grid-3">
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Vendor Name</label>
                <select
                  className="form-control"
                  value={vendorName}
                  onChange={e => setVendorName(e.target.value)}
                  disabled={suppliersLoading}
                >
                  <option value="">
                    {suppliersLoading ? 'Loading vendors...' : suppliersError ? 'Failed to load — see below' : 'Select vendor...'}
                  </option>
                  {suppliers.map(s => (
                    <option key={s.id} value={s.name}>{s.name}</option>
                  ))}
                </select>
                {suppliersError && (
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    style={{ marginTop: 6 }}
                    onClick={() => {
                      setSuppliersError(false);
                      setSuppliersLoading(true);
                      getSuppliers().then(d => { setSuppliers(d); setSuppliersLoading(false); }).catch(() => { setSuppliersLoading(false); setSuppliersError(true); });
                    }}
                  >
                    Retry loading vendors
                  </button>
                )}
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Purchase Type</label>
                <select
                  className="form-control"
                  value={purchaseType}
                  onChange={e => setPurchaseType(e.target.value)}
                >
                  <option value="">Select type...</option>
                  {PURCHASE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Date</label>
                <input
                  type="date"
                  className="form-control"
                  value={poDate}
                  onChange={e => setPoDate(e.target.value)}
                />
              </div>
              <div className="form-group" style={{ marginBottom: 0, gridColumn: '1 / -1' }}>
                <label className="form-label">Notes (Optional)</label>
                <textarea
                  className="form-control"
                  rows={2}
                  placeholder="Additional details or instructions..."
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Materials / Items */}
        <div className="card mb-6">
          <div className="card-header">
            <span className="card-title">
              <ShoppingCart size={15} />
              Materials / Items
            </span>
            <button className="btn btn-outline btn-sm" onClick={addItem}>
              <Plus size={13} /> Add Item
            </button>
          </div>
          <div className="table-wrapper">
            <table className="items-table">
              <thead>
                <tr>
                  <th style={{ width: '4%' }}>#</th>
                  <th style={{ width: '42%' }}>Item Description</th>
                  <th style={{ width: '15%' }}>Quantity</th>
                  <th style={{ width: '19%' }}>Unit Price ($)</th>
                  <th style={{ width: '15%' }}>Amount ($)</th>
                  <th style={{ width: '5%' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => {
                  const q = typeof item.quantity === 'number' ? item.quantity : 0;
                  const p = typeof item.unitPrice === 'number' ? item.unitPrice : 0;
                  const amount = q * p;
                  return (
                    <tr key={item.id}>
                      <td style={{ color: 'var(--text-muted)', fontWeight: 500 }}>{idx + 1}</td>
                      <td>
                        <AutocompleteInput
                          value={item.description}
                          onChange={val => updateItem(item.id, 'description', val)}
                        />
                      </td>
                      <td>
                        <input
                          className="form-control"
                          type="number"
                          min={1}
                          placeholder="0"
                          value={item.quantity}
                          onChange={e => updateItem(item.id, 'quantity', e.target.value === '' ? '' : Number(e.target.value))}
                        />
                      </td>
                      <td>
                        <input
                          className="form-control"
                          type="number"
                          min={0}
                          step={0.01}
                          placeholder="0.00"
                          value={item.unitPrice}
                          onChange={e => updateItem(item.id, 'unitPrice', e.target.value === '' ? '' : Number(e.target.value))}
                        />
                      </td>
                      <td className="amount-cell">{amount > 0 ? formatCurrency(amount) : '—'}</td>
                      <td>
                        <button
                          className="btn-icon"
                          onClick={() => removeItem(item.id)}
                          disabled={items.length === 1}
                          style={{ color: items.length === 1 ? 'var(--text-muted)' : 'var(--color-danger)' }}
                        >
                          <Trash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Approval Routing + Summary */}
        <div className="po-bottom-grid">
          {/* Approval Routing Logic */}
          <div>
            {grandTotal === 0 ? (
              <div className="routing-box neutral">
                <Info size={16} style={{ flexShrink: 0, marginTop: 1 }} />
                <div>
                  <div style={{ fontWeight: 600 }}>Approval Routing Logic</div>
                  <div style={{ fontSize: 12, marginTop: 3, opacity: 0.85 }}>
                    Based on the total amount, this Purchase Order requires:
                  </div>
                  <div style={{ marginTop: 8, fontSize: 13 }}>Add items to see routing info</div>
                </div>
              </div>
            ) : routingInfo ? (
              <div className={`routing-box ${routingInfo.requiredLevels === 1 ? 'level1' : 'level2'}`}>
                <Info size={16} style={{ flexShrink: 0, marginTop: 1 }} />
                <div>
                  <div style={{ fontWeight: 600 }}>Approval Routing Logic</div>
                  <div style={{ fontSize: 12, marginTop: 3, opacity: 0.85 }}>
                    Based on the total amount, this Purchase Order requires:
                  </div>
                  <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: 5,
                      background: routingInfo.requiredLevels === 1 ? '#059669' : '#d97706',
                      color: '#fff', borderRadius: 999, padding: '3px 10px',
                      fontSize: 12, fontWeight: 600
                    }}>
                      <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#fff', display: 'inline-block' }} />
                      {routingInfo.requiredLevels === 1
                        ? `1-Level Approval (Total < $10k)`
                        : `2-Level Approval (Total ≥ $10k)`}
                    </span>
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          {/* Order Summary */}
          <div>
            <div className="summary-box">
              <div className="summary-row">
                <span>Subtotal</span>
                <span className="font-semibold">{formatCurrency(subtotal)}</span>
              </div>
              <div className="summary-row">
                <span>Estimated Tax (0%)</span>
                <span className="font-semibold">{formatCurrency(tax)}</span>
              </div>
              <div className="summary-row total">
                <span>Total Amount</span>
                <span className="total-amount">{formatCurrency(grandTotal)}</span>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Toast */}
      {toast && (
        <div className={`toast ${toast.type}`}>
          {toast.type === 'success' && <CheckCircle size={16} color="var(--color-success)" />}
          {toast.type === 'error' && <AlertCircle size={16} color="var(--color-danger)" />}
          {toast.type === 'info' && <Info size={16} color="var(--color-primary)" />}
          {toast.message}
        </div>
      )}
    </div>
  );
}
