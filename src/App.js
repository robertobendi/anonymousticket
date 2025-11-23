import React, { Suspense, lazy, useEffect } from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { THEME } from "@lib/themeColors";
import Footer from "@layouts/Footer";

import ProtectedRoute from "@components/ProtectedRoute";

// Lazy load pages
const Home = lazy(() => import("@pages/Home"));
const Verify = lazy(() => import("@pages/Verify"));
const Wallet = lazy(() => import("@pages/Wallet"));
const ReceivedTickets = lazy(() => import("@pages/ReceivedTickets"));
const Dashboard = lazy(() => import("@pages/Dashboard"));
const StatsHistory = lazy(() => import("@pages/StatsHistory"));
const Login = lazy(() => import("@pages/Login"));
const About = lazy(() => import("@pages/About"));

// Routes configuration
const routes = [
  { path: "/", element: <Home /> },
  { path: "/verify", element: <Verify /> },
  { path: "/wallet", element: <Wallet /> },
  { path: "/received", element: <ReceivedTickets /> },
  { path: "/login", element: <Login /> },
  { path: "/about", element: <About /> },
  { 
    path: "/dashboard", 
    element: (
      <ProtectedRoute>
        <Dashboard />
      </ProtectedRoute>
    ) 
  },
  { 
    path: "/dashboard/history", 
    element: (
      <ProtectedRoute>
        <StatsHistory />
      </ProtectedRoute>
    ) 
  }
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
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 4000,
          style: {
            background: THEME.card,
            color: THEME.text,
            border: `2px solid ${THEME.border}`,
            borderRadius: '8px',
            padding: '12px 16px',
            fontSize: '14px',
            fontWeight: '500',
          },
          success: {
            iconTheme: {
              primary: THEME.success || '#10b981',
              secondary: THEME.card,
            },
            style: {
              borderColor: THEME.success || '#10b981',
            },
          },
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: THEME.card,
            },
            style: {
              borderColor: '#ef4444',
            },
          },
        }}
      />
    </div>
  );
}

export default App;