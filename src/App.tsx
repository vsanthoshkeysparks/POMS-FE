import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import CreatePO from './pages/CreatePO';
import Approvals from './pages/Approvals';
import VendorDispatch from './pages/VendorDispatch';
import MaterialReceipt from './pages/MaterialReceipt';
import Payment from './pages/Payment';
import './index.css';
import {
  getPendingApprovals,
  getApprovedPOs,
  getSentToVendorPOs,
  getPendingReceipts,
  getVerificationPendingPOs,
  getPendingPayments,
} from './api/apiClient';

export default function App() {
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem('theme') === 'dark';
  });

  const [pendingCounts, setPendingCounts] = useState({
    approvals: 0,
    vendorDispatch: 0,
    receipt: 0,
    payment: 0,
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light');
    localStorage.setItem('theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  // Load badge counts for sidebar
  useEffect(() => {
    const load = async () => {
      try {
        const [approvals, approvedPOs, sentPOs, receipts, verifications, payments] = await Promise.all([
          getPendingApprovals(),
          getApprovedPOs(),
          getSentToVendorPOs(),
          getPendingReceipts(),
          getVerificationPendingPOs(),
          getPendingPayments(),
        ]);
        setPendingCounts({
          approvals: approvals.length,
          vendorDispatch: approvedPOs.length + sentPOs.length,
          receipt: receipts.length + verifications.length,
          payment: payments.length,
        });
      } catch {
        // silently ignore — counts will just show 0
      }
    };
    load();
  }, []);

  return (
    <BrowserRouter>
      <div className="app-layout">
        <Sidebar
          darkMode={darkMode}
          onToggleDark={() => setDarkMode(d => !d)}
          pendingCounts={pendingCounts}
        />
        <div className="main-content">
          <Routes>
            <Route path="/" element={<CreatePO />} />
            <Route path="/approvals" element={<Approvals />} />
            <Route path="/vendor-dispatch" element={<VendorDispatch />} />
            <Route path="/receipt" element={<MaterialReceipt />} />
            <Route path="/payment" element={<Payment />} />
          </Routes>
        </div>
      </div>
    </BrowserRouter>
  );
}
