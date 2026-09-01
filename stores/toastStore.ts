import { create } from "zustand";

export type ToastTone = "success" | "error";

interface ToastState {
  message: string | null;
  tone: ToastTone;
  show: (message: string, tone?: ToastTone) => void;
  hide: () => void;
}

const VISIBLE_MS = 2600;

let timer: ReturnType<typeof setTimeout> | null = null;

export const useToastStore = create<ToastState>()((set) => ({
  message: null,
  tone: "success",

  show: (message, tone = "success") => {
    // A second toast replaces the first rather than queueing, so a run of
    // quick adds ends on the message for the last one.
    if (timer) clearTimeout(timer);
    set({ message, tone });
    timer = setTimeout(() => set({ message: null }), VISIBLE_MS);
  },

  hide: () => {
    if (timer) clearTimeout(timer);
    set({ message: null });
  },
}));
