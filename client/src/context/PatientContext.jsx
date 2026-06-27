import { createContext, useContext, useState } from 'react';

const PatientContext = createContext(null);

export function PatientProvider({ children }) {
  const [sessionId, setSessionId] = useState(null);
  const [language, setLanguage] = useState('te'); // 'te' | 'hi'
  const [session, setSession] = useState(null);
  const [triageComplete, setTriageComplete] = useState(false);
  const [awaitingWatcherResponse, setAwaitingWatcherResponse] = useState(false);

  return (
    <PatientContext.Provider
      value={{
        sessionId,
        setSessionId,
        language,
        setLanguage,
        session,
        setSession,
        triageComplete,
        setTriageComplete,
        awaitingWatcherResponse,
        setAwaitingWatcherResponse,
      }}
    >
      {children}
    </PatientContext.Provider>
  );
}

export function usePatient() {
  const ctx = useContext(PatientContext);
  if (!ctx) throw new Error('usePatient must be used within PatientProvider');
  return ctx;
}
