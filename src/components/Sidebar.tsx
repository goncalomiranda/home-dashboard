'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';

interface SidebarProps {
  isOpen?: boolean;
}

export default function Sidebar({ isOpen = true }: SidebarProps) {
  const pathname = usePathname();

  const menuItems = [
    { href: '/dashboard', icon: 'dashboard', label: 'Dashboard' },
    { href: '/tables', icon: 'table_view', label: 'Tables' },
    { href: '/admin/newsletter', icon: 'mail', label: 'Newsletter' },
    { href: '/billing', icon: 'receipt_long', label: 'Billing' },
    { href: '/virtual-reality', icon: 'view_in_ar', label: 'Virtual Reality' },
    { href: '/rtl', icon: 'format_textdirection_r_to_l', label: 'RTL' },
    { href: '/notifications', icon: 'notifications', label: 'Notifications' },
  ];

  const accountItems = [
    { href: '/profile', icon: 'person', label: 'Profile' },
    { href: '/sign-in', icon: 'login', label: 'Sign In' },
    { href: '/sign-up', icon: 'assignment', label: 'Sign Up' },
  ];

  return (
    <aside className={`sidenav navbar navbar-vertical navbar-expand-xs border-radius-lg fixed-start ms-2 bg-white my-2 ${isOpen ? '' : 'd-none'}`} id="sidenav-main">
      <div className="sidenav-header">
        <i className="fas fa-times p-3 cursor-pointer text-dark opacity-5 position-absolute end-0 top-0 d-none d-xl-none" aria-hidden="true" id="iconSidenav"></i>
        <Link className="navbar-brand px-4 py-3 m-0" href="/dashboard">
          <Image src="/assets/img/logo-ct-dark.png" className="navbar-brand-img" width={26} height={26} alt="main_logo" />
          <span className="ms-1 text-sm text-dark">Creative Tim</span>
        </Link>
      </div>
      <hr className="horizontal dark mt-0 mb-2" />
      <div className="collapse navbar-collapse w-auto" id="sidenav-collapse-main">
        <ul className="navbar-nav">
          {menuItems.map((item) => (
            <li key={item.href} className="nav-item">
              <Link 
                className={`nav-link ${pathname === item.href ? 'active bg-gradient-dark text-white' : 'text-dark'}`} 
                href={item.href}
              >
                <i className="material-symbols-rounded opacity-5">{item.icon}</i>
                <span className="nav-link-text ms-1">{item.label}</span>
              </Link>
            </li>
          ))}
          <li className="nav-item mt-3">
            <h6 className="ps-4 ms-2 text-uppercase text-xs text-dark font-weight-bolder opacity-5">Account pages</h6>
          </li>
          {accountItems.map((item) => (
            <li key={item.href} className="nav-item">
              <Link 
                className={`nav-link ${pathname === item.href ? 'active bg-gradient-dark text-white' : 'text-dark'}`} 
                href={item.href}
              >
                <i className="material-symbols-rounded opacity-5">{item.icon}</i>
                <span className="nav-link-text ms-1">{item.label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}