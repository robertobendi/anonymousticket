import { memo, useState, useEffect } from 'react';
import config from '@lib/config';
import { THEME } from '@lib/themeColors';
import { getBuildInfo, formatBuildNumber } from '@lib/buildInfo';

/**
 * Footer component - Modular and reusable
 * Uses centralized theme colors for consistency
 */
const Footer = memo(() => {
  const { site } = config;
  const currentYear = new Date().getFullYear();
  const [buildNumber, setBuildNumber] = useState(null);
  
  useEffect(() => {
    getBuildInfo().then((info) => {
      if (info) {
        setBuildNumber(info.buildNumber);
      }
    });
  }, []);
  
  const linkStyle = {
    color: THEME.textMuted,
  };

  const handleLinkHover = (e, isEntering) => {
    e.target.style.color = isEntering ? THEME.accent : THEME.textMuted;
  };
  
  return (
    <footer 
      className="mt-auto border-t" 
      style={{ 
        backgroundColor: THEME.surface, 
        borderColor: THEME.border 
      }}
    >
      <div className="max-w-6xl mx-auto px-4 py-4">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex flex-col items-start">
          <p className="text-xs" style={{ color: THEME.textMuted }}>
            © {currentYear} {site.author}
          </p>
            {buildNumber && (
              <p className="text-xs mt-1" style={{ color: THEME.textMuted, opacity: 0.7 }}>
                Build: {formatBuildNumber(buildNumber)}
              </p>
            )}
          </div>
          <div className="flex gap-6">
            <a
              href={site.links.github}
              className="text-xs transition-colors font-medium"
              style={linkStyle}
              onMouseEnter={(e) => handleLinkHover(e, true)}
              onMouseLeave={(e) => handleLinkHover(e, false)}
              target="_blank"
              rel="noopener noreferrer"
            >
              sbb.ch
            </a>
            <a
              href="/about"
              className="text-xs transition-colors font-medium"
              style={linkStyle}
              onMouseEnter={(e) => handleLinkHover(e, true)}
              onMouseLeave={(e) => handleLinkHover(e, false)}
            >
              About
            </a>
            <a
              href="#"
              className="text-xs transition-colors font-medium"
              style={linkStyle}
              onMouseEnter={(e) => handleLinkHover(e, true)}
              onMouseLeave={(e) => handleLinkHover(e, false)}
            >
              Help
            </a>
            <a
              href="#"
              className="text-xs transition-colors font-medium"
              style={linkStyle}
              onMouseEnter={(e) => handleLinkHover(e, true)}
              onMouseLeave={(e) => handleLinkHover(e, false)}
            >
              Contact
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
});

Footer.displayName = 'Footer';

export default Footer;