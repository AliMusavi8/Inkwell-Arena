import { createContext, useContext, useEffect, useRef, useState, useCallback, type ReactNode } from 'react';
import { useAuth } from './AuthContext';

interface WSMessage {
    type: string;
    [key: string]: any;
}

interface WebSocketContextType {
    isConnected: boolean;
    sendMessage: (message: WSMessage) => void;
    lastMessage: WSMessage | null;
    onlineUserIds: Set<number>;
}

const WebSocketContext = createContext<WebSocketContextType>({
    isConnected: false,
    sendMessage: () => { },
    lastMessage: null,
    onlineUserIds: new Set(),
});

export function WebSocketProvider({ children }: { children: ReactNode }) {
    const { status, user } = useAuth();
    const wsRef = useRef<WebSocket | null>(null);
    const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);
    const [isConnected, setIsConnected] = useState(false);
    const [lastMessage, setLastMessage] = useState<WSMessage | null>(null);
    const [onlineUserIds, setOnlineUserIds] = useState<Set<number>>(new Set());
    // Use refs for stable values to avoid re-triggering effect
    const statusRef = useRef(status);
    const userRef = useRef(user);
    statusRef.current = status;
    userRef.current = user;

    useEffect(() => {
        if (status !== 'authenticated' || !user) {
            // Close any existing connection when logged out
            if (wsRef.current) {
                wsRef.current.close();
                wsRef.current = null;
            }
            return;
        }

        const token = localStorage.getItem('inkwell_token');
        if (!token) return;

        // Don't reconnect if already connected
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            return;
        }

        function connect() {
            const currentToken = localStorage.getItem('inkwell_token');
            if (!currentToken || statusRef.current !== 'authenticated') return;

            // Close existing
            if (wsRef.current) {
                wsRef.current.close();
            }

            const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:8000";
            const wsUrl = apiUrl.replace(/^http/, 'ws');
            const ws = new WebSocket(`${wsUrl}/ws/${currentToken}`);

            ws.onopen = () => {
                setIsConnected(true);
            };

            ws.onmessage = (event) => {
                try {
                    const message: WSMessage = JSON.parse(event.data);
                    setLastMessage(message);

                    if (message.type === 'user_online') {
                        setOnlineUserIds(prev => new Set([...prev, message.user_id]));
                    } else if (message.type === 'user_offline') {
                        setOnlineUserIds(prev => {
                            const next = new Set(prev);
                            next.delete(message.user_id);
                            return next;
                        });
                    }
                } catch {
                    // ignore
                }
            };

            ws.onclose = () => {
                setIsConnected(false);
                wsRef.current = null;
                // Only reconnect if still authenticated
                if (statusRef.current === 'authenticated') {
                    reconnectTimeoutRef.current = setTimeout(connect, 5000);
                }
            };

            ws.onerror = () => {
                // onclose will fire after this
            };

            wsRef.current = ws;
        }

        connect();

        return () => {
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
            }
            if (wsRef.current) {
                wsRef.current.close();
                wsRef.current = null;
            }
        };
        // Only re-run when auth status or user ID changes, NOT on every render
    }, [status, user?.id]);

    const sendMessage = useCallback((message: WSMessage) => {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify(message));
        }
    }, []);

    return (
        <WebSocketContext.Provider value={{ isConnected, sendMessage, lastMessage, onlineUserIds }}>
            {children}
        </WebSocketContext.Provider>
    );
}

export function useWebSocket() {
    return useContext(WebSocketContext);
}
