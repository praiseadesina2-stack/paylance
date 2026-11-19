import { create } from "zustand";

export interface User {
  id: string;
  name: string;
  role: "employer" | "freelancer";
  walletAddress?: string;
  avatar?: string;
  trustScore?: number;
  balance?: number;
}

interface AuthState {
  user: User | null;
  login: (user: User) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: {
    id: "user_employer_1",
    name: "Alex Client",
    role: "employer",
    walletAddress: "$ilp.paylance.com/alex",
    avatar: "https://i.pravatar.cc/150?u=alex",
    trustScore: 98,
    balance: 15000,
  },
  login: (user) => set({ user }),
  logout: () => set({ user: null }),
}));

interface UIState {
  sidebarOpen: boolean;
  notifications: number;
  toggleSidebar: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: false,
  notifications: 3,
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
}));
