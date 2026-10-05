import React from "react";
import { AppProvider, useApp } from "./context";
import { ToastContainer } from "./components/ui";
import Layout from "./components/Layout";
import Login from "./components/Login";
import Home from "./components/Home";
import Patients from "./components/Patients";
import PatientRecord from "./components/PatientRecord";
import NewPatient from "./components/NewPatient";
import NewAppointment from "./components/NewAppointment";
import Pendencies from "./components/Pendencies";
import Imports from "./components/Imports";
import Dashboard from "./components/Dashboard";
import Users from "./components/Users";
import MyAccount from "./components/MyAccount";

function ErrorPage({ code, title, message }: { code: number; title: string; message: string }) {
  const { navigate } = useApp();
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center px-6">
      <div className="text-6xl font-light text-muted-foreground/40">{code}</div>
      <h2 className="text-xl font-semibold text-foreground">{title}</h2>
      <p className="text-sm text-muted-foreground max-w-sm">{message}</p>
      <button
        onClick={() => navigate("home")}
        className="mt-2 px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:opacity-90 transition-opacity"
      >
        Voltar ao início
      </button>
    </div>
  );
}

function AppRouter() {
  const { currentUser, nav, toasts, dismissToast } = useApp();

  // Not logged in
  if (!currentUser || nav.page === "login") {
    return <Login />;
  }

  function renderPage() {
    switch (nav.page) {
      case "home": return <Home />;
      case "patients": return <Patients />;
      case "patient-record": return <PatientRecord />;
      case "new-patient": return <NewPatient />;
      case "new-appointment": return <NewAppointment />;
      case "pendencies": return <Pendencies />;
      case "imports": return <Imports />;
      case "import-detail": return <Imports />;
      case "dashboard": return <Dashboard />;
      case "users": return <Users />;
      case "my-account": return <MyAccount />;
      case "error-403": return (
        <ErrorPage
          code={403}
          title="Acesso não autorizado"
          message="Você não possui permissão para acessar esta área. Entre em contato com a Administração do sistema se acredita que deveria ter acesso."
        />
      );
      case "error-404": return (
        <ErrorPage
          code={404}
          title="Registro não encontrado"
          message="O registro solicitado não foi encontrado ou pode ter sido removido. Verifique o código informado e tente novamente."
        />
      );
      default: return <Home />;
    }
  }

  return (
    <>
      <Layout>
        {renderPage()}
      </Layout>
      <ToastContainer toasts={toasts} dismiss={dismissToast} />
    </>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppRouter />
    </AppProvider>
  );
}
