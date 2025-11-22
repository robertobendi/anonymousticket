import { useState, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiMapPin, FiCalendar, FiUsers, FiSearch, FiRepeat, FiAlertCircle, FiPrinter, FiShield, FiCreditCard, FiGlobe, FiRadio } from 'react-icons/fi';
import { getConnections, transformConnection, getPopularStations, searchStations } from '@lib/api';
import { generateAnonymousTicket, generateAnonymousPass, formatTicketForPrint, generateQRCodeData } from '@lib/ticketGenerator';
import { addTicketToWallet } from '@lib/wallet';
import { THEME } from '@lib/themeColors';

const SWISS_STATIONS = getPopularStations();

const Home = memo(() => {
  const navigate = useNavigate();
  
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

  const handlePurchasePass = () => {
    const passPrices = {
      daily: 75,
      weekly: 200,
      monthly: 600,
      countrywide: 300
    };

    const pass = generateAnonymousPass({
      type: formData.passType,
      date: formData.date,
      price: passPrices[formData.passType],
    });

    // Add to wallet
    addTicketToWallet(pass);
    setPurchasedTicket(pass);
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

  const handleBook = (trip) => {
    // Generate anonymous ticket (no personal data required)
    const ticketData = {
      origin: formData.origin,
      destination: formData.destination,
      date: formData.date,
      departure: trip.departure,
      arrival: trip.arrival,
      train: trip.train,
      price: 45.00, // Placeholder - would come from API
      type: 'single',
      class: '2nd',
    };

    const ticket = generateAnonymousTicket(ticketData);
    // Add to wallet
    addTicketToWallet(ticket);
    setPurchasedTicket(ticket);
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
    <div className="min-h-screen" style={{ backgroundColor: THEME.background }}>
      {/* Hero Section - Anonymous Ticket Focus */}
      <section className="text-white py-6" style={{ backgroundColor: THEME.accent }}>
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 flex items-center justify-center">
                <span className="text-white font-bold text-sm">SBB</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight">Anonymous Tickets</h1>
                <p className="text-sm opacity-90">No personal data required • Print@Home</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/wallet')}
                className="flex items-center gap-2 px-3 py-2 text-white transition-colors font-bold text-xs uppercase"
                style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}
                onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(255,255,255,0.3)'}
                onMouseLeave={(e) => e.target.style.backgroundColor = 'rgba(255,255,255,0.2)'}
              >
                <FiCreditCard size={16} />
                Wallet
              </button>
              <button
                onClick={() => navigate('/verify')}
                className="flex items-center gap-2 px-3 py-2 text-white transition-colors font-bold text-xs uppercase"
                style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}
                onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(255,255,255,0.3)'}
                onMouseLeave={(e) => e.target.style.backgroundColor = 'rgba(255,255,255,0.2)'}
              >
                <FiRadio size={16} />
                Verify
              </button>
              <div className="flex items-center gap-2 px-3 py-2" style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}>
                <FiShield size={18} />
                <span className="text-xs font-bold">100% Anonymous</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Booking Form - Mobile First Design */}
      <section className="max-w-6xl mx-auto px-4 py-6">
        <div className="p-4 mb-6" style={{ backgroundColor: THEME.card }}>
          <form onSubmit={handleSearch} className="space-y-6">
            {/* Ticket Type Selector */}
            <div>
              <label className="block text-sm font-bold mb-3" style={{ color: THEME.text }}>
                Ticket Type
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => handleInputChange('ticketType', 'single')}
                  className="p-4 border-2 transition-all flex items-center justify-center gap-2 font-bold text-sm uppercase"
                  style={{
                    borderColor: formData.ticketType === 'single' ? THEME.accent : THEME.border,
                    backgroundColor: formData.ticketType === 'single' ? `${THEME.accent}20` : THEME.surface,
                    color: THEME.text
                  }}
                  onMouseEnter={(e) => {
                    if (formData.ticketType !== 'single') {
                      e.target.style.borderColor = THEME.accent;
                      e.target.style.backgroundColor = `${THEME.accent}10`;
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (formData.ticketType !== 'single') {
                      e.target.style.borderColor = THEME.border;
                      e.target.style.backgroundColor = THEME.surface;
                    }
                  }}
                >
                  <FiCreditCard size={18} />
                  Single Ticket
                </button>
                <button
                  type="button"
                  onClick={() => handleInputChange('ticketType', 'pass')}
                  className="p-4 border-2 transition-all flex items-center justify-center gap-2 font-bold text-sm uppercase"
                  style={{
                    borderColor: formData.ticketType === 'pass' ? THEME.accent : THEME.border,
                    backgroundColor: formData.ticketType === 'pass' ? `${THEME.accent}20` : THEME.surface,
                    color: THEME.text
                  }}
                  onMouseEnter={(e) => {
                    if (formData.ticketType !== 'pass') {
                      e.target.style.borderColor = THEME.accent;
                      e.target.style.backgroundColor = `${THEME.accent}10`;
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (formData.ticketType !== 'pass') {
                      e.target.style.borderColor = THEME.border;
                      e.target.style.backgroundColor = THEME.surface;
                    }
                  }}
                >
                  <FiGlobe size={18} />
                  Pass
                </button>
              </div>
            </div>

            {/* Pass Type Selector (only for passes) */}
            {formData.ticketType === 'pass' && (
              <div>
                <label className="block text-sm font-bold mb-3" style={{ color: THEME.text }}>
                  Pass Type
                </label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { value: 'daily', label: 'Daily', price: 75 },
                    { value: 'weekly', label: 'Weekly', price: 200 },
                    { value: 'monthly', label: 'Monthly', price: 600 },
                    { value: 'countrywide', label: 'Country-wide', price: 300 }
                  ].map((pass) => (
                    <button
                      key={pass.value}
                      type="button"
                      onClick={() => handleInputChange('passType', pass.value)}
                      className="p-4 border-2 transition-all text-center"
                      style={{
                        borderColor: formData.passType === pass.value ? THEME.accent : THEME.border,
                        backgroundColor: formData.passType === pass.value ? `${THEME.accent}20` : THEME.surface,
                        color: THEME.text
                      }}
                      onMouseEnter={(e) => {
                        if (formData.passType !== pass.value) {
                          e.target.style.borderColor = THEME.accent;
                          e.target.style.backgroundColor = `${THEME.accent}10`;
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (formData.passType !== pass.value) {
                          e.target.style.borderColor = THEME.border;
                          e.target.style.backgroundColor = THEME.surface;
                        }
                      }}
                    >
                      <div className="font-bold text-sm mb-1">{pass.label}</div>
                      <div className="text-xs" style={{ color: THEME.textMuted }}>
                        CHF {pass.price}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Origin and Destination (only for single tickets or non-countrywide passes) */}
            {(formData.ticketType === 'single' || (formData.ticketType === 'pass' && formData.passType !== 'countrywide')) && (
            <div className="grid md:grid-cols-2 gap-4">
              <div className="relative">
                <label className="block text-sm font-bold mb-2" style={{ color: THEME.text }}>
                  From
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={formData.origin}
                    onChange={(e) => handleStationInput('origin', e.target.value)}
                    onFocus={() => formData.origin.length >= 2 && setShowOriginSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowOriginSuggestions(false), 200)}
                    placeholder="Enter station name"
                    className="w-full px-4 py-3 border-2 border-gray-300 focus:outline-none focus:border-red-600 bg-white text-black font-normal"
                    style={{ borderColor: THEME.border, backgroundColor: THEME.card, color: THEME.text }}
                    required
                  />
                  {showOriginSuggestions && originSuggestions.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 border-2 max-h-48 overflow-y-auto" style={{ borderColor: THEME.border, backgroundColor: THEME.card }}>
                      {originSuggestions.slice(0, 5).map((station, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => selectStation('origin', station)}
                          className="w-full text-left px-4 py-2"
                          style={{ color: THEME.text, backgroundColor: THEME.card }}
                          onMouseEnter={(e) => e.target.style.backgroundColor = THEME.surfaceHover}
                          onMouseLeave={(e) => e.target.style.backgroundColor = THEME.card}
                        >
                          {station.name}
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
                  className="absolute right-2 top-9 p-2 text-accent hover:bg-surface transition-colors"
                  aria-label="Swap stations"
                >
                  <FiRepeat size={18} />
                </button>
                <label className="block text-sm font-bold mb-2" style={{ color: THEME.text }}>
                  To
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={formData.destination}
                    onChange={(e) => handleStationInput('destination', e.target.value)}
                    onFocus={() => formData.destination.length >= 2 && setShowDestinationSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowDestinationSuggestions(false), 200)}
                    placeholder="Enter station name"
                    className="w-full px-4 py-3 border-2 border-gray-300 focus:outline-none focus:border-red-600 bg-white text-black font-normal"
                    style={{ borderColor: THEME.border, backgroundColor: THEME.card, color: THEME.text }}
                    required
                  />
                  {showDestinationSuggestions && destinationSuggestions.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 border-2 max-h-48 overflow-y-auto" style={{ borderColor: THEME.border, backgroundColor: THEME.card }}>
                      {destinationSuggestions.slice(0, 5).map((station, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => selectStation('destination', station)}
                          className="w-full text-left px-4 py-2"
                          style={{ color: THEME.text, backgroundColor: THEME.card }}
                          onMouseEnter={(e) => e.target.style.backgroundColor = THEME.surfaceHover}
                          onMouseLeave={(e) => e.target.style.backgroundColor = THEME.card}
                        >
                          {station.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
            )}

            {/* Date and Passengers */}
            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-bold mb-2" style={{ color: THEME.text }}>
                  Date
                </label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => handleInputChange('date', e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-4 py-3 border-2 focus:outline-none font-normal"
                  style={{ borderColor: THEME.border, backgroundColor: THEME.card, color: THEME.text }}
                  onFocus={(e) => e.target.style.borderColor = THEME.accent}
                  onBlur={(e) => e.target.style.borderColor = THEME.border}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-bold mb-2" style={{ color: THEME.text }}>
                  Passengers
                </label>
                <select
                  value={formData.passengers}
                  onChange={(e) => handleInputChange('passengers', parseInt(e.target.value))}
                  className="w-full px-4 py-3 border-2 focus:outline-none font-normal"
                  style={{ borderColor: THEME.border, backgroundColor: THEME.card, color: THEME.text }}
                  onFocus={(e) => e.target.style.borderColor = THEME.accent}
                  onBlur={(e) => e.target.style.borderColor = THEME.border}
                >
                  {[1, 2, 3, 4, 5, 6].map(num => (
                    <option key={num} value={num}>{num} {num === 1 ? 'passenger' : 'passengers'}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-end">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.returnTrip}
                    onChange={(e) => handleInputChange('returnTrip', e.target.checked)}
                    className="w-5 h-5 text-accent border-2 border-border focus:ring-2 focus:ring-accent cursor-pointer"
                  />
                  <span className="text-sm" style={{ color: THEME.text }}>Return trip</span>
                </label>
              </div>
            </div>

            {formData.returnTrip && (
              <div>
                <label className="block text-sm font-bold mb-2" style={{ color: THEME.text }}>
                  Return Date
                </label>
                <input
                  type="date"
                  value={formData.returnDate}
                  onChange={(e) => handleInputChange('returnDate', e.target.value)}
                  min={formData.date}
                  className="w-full px-4 py-3 border-2 focus:outline-none font-normal"
                  style={{ borderColor: THEME.border, backgroundColor: THEME.card, color: THEME.text }}
                  onFocus={(e) => e.target.style.borderColor = THEME.accent}
                  onBlur={(e) => e.target.style.borderColor = THEME.border}
                  required={formData.returnTrip}
                />
              </div>
            )}

            {/* Search Button - SBB Mobile Style */}
            <button
              type="submit"
              disabled={isSearching}
              className="w-full px-6 py-4 text-white transition-colors font-bold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-base uppercase tracking-wide"
              style={{ backgroundColor: THEME.accent }}
              onMouseEnter={(e) => e.target.style.backgroundColor = THEME.accentHover}
              onMouseLeave={(e) => e.target.style.backgroundColor = THEME.accent}
            >
              {isSearching ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
                  Searching...
                </>
              ) : formData.ticketType === 'pass' ? (
                <>
                  <FiCreditCard size={20} />
                  Purchase Pass
                </>
              ) : (
                <>
                  <FiSearch size={20} />
                  Search Connections
                </>
              )}
            </button>

            {/* Error Message */}
            {searchError && (
              <div className="flex items-center gap-2 p-3 border-2" style={{ backgroundColor: `${THEME.accent}15`, borderColor: THEME.accent }}>
                <FiAlertCircle style={{ color: THEME.accent }} />
                <span className="text-sm" style={{ color: THEME.accent }}>{searchError}</span>
              </div>
            )}
          </form>
        </div>

        {/* Search Results - SBB Mobile Style */}
        {searchResults && (
          <div className="p-4" style={{ backgroundColor: THEME.card }}>
            <h2 className="text-lg font-bold mb-4" style={{ color: THEME.text }}>
              Connections: {formData.origin} → {formData.destination}
            </h2>
            <div className="space-y-2">
              {searchResults.map((trip) => (
                <div
                  key={trip.id}
                  className="p-4 transition-colors"
                  style={{ borderLeft: `4px solid ${THEME.accent}`, backgroundColor: THEME.card }}
                  onMouseEnter={(e) => e.target.style.backgroundColor = THEME.surfaceHover}
                  onMouseLeave={(e) => e.target.style.backgroundColor = THEME.card}
                >
                  <div className="flex flex-col gap-4">
                    {/* Time and Route Info */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div>
                          <div className="text-2xl font-bold" style={{ color: THEME.text }}>{trip.departure}</div>
                          <div className="text-xs" style={{ color: THEME.textMuted }}>{formData.origin}</div>
                        </div>
                        <div className="font-bold" style={{ color: THEME.accent }}>→</div>
                        <div>
                          <div className="text-2xl font-bold" style={{ color: THEME.text }}>{trip.arrival}</div>
                          <div className="text-xs" style={{ color: '#999999' }}>{formData.destination}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-bold" style={{ color: '#EB0000' }}>
                          {trip.price ? `CHF ${trip.price.toFixed(2)}` : 'Price on sbb.ch'}
                        </div>
                        {trip.price && formData.passengers > 1 && (
                          <div className="text-xs" style={{ color: '#999999' }}>
                            CHF {(trip.price * formData.passengers).toFixed(2)} total
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Train Info */}
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-4">
                        <span className="font-bold" style={{ color: THEME.accent }}>{trip.train}</span>
                        <span style={{ color: THEME.textMuted }}>{trip.duration}</span>
                        <span style={{ color: THEME.textMuted }}>
                          {trip.changes === 0 ? 'Direct' : `${trip.changes} change${trip.changes > 1 ? 's' : ''}`}
                        </span>
                      </div>
                      <button
                        onClick={() => handleBook(trip)}
                        className="px-4 py-2 text-white transition-colors font-bold text-sm uppercase"
                        style={{ backgroundColor: THEME.accent }}
                        onMouseEnter={(e) => e.target.style.backgroundColor = THEME.accentHover}
                        onMouseLeave={(e) => e.target.style.backgroundColor = THEME.accent}
                      >
                        Book
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Purchased Anonymous Ticket */}
        {purchasedTicket && (
          <div className="p-4 mb-6" style={{ backgroundColor: THEME.card, border: `2px solid ${THEME.accent}` }}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <FiShield style={{ color: THEME.accent }} />
                <h2 className="text-lg font-bold" style={{ color: THEME.text }}>
                  Your Anonymous Ticket
                </h2>
              </div>
              <button
                onClick={handlePrintTicket}
                className="flex items-center gap-2 px-4 py-2 text-white transition-colors font-bold text-sm"
                style={{ backgroundColor: THEME.accent }}
                onMouseEnter={(e) => e.target.style.backgroundColor = THEME.accentHover}
                onMouseLeave={(e) => e.target.style.backgroundColor = THEME.accent}
              >
                <FiPrinter size={16} />
                Print Ticket
              </button>
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
          </div>
        )}
      </section>
    </div>
  );
});

Home.displayName = 'Home';

export default Home;
