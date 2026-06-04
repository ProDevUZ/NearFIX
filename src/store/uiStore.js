import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createJSONStorage, persist } from "zustand/middleware";

export const useUiStore = create(
  persist(
    (set) => ({
      locale: "uz",
      chatMessages: [],
      supportSheetOpen: false,
      setLocale: (locale) => set({ locale }),
      sendMessage: (message) =>
        set((state) => ({
          chatMessages: [...state.chatMessages, ["out", message]]
        })),
      setSupportSheetOpen: (supportSheetOpen) => set({ supportSheetOpen })
    }),
    {
      name: "nearfix-ui-settings",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        locale: state.locale
      })
    }
  )
);
