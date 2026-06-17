import { Link } from 'react-router-dom';
import { FiFilm, FiMail, FiPhone } from 'react-icons/fi';
import './Footer.css';

const Footer = () => {
  return (
    <footer className="footer" id="main-footer">
      <div className="container">
        <div className="footer-grid">
          <div className="footer-brand">
            <Link to="/" className="footer-logo">
              <FiFilm /> CineBooking
            </Link>
            <p className="footer-desc">
              Hệ thống đặt vé xem phim trực tuyến hàng đầu. Trải nghiệm đặt vé nhanh chóng, tiện lợi.
            </p>
          </div>

          <div className="footer-col">
            <h4>Khám phá</h4>
            <Link to="/movies">Phim đang chiếu</Link>
            <Link to="/cinemas">Hệ thống rạp</Link>
          </div>

          <div className="footer-col">
            <h4>Tài khoản</h4>
            <Link to="/login">Đăng nhập</Link>
            <Link to="/register">Đăng ký</Link>
            <Link to="/history">Lịch sử vé</Link>
          </div>

          <div className="footer-col">
            <h4>Liên hệ</h4>
            <a href="mailto:support@cinebooking.vn"><FiMail /> support@cinebooking.vn</a>
            <a href="tel:19001234"><FiPhone /> 1900 1234</a>
          </div>
        </div>

        <div className="footer-bottom">
          <p>© {new Date().getFullYear()} CineBooking. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
