'use client';

import { createContext, useContext, useState, useCallback } from 'react';

const ScanContext = createContext({
  currentScanData: null,
  currentScanStatus: null,
  setCurrentScan: () => {},
  clearCurrentScan: () => {},
});

export function ScanProvider({ children }) {
  const [currentScanData, setCurrentScanData] = useState(null);
  const [currentScanStatus, setCurrentScanStatus] = useState(null);

  const setCurrentScan = useCallback((data, status = null) => {
    setCurrentScanData(data);
    setCurrentScanStatus(status || data?.scan?.status || null);
  }, []);

  const clearCurrentScan = useCallback(() => {
    setCurrentScanData(null);
    setCurrentScanStatus(null);
  }, []);

  return (
    <ScanContext.Provider
      value={{
        currentScanData,
        currentScanStatus,
        setCurrentScan,
        clearCurrentScan,
      }}
    >
      {children}
    </ScanContext.Provider>
  );
}

export function useScan() {
  const context = useContext(ScanContext);
  if (!context) {
    throw new Error('useScan must be used within a ScanProvider');
  }
  return context;
}
