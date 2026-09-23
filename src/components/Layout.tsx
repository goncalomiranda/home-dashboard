'use client';

import { ReactNode } from 'react';
import Sidebar from './Sidebar';
import Navbar from './Navbar';

interface LayoutProps {
  children: ReactNode;
  title?: string;
}

export default function Layout({ children, title }: LayoutProps) {
  return (
    <div className="g-sidenav-show bg-gray-100">
      <Sidebar />
      <main className="main-content position-relative max-height-vh-100 h-100 border-radius-lg">
        <Navbar title={title} />
        <div className="container-fluid py-2">
          {children}
        </div>
      </main>
    </div>
  );
}