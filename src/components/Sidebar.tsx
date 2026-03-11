import { NavLink } from 'react-router-dom';
import { ShoppingCart, CheckSquare, Package, CreditCard, Truck, Sun, Moon } from 'lucide-react';

interface SidebarProps {
  darkMode: boolean;
  onToggleDark: () => void;
  pendingCounts?: {
    approvals: number;
    vendorDispatch: number;
    receipt: number;
    payment: number;
  };
}

const navItems = [
  { to: '/',               label: 'Create PO',        icon: ShoppingCart, num: 1, exact: true,  countKey: null },
  { to: '/approvals',      label: 'Approvals',         icon: CheckSquare,  num: 2, exact: false, countKey: 'approvals'      as const },
  { to: '/vendor-dispatch',label: 'Vendor Dispatch',   icon: Truck,        num: 3, exact: false, countKey: 'vendorDispatch' as const },
  { to: '/receipt',        label: 'Material Receipt',  icon: Package,      num: 4, exact: false, countKey: 'receipt'        as const },
  { to: '/payment',        label: 'Payment',           icon: CreditCard,   num: 5, exact: false, countKey: 'payment'        as const },
];

export default function Sidebar({ darkMode, onToggleDark, pendingCounts }: SidebarProps) {
  const counts = pendingCounts ?? { approvals: 0, vendorDispatch: 0, receipt: 0, payment: 0 };

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <rect x="1" y="1" width="7" height="7" rx="1.5" fill="white"/>
            <rect x="10" y="1" width="7" height="7" rx="1.5" fill="white" opacity="0.7"/>
            <rect x="1" y="10" width="7" height="7" rx="1.5" fill="white" opacity="0.7"/>
            <rect x="10" y="10" width="7" height="7" rx="1.5" fill="white" opacity="0.5"/>
          </svg>
        </div>
        <div className="sidebar-logo-text">
          PO Management
          <span>PROCUREMENT SYSTEM</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        {navItems.map(({ to, label, icon: Icon, num, exact, countKey }) => {
          const count = countKey ? counts[countKey] : 0;
          return (
            <NavLink
              key={to}
              to={to}
              end={exact}
              className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
            >
              <Icon size={16} />
              <span className="nav-label">{num}. {label}</span>
              {count > 0 && <span className="nav-badge">{count}</span>}
            </NavLink>
          );
        })}
      </nav>

      {/* Footer: User profile + dark mode toggle */}
      <div className="sidebar-footer">
        <div className="user-profile">
          <div className="user-avatar">SG</div>
          <div className="user-info">
            <div className="user-name">Saravanan G R</div>
            <div className="user-role">PROCUREMENT MGR</div>
          </div>
        </div>
        <button className="theme-toggle" onClick={onToggleDark} aria-label="Toggle theme">
          {darkMode ? <Sun size={14} /> : <Moon size={14} />}
          {darkMode ? 'Light Mode' : 'Dark Mode'}
        </button>
      </div>
    </aside>
  );
}
