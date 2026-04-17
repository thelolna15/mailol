import { create } from 'zustand';

interface Account {
  id: string;
  address: string;
  quota: number;
  used: number;
  isDisabled: boolean;
  createdAt: string;
}

interface SavedAccount {
  id: string;
  address: string;
  password?: string;
}

interface MailState {
  token: string | null;
  account: Account | null;
  savedAccounts: SavedAccount[];
  messages: any[];
  isLoginModalOpen: boolean;
  isCreateModalOpen: boolean;
  isDeleteModalOpen: boolean;
  isFetching: boolean;
  selectedId: string | null;
  eventSource: EventSource | null;
  isSidebarOpen: boolean;
  
  // Actions
  init: () => void;
  setToken: (token: string | null) => void;
  setAccount: (account: Account | null) => void;
  saveCredentials: (id: string, address: string, password?: string) => void;
  removeSavedAccount: (address: string) => void;
  setLoginModal: (open: boolean) => void;
  setCreateModal: (open: boolean) => void;
  setDeleteModal: (open: boolean) => void;
  logout: () => void;
  fetchProfile: () => Promise<void>;
  fetchMessages: () => Promise<void>;
  markMessageSeen: (id: string) => void;
  setSelectedId: (id: string | null) => void;
  setSidebarOpen: (open: boolean) => void;
  switchAccount: (address: string, password?: string) => Promise<void>;
  tryAutoRelogin: () => Promise<void>;
}

