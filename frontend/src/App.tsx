import { BrowserRouter, Routes, Route, NavLink, Link } from 'react-router-dom';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import HomePage from './pages/Home';
import WrapPage from './pages/Wrap';
import AirdropPage from './pages/Airdrop';
import TreasuryPage from './pages/Treasury';

function Navbar() {
  return (
    <nav className="navbar">
      <div className="container navbar-inner">
        <Link to="/" className="nav-logo">
          <span style={{ fontSize: '1.4rem' }}>🔐</span>
          <span className="gradient-text">ShadowDrop</span>
        </Link>

        <div className="nav-links">
          <NavLink to="/wrap" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            Wrapper
          </NavLink>
          <NavLink to="/airdrop" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            Airdrop
          </NavLink>
          <NavLink to="/treasury" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            Treasury
          </NavLink>
        </div>

        <ConnectButton chainStatus="icon" showBalance={false} />
      </div>
    </nav>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Navbar />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/wrap" element={<WrapPage />} />
        <Route path="/airdrop" element={<AirdropPage />} />
        <Route path="/treasury" element={<TreasuryPage />} />
      </Routes>
    </BrowserRouter>
  );
}
