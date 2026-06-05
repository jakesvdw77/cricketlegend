import React, { createContext, useContext, useEffect, useState } from 'react';

const AUTO_COLLAPSE_KEY = 'sidebar_auto_collapse';

interface SidebarContextValue {
  open: boolean;
  locked: boolean;
  autoCollapse: boolean;
  setOpen: (open: boolean) => void;
  setLocked: (locked: boolean) => void;
  setAutoCollapse: (enabled: boolean) => void;
}

const SidebarContext = createContext<SidebarContextValue>({
  open: true,
  locked: false,
  autoCollapse: false,
  setOpen: () => {},
  setLocked: () => {},
  setAutoCollapse: () => {},
});

export const SidebarProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [open, setOpen] = useState(true);
  const [locked, setLocked] = useState(false);
  const [autoCollapse, setAutoCollapseState] = useState(
    () => localStorage.getItem(AUTO_COLLAPSE_KEY) === 'true',
  );

  const setAutoCollapse = (enabled: boolean) => {
    localStorage.setItem(AUTO_COLLAPSE_KEY, String(enabled));
    setAutoCollapseState(enabled);
  };

  return (
    <SidebarContext.Provider value={{ open, locked, autoCollapse, setOpen, setLocked, setAutoCollapse }}>
      {children}
    </SidebarContext.Provider>
  );
};

export const useSidebar = () => useContext(SidebarContext);

/** Call in a page to collapse and disable the sidebar for the duration of that page. */
export const useSidebarLock = () => {
  const { setOpen, setLocked } = useSidebar();

  useEffect(() => {
    setOpen(false);
    setLocked(true);
    return () => {
      setOpen(true);
      setLocked(false);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
};
