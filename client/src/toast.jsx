import { createContext, useCallback, useContext, useMemo, useState } from "react";

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [items, setItems] = useState([]);

  const push = useCallback((kind, text) => {
    const id = Math.random().toString(36).slice(2);
    setItems((list) => [...list, { id, kind, text }]);
    setTimeout(() => setItems((list) => list.filter((i) => i.id !== id)), 4500);
  }, []);

  const api = useMemo(
    () => ({
      success: (t) => push("success", t),
      error: (t) => push("danger", t),
      info: (t) => push("primary", t),
    }),
    [push]
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="toast-container position-fixed top-0 end-0 p-3 no-print" style={{ zIndex: 2000 }}>
        {items.map((i) => (
          <div key={i.id} className={`toast show text-bg-${i.kind} border-0 mb-2`} role="alert">
            <div className="toast-body">{i.text}</div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
