import { memo, useState, useEffect, useRef } from 'react';
import { THEME } from '@lib/themeColors';

/**
 * Interactive Switzerland Map Component
 * Uses accurate SVG from Wikimedia Commons with precise canton boundaries
 */

// Mapping of various canton identifiers to codes
const CANTON_MAPPINGS = {
  // By code
  'AG': 'AG', 'AI': 'AI', 'AR': 'AR', 'BE': 'BE', 'BL': 'BL', 'BS': 'BS',
  'FR': 'FR', 'GE': 'GE', 'GL': 'GL', 'GR': 'GR', 'JU': 'JU', 'LU': 'LU',
  'NE': 'NE', 'NW': 'NW', 'OW': 'OW', 'SG': 'SG', 'SH': 'SH', 'SO': 'SO',
  'SZ': 'SZ', 'TG': 'TG', 'TI': 'TI', 'UR': 'UR', 'VD': 'VD', 'VS': 'VS',
  'ZG': 'ZG', 'ZH': 'ZH',
  // By name variations
  'aargau': 'AG', 'appenzell-innerrhoden': 'AI', 'appenzell-ausserrhoden': 'AR',
  'bern': 'BE', 'basel-landschaft': 'BL', 'basel-stadt': 'BS', 'freiburg': 'FR',
  'genf': 'GE', 'genève': 'GE', 'glarus': 'GL', 'graubünden': 'GR', 'jura': 'JU',
  'luzern': 'LU', 'neuenburg': 'NE', 'nidwalden': 'NW', 'obwalden': 'OW',
  'st-gallen': 'SG', 'st.gallen': 'SG', 'schaffhausen': 'SH', 'solothurn': 'SO',
  'schwyz': 'SZ', 'thurgau': 'TG', 'tessin': 'TI', 'ticino': 'TI', 'uri': 'UR',
  'waadt': 'VD', 'vaud': 'VD', 'wallis': 'VS', 'valais': 'VS', 'zug': 'ZG',
  'zürich': 'ZH', 'zurich': 'ZH'
};

// Canton codes to names mapping
const CANTON_NAMES = {
  'AG': 'Aargau',
  'AI': 'Appenzell Innerrhoden',
  'AR': 'Appenzell Ausserrhoden',
  'BE': 'Bern',
  'BL': 'Basel-Landschaft',
  'BS': 'Basel-Stadt',
  'FR': 'Freiburg',
  'GE': 'Genève',
  'GL': 'Glarus',
  'GR': 'Graubünden',
  'JU': 'Jura',
  'LU': 'Luzern',
  'NE': 'Neuenburg',
  'NW': 'Nidwalden',
  'OW': 'Obwalden',
  'SG': 'St. Gallen',
  'SH': 'Schaffhausen',
  'SO': 'Solothurn',
  'SZ': 'Schwyz',
  'TG': 'Thurgau',
  'TI': 'Ticino',
  'UR': 'Uri',
  'VD': 'Vaud',
  'VS': 'Wallis',
  'ZG': 'Zug',
  'ZH': 'Zürich',
};

