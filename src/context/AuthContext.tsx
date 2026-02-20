import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { apiLogin, apiRegister, apiGetMe, apiGetActiveAccess, type UserData, type ConqueredAccountData } from '../api';

type AuthStatus = 'loading' | 'unauthenticated' | 'authenticated';

interface AuthContextType {
    status: AuthStatus;
    user: UserData | null;
    conqueredAccounts: ConqueredAccountData[];
    login: (email: string, password: string) => Promise<void>;
    register: (username: string, email: string, password: string, displayName?: string) => Promise<void>;
    logout: () => void;
    refreshConquests: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    status: 'loading',
    user: null,
    conqueredAccounts: [],
    login: async () => { },
    register: async () => { },
    logout: () => { },
    refreshConquests: async () => { },
});

export function AuthProvider({ children }: { children: ReactNode }) {
    const [status, setStatus] = useState<AuthStatus>('loading');
    const [user, setUser] = useState<UserData | null>(null);
    const [conqueredAccounts, setConqueredAccounts] = useState<ConqueredAccountData[]>([]);

    // Check for existing token on mount
    useEffect(() => {
        const token = localStorage.getItem('inkwell_token');
        if (token) {
            apiGetMe()
                .then((userData) => {
                    setUser(userData);
                    setStatus('authenticated');
                })
                .catch(() => {
                    localStorage.removeItem('inkwell_token');
                    setStatus('unauthenticated');
                });
        } else {
            setStatus('unauthenticated');
        }
    }, []);

    // Refresh conquered accounts periodically when authenticated
    useEffect(() => {
        if (status !== 'authenticated') return;

        const refresh = () => {
            apiGetActiveAccess()
                .then(setConqueredAccounts)
                .catch(() => setConqueredAccounts([]));
        };

        refresh();
        const interval = setInterval(refresh, 15000); // Check every 15s
        return () => clearInterval(interval);
    }, [status]);

    const login = async (email: string, password: string) => {
        const res = await apiLogin(email, password);
        localStorage.setItem('inkwell_token', res.access_token);
        setUser(res.user);
        setStatus('authenticated');
    };

    const register = async (username: string, email: string, password: string, displayName?: string) => {
        const res = await apiRegister(username, email, password, displayName);
        localStorage.setItem('inkwell_token', res.access_token);
        setUser(res.user);
        setStatus('authenticated');
    };

    const logout = () => {
        localStorage.removeItem('inkwell_token');
        setUser(null);
        setConqueredAccounts([]);
        setStatus('unauthenticated');
    };

    const refreshConquests = async () => {
        try {
            const accounts = await apiGetActiveAccess();
            setConqueredAccounts(accounts);
        } catch {
            setConqueredAccounts([]);
        }
    };

    return (
        <AuthContext.Provider value={{ status, user, conqueredAccounts, login, register, logout, refreshConquests }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    return useContext(AuthContext);
}
