
import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

// FIX F3: Decode JWT payload without any external library (pure base64 decode)
// This ensures role always comes from the server-signed token, never from mutable localStorage
const decodeJwtPayload = (token) => {
  try {
    const base64Payload = token.split('.')[1];
    const decoded = JSON.parse(atob(base64Payload));
    return decoded;
  } catch {
    return null;
  }
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  // FIX F3: Role is derived from the JWT payload, NOT stored in localStorage
  const [role, setRole] = useState(() => {
    const storedToken = localStorage.getItem('token');
    if (storedToken) {
      const payload = decodeJwtPayload(storedToken);
      return payload?.role || null;
    }
    return null;
  });

  useEffect(() => {
    if (token) {
      const payload = decodeJwtPayload(token);
      if (payload) {
        setRole(payload.role);
        setUser({ token, role: payload.role, id: payload.userId });
      }
    } else {
      setRole(null);
      setUser(null);
    }
  }, [token]);

  const login = (data) => {
    localStorage.setItem('token', data.token);
    // FIX F3: Role is NOT stored in localStorage — decoded from the JWT instead
    const payload = decodeJwtPayload(data.token);
    setToken(data.token);
    setRole(payload?.role || null);
    setUser({ ...data.user, role: payload?.role });
  };

  const logout = async () => {
    // FIX F6: Call server-side logout to invalidate the token in the blacklist
    const currentToken = localStorage.getItem('token');
    if (currentToken) {
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${currentToken}`,
            'Content-Type': 'application/json',
          },
        });
      } catch {
        // Still clear client-side even if server call fails
      }
    }
    // FIX F3: Only token removed from localStorage — role was never stored there
    localStorage.removeItem('token');
    setToken(null);
    setRole(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, role, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
