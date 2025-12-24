// RequireAuth.js - Updated logic
import { useLocation, Navigate, Outlet } from 'react-router-dom';
import useAuth from '../hooks/useAuth';

const RequireAuth = () => {
    const { auth } = useAuth();
    const location = useLocation();

    // In your new model, having a walletAddress IS being authenticated.
    const isWalletConnected = auth?.walletAddress || !!window.ethereum?.selectedAddress;

    return (
        isWalletConnected
            ? <Outlet />
            : <Navigate to="/" state={{ from: location }} replace />
    );
}
export default RequireAuth;