import React, { Suspense, lazy, useEffect } from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import { THEME } from "@lib/themeColors";
import Footer from "@layouts/Footer";

// Lazy load pages
const Home = lazy(() => import("@pages/Home"));
const Verify = lazy(() => import("@pages/Verify"));
const Wallet = lazy(() => import("@pages/Wallet"));
const ReceivedTickets = lazy(() => import("@pages/ReceivedTickets"));
const Dashboard = lazy(() => import("@pages/Dashboard"));

// Routes configuration
const routes = [
  { path: "/", element: <Home /> },
  { path: "/verify", element: <Verify /> },
  { path: "/wallet", element: <Wallet /> },
  { path: "/received", element: <ReceivedTickets /> },
  { path: "/dashboard", element: <Dashboard /> }
];

// Loading component
const LoadingFallback = () => (
  <div className="flex items-center justify-center min-h-[60vh]">
    <div 
      className="animate-spin rounded-full border-t-2 border-b-2 border-accent" 
      style={{ height: '48px', width: '48px' }}
      aria-label="Loading..."
      role="status"
    />
    <span className="sr-only">Loading...</span>
  </div>
);

// Error boundary component
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log to error reporting service in production
    console.error("Page error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center min-h-[60vh]">
          <div 
            className="text-center p-6 max-w-md border-2" 
            style={{ backgroundColor: THEME.card, borderColor: THEME.border }}
          >
            <h2 className="text-xl font-bold mb-4" style={{ color: THEME.accent }}>
              Something went wrong
            </h2>
            <p className="mb-6 text-sm" style={{ color: THEME.textMuted }}>
              The page couldn't be loaded properly.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-2 text-white transition-colors font-bold"
              style={{ backgroundColor: THEME.accent }}
              onMouseEnter={(e) => e.target.style.backgroundColor = THEME.accentHover}
              onMouseLeave={(e) => e.target.style.backgroundColor = THEME.accent}
              aria-label="Reload page"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// ScrollToTop component
const ScrollToTop = () => {
  const { pathname } = useLocation();
  
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  
  return null;
};

function App() {
  return (
    <div 
      className="min-h-screen flex flex-col" 
      style={{ backgroundColor: THEME.background, color: THEME.text }}
    >
      <ScrollToTop />
      <main className="flex-grow" style={{ backgroundColor: THEME.background }}>
        <ErrorBoundary>
          <Suspense fallback={<LoadingFallback />}>
            <Routes>
              {routes.map((route) => (
                <Route 
                  key={route.path}
                  path={route.path}
                  element={route.element}
                />
              ))}
            </Routes>
          </Suspense>
        </ErrorBoundary>
      </main>
      <Footer />
    </div>
  );
}

export default App;