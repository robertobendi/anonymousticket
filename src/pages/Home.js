import { useState, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FiMapPin, FiCalendar, FiUsers, FiSearch, FiRepeat, FiAlertCircle, FiPrinter, FiShield, FiCreditCard, FiGlobe, FiRadio, FiMenu, FiArrowRight, FiClock, FiArrowLeft } from 'react-icons/fi';
import { MdTrain, MdAccessTime, MdSwapHoriz } from 'react-icons/md';
import { getConnections, transformConnection, getPopularStations, searchStations } from '@lib/api';
import { generateAnonymousTicket, generateAnonymousPass, formatTicketForPrint, generateQRCodeData } from '@lib/ticketGenerator';
import { addTicketToWallet } from '@lib/wallet';
import { generateAndStoreKeyPair, signPayload, submitMintTransaction } from '@lib/crypto';
import { THEME } from '@lib/themeColors';
import AnimatedCard from '@components/ui/AnimatedCard';
import AnimatedButton from '@components/ui/AnimatedButton';
import MobileSidebar from '@components/ui/MobileSidebar';
import HeroGlobe from '@components/ui/HeroGlobe';

const SWISS_STATIONS = getPopularStations();

const Home = memo(() => {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  const [formData, setFormData] = useState({
    ticketType: 'single', // 'single' or 'pass'
    passType: 'daily', // 'daily', 'weekly', 'monthly', 'countrywide'
    origin: '',
    destination: '',
    date: new Date().toISOString().split('T')[0],
    passengers: 1,
    returnTrip: false,
    returnDate: '',
  });

  const [searchResults, setSearchResults] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState(null);
  const [originSuggestions, setOriginSuggestions] = useState([]);
  const [destinationSuggestions, setDestinationSuggestions] = useState([]);
  const [showOriginSuggestions, setShowOriginSuggestions] = useState(false);
  const [showDestinationSuggestions, setShowDestinationSuggestions] = useState(false);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const swapStations = () => {
    setFormData(prev => ({
      ...prev,
      origin: prev.destination,
      destination: prev.origin,
    }));
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    
    // For passes, skip connection search and go directly to purchase
    if (formData.ticketType === 'pass') {
      handlePurchasePass();
      return;
    }

    // For single tickets, validate and search
    if (!formData.origin || !formData.destination) {
      setSearchError('Please select origin and destination');
      return;
    }

    setIsSearching(true);
    setSearchError(null);
    setSearchResults(null);

    try {
      const searchDate = formData.date;
      const searchTime = new Date().toTimeString().slice(0, 5);

      const data = await getConnections(
        formData.origin,
        formData.destination,
        searchDate,
        searchTime
      );

      if (data.connections && data.connections.length > 0) {
        const transformed = data.connections
          .slice(0, 10)
          .map((conn, index) => transformConnection(conn, index));
        
        setSearchResults(transformed);
      } else {
        setSearchError('No connections found for this route');
      }
    } catch (error) {
      console.error('Search error:', error);
      setSearchError('Failed to fetch connections. Please try again.');
    } finally {
      setIsSearching(false);
    }
  };

  const handlePurchasePass = async () => {
    try {
      const passPrices = {
        daily: 75,
        weekly: 200,
        monthly: 600,
        countrywide: 300
      };

      const price = passPrices[formData.passType];
      
      // Generate key pair (public key = ticketId)
      console.log('🔑 Generating key pair for pass...');
      const { publicKeyHex, privateKey } = await generateAndStoreKeyPair();
      console.log('✅ Key pair generated. Public key (ticketId):', publicKeyHex.substring(0, 16) + '...');

      // Calculate duration based on pass type (in milliseconds)
      const durationMap = {
        daily: 24 * 60 * 60 * 1000, // 24 hours
        weekly: 7 * 24 * 60 * 60 * 1000, // 7 days
        monthly: 30 * 24 * 60 * 60 * 1000, // 30 days
        countrywide: 365 * 24 * 60 * 60 * 1000, // 1 year
      };
      const duration = durationMap[formData.passType] || durationMap.daily;

      // Create payload
      const payload = {
        price: `${price.toFixed(2)} CHF`,
        timestamp: Date.now(),
        deviceId: 'CLI_KIOSK', // Kiosk device ID
        duration: duration,
      };

      // Sign payload with private key
      console.log('✍️ Signing payload...');
      const signature = signPayload(privateKey, payload);
      console.log('✅ Payload signed. Signature length:', signature.length, 'hex chars');
      console.log('✅ Full signature:', signature);

      // Submit MINT transaction to blockchain
      console.log('📤 Submitting MINT transaction to blockchain...');
      await submitMintTransaction({
        ticketId: publicKeyHex,
        payload: payload,
        signature: signature,
      });

      // Generate pass with ticketId = publicKeyHex
      const pass = generateAnonymousPass({
        type: formData.passType,
        date: formData.date,
        price: price,
      });
      
      // Set ticketId to public key hex
      pass.id = publicKeyHex;
      pass.ticketId = publicKeyHex;

      // Add to wallet
      addTicketToWallet(pass);
      setPurchasedTicket(pass);
      
      console.log('✅ Pass purchased and added to wallet!');
    } catch (error) {
      console.error('❌ Error purchasing pass:', error);
      alert('Error purchasing pass: ' + error.message);
    }
  };

  // Handle station input with autocomplete
  const handleStationInput = async (field, value) => {
    handleInputChange(field, value);
    
    if (value.length >= 2) {
      const suggestions = await searchStations(value);
      if (field === 'origin') {
        setOriginSuggestions(suggestions);
        setShowOriginSuggestions(true);
      } else {
        setDestinationSuggestions(suggestions);
        setShowDestinationSuggestions(true);
      }
    } else {
      if (field === 'origin') {
        setShowOriginSuggestions(false);
      } else {
        setShowDestinationSuggestions(false);
      }
    }
  };

  const selectStation = (field, station) => {
    handleInputChange(field, station.name);
    if (field === 'origin') {
      setShowOriginSuggestions(false);
    } else {
      setShowDestinationSuggestions(false);
    }
  };

  const [purchasedTicket, setPurchasedTicket] = useState(null);

  const handleBook = async (trip) => {
    try {
      const price = 45.00; // Placeholder - would come from API
      
      // Generate key pair (public key = ticketId)
      console.log('🔑 Generating key pair for ticket...');
      const { publicKeyHex, privateKey } = await generateAndStoreKeyPair();
      console.log('✅ Key pair generated. Public key (ticketId):', publicKeyHex.substring(0, 16) + '...');

      // Calculate duration (e.g., 2 hours for a single trip ticket)
      const duration = 2 * 60 * 60 * 1000; // 2 hours in milliseconds

      // Create payload
      const payload = {
        price: `${price.toFixed(2)} CHF`,
        timestamp: Date.now(),
        deviceId: 'CLI_KIOSK', // Kiosk device ID
        duration: duration,
      };

      // Sign payload with private key
      console.log('✍️ Signing payload...');
      const signature = signPayload(privateKey, payload);
      console.log('✅ Payload signed. Signature length:', signature.length, 'hex chars');
      console.log('✅ Full signature:', signature);

      // Submit MINT transaction to blockchain
      console.log('📤 Submitting MINT transaction to blockchain...');
      await submitMintTransaction({
        ticketId: publicKeyHex,
        payload: payload,
        signature: signature,
      });

      // Generate anonymous ticket (no personal data required)
      const ticketData = {
        origin: formData.origin,
        destination: formData.destination,
        date: formData.date,
        departure: trip.departure,
        arrival: trip.arrival,
        train: trip.train,
        price: price,
        type: 'single',
        class: '2nd',
      };

      const ticket = generateAnonymousTicket(ticketData);
      
      // Set ticketId to public key hex
      ticket.id = publicKeyHex;
      ticket.ticketId = publicKeyHex;
      
      // Add to wallet
      addTicketToWallet(ticket);
      setPurchasedTicket(ticket);
      
      console.log('✅ Ticket purchased and added to wallet!');
    } catch (error) {
      console.error('❌ Error purchasing ticket:', error);
      alert('Error purchasing ticket: ' + error.message);
    }
  };

  const handlePrintTicket = () => {
    if (!purchasedTicket) return;
    
    const printWindow = window.open('', '_blank');
    const printContent = formatTicketForPrint(purchasedTicket);
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };

  return (
    <motion.div 
      className="min-h-screen" 
      style={{ backgroundColor: THEME.background }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {/* Hero Section - Beautiful Train Station Background */}
      <motion.section 
        className="text-white relative overflow-hidden" 
        style={{ 
          minHeight: '100vh',
          paddingTop: 'calc(env(safe-area-inset-top) + 1rem)'
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
      >
        {/* Train Station Background Image */}
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: 'url(/wp.jpg)',
            backgroundPosition: 'center center'
          }}
        />
        
        {/* Elegant gradient overlay - SBB inspired */}
        <div 
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(to bottom, rgba(235,0,0,0.85) 0%, rgba(235,0,0,0.75) 30%, rgba(0,0,0,0.4) 70%, rgba(0,0,0,0.6) 100%)'
          }}
        />
        
        {/* Red Navbar Overlay - SBB Style */}
        <div className="relative z-20">
          <div className="max-w-6xl mx-auto px-3 sm:px-4 py-3 sm:py-4">
            <div className="flex items-center justify-between gap-2 sm:gap-3">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                <img 
                  src="/logo.png" 
                  alt="NodePass" 
                  className="h-8 w-auto sm:h-10 flex-shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <h1 className="text-lg sm:text-xl md:text-2xl font-bold tracking-tight truncate">NodePass</h1>
                  <p className="text-xs sm:text-sm opacity-90 hidden sm:block">Anonymous ticket system</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3 flex-shrink-0">
                {/* Mobile Menu Button */}
                <motion.button
                  onClick={() => setSidebarOpen(true)}
                  className="md:hidden p-2 min-w-[44px] min-h-[44px] flex items-center justify-center text-white"
                  whileHover={{ scale: 1.1, rotate: 90 }}
                  whileTap={{ scale: 0.9 }}
                  aria-label="Open menu"
                >
                  <FiMenu size={24} />
                </motion.button>
                
                {/* Desktop Buttons - SBB Style */}
                <motion.button
                  onClick={() => navigate('/wallet')}
                  className="hidden md:flex items-center gap-2 px-4 py-2.5 text-white font-bold text-xs uppercase min-h-[44px] rounded-lg border-2 transition-all"
                  style={{ 
                    backgroundColor: 'rgba(255,255,255,0.15)',
                    borderColor: 'rgba(255,255,255,0.3)',
                    borderRadius: '8px'
                  }}
                  whileHover={{ 
                    backgroundColor: 'rgba(255,255,255,0.2)',
                    borderColor: '#ffffff'
                  }}
                  whileTap={{ scale: 0.95 }}
                >
                  <FiCreditCard size={16} />
                  Wallet
                </motion.button>
                <motion.button
                  onClick={() => navigate('/verify')}
                  className="hidden md:flex items-center gap-2 px-4 py-2.5 text-white font-bold text-xs uppercase min-h-[44px] rounded-lg border-2 transition-all"
                  style={{ 
                    backgroundColor: 'rgba(255,255,255,0.15)',
                    borderColor: 'rgba(255,255,255,0.3)',
                    borderRadius: '8px'
                  }}
                  whileHover={{ 
                    backgroundColor: 'rgba(255,255,255,0.2)',
                    borderColor: '#ffffff'
                  }}
                  whileTap={{ scale: 0.95 }}
                >
                  <FiRadio size={16} />
                  Verify
                </motion.button>
                <div className="hidden lg:flex items-center gap-2 px-4 py-2.5 rounded-lg border-2" style={{ 
                  backgroundColor: 'rgba(255,255,255,0.15)',
                  borderColor: 'rgba(255,255,255,0.3)',
                  borderRadius: '8px'
                }}>
                  <FiShield size={18} />
                  <span className="text-xs font-bold">100% Anonymous</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Hero Content - Centered and Beautiful */}
        <div className="relative z-10 flex items-center justify-center min-h-[calc(100vh-120px)] pb-20">
          <div className="max-w-4xl mx-auto px-3 sm:px-4 text-center">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.7, ease: "easeOut" }}
            >
              <h2 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold mb-4 sm:mb-6 tracking-tight leading-tight">
                Anonymous
                <br />
                <span className="text-white">Tickets</span>
              </h2>
              <motion.p 
                className="text-lg sm:text-xl md:text-2xl opacity-95 max-w-2xl mx-auto mb-8 sm:mb-10 font-normal"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, duration: 0.7 }}
                role="text"
                aria-label="Key features: No personal data required, Print at Home, Multiple checks, Copy-safe"
              >
                No personal data required • Print@Home • Multiple checks • Copy-safe
              </motion.p>
              <motion.div 
                className="flex items-center justify-center gap-3 sm:gap-4 flex-wrap"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7, duration: 0.7 }}
              >
                <motion.button
                  className="flex items-center gap-2.5 px-5 py-3.5 rounded-lg border-2 min-h-[48px] transition-all"
                  style={{
                    backgroundColor: THEME.card,
                    borderColor: '#EB0000',
                    color: THEME.text,
                    borderRadius: '8px'
                  }}
                  whileHover={{ 
                    backgroundColor: '#EB0000',
                    color: '#ffffff',
                    scale: 1.02
                  }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ duration: 0.2 }}
                  role="status"
                  aria-label="100% Anonymous"
                >
                  <FiShield size={20} aria-hidden="true" style={{ color: 'inherit' }} />
                  <span className="text-sm font-bold uppercase tracking-wide">100% Anonymous</span>
                </motion.button>
                <motion.button
                  className="flex items-center gap-2.5 px-5 py-3.5 rounded-lg border-2 min-h-[48px] transition-all"
                  style={{
                    backgroundColor: THEME.card,
                    borderColor: '#EB0000',
                    color: THEME.text,
                    borderRadius: '8px'
                  }}
                  whileHover={{ 
                    backgroundColor: '#EB0000',
                    color: '#ffffff',
                    scale: 1.02
                  }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ duration: 0.2 }}
                  role="status"
                  aria-label="NFC Enabled"
                >
                  <FiCreditCard size={20} aria-hidden="true" style={{ color: 'inherit' }} />
                  <span className="text-sm font-bold uppercase tracking-wide">NFC Enabled</span>
                </motion.button>
                <motion.button
                  className="flex items-center gap-2.5 px-5 py-3.5 rounded-lg border-2 min-h-[48px] transition-all"
                  style={{
                    backgroundColor: THEME.card,
                    borderColor: '#EB0000',
                    color: THEME.text,
                    borderRadius: '8px'
                  }}
                  whileHover={{ 
                    backgroundColor: '#EB0000',
                    color: '#ffffff',
                    scale: 1.02
                  }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ duration: 0.2 }}
                  role="status"
                  aria-label="Switzerland"
                >
                  <FiGlobe size={20} aria-hidden="true" style={{ color: 'inherit' }} />
                  <span className="text-sm font-bold uppercase tracking-wide">Switzerland</span>
                </motion.button>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </motion.section>

      {/* Plus Globe Wallpaper Section - Black Background with Form Overlay */}
      <motion.section 
        className="relative overflow-hidden"
        style={{ 
          backgroundColor: '#000000',
          backgroundImage: `radial-gradient(circle at 2px 2px, rgba(255,255,255,0.05) 1px, transparent 0)`,
          backgroundSize: '40px 40px',
          minHeight: '600px',
          paddingTop: '2rem',
          paddingBottom: '2rem'
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
      >
        {/* Subtle Globe Wallpaper - Positioned Right, Overflowing */}
        <div className="absolute inset-0 opacity-20 overflow-visible">
          <div className="absolute right-0 top-1/2 -translate-y-1/2 w-[150%] sm:w-[120%] md:w-[100%] lg:w-[80%] h-[150%] translate-x-[20%]">
            <HeroGlobe />
          </div>
        </div>
        
        {/* Booking Form Overlay */}
        <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6">
        <AnimatedCard className="p-4 sm:p-6 mb-4 sm:mb-6 rounded-lg" style={{ 
          backgroundColor: THEME.card, 
          borderRadius: '8px',
          border: `1px solid ${THEME.border}`,
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)',
          position: 'relative',
          zIndex: 10
        }}>
          <form onSubmit={handleSearch} className="space-y-4 sm:space-y-6" style={{ backgroundColor: 'transparent' }}>
            {/* Ticket Type Selector - SBB Style */}
            <div>
              <label className="block text-sm font-bold mb-3 uppercase tracking-wide" style={{ color: THEME.text }}>
                Ticket Type
              </label>
              <div className="grid grid-cols-2 gap-3">
                <motion.button
                  type="button"
                  onClick={() => handleInputChange('ticketType', 'single')}
                  className="p-4 border-2 flex items-center justify-center gap-2 font-bold text-sm uppercase min-h-[56px] rounded-lg transition-all"
                  style={{
                    borderColor: formData.ticketType === 'single' ? THEME.accent : '#666666',
                    borderWidth: formData.ticketType === 'single' ? '3px' : '2px',
                    backgroundColor: formData.ticketType === 'single' ? `${THEME.accent}20` : '#1a1a1a',
                    color: THEME.text,
                    borderRadius: '8px'
                  }}
                  whileHover={formData.ticketType !== 'single' ? { 
                    borderColor: THEME.accent,
                    backgroundColor: '#2a2a2a'
                  } : {}}
                  whileTap={{ scale: 0.98 }}
                  aria-label="Select single ticket"
                  aria-pressed={formData.ticketType === 'single'}
                >
                  <MdTrain size={20} style={{ color: formData.ticketType === 'single' ? THEME.accent : THEME.textMuted }} aria-hidden="true" />
                  <span>Single Ticket</span>
                </motion.button>
                <motion.button
                  type="button"
                  onClick={() => handleInputChange('ticketType', 'pass')}
                  className="p-4 border-2 flex items-center justify-center gap-2 font-bold text-sm uppercase min-h-[56px] rounded-lg transition-all"
                  style={{
                    borderColor: formData.ticketType === 'pass' ? THEME.accent : '#666666',
                    borderWidth: formData.ticketType === 'pass' ? '3px' : '2px',
                    backgroundColor: formData.ticketType === 'pass' ? `${THEME.accent}20` : '#1a1a1a',
                    color: THEME.text,
                    borderRadius: '8px'
                  }}
                  whileHover={formData.ticketType !== 'pass' ? { 
                    borderColor: THEME.accent,
                    backgroundColor: '#2a2a2a'
                  } : {}}
                  whileTap={{ scale: 0.98 }}
                  aria-label="Select pass"
                  aria-pressed={formData.ticketType === 'pass'}
                >
                  <FiGlobe size={20} style={{ color: formData.ticketType === 'pass' ? THEME.accent : THEME.textMuted }} aria-hidden="true" />
                  <span>Pass</span>
                </motion.button>
              </div>
            </div>

            {/* Pass Type Selector (only for passes) */}
            {formData.ticketType === 'pass' && (
              <div>
                <label className="block text-sm font-bold mb-3" style={{ color: THEME.text }}>
                  Pass Type
                </label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3">
                  {[
                    { value: 'daily', label: 'Daily', price: 75 },
                    { value: 'weekly', label: 'Weekly', price: 200 },
                    { value: 'monthly', label: 'Monthly', price: 600 },
                    { value: 'countrywide', label: 'Country-wide', price: 300 }
                  ].map((pass) => (
                    <motion.button
                      key={pass.value}
                      type="button"
                      onClick={() => handleInputChange('passType', pass.value)}
                      className="p-4 border-2 text-center min-h-[56px] rounded-lg transition-all"
                      whileTap={{ scale: 0.98 }}
                      style={{
                        borderColor: formData.passType === pass.value ? THEME.accent : '#666666',
                        borderWidth: formData.passType === pass.value ? '3px' : '2px',
                        backgroundColor: formData.passType === pass.value ? `${THEME.accent}20` : '#1a1a1a',
                        color: THEME.text,
                        borderRadius: '8px'
                      }}
                      onMouseEnter={(e) => {
                        if (formData.passType !== pass.value) {
                          e.target.style.borderColor = THEME.accent;
                          e.target.style.backgroundColor = '#2a2a2a';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (formData.passType !== pass.value) {
                          e.target.style.borderColor = '#666666';
                          e.target.style.backgroundColor = '#1a1a1a';
                        }
                      }}
                      aria-pressed={formData.passType === pass.value}
                    >
                      <div className="font-bold text-sm mb-1">{pass.label}</div>
                      <div className="text-xs font-medium" style={{ color: formData.passType === pass.value ? THEME.accent : THEME.textMuted }}>
                        CHF {pass.price}
                      </div>
                    </motion.button>
                  ))}
                </div>
              </div>
            )}

            {/* Origin and Destination - SBB Style with Icons */}
            {(formData.ticketType === 'single' || (formData.ticketType === 'pass' && formData.passType !== 'countrywide')) && (
            <div className="grid md:grid-cols-2 gap-4">
              <div className="relative">
                <label className="block text-sm font-bold mb-2 uppercase tracking-wide" style={{ color: THEME.text }}>
                  From
                </label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 z-10" style={{ color: '#666666' }}>
                    <FiMapPin size={20} aria-hidden="true" />
                  </div>
                  <input
                    type="text"
                    value={formData.origin}
                    onChange={(e) => handleStationInput('origin', e.target.value)}
                    onFocus={() => formData.origin.length >= 2 && setShowOriginSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowOriginSuggestions(false), 200)}
                    placeholder="Enter station name"
                    className="w-full pl-12 pr-4 py-3.5 border-2 focus:outline-none font-normal text-base rounded-lg"
                    style={{ 
                      borderColor: THEME.border, 
                      backgroundColor: THEME.card, 
                      color: THEME.text,
                      borderRadius: '8px',
                      paddingLeft: '48px'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = THEME.accent;
                      e.target.style.borderWidth = '3px';
                      e.target.style.backgroundColor = THEME.surfaceHover;
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = THEME.border;
                      e.target.style.borderWidth = '2px';
                      e.target.style.backgroundColor = THEME.card;
                    }}
                    required
                    aria-label="Origin station"
                    aria-describedby="origin-description"
                    aria-autocomplete="list"
                    aria-expanded={showOriginSuggestions}
                    aria-controls="origin-suggestions"
                  />
                  <span id="origin-description" className="sr-only">Enter the departure station name</span>
                  {showOriginSuggestions && originSuggestions.length > 0 && (
                    <div 
                      id="origin-suggestions"
                      className="absolute z-50 w-full mt-2 border-2 max-h-48 overflow-y-auto rounded-lg shadow-lg" 
                      style={{ 
                        borderColor: THEME.border, 
                        backgroundColor: THEME.card, 
                        borderRadius: '8px',
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.8)',
                        border: `2px solid ${THEME.border}`
                      }}
                      role="listbox"
                      aria-label="Origin station suggestions"
                    >
                      {originSuggestions.slice(0, 5).map((station, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => selectStation('origin', station)}
                          className="w-full text-left px-4 py-3 rounded flex items-center gap-2"
                      style={{ 
                        color: THEME.text, 
                        backgroundColor: THEME.card,
                        borderRadius: '4px'
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.backgroundColor = THEME.surfaceHover;
                        e.target.style.color = THEME.accent;
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.backgroundColor = THEME.card;
                        e.target.style.color = THEME.text;
                      }}
                          role="option"
                          aria-label={`Select ${station.name} as origin`}
                        >
                          <FiMapPin size={16} style={{ color: '#666666' }} aria-hidden="true" />
                          <span>{station.name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="relative">
                <button
                  type="button"
                  onClick={swapStations}
                  className="absolute right-2 top-9 p-2 rounded-lg hover:bg-gray-100 transition-colors z-10"
                  style={{ color: THEME.accent }}
                  aria-label="Swap stations"
                  title="Swap origin and destination"
                >
                  <FiRepeat size={20} />
                </button>
                <label className="block text-sm font-bold mb-2 uppercase tracking-wide" style={{ color: THEME.text }}>
                  To
                </label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 z-10" style={{ color: '#666666' }}>
                    <FiMapPin size={20} aria-hidden="true" />
                  </div>
                  <input
                    type="text"
                    value={formData.destination}
                    onChange={(e) => handleStationInput('destination', e.target.value)}
                    onFocus={() => formData.destination.length >= 2 && setShowDestinationSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowDestinationSuggestions(false), 200)}
                    placeholder="Enter station name"
                    className="w-full pl-12 pr-4 py-3.5 border-2 focus:outline-none font-normal text-base rounded-lg"
                    style={{ 
                      borderColor: THEME.border, 
                      backgroundColor: THEME.card, 
                      color: THEME.text,
                      borderRadius: '8px',
                      paddingLeft: '48px'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = THEME.accent;
                      e.target.style.borderWidth = '3px';
                      e.target.style.backgroundColor = THEME.surfaceHover;
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = THEME.border;
                      e.target.style.borderWidth = '2px';
                      e.target.style.backgroundColor = THEME.card;
                    }}
                    required
                    aria-label="Destination station"
                    aria-describedby="destination-description"
                    aria-autocomplete="list"
                    aria-expanded={showDestinationSuggestions}
                    aria-controls="destination-suggestions"
                  />
                  <span id="destination-description" className="sr-only">Enter the arrival station name</span>
                  {showDestinationSuggestions && destinationSuggestions.length > 0 && (
                    <div 
                      id="destination-suggestions"
                      className="absolute z-50 w-full mt-2 border-2 max-h-48 overflow-y-auto rounded-lg shadow-lg" 
                      style={{ 
                        borderColor: THEME.border, 
                        backgroundColor: THEME.card, 
                        borderRadius: '8px',
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.8)',
                        border: `2px solid ${THEME.border}`
                      }}
                      role="listbox"
                      aria-label="Destination station suggestions"
                    >
                      {destinationSuggestions.slice(0, 5).map((station, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => selectStation('destination', station)}
                          className="w-full text-left px-4 py-3 rounded flex items-center gap-2"
                      style={{ 
                        color: THEME.text, 
                        backgroundColor: THEME.card,
                        borderRadius: '4px'
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.backgroundColor = THEME.surfaceHover;
                        e.target.style.color = THEME.accent;
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.backgroundColor = THEME.card;
                        e.target.style.color = THEME.text;
                      }}
                          role="option"
                          aria-label={`Select ${station.name} as destination`}
                        >
                          <FiMapPin size={16} style={{ color: '#666666' }} aria-hidden="true" />
                          <span>{station.name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
            )}

            {/* Date and Passengers - SBB Style with Icons */}
            <div className="grid md:grid-cols-3 gap-4">
              <div className="relative">
                <label className="block text-sm font-bold mb-2 uppercase tracking-wide" style={{ color: THEME.text }}>
                  Date
                </label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 z-10" style={{ color: '#666666' }}>
                    <FiCalendar size={20} aria-hidden="true" />
                  </div>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => handleInputChange('date', e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full pl-12 pr-4 py-3.5 border-2 focus:outline-none font-normal text-base rounded-lg"
                    style={{ 
                      borderColor: THEME.border, 
                      backgroundColor: THEME.card, 
                      color: THEME.text, 
                      minHeight: '48px', 
                      borderRadius: '8px',
                      paddingLeft: '48px'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = THEME.accent;
                      e.target.style.borderWidth = '3px';
                      e.target.style.backgroundColor = THEME.surfaceHover;
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = THEME.border;
                      e.target.style.borderWidth = '2px';
                      e.target.style.backgroundColor = THEME.card;
                    }}
                    required
                    aria-label="Travel date"
                  />
                </div>
              </div>

              <div className="relative">
                <label className="block text-sm font-bold mb-2 uppercase tracking-wide" style={{ color: THEME.text }}>
                  Passengers
                </label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 z-10 pointer-events-none" style={{ color: '#666666' }}>
                    <FiUsers size={20} aria-hidden="true" />
                  </div>
                  <select
                    value={formData.passengers}
                    onChange={(e) => handleInputChange('passengers', parseInt(e.target.value))}
                    className="w-full pl-12 pr-10 py-3.5 border-2 focus:outline-none font-normal text-base rounded-lg appearance-none bg-white"
                    style={{ 
                      borderColor: THEME.border, 
                      backgroundColor: THEME.card, 
                      color: THEME.text, 
                      minHeight: '48px', 
                      borderRadius: '8px',
                      paddingLeft: '48px',
                      backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'12\' viewBox=\'0 0 12 12\'%3E%3Cpath fill=\'%23ffffff\' d=\'M6 9L1 4h10z\'/%3E%3C/svg%3E")',
                      backgroundRepeat: 'no-repeat',
                      backgroundPosition: 'right 16px center'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = THEME.accent;
                      e.target.style.borderWidth = '3px';
                      e.target.style.backgroundColor = THEME.surfaceHover;
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = THEME.border;
                      e.target.style.borderWidth = '2px';
                      e.target.style.backgroundColor = THEME.card;
                    }}
                    aria-label="Number of passengers"
                  >
                    {[1, 2, 3, 4, 5, 6].map(num => (
                      <option key={num} value={num} style={{ backgroundColor: '#1a1a1a', color: '#ffffff' }}>
                        {num} {num === 1 ? 'passenger' : 'passengers'}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-end">
                <label className="flex items-center gap-3 cursor-pointer group" style={{ paddingBottom: '4px' }}>
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={formData.returnTrip}
                      onChange={(e) => handleInputChange('returnTrip', e.target.checked)}
                      className="sr-only"
                      aria-label="Return trip"
                    />
                    <div 
                      className="w-6 h-6 border-2 rounded flex items-center justify-center transition-all"
                      style={{
                        borderColor: formData.returnTrip ? THEME.accent : '#666666',
                        backgroundColor: formData.returnTrip ? THEME.accent : 'transparent',
                        borderRadius: '4px'
                      }}
                    >
                      {formData.returnTrip && (
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M11.6667 3.5L5.25 9.91667L2.33334 7" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                    </div>
                  </div>
                  <span className="text-sm font-medium" style={{ color: THEME.text }}>Return trip</span>
                </label>
              </div>
            </div>

            {formData.returnTrip && (
              <div className="relative">
                <label className="block text-sm font-bold mb-2 uppercase tracking-wide" style={{ color: THEME.text }}>
                  Return Date
                </label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 z-10" style={{ color: '#666666' }}>
                    <FiCalendar size={20} aria-hidden="true" />
                  </div>
                  <input
                    type="date"
                    value={formData.returnDate}
                    onChange={(e) => handleInputChange('returnDate', e.target.value)}
                    min={formData.date}
                    className="w-full pl-12 pr-4 py-3.5 border-2 focus:outline-none font-normal text-base rounded-lg"
                    style={{ 
                      borderColor: THEME.border, 
                      backgroundColor: THEME.card, 
                      color: THEME.text,
                      borderRadius: '8px',
                      paddingLeft: '48px'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = THEME.accent;
                      e.target.style.borderWidth = '3px';
                      e.target.style.backgroundColor = THEME.surfaceHover;
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = THEME.border;
                      e.target.style.borderWidth = '2px';
                      e.target.style.backgroundColor = THEME.card;
                    }}
                    required={formData.returnTrip}
                    aria-label="Return date"
                  />
                </div>
              </div>
            )}

            {/* Search Button - SBB Style */}
            <motion.button
              type="submit"
              disabled={isSearching}
              className="w-full px-6 py-4 text-base font-bold uppercase tracking-wide rounded-lg flex items-center justify-center gap-2 min-h-[56px] transition-all"
              style={{
                backgroundColor: isSearching ? '#999999' : THEME.accent,
                color: '#ffffff',
                borderRadius: '8px',
                border: 'none',
                cursor: isSearching ? 'not-allowed' : 'pointer'
              }}
              whileHover={!isSearching ? { backgroundColor: '#d10000' } : {}}
              whileTap={!isSearching ? { scale: 0.98 } : {}}
              aria-label={isSearching ? 'Searching connections' : formData.ticketType === 'pass' ? 'Purchase pass' : 'Search train connections'}
            >
              {isSearching ? (
                <>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    style={{ width: '20px', height: '20px', border: '2px solid white', borderTopColor: 'transparent', borderRadius: '50%' }}
                  />
                  <span>Searching...</span>
                </>
              ) : (
                <>
                  <FiSearch size={20} aria-hidden="true" />
                  <span>{formData.ticketType === 'pass' ? 'Purchase Pass' : 'Search Connections'}</span>
                </>
              )}
            </motion.button>

            {/* Error Message - SBB Self-Explanatory principle */}
            <AnimatePresence>
              {searchError && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="flex items-center gap-2 p-3 border-2 rounded-lg" 
                  style={{ backgroundColor: `${THEME.accent}15`, borderColor: THEME.accent, borderRadius: '8px' }}
                  role="alert"
                  aria-live="assertive"
                >
                  <FiAlertCircle style={{ color: THEME.accent }} aria-hidden="true" />
                  <span className="text-sm" style={{ color: THEME.accent }}>{searchError}</span>
                </motion.div>
              )}
            </AnimatePresence>
          </form>
        </AnimatedCard>
        
        {/* Search Results - EXACTLY matching form style */}
        <AnimatePresence>
          {searchResults && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="mt-6"
              style={{ position: 'relative', zIndex: 10 }}
            >
              <div className="mb-6">
                <h2 className="text-xl font-bold mb-2 uppercase tracking-wide" style={{ color: THEME.text }}>
                  Connections
                </h2>
                <p className="text-sm" style={{ color: THEME.textMuted }}>
                  {formData.origin} → {formData.destination}
                </p>
              </div>
              <div className="space-y-4">
                {searchResults.map((trip, index) => (
                  <AnimatedCard
                    key={trip.id}
                    delay={index * 0.05}
                    className="p-4 sm:p-6 mb-4 sm:mb-6 rounded-lg"
                    style={{ 
                      backgroundColor: THEME.card, 
                      borderRadius: '8px',
                      border: `1px solid ${THEME.border}`,
                      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)',
                      position: 'relative',
                      zIndex: 10
                    }}
                    whileHover={{ 
                      backgroundColor: THEME.surfaceHover,
                      scale: 1.01
                    }}
                  >
                      {/* Time and Route Info - SBB Style with Icons */}
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-5 pb-5" style={{ borderBottom: `1px solid ${THEME.border}` }}>
                        <div className="flex items-center gap-4 sm:gap-6">
                          <div className="text-center sm:text-left">
                            <div className="flex items-center gap-2 mb-1">
                              <MdAccessTime size={20} style={{ color: THEME.accent }} aria-hidden="true" />
                              <div className="text-3xl sm:text-4xl font-bold" style={{ color: THEME.text }}>{trip.departure}</div>
                            </div>
                            <div className="flex items-center gap-1.5 text-xs uppercase tracking-wide" style={{ color: THEME.textMuted }}>
                              <FiMapPin size={12} aria-hidden="true" />
                              <span>{formData.origin}</span>
                            </div>
                          </div>
                          <div className="flex-shrink-0">
                            <MdSwapHoriz size={28} style={{ color: THEME.accent }} aria-hidden="true" />
                          </div>
                          <div className="text-center sm:text-left">
                            <div className="flex items-center gap-2 mb-1">
                              <MdAccessTime size={20} style={{ color: THEME.accent }} aria-hidden="true" />
                              <div className="text-3xl sm:text-4xl font-bold" style={{ color: THEME.text }}>{trip.arrival}</div>
                            </div>
                            <div className="flex items-center gap-1.5 text-xs uppercase tracking-wide" style={{ color: THEME.textMuted }}>
                              <FiMapPin size={12} aria-hidden="true" />
                              <span>{formData.destination}</span>
                            </div>
                          </div>
                        </div>
                        <div className="text-center sm:text-right sm:min-w-[120px]">
                          <div className="flex items-center justify-center sm:justify-end gap-2 mb-1">
                            <FiCreditCard size={18} style={{ color: THEME.accent }} aria-hidden="true" />
                            <div className="text-lg sm:text-xl font-bold" style={{ color: THEME.accent }}>
                              {trip.price ? `CHF ${trip.price.toFixed(2)}` : 'Price on sbb.ch'}
                            </div>
                          </div>
                          {trip.price && formData.passengers > 1 && (
                            <div className="text-xs" style={{ color: THEME.textMuted }}>
                              CHF {(trip.price * formData.passengers).toFixed(2)} total
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* Train Info - SBB Style with Icons */}
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-sm">
                          <div className="flex items-center gap-2">
                            <MdTrain size={18} style={{ color: THEME.accent }} aria-hidden="true" />
                            <span className="font-bold uppercase tracking-wide" style={{ color: THEME.accent }}>{trip.train}</span>
                          </div>
                          <div className="w-px h-4" style={{ backgroundColor: THEME.border }}></div>
                          <div className="flex items-center gap-1.5">
                            <FiClock size={14} style={{ color: THEME.textMuted }} aria-hidden="true" />
                            <span style={{ color: THEME.textMuted }}>{trip.duration}</span>
                          </div>
                          <div className="w-px h-4" style={{ backgroundColor: THEME.border }}></div>
                          <div className="flex items-center gap-1.5">
                            <FiArrowRight size={14} style={{ color: THEME.textMuted }} aria-hidden="true" />
                            <span style={{ color: THEME.textMuted }}>
                              {trip.changes === 0 ? 'Direct' : `${trip.changes} change${trip.changes > 1 ? 's' : ''}`}
                            </span>
                          </div>
                        </div>
                        <AnimatedButton
                          onClick={() => handleBook(trip)}
                          variant="primary"
                          className="px-6 py-3 text-sm font-bold uppercase tracking-wide rounded-lg min-h-[48px] flex items-center gap-2"
                          aria-label={`Book trip from ${formData.origin} to ${formData.destination} departing at ${trip.departure}`}
                        >
                          <FiCreditCard size={16} aria-hidden="true" />
                          <span>Book Now</span>
                        </AnimatedButton>
                      </div>
                  </AnimatedCard>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Purchased Anonymous Ticket */}
        <AnimatePresence>
          {purchasedTicket && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="p-4 mb-6 rounded-lg" 
              style={{ backgroundColor: THEME.card, border: `2px solid ${THEME.accent}`, borderRadius: '8px' }}
              role="region"
              aria-label="Purchased ticket information"
            >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <FiShield style={{ color: THEME.accent }} />
                <h2 className="text-lg font-bold" style={{ color: THEME.text }}>
                  Your Anonymous Ticket
                </h2>
              </div>
              <AnimatedButton
                onClick={handlePrintTicket}
                variant="primary"
                className="px-4 py-2 text-sm rounded-lg"
                icon={FiPrinter}
                aria-label="Print ticket"
              >
                Print Ticket
              </AnimatedButton>
            </div>

            <div className="space-y-3">
              <div className="p-4" style={{ backgroundColor: THEME.surface }}>
                {purchasedTicket.type === 'pass' ? (
                  <>
                    <div className="text-center mb-4">
                      <div className="text-2xl font-bold mb-1" style={{ color: THEME.text }}>
                        {purchasedTicket.passType === 'countrywide' ? 'Switzerland' : 
                         purchasedTicket.passType === 'daily' ? 'Daily Pass' :
                         purchasedTicket.passType === 'weekly' ? 'Weekly Pass' : 'Monthly Pass'}
                      </div>
                      <div className="text-sm" style={{ color: THEME.textMuted }}>
                        {purchasedTicket.passType === 'countrywide' ? 'Valid throughout Switzerland' :
                         purchasedTicket.passType === 'daily' ? 'Valid for 1 day' :
                         purchasedTicket.passType === 'weekly' ? 'Valid for 7 days' : 'Valid for 1 month'}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                      <div>
                        <div style={{ color: THEME.textMuted }}>Valid From</div>
                        <div className="font-bold" style={{ color: THEME.text }}>
                          {new Date(purchasedTicket.validFrom).toLocaleDateString('de-CH')}
                        </div>
                      </div>
                      <div>
                        <div style={{ color: THEME.textMuted }}>Valid Until</div>
                        <div className="font-bold" style={{ color: THEME.text }}>
                          {new Date(purchasedTicket.validUntil).toLocaleDateString('de-CH')}
                        </div>
                      </div>
                      <div>
                        <div style={{ color: THEME.textMuted }}>Type</div>
                        <div className="font-bold capitalize" style={{ color: THEME.accent }}>
                          {purchasedTicket.passType}
                        </div>
                      </div>
                      <div>
                        <div style={{ color: THEME.textMuted }}>Price</div>
                        <div className="font-bold" style={{ color: THEME.text }}>CHF {purchasedTicket.price.toFixed(2)}</div>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="text-center mb-4">
                      <div className="text-2xl font-bold mb-1" style={{ color: THEME.text }}>
                        {purchasedTicket.origin} → {purchasedTicket.destination}
                      </div>
                      <div className="text-sm" style={{ color: THEME.textMuted }}>
                        {new Date(purchasedTicket.date).toLocaleDateString('de-CH')}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                      <div>
                        <div style={{ color: THEME.textMuted }}>Departure</div>
                        <div className="font-bold" style={{ color: THEME.text }}>{purchasedTicket.departure}</div>
                      </div>
                      <div>
                        <div style={{ color: THEME.textMuted }}>Arrival</div>
                        <div className="font-bold" style={{ color: THEME.text }}>{purchasedTicket.arrival}</div>
                      </div>
                      <div>
                        <div style={{ color: THEME.textMuted }}>Train</div>
                        <div className="font-bold" style={{ color: THEME.accent }}>{purchasedTicket.train}</div>
                      </div>
                      <div>
                        <div style={{ color: THEME.textMuted }}>Price</div>
                        <div className="font-bold" style={{ color: THEME.text }}>CHF {purchasedTicket.price.toFixed(2)}</div>
                      </div>
                    </div>
                  </>
                )}

                <div className="p-3 text-center" style={{ backgroundColor: THEME.background }}>
                  <div className="text-xs mb-1" style={{ color: THEME.textMuted }}>Control Code</div>
                  <div className="text-lg font-bold font-mono" style={{ color: THEME.accent }}>
                    {purchasedTicket.controlCode}
                  </div>
                </div>

                <div className="mt-4 p-3 text-center border-2 border-dashed" style={{ borderColor: THEME.border }}>
                  <div className="text-xs mb-2" style={{ color: THEME.textMuted }}>QR Code Data</div>
                  <div className="text-xs font-mono break-all" style={{ color: THEME.text }}>
                    {generateQRCodeData(purchasedTicket)}
                  </div>
                </div>

                <div className="mt-4 text-xs text-center" style={{ color: THEME.textMuted }}>
                  <p>✓ No personal data required</p>
                  <p>✓ Can be checked multiple times</p>
                  <p>✓ Copy-safe (unique ticket ID)</p>
                  {purchasedTicket.type === 'pass' ? (
                    <p>✓ Valid from {new Date(purchasedTicket.validFrom).toLocaleDateString('de-CH')} until {new Date(purchasedTicket.validUntil).toLocaleDateString('de-CH')}</p>
                  ) : (
                    <p>✓ Valid until: {new Date(purchasedTicket.validUntil).toLocaleString('de-CH')}</p>
                  )}
                </div>
              </div>
            </div>
            </motion.div>
          )}
        </AnimatePresence>
        </div>
      </motion.section>

      {/* Mobile Sidebar */}
      <MobileSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
    </motion.div>
  );
});

Home.displayName = 'Home';

export default Home;
