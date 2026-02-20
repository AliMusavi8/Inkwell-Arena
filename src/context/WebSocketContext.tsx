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
    const [isConnected, setIsConnected] = useState(false);
    const [lastMessage, setLastMessage] = useState<WSMessage | null>(null);
    const [onlineUserIds, setOnlineUserIds] = useState<Set<number>>(new Set());
    const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);

    const connect = useCallback(() => {
        if (status !== 'authenticated' || !user) return;

        const token = localStorage.getItem('inkwell_token');
        if (!token) return;

        // Close existing connection
        if (wsRef.current) {
            wsRef.current.close();
        }

        const ws = new WebSocket(`ws://localhost:8000/ws/${token}`);

        ws.onopen = () => {
            setIsConnected(true);
        };

        ws.onmessage = (event) => {
            try {
                const message: WSMessage = JSON.parse(event.data);
                setLastMessage(message);

                // Track online users
                if (message.type === 'user_online') {
                    setOnlineUserIds(prev => new Set([...prev, message.user_id]));
                } else if (message.type === 'user_offline') {
                    setOnlineUserIds(prev => {
                        const next = new Set(prev);
                        next.delete(message.user_id);
                        return next;
                    });
                }
            } catch (e) {
                // ignore parse errors
            }
        };

        ws.onclose = () => {
            setIsConnected(false);
            // Reconnect after 3 seconds
            reconnectTimeoutRef.current = setTimeout(() => {
                if (status === 'authenticated') {
                    connect();
                }
            }, 3000);
        };

        ws.onerror = () => {
            ws.close();
        };

        wsRef.current = ws;
    }, [status, user]);

    useEffect(() => {
        connect();
        return () => {
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
            }
            if (wsRef.current) {
                wsRef.current.close();
            }
        };
    }, [connect]);

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
