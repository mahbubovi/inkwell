import { createContext, useCallback, useContext, useState } from 'react';

const Ctx = createContext(() => {});
export const useToast = () => useContext(Ctx);

export function ToastProvider({ children }) {
  const [items, setItems] = useState([]);
  const toast = useCallback((msg) => {
    const id = Math.random();
    setItems((i) => [...i, { id, msg }]);
    setTimeout(() => setItems((i) => i.filter((x) => x.id !== id)), 2800);
  }, []);

  return (
    <Ctx.Provider value={toast}>
      {children}
      <div aria-live="polite" className="fixed inset-x-0 bottom-4 z-40 flex flex-col items-center gap-2 pointer-events-none">
        {items.map((t) => (
          <div key={t.id} className="rounded-md bg-ink text-bg text-sm px-4 py-2.5 shadow-lg">{t.msg}</div>
        ))}
      </div>
    </Ctx.Provider>
  );
}
