import { useState, memo } from 'react';
import { FiClock, FiMapPin, FiCalendar } from 'react-icons/fi';

const Page1 = memo(() => {
  const [bookings] = useState([
    {
      id: 1,
      origin: 'Zürich HB',
      destination: 'Bern',
      date: '2024-12-20',
      time: '08:30',
      train: 'IC 1',
      price: 45.00,
      passengers: 2,
      status: 'confirmed',
    },
    {
      id: 2,
      origin: 'Bern',
      destination: 'Zürich HB',
      date: '2024-12-22',
      time: '16:15',
      train: 'IC 3',
      price: 45.00,
      passengers: 2,
      status: 'confirmed',
    },
  ]);

  return (
    <div className="min-h-screen py-6" style={{ backgroundColor: '#000000' }}>
      <div className="max-w-6xl mx-auto px-4">
        <h1 className="text-xl font-bold mb-4" style={{ color: '#ffffff' }}>My Bookings</h1>
        
        {bookings.length === 0 ? (
          <div className="p-8 text-center" style={{ backgroundColor: '#1a1a1a' }}>
            <p className="text-sm mb-4" style={{ color: '#999999' }}>No bookings found</p>
            <a
              href="/"
              className="inline-block px-6 py-3 text-white transition-colors font-bold text-sm uppercase tracking-wide"
              style={{ backgroundColor: '#EB0000' }}
              onMouseEnter={(e) => e.target.style.backgroundColor = '#d10000'}
              onMouseLeave={(e) => e.target.style.backgroundColor = '#EB0000'}
            >
              Book a ticket
            </a>
          </div>
        ) : (
          <div className="space-y-2">
            {bookings.map((booking) => (
              <div
                key={booking.id}
                className="border-l-4 p-4 transition-colors"
                style={{ borderLeftColor: '#EB0000', backgroundColor: '#1a1a1a' }}
                onMouseEnter={(e) => e.target.style.backgroundColor = '#2a2a2a'}
                onMouseLeave={(e) => e.target.style.backgroundColor = '#1a1a1a'}
              >
                <div className="flex flex-col gap-3">
                  {/* Status and Booking ID */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-1 bg-success text-white text-xs font-bold uppercase">
                        {booking.status}
                      </span>
                      <span className="text-xs" style={{ color: '#999999' }}>#{booking.id}</span>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold" style={{ color: '#EB0000' }}>
                        CHF {(booking.price * booking.passengers).toFixed(2)}
                      </div>
                      <div className="text-xs" style={{ color: '#999999' }}>
                        {booking.passengers} {booking.passengers === 1 ? 'passenger' : 'passengers'}
                      </div>
                    </div>
                  </div>
                  
                  {/* Route */}
                  <div className="flex items-center gap-3">
                    <div>
                      <div className="text-lg font-bold" style={{ color: '#ffffff' }}>{booking.time}</div>
                      <div className="text-xs" style={{ color: '#999999' }}>{booking.origin}</div>
                    </div>
                    <div className="font-bold" style={{ color: '#EB0000' }}>→</div>
                    <div>
                      <div className="text-lg font-bold" style={{ color: '#ffffff' }}>
                        {new Date(booking.date).toLocaleDateString('en-US', { 
                          month: 'short', 
                          day: 'numeric' 
                        })}
                      </div>
                      <div className="text-xs" style={{ color: '#999999' }}>{booking.destination}</div>
                    </div>
                  </div>
                  
                  {/* Train Info */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 text-xs">
                      <span className="font-bold" style={{ color: '#EB0000' }}>{booking.train}</span>
                      <span style={{ color: '#999999' }}>
                        {new Date(booking.date).toLocaleDateString('en-US', { 
                          weekday: 'short'
                        })}
                      </span>
                    </div>
                    <button 
                      className="px-4 py-2 border-2 transition-colors font-bold text-xs uppercase"
                      style={{ borderColor: '#EB0000', color: '#EB0000', backgroundColor: 'transparent' }}
                      onMouseEnter={(e) => { e.target.style.backgroundColor = '#EB0000'; e.target.style.color = '#ffffff'; }}
                      onMouseLeave={(e) => { e.target.style.backgroundColor = 'transparent'; e.target.style.color = '#EB0000'; }}
                    >
                      Details
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
});

Page1.displayName = 'Page1';

export default Page1;
