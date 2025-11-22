import { Link } from "react-router-dom";
import { useState, memo } from "react";
import config from '@lib/config';

function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const menuItems = config.navigation.menu;

  return (
    <nav className="sticky top-0 z-50 border-b" style={{ backgroundColor: '#000000', borderColor: '#333333' }}>
      <div className="max-w-6xl mx-auto px-4 py-3">
        <div className="flex justify-between items-center">
          {/* Logo - SBB Mobile Style */}
          <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <div className="w-10 h-10 flex items-center justify-center" style={{ backgroundColor: '#EB0000' }}>
              <span className="text-white font-bold text-sm">SBB</span>
            </div>
            <span className="text-base font-bold" style={{ color: '#ffffff' }}>CFF FFS</span>
          </Link>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center gap-6">
            {menuItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className="font-bold text-sm uppercase tracking-wide transition-colors"
                style={{ color: '#ffffff' }}
                onMouseEnter={(e) => e.target.style.color = '#EB0000'}
                onMouseLeave={(e) => e.target.style.color = '#ffffff'}
              >
                {item.label}
              </Link>
            ))}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden"
            style={{ color: '#ffffff' }}
            aria-label="Toggle menu"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {isOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile Menu */}
        {isOpen && (
          <div className="md:hidden mt-4 pb-4 border-t pt-4" style={{ borderColor: '#333333' }}>
            {menuItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setIsOpen(false)}
                className="block py-2 transition-colors font-medium"
                style={{ color: '#ffffff' }}
                onMouseEnter={(e) => e.target.style.color = '#EB0000'}
                onMouseLeave={(e) => e.target.style.color = '#ffffff'}
              >
                {item.label}
              </Link>
            ))}
          </div>
        )}
      </div>
    </nav>
  );
}

export default memo(Navbar);