import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { FiFilm, FiMenu, FiX, FiUser, FiLogOut, FiClock, FiMapPin } from 'react-icons/fi';
import './Navbar.css';

const Navbar = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    setDropdownOpen(false);
    navigate('/');
  };

  const navLinks = [
    { to: '/', label: 'Trang chủ' },
    { to: '/movies', label: 'Phim' },
    { to: '/cinemas', label: 'Rạp phim' },
  ];

  return (
    <nav className="navbar" id="main-navbar">
      <div className="container navbar-inner">
        {/* Logo */}
        <Link to="/" className="navbar-logo" id="logo-link">
          <FiFilm className="navbar-logo-icon" />
          <span>CineBooking</span>
        </Link>

        {/* Desktop Nav */}
        <ul className="navbar-links">
          {navLinks.map((link) => (
            <li key={link.to}>
              <NavLink
                to={link.to}
                className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}
                end={link.to === '/'}
              >
                {link.label}
              </NavLink>
            </li>
          ))}
        </ul>

        {/* Auth Section */}
        <div className="navbar-auth">
          {isAuthenticated ? (
            <div className="navbar-user" id="user-dropdown-trigger">
              <button
                className="navbar-user-btn"
                onClick={() => setDropdownOpen(!dropdownOpen)}
              >
                <div className="navbar-avatar">
                  {user?.name?.charAt(0).toUpperCase()}
                </div>
                <span className="navbar-user-name">{user?.name}</span>
              </button>

              {dropdownOpen && (
                <div className="navbar-dropdown" id="user-dropdown-menu">
                  <Link
                    to="/profile"
                    className="dropdown-item"
                    onClick={() => setDropdownOpen(false)}
                  >
                    <FiUser /> Tài khoản
                  </Link>
                  <Link
                    to="/history"
                    className="dropdown-item"
                    onClick={() => setDropdownOpen(false)}
                  >
                    <FiClock /> Lịch sử vé
                  </Link>
                  <button className="dropdown-item dropdown-logout" onClick={handleLogout}>
                    <FiLogOut /> Đăng xuất
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="navbar-auth-buttons">
              <Link to="/login" className="btn btn-sm btn-secondary" id="login-btn">
                Đăng nhập
              </Link>
              <Link to="/register" className="btn btn-sm btn-primary" id="register-btn">
                Đăng ký
              </Link>
            </div>
          )}
        </div>

        {/* Mobile Toggle */}
        <button
          className="navbar-mobile-toggle"
          onClick={() => setMobileOpen(!mobileOpen)}
          id="mobile-menu-toggle"
        >
          {mobileOpen ? <FiX /> : <FiMenu />}
        </button>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="navbar-mobile-menu" id="mobile-menu">
          {navLinks.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className="mobile-nav-link"
              onClick={() => setMobileOpen(false)}
              end={link.to === '/'}
            >
              {link.label}
            </NavLink>
          ))}
          {!isAuthenticated && (
            <div className="mobile-auth">
              <Link to="/login" className="btn btn-block btn-secondary" onClick={() => setMobileOpen(false)}>
                Đăng nhập
              </Link>
              <Link to="/register" className="btn btn-block btn-primary" onClick={() => setMobileOpen(false)}>
                Đăng ký
              </Link>
            </div>
          )}
        </div>
      )}
    </nav>
  );
};

export default Navbar;
