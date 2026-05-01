import React, { createContext, useContext, useEffect, useState } from 'react';

interface SidebarContextValue {
  open: boolean;
  locked: boolean;
  setOpen: (open: boolean) => void;
  setLocked: (locked: boolean) => void;
}

const SidebarContext = createContext<SidebarContextValue>({
  open: true,
  locked: false,
  setOpen: () => {},
  setLocked: () => {},
});

export const SidebarProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [open, setOpen] = useState(true);
  const [locked, setLocked] = useState(false);

  return (
    <SidebarContext.Provider value={{ open, locked, setOpen, setLocked }}>
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
