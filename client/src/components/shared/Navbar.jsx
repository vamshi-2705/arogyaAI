import { MdLocalHospital } from 'react-icons/md';
import { Link, useLocation } from 'react-router-dom';

export default function Navbar({ title = 'AROGYA WATCH AI' }) {
  const location = useLocation();
  const isNurse = location.pathname.startsWith('/nurse');

  return (
    <nav className="shared-navbar">
      <div className="shared-navbar-inner">
        <div className="shared-navbar-brand">
          <MdLocalHospital size={22} />
          <span>{title}</span>
        </div>
        {isNurse && (
          <Link to="/nurse/login" className="shared-navbar-link">
            Login
          </Link>
        )}
      </div>
    </nav>
  );
}
