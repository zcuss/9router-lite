import { create } from "zustand";

interface EmailPrivacyState {
  emailsVisible: boolean;
  toggleEmailsVisible: () => void;
  setEmailsVisible: (value: boolean) => void;
}

const useEmailPrivacyStore = create<EmailPrivacyState>((set) => ({
  emailsVisible: false,
  toggleEmailsVisible: () => set((state) => ({ emailsVisible: !state.emailsVisible })),
  setEmailsVisible: (value) => set({ emailsVisible: value }),
}));

export default useEmailPrivacyStore;
