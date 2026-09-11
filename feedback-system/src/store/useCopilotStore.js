import { create } from 'zustand';

const useCopilotStore = create((set, get) => ({
  isOpen: false,
  messages: [], // { role: 'user' | 'model', content: string, type: 'text' | 'chart' | 'confirmation', metadata?: any }
  isTyping: false,
  uiIntent: null,

  setUiIntent: (intent) => set({ uiIntent: intent }),

  toggleCopilot: () => set((state) => ({ isOpen: !state.isOpen })),
  
  openCopilot: () => set({ isOpen: true }),
  closeCopilot: () => set({ isOpen: false }),

  addMessage: (msg) => set((state) => ({ messages: [...state.messages, msg] })),
  
  updateLastMessage: (chunk) => set((state) => {
    const newMessages = [...state.messages];
    const lastMsg = newMessages[newMessages.length - 1];
    if (lastMsg && lastMsg.role === 'model' && lastMsg.type === 'text') {
      lastMsg.content += chunk;
    } else {
      newMessages.push({ role: 'model', content: chunk, type: 'text' });
    }
    return { messages: newMessages };
  }),

  setTyping: (status) => set({ isTyping: status }),

  clearChat: () => set({ messages: [] })
}));

export default useCopilotStore;
