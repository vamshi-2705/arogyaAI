import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import NurseDashboard from '../components/nurse/NurseDashboard';
import LoadingSpinner from '../components/shared/LoadingSpinner';

/**
 * Nurse home page — /nurse/dashboard
 * Guards route: redirect to login if not authenticated.
 */
export default function NurseHome() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="page-loading">
        <LoadingSpinner size="large" color="#3B82F6" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/nurse/login" replace />;
  }

  return <NurseDashboard />;
}
