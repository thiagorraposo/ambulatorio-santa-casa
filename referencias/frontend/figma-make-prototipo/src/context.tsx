import React, { createContext, useContext, useState, useCallback } from "react";
import type { User, Patient, Appointment, Pendency, ImportBatch, NavState, Page } from "./types";
import { USERS, PATIENTS, APPOINTMENTS, PENDENCIES, IMPORT_BATCHES, DEMO_CREDENTIALS } from "./data";

interface Toast {
  id: string;
  type: "success" | "error" | "warning" | "info";
  message: string;
}

interface AppContextValue {
  currentUser: User | null;
  users: User[];
  patients: Patient[];
  appointments: Appointment[];
  pendencies: Pendency[];
  importBatches: ImportBatch[];
  nav: NavState;
  toasts: Toast[];

  login: (loginStr: string, password: string) => "ok" | "invalid" | "inactive" | "locked";
  logout: () => void;
  navigate: (page: Page, params?: Partial<NavState>) => void;
  goBack: () => void;

  addPatient: (p: Patient) => void;
  updatePatient: (p: Patient) => void;
  addAppointment: (a: Appointment) => void;
  updateAppointment: (a: Appointment) => void;
  updatePendency: (p: Pendency) => void;
  addImportBatch: (b: ImportBatch) => void;
  updateUser: (u: User) => void;

  showToast: (type: Toast["type"], message: string) => void;
  dismissToast: (id: string) => void;

  loginAttempts: Record<string, number>;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>(USERS);
  const [patients, setPatients] = useState<Patient[]>(PATIENTS);
  const [appointments, setAppointments] = useState<Appointment[]>(APPOINTMENTS);
  const [pendencies, setPendencies] = useState<Pendency[]>(PENDENCIES);
  const [importBatches, setImportBatches] = useState<ImportBatch[]>(IMPORT_BATCHES);
  const [nav, setNav] = useState<NavState>({ page: "login" });
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [loginAttempts, setLoginAttempts] = useState<Record<string, number>>({});
  const [history, setHistory] = useState<NavState[]>([]);

  const navigate = useCallback((page: Page, params?: Partial<NavState>) => {
    setHistory((h) => [...h, nav]);
    setNav({ page, ...params });
  }, [nav]);

  const goBack = useCallback(() => {
    setHistory((h) => {
      if (h.length === 0) return h;
      const prev = h[h.length - 1];
      setNav(prev);
      return h.slice(0, -1);
    });
  }, []);

  const login = useCallback((loginStr: string, password: string): "ok" | "invalid" | "inactive" | "locked" => {
    const attempts = loginAttempts[loginStr] || 0;
    if (attempts >= 5) return "locked";

    const cred = DEMO_CREDENTIALS[loginStr];
    if (!cred || cred.password !== password) {
      setLoginAttempts((a) => ({ ...a, [loginStr]: attempts + 1 }));
      return "invalid";
    }
    const user = users.find((u) => u.id === cred.userId);
    if (!user) return "invalid";
    if (user.status === "inativo") return "inactive";

    setCurrentUser(user);
    setLoginAttempts((a) => ({ ...a, [loginStr]: 0 }));
    setNav({ page: "home" });
    setHistory([]);
    return "ok";
  }, [loginAttempts, users]);

  const logout = useCallback(() => {
    setCurrentUser(null);
    setNav({ page: "login" });
    setHistory([]);
  }, []);

  const showToast = useCallback((type: Toast["type"], message: string) => {
    const id = Date.now().toString();
    setToasts((t) => [...t, { id, type, message }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4000);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  const addPatient = useCallback((p: Patient) => setPatients((ps) => [...ps, p]), []);
  const updatePatient = useCallback((p: Patient) => setPatients((ps) => ps.map((x) => x.id === p.id ? p : x)), []);
  const addAppointment = useCallback((a: Appointment) => setAppointments((as) => [...as, a]), []);
  const updateAppointment = useCallback((a: Appointment) => setAppointments((as) => as.map((x) => x.id === a.id ? a : x)), []);
  const updatePendency = useCallback((p: Pendency) => setPendencies((ps) => ps.map((x) => x.id === p.id ? p : x)), []);
  const addImportBatch = useCallback((b: ImportBatch) => setImportBatches((bs) => [...bs, b]), []);
  const updateUser = useCallback((u: User) => setUsers((us) => us.map((x) => x.id === u.id ? u : x)), []);

  return (
    <AppContext.Provider value={{
      currentUser, users, patients, appointments, pendencies, importBatches,
      nav, toasts, loginAttempts,
      login, logout, navigate, goBack,
      addPatient, updatePatient, addAppointment, updateAppointment,
      updatePendency, addImportBatch, updateUser,
      showToast, dismissToast,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
