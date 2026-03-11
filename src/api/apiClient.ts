import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const apiClient = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
});

// Response interceptor for consistent error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = error.response?.data?.message || error.response?.data || error.message || 'An error occurred';
    return Promise.reject(new Error(typeof message === 'string' ? message : JSON.stringify(message)));
  }
);

export default apiClient;

// ── Types ──────────────────────────────────────────────────────────────────

export type POStatus =
  | 'Draft'
  | 'PendingApprovalLevel1'
  | 'PendingApprovalLevel2'
  | 'Approved'
  | 'SentToVendor'
  | 'MaterialDispatched'
  | 'MaterialReceived'
  | 'VerificationPending'
  | 'FinalApproved'
  | 'PaymentProcessing'
  | 'Completed'
  | 'Rejected';

export interface LineItem {
  id: number;
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

export interface PurchaseOrder {
  id: number;
  poNumber: string;
  vendorName: string;
  purchaseType: string;
  poDate: string;
  status: POStatus;
  totalAmount: number;
  requiredApprovalLevels: number;
  currentApprovalLevel: number;
  createdBy?: string;
  notes?: string;
  createdAt: string;
  lineItems: LineItem[];
}

export interface ApprovalQueueItem {
  id: number;
  poNumber: string;
  vendorName: string;
  purchaseType: string;
  poDate: string;
  totalAmount: number;
  status: POStatus;
  requiredApprovalLevels: number;
  currentApprovalLevel: number;
  routingLabel: string;
  isUrgent: boolean;
}

export interface ApprovalStats {
  pendingCount: number;
  urgentCount: number;
}

export interface ReceiptItem {
  id: number;
  poNumber: string;
  vendorName: string;
  purchaseType: string;
  totalAmount: number;
  expectedDate: string;
  status: string;
}

export interface VerificationItem {
  id: number;
  poNumber: string;
  vendorName: string;
  purchaseType: string;
  poDate: string;
  totalAmount: number;
  receivedDate?: string;
  receivedBy?: string;
}

export interface PaymentItem {
  id: number;
  poNumber: string;
  vendorName: string;
  totalAmount: number;
  dueDate: string;
  status: string;
}

export interface VendorDispatchItem {
  id: number;
  poNumber: string;
  vendorName: string;
  purchaseType: string;
  poDate: string;
  totalAmount: number;
  status: string;
}

export interface Supplier {
  id: number;
  name: string;
  category: string;
}

export interface RoutingInfo {
  requiredLevels: number;
  label: string;
}

// ── API Functions ──────────────────────────────────────────────────────────

// Purchase Orders
export const getPurchaseOrders = () =>
  apiClient.get<PurchaseOrder[]>('/api/purchaseorders').then(r => r.data);

export const getPurchaseOrder = (id: number) =>
  apiClient.get<PurchaseOrder>(`/api/purchaseorders/${id}`).then(r => r.data);

export const createPurchaseOrder = (data: object) =>
  apiClient.post<PurchaseOrder>('/api/purchaseorders', data).then(r => r.data);

export const updatePurchaseOrder = (id: number, data: object) =>
  apiClient.put<PurchaseOrder>(`/api/purchaseorders/${id}`, data).then(r => r.data);

export const deletePurchaseOrder = (id: number) =>
  apiClient.delete(`/api/purchaseorders/${id}`);

export const getRoutingInfo = (total: number) =>
  apiClient.get<RoutingInfo>(`/api/purchaseorders/routing-info?total=${total}`).then(r => r.data);

// Vendor Dispatch
export const getApprovedPOs = () =>
  apiClient.get<VendorDispatchItem[]>('/api/purchaseorders/approved').then(r => r.data);

export const getSentToVendorPOs = () =>
  apiClient.get<VendorDispatchItem[]>('/api/purchaseorders/sent-to-vendor').then(r => r.data);

export const sendToVendor = (id: number) =>
  apiClient.post(`/api/purchaseorders/${id}/send-to-vendor`).then(r => r.data);

export const markMaterialDispatched = (id: number) =>
  apiClient.post(`/api/purchaseorders/${id}/material-dispatched`).then(r => r.data);

// Approvals
export const getPendingApprovals = () =>
  apiClient.get<ApprovalQueueItem[]>('/api/approvals/pending').then(r => r.data);

export const getApprovalStats = () =>
  apiClient.get<ApprovalStats>('/api/approvals/stats').then(r => r.data);

export const submitApprovalAction = (id: number, action: string, approverName?: string, comments?: string) =>
  apiClient.post(`/api/approvals/${id}/action`, { action, approverName, comments }).then(r => r.data);

// Material Receipt
export const getPendingReceipts = () =>
  apiClient.get<ReceiptItem[]>('/api/materialreceipt/pending').then(r => r.data);

export const getVerificationPendingPOs = () =>
  apiClient.get<VerificationItem[]>('/api/materialreceipt/verification-pending').then(r => r.data);

export const receiveGoods = (id: number, receivedBy?: string, notes?: string) =>
  apiClient.post(`/api/materialreceipt/${id}/receive`, { receivedBy, notes }).then(r => r.data);

export const submitFinalApproval = (id: number, verifiedBy?: string, notes?: string) =>
  apiClient.post(`/api/materialreceipt/${id}/final-approval`, { verifiedBy, notes }).then(r => r.data);

// Payment
export const getPendingPayments = () =>
  apiClient.get<PaymentItem[]>('/api/payment/pending').then(r => r.data);

export const processPayment = (id: number, paidBy?: string, paymentMethod?: string, notes?: string) =>
  apiClient.post(`/api/payment/${id}/pay`, { paidBy, paymentMethod, notes }).then(r => r.data);

// Suppliers
export const getSuppliers = () =>
  apiClient.get<Supplier[]>('/api/suppliers').then(r => r.data);
