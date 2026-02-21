const API_BASE = (import.meta.env.VITE_API_URL || "http://localhost:8000") + "/api";

function getToken(): string | null {
    return localStorage.getItem("inkwell_token");
}

async function request<T>(
    endpoint: string,
    options: RequestInit = {}
): Promise<T> {
    const token = getToken();
    const headers: Record<string, string> = {
        "Content-Type": "application/json",
        ...(options.headers as Record<string, string>),
    };
    if (token) {
        headers["Authorization"] = `Bearer ${token}`;
    }

    const res = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers,
    });

    if (!res.ok) {
        const error = await res.json().catch(() => ({ detail: "Request failed" }));
        throw new Error(error.detail || `HTTP ${res.status}`);
    }

    return res.json();
}

// ===== Auth =====
export interface UserData {
    id: number;
    username: string;
    email: string;
    display_name: string | null;
    bio: string;
    avatar_color: string;
    is_online: boolean;
    last_seen: string | null;
    created_at: string;
}

interface AuthResponse {
    access_token: string;
    token_type: string;
    user: UserData;
}

export async function apiRegister(
    username: string,
    email: string,
    password: string,
    display_name?: string
): Promise<AuthResponse> {
    return request<AuthResponse>("/register", {
        method: "POST",
        body: JSON.stringify({ username, email, password, display_name }),
    });
}

export async function apiLogin(
    email: string,
    password: string
): Promise<AuthResponse> {
    return request<AuthResponse>("/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
    });
}

export async function apiGetMe(): Promise<UserData> {
    return request<UserData>("/users/me");
}

// ===== Users =====
export async function apiGetAllUsers(): Promise<UserData[]> {
    return request<UserData[]>("/users");
}

export async function apiGetOnlineUsers(): Promise<UserData[]> {
    return request<UserData[]>("/users/online");
}

// ===== Posts =====
export interface PostData {
    id: number;
    author_id: number;
    author_username: string;
    author_display_name: string | null;
    author_avatar_color: string;
    posted_by_id: number | null;
    posted_by_username: string | null;
    text: string;
    likes_count: number;
    liked_by_me: boolean;
    created_at: string;
}

export async function apiGetPosts(): Promise<PostData[]> {
    return request<PostData[]>("/posts");
}

export async function apiCreatePost(
    text: string,
    post_as_user_id?: number
): Promise<PostData> {
    return request<PostData>("/posts", {
        method: "POST",
        body: JSON.stringify({ text, post_as_user_id: post_as_user_id || null }),
    });
}

export async function apiToggleLike(
    postId: number
): Promise<{ liked: boolean; likes_count: number }> {
    return request<{ liked: boolean; likes_count: number }>(
        `/posts/${postId}/like`,
        { method: "POST" }
    );
}

// ===== Challenges =====
export interface ChallengeData {
    id: number;
    challenger_id: number;
    challenger_username: string;
    defender_id: number;
    defender_username: string;
    winner_id: number | null;
    loser_id: number | null;
    game_type: string;
    status: string;
    access_expires_at: string | null;
    created_at: string;
    completed_at: string | null;
}

export interface ConqueredAccountData {
    user_id: number;
    username: string;
    display_name: string | null;
    avatar_color: string;
    expires_at: string;
    challenge_id: number;
}

export async function apiCreateChallenge(
    defender_id: number
): Promise<ChallengeData> {
    return request<ChallengeData>("/challenges", {
        method: "POST",
        body: JSON.stringify({ defender_id }),
    });
}

export async function apiAcceptChallenge(
    challengeId: number
): Promise<ChallengeData> {
    return request<ChallengeData>(`/challenges/${challengeId}/accept`, {
        method: "PUT",
    });
}

export async function apiDeclineChallenge(
    challengeId: number
): Promise<ChallengeData> {
    return request<ChallengeData>(`/challenges/${challengeId}/decline`, {
        method: "PUT",
    });
}

export async function apiCompleteChallenge(
    challengeId: number,
    winnerId: number
): Promise<ChallengeData> {
    return request<ChallengeData>(`/challenges/${challengeId}/complete`, {
        method: "PUT",
        body: JSON.stringify({ winner_id: winnerId }),
    });
}

export async function apiGetActiveAccess(): Promise<ConqueredAccountData[]> {
    return request<ConqueredAccountData[]>("/challenges/active-access");
}

export async function apiGetUnderSiege(): Promise<ConqueredAccountData[]> {
    return request<ConqueredAccountData[]>("/challenges/under-siege");
}

export async function apiGetChallengeHistory(): Promise<ChallengeData[]> {
    return request<ChallengeData[]>("/challenges/history");
}

export async function apiGetPendingChallenges(): Promise<ChallengeData[]> {
    return request<ChallengeData[]>("/challenges/pending");
}

export async function apiGetActiveChallenge(): Promise<ChallengeData | null> {
    try {
        return await request<ChallengeData>("/challenges/active");
    } catch {
        return null; // No active challenge = 404
    }
}

export async function apiForfeitChallenge(
    challengeId: number
): Promise<ChallengeData> {
    return request<ChallengeData>(`/challenges/${challengeId}/forfeit`, {
        method: "PUT",
    });
}

export async function apiReleaseSiege(
    challengeId: number
): Promise<ChallengeData> {
    return request<ChallengeData>(`/challenges/${challengeId}/release`, {
        method: "PUT",
    });
}
