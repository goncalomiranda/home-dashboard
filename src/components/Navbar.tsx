'use client';

import Link from 'next/link';
import Image from 'next/image';

interface NavbarProps {
  title?: string;
  subtitle?: string;
}

export default function Navbar({ title = "Dashboard", subtitle = "Check the sales, value and bounce rate by country." }: NavbarProps) {
  return (
    <nav className="navbar navbar-main navbar-expand-lg px-0 mx-3 shadow-none border-radius-xl" id="navbarBlur" data-scroll="true">
      <div className="container-fluid py-1 px-3">
        <nav aria-label="breadcrumb">
          <ol className="breadcrumb bg-transparent mb-0 pb-0 pt-1 px-0 me-sm-6 me-5">
            <li className="breadcrumb-item text-sm">
              <Link className="opacity-5 text-dark" href="/dashboard">Pages</Link>
            </li>
            <li className="breadcrumb-item text-sm text-dark active" aria-current="page">{title}</li>
          </ol>
          <h6 className="font-weight-bold mb-0">{title}</h6>
        </nav>
        <div className="collapse navbar-collapse mt-sm-0 mt-2 me-md-0 me-sm-4" id="navbar">
          <div className="ms-md-auto pe-md-3 d-flex align-items-center">
            <div className="input-group input-group-outline">
              <label className="form-label">Type here...</label>
              <input type="text" className="form-control" />
            </div>
          </div>
          <ul className="navbar-nav justify-content-end">
            <li className="nav-item d-flex align-items-center">
              <Link href="/sign-in" className="nav-link text-body font-weight-bold px-0">
                <i className="material-symbols-rounded">account_circle</i>
              </Link>
            </li>
            <li className="nav-item d-xl-none ps-3 d-flex align-items-center">
              <a href="#" className="nav-link text-body p-0" id="iconNavbarSidenav">
                <div className="sidenav-toggler-inner">
                  <i className="sidenav-toggler-line"></i>
                  <i className="sidenav-toggler-line"></i>
                  <i className="sidenav-toggler-line"></i>
                </div>
              </a>
            </li>
            <li className="nav-item px-3 d-flex align-items-center">
              <a href="#" className="nav-link text-body p-0">
                <i className="material-symbols-rounded fixed-plugin-button-nav">settings</i>
              </a>
            </li>
            <li className="nav-item dropdown pe-3 d-flex align-items-center">
              <a href="#" className="nav-link text-body p-0" id="dropdownMenuButton" data-bs-toggle="dropdown" aria-expanded="false">
                <i className="material-symbols-rounded">notifications</i>
              </a>
              <ul className="dropdown-menu dropdown-menu-end px-2 py-3 me-sm-n4" aria-labelledby="dropdownMenuButton">
                <li className="mb-2">
                  <a className="dropdown-item border-radius-md" href="#">
                    <div className="d-flex py-1">
                      <div className="my-auto">
                        <Image src="/assets/img/team-2.jpg" className="avatar avatar-sm me-3" width={32} height={32} alt="team member" />
                      </div>
                      <div className="d-flex flex-column justify-content-center">
                        <h6 className="text-sm font-weight-normal mb-1">
                          <span className="font-weight-bold">New message</span> from Laur
                        </h6>
                        <p className="text-xs text-secondary mb-0">
                          <i className="fa fa-clock me-1"></i>
                          13 minutes ago
                        </p>
                      </div>
                    </div>
                  </a>
                </li>
              </ul>
            </li>
          </ul>
        </div>
      </div>
    </nav>
  );
}