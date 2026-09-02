"use client";

import * as React from "react";

/**
 * Bandeau de confirmation de la maquette : plaque accent-900 en bas d'ecran,
 * effacee au bout de 2,6 s.
 *
 * Le provider est monte une seule fois dans le layout racine, pour qu'une
 * action lancee depuis n'importe quel ecran puisse rendre la main a
 * l'utilisateur sans que chaque page reimplante sa propre file.
 */
const ToastContext = React.createContext<(message: string) => void>(() => {});

export function useToast() {
  return React.useContext(ToastContext);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [message, setMessage] = React.useState("");
  const timer = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const toast = React.useCallback((next: string) => {
    setMessage(next);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setMessage(""), 2600);
  }, []);

  React.useEffect(() => () => clearTimeout(timer.current), []);

  return (
    <ToastContext.Provider value={toast}>
      {children}
      {message ? (
        <div
          role="status"
          aria-live="polite"
          data-testid="toast"
          className="fixed bottom-7 left-1/2 z-60 -translate-x-1/2 bg-accent-900 px-[22px] py-3 text-sm text-bg"
        >
          {message}
        </div>
      ) : null}
    </ToastContext.Provider>
  );
}