export const useMailStore = create<MailState>((set, get) => ({
  token: typeof window !== "undefined" ? localStorage.getItem("mailol_token") : null,
  account: null,
  savedAccounts: typeof window !== "undefined" ? JSON.parse(localStorage.getItem("mailol_accounts") || "[]") : [],
  messages: [],
  isLoginModalOpen: false,
  isCreateModalOpen: false,
  isDeleteModalOpen: false,
  isFetching: false,
  selectedId: null,
  eventSource: null,
  isSidebarOpen: false,

  init: () => {
     const token = get().token;
     if (token) {
        // Validate token by fetching profile; if expired, try auto-relogin
        fetch("/api/me", { headers: { "Authorization": `Bearer ${token}` } })
          .then(res => {
             if (res.ok) {
                res.json().then(data => set({ account: data }));
                get().fetchMessages();
             } else {
                // Token expired — try auto-relogin with first saved account
                get().tryAutoRelogin();
             }
          })
          .catch(() => get().tryAutoRelogin());
     } else {
        // No token at all — try auto-relogin with saved accounts
        const saved = get().savedAccounts;
        if (saved.length > 0) {
           get().tryAutoRelogin();
        }
     }
  },

  setToken: (token) => {
    if (token) localStorage.setItem("mailol_token", token);
    else localStorage.removeItem("mailol_token");
    set({ token });
    if (token) {
       get().fetchProfile();
       get().fetchMessages();
    }
  },
  
  setAccount: (account) => set({ account }),

  saveCredentials: (id, address, password) => {
     const accs = [...get().savedAccounts];
     const existingIndex = accs.findIndex(a => a.address === address);
     
     const newAcc = { id, address, password: password || "" };
     if (existingIndex >= 0) {
        if (!password && accs[existingIndex].password) {
           newAcc.password = accs[existingIndex].password;
        }
        accs[existingIndex] = newAcc;
     } else {
        accs.push(newAcc);
     }
     
     localStorage.setItem("mailol_accounts", JSON.stringify(accs));
     set({ savedAccounts: accs });
  },

  removeSavedAccount: (address) => {
     let accs = [...get().savedAccounts];
     accs = accs.filter(a => a.address !== address);
     localStorage.setItem("mailol_accounts", JSON.stringify(accs));
     set({ savedAccounts: accs });
  },

  setLoginModal: (open) => set({ isLoginModalOpen: open, isCreateModalOpen: false }),
  setCreateModal: (open) => set({ isCreateModalOpen: open, isLoginModalOpen: false }),
  setDeleteModal: (open) => set({ isDeleteModalOpen: open }),
  
  logout: () => {
    localStorage.removeItem("mailol_token");
    if (get().eventSource) get().eventSource?.close();
    set({ token: null, account: null, messages: [], eventSource: null });
  },

  fetchProfile: async () => {
    const { token } = get();
    if (!token) return;
    try {
      const res = await fetch("/api/me", {
         headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
         set({ account: await res.json() });
      } else {
         // Token expired — try to auto-relogin instead of hard logout
         await get().tryAutoRelogin(); 
      }
    } catch(err) {
       console.error("fetchProfile err", err);
    }
  },

  fetchMessages: async () => {
    const { token } = get();
    if (!token) return;
    set({ isFetching: true });
    try {
      const res = await fetch("/api/messages", {
         headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
         const data = await res.json();
         set({ messages: data["hydra:member"] || [] });
         
         if (get().eventSource) {
            get().eventSource?.close();
         }
         
         const es = new EventSource("/api/events?authorization=" + token); 
         es.addEventListener("message", (event) => {
            try {
               const parsed = JSON.parse(event.data);
               if (parsed.type === "message_created") {
                  const msgs = get().messages;
                  set({ messages: [parsed.message, ...msgs] });
                  
                  // Play Notification Sound via Web Audio API seamlessly
                  try {
                      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
                      const oscillator = audioCtx.createOscillator();
                      const gainNode = audioCtx.createGain();
                      oscillator.connect(gainNode);
                      gainNode.connect(audioCtx.destination);
                      oscillator.type = 'sine';
                      oscillator.frequency.setValueAtTime(880, audioCtx.currentTime); // A5
                      oscillator.frequency.exponentialRampToValueAtTime(1760, audioCtx.currentTime + 0.1); // A6
                      gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
                      gainNode.gain.linearRampToValueAtTime(0.5, audioCtx.currentTime + 0.05);
                      gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.5);
                      oscillator.start(audioCtx.currentTime);
                      oscillator.stop(audioCtx.currentTime + 0.5);
                  } catch(e) {}
               }
            } catch(e) {}
         });
         
         set({ eventSource: es });
      }
    } catch(err) {
       console.error("fetchMessages err", err);
    } finally {
       set({ isFetching: false });
    }
  },

  markMessageSeen: (id: string) => {
     const messages = get().messages.map(m => {
        if (m.id === id) return { ...m, seen: true };
        return m;
     });
     set({ messages });
  },

  setSelectedId: (id) => set({ selectedId: id }),
  setSidebarOpen: (open) => set({ isSidebarOpen: open }),

  switchAccount: async (address, password) => {
     if (!password) {
        alert("Cannot switch: Password missing for this account record.");
        return;
     }

     try {
       const res = await fetch("/api/token", {
         method: "POST",
         headers: { "Content-Type": "application/json" },
         body: JSON.stringify({ address, password }),
       });

       if (!res.ok) throw new Error("Invalid credentials");
       
       const { token, id } = await res.json();
       get().setToken(token);
       get().saveCredentials(id, address, password);

     } catch(err) {
       alert("Failed to auto-switch account: Invalid stored credentials.");
     }
  },

  tryAutoRelogin: async () => {
     // Clear expired token
     localStorage.removeItem("mailol_token");
     set({ token: null, account: null, messages: [] });

     const saved = get().savedAccounts;
     if (saved.length === 0) return;

     // Try each saved account until one succeeds
     for (const acc of saved) {
        if (!acc.password) continue;
        try {
           const res = await fetch("/api/token", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ address: acc.address, password: acc.password }),
           });
           if (res.ok) {
              const { token, id } = await res.json();
              get().setToken(token);
              get().saveCredentials(id, acc.address, acc.password);
              return; // Success — stop trying
           }
        } catch(e) {
           continue;
        }
     }
     // All failed — credentials changed or accounts deleted
  }
}));
