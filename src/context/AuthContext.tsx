import { createContext, useContext, useState, type ReactNode } from 'react';

type AuthStatus = 'pending' | 'guest' | 'authenticated';

interface AuthContextType {
    status: AuthStatus;
    setStatus: (status: AuthStatus) => void;
    userName: string;
    setUserName: (name: string) => void;
}

const AuthContext = createContext<AuthContextType>({
    status: 'pending',
    setStatus: () => { },
    userName: '',
    setUserName: () => { },
});

export function AuthProvider({ children }: { children: ReactNode }) {
    const [status, setStatus] = useState<AuthStatus>('pending');
    const [userName, setUserName] = useState('');

    return (
        <AuthContext.Provider value={{ status, setStatus, userName, setUserName }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    return useContext(AuthContext);
}