const SwitzerlandMap = memo(({ selectedCantons = [], onCantonClick }) => {
  const [svgContent, setSvgContent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tooltip, setTooltip] = useState({ show: false, text: '', x: 0, y: 0 });
  const containerRef = useRef(null);
  const tooltipRef = useRef(null);

  useEffect(() => {
    const loadSVG = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Load from public folder
        const response = await fetch('/switzerland-cantons.svg');
        if (!response.ok) {
          throw new Error('SVG file not found');
        }
        
        const text = await response.text();
        setSvgContent(text);
      } catch (err) {
        console.error('Error loading SVG:', err);
        setError('Unable to load map. Please ensure switzerland-cantons.svg is in /public folder.');
      } finally {
        setLoading(false);
      }
    };

    loadSVG();
  }, []);

  // Make SVG interactive after it's loaded
  useEffect(() => {
    if (!svgContent || !containerRef.current) return;

    const container = containerRef.current;
    const svgElement = container.querySelector('svg');
    if (!svgElement) return;

    // Apply theme colors and sizing
    svgElement.style.backgroundColor = THEME.background;
    svgElement.style.width = '100%';
    svgElement.style.height = 'auto';
    svgElement.style.maxHeight = '600px';
    
    // Preserve aspect ratio
    const viewBox = svgElement.getAttribute('viewBox');
    if (viewBox) {
      svgElement.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    }

    // Find all paths that represent cantons (they have id like "BE", "ZH", etc.)
    const allPaths = svgElement.querySelectorAll('path[id]');
    const pathsArray = Array.from(allPaths); // Convert to array for cleanup
    
    pathsArray.forEach((element) => {
      const id = element.getAttribute('id') || '';
      
      // Check if id is a direct canton code (uppercase)
      let cantonCode = null;
      
      // Direct match for canton codes (AG, BE, ZH, etc.)
      if (CANTON_MAPPINGS[id]) {
        cantonCode = CANTON_MAPPINGS[id];
      } else {
        // Try lowercase match
        const idLower = id.toLowerCase();
        for (const [key, code] of Object.entries(CANTON_MAPPINGS)) {
          if (idLower === key.toLowerCase() || idLower.includes(key.toLowerCase())) {
            cantonCode = code;
            break;
          }
        }
      }
      
      if (cantonCode) {
        const isSelected = selectedCantons.includes(cantonCode);
        
        // Set initial style - use !important to override inline attributes
        element.style.setProperty('cursor', 'pointer', 'important');
        element.style.setProperty('transition', 'all 0.2s ease', 'important');
        element.style.setProperty('fill', isSelected ? `${THEME.accent}30` : THEME.surface, 'important');
        element.style.setProperty('stroke', isSelected ? THEME.accent : THEME.border, 'important');
        element.style.setProperty('stroke-width', isSelected ? '2.5' : '1.5', 'important');
        
        // Remove fill/stroke attributes to let CSS take precedence
        element.removeAttribute('fill');
        element.removeAttribute('stroke');
        element.removeAttribute('stroke-width');
        
        // Add click handler
        const clickHandler = (e) => {
          e.stopPropagation();
          if (onCantonClick) {
            onCantonClick(cantonCode);
          }
        };
        
        element.addEventListener('click', clickHandler);
        
        // Add hover effects with tooltip
        const mouseEnterHandler = (e) => {
          if (!selectedCantons.includes(cantonCode)) {
            element.style.setProperty('fill', `${THEME.accent}20`, 'important');
            element.style.setProperty('stroke', THEME.accent, 'important');
            element.style.setProperty('stroke-width', '2.5', 'important');
          }
          
          // Show tooltip
          const cantonName = CANTON_NAMES[cantonCode] || cantonCode;
          setTooltip({
            show: true,
            text: cantonName,
            x: e.clientX || e.pageX || 0,
            y: e.clientY || e.pageY || 0,
          });
        };
        
        const mouseLeaveHandler = () => {
          if (!selectedCantons.includes(cantonCode)) {
            element.style.setProperty('fill', THEME.surface, 'important');
            element.style.setProperty('stroke', THEME.border, 'important');
            element.style.setProperty('stroke-width', '1.5', 'important');
          } else {
            element.style.setProperty('fill', `${THEME.accent}30`, 'important');
            element.style.setProperty('stroke', THEME.accent, 'important');
            element.style.setProperty('stroke-width', '2.5', 'important');
          }
          
          // Hide tooltip
          setTooltip({ show: false, text: '', x: 0, y: 0 });
        };
        
        const mouseMoveHandler = (e) => {
          if (tooltip.show) {
            setTooltip(prev => ({
              ...prev,
              x: e.clientX || e.pageX || 0,
              y: e.clientY || e.pageY || 0,
            }));
          }
        };
        
        element.addEventListener('mouseenter', mouseEnterHandler);
        element.addEventListener('mouseleave', mouseLeaveHandler);
        element.addEventListener('mousemove', mouseMoveHandler);
        
        // Store handlers for cleanup
        element._clickHandler = clickHandler;
        element._mouseEnterHandler = mouseEnterHandler;
        element._mouseLeaveHandler = mouseLeaveHandler;
        element._mouseMoveHandler = mouseMoveHandler;
      }
    });
    
    // Cleanup function
    return () => {
      pathsArray.forEach((element) => {
        if (element._clickHandler) {
          element.removeEventListener('click', element._clickHandler);
          delete element._clickHandler;
        }
        if (element._mouseEnterHandler) {
          element.removeEventListener('mouseenter', element._mouseEnterHandler);
          delete element._mouseEnterHandler;
        }
        if (element._mouseLeaveHandler) {
          element.removeEventListener('mouseleave', element._mouseLeaveHandler);
          delete element._mouseLeaveHandler;
        }
        if (element._mouseMoveHandler) {
          element.removeEventListener('mousemove', element._mouseMoveHandler);
          delete element._mouseMoveHandler;
        }
      });
    };
  }, [svgContent, selectedCantons, onCantonClick]);

  // Update styles when selectedCantons changes
  useEffect(() => {
    if (!containerRef.current) return;
    
    const svgElement = containerRef.current.querySelector('svg');
    if (!svgElement) return;
    
    const allPaths = svgElement.querySelectorAll('path[id]');
    
    allPaths.forEach((element) => {
      const id = element.getAttribute('id') || '';
      let cantonCode = null;
      
      // Direct match
      if (CANTON_MAPPINGS[id]) {
        cantonCode = CANTON_MAPPINGS[id];
      } else {
        const idLower = id.toLowerCase();
        for (const [key, code] of Object.entries(CANTON_MAPPINGS)) {
          if (idLower === key.toLowerCase() || idLower.includes(key.toLowerCase())) {
            cantonCode = code;
            break;
          }
        }
      }
      
      if (cantonCode) {
        const isSelected = selectedCantons.includes(cantonCode);
        element.style.setProperty('fill', isSelected ? `${THEME.accent}30` : THEME.surface, 'important');
        element.style.setProperty('stroke', isSelected ? THEME.accent : THEME.border, 'important');
        element.style.setProperty('stroke-width', isSelected ? '2.5' : '1.5', 'important');
      }
    });
  }, [selectedCantons]);

  if (loading) {
    return (
      <div 
        className="w-full p-8 border-2 flex items-center justify-center"
        style={{ 
          backgroundColor: THEME.card,
          borderColor: THEME.border,
          minHeight: '400px'
        }}
      >
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 mx-auto mb-4" style={{ borderColor: THEME.accent }}></div>
          <p className="text-sm" style={{ color: THEME.textMuted }}>Loading accurate map data...</p>
        </div>
      </div>
    );
  }

  if (error || !svgContent) {
    return (
      <div 
        className="w-full p-8 border-2"
        style={{ 
          backgroundColor: THEME.card,
          borderColor: THEME.border
        }}
      >
        <p className="text-sm text-center mb-2" style={{ color: THEME.textMuted }}>
          {error || 'Unable to load map data'}
        </p>
        <p className="text-xs text-center" style={{ color: THEME.textMuted }}>
          The SVG file should be in /public/switzerland-cantons.svg
        </p>
      </div>
    );
  }

  return (
    <div 
      className="w-full p-4 border-2 relative"
      style={{ 
        backgroundColor: THEME.card,
        borderColor: THEME.border
      }}
    >
      <div
        ref={containerRef}
        dangerouslySetInnerHTML={{ __html: svgContent }}
        className="switzerland-map"
      />
      <p className="text-xs mt-2 text-center" style={{ color: THEME.textMuted }}>
        Click on a canton to select/deselect it
      </p>
      
      {/* Tooltip */}
      {tooltip.show && (
        <div
          ref={tooltipRef}
          className="fixed z-50 px-3 py-1.5 rounded pointer-events-none whitespace-nowrap"
          style={{
            left: `${tooltip.x + 15}px`,
            top: `${tooltip.y - 35}px`,
            backgroundColor: THEME.accent,
            color: '#ffffff',
            fontSize: '12px',
            fontWeight: 'bold',
            boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
          }}
        >
          {tooltip.text}
        </div>
      )}
    </div>
  );
});

SwitzerlandMap.displayName = 'SwitzerlandMap';

export default SwitzerlandMap;
