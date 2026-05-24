
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const LogoutButton = () => {
    const { logout } = useAuth();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);

    const handleLogout = async () => {
        setLoading(true);
        // FIX F6: logout() now calls server-side /api/auth/logout to blacklist the token
        // Token is invalidated server-side before localStorage is cleared
        await logout();
        navigate('/login');
    };

    return (
        <button
            onClick={handleLogout}
            disabled={loading}
            className="btn btn-outline"
            style={{ width: 'auto', padding: '0.5rem 1.25rem' }}
        >
            {loading ? 'Logging out...' : 'Logout'}
        </button>
    );
};

export default LogoutButton;
