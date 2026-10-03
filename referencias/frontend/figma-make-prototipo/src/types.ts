export type UserRole = "consulta" | "edicao" | "administracao";
export type UserStatus = "ativo" | "inativo";

export interface User {
  id: string;
  name: string;
  login: string;
  role: UserRole;
  status: UserStatus;
}

export type PatientOrigin = "dc" | "non-dc" | "system";

export interface Patient {
  id: string;
  code: string;
  name: string;
  birthDate: string;
  sex: string;
  race: string;
  phone?: string;
  address?: string;
  city?: string;
  origin: PatientOrigin;
  projects: string[];
  community?: { belongs: boolean; type?: "indigena" | "quilombola" };
  createdAt: string;
  importedFrom?: string;
}

export interface Sorologia {
  id: string;
  method: string;
  requestDate?: string;
  collectDate?: string;
  resultDate?: string;
  result: string;
  lab?: string;
  observations?: string;
}

export interface VitalSigns {
  height?: number;
  weight?: number;
  abdominalCircumference?: number;
  heartRate?: number;
  saturation?: number;
  systolicBP?: number;
  diastolicBP?: number;
  nyha?: string;
  observations?: string;
}

export interface Comorbidity {
  type: string;
  present: boolean;
  detail?: string;
}

export interface Medication {
  id: string;
  name: string;
  dose?: string;
  route?: string;
  frequency?: string;
  startDate?: string;
  endDate?: string;
  currentUse: boolean;
  prescribedThisVisit: boolean;
  status?: string;
  reason?: string;
  observations?: string;
}

export interface AdverseReaction {
  id: string;
  date?: string;
  description: string;
  status?: string;
}

export interface BZNTreatment {
  used: boolean | null;
  byClinic?: boolean;
  duration?: string;
  year?: string;
  hasIndication?: boolean;
  prescriptionDate?: string;
  reasonNotUsed?: string;
  observations?: string;
  adverseReactions: AdverseReaction[];
}

export interface ExamResult {
  name: string;
  value: string;
  unit?: string;
  reference?: string;
  interpretation?: string;
}

export interface Exam {
  id: string;
  type: string;
  origin: "brought" | "requested";
  block?: string;
  date?: string;
  status: "pendente" | "realizado" | "resultado-disponivel";
  resultSummary?: string;
  observations?: string;
  results?: ExamResult[];
}

export interface Referral {
  id: string;
  documentPresented: boolean;
  origin?: string;
  type?: string;
  destination?: string;
  service?: string;
  specialty?: string;
  referralDate?: string;
  schedulingDate?: string;
  realizationDate?: string;
  status: string;
  priority?: string;
  reason?: string;
  conduct?: string;
  relatedProject?: string;
  observations?: string;
}

export interface Notification {
  notified: boolean | null;
  number?: string;
  justification?: string;
}

export interface Pendency {
  id: string;
  patientId?: string;
  patientName?: string;
  type: string;
  origin: string;
  description: string;
  status: "pendente" | "em-revisao" | "resolvida";
  identifiedAt: string;
  resolvedAt?: string;
  responsible?: string;
  observation?: string;
}

export interface ChagasDiagnosis {
  hasChagas: boolean | null;
  status?: string;
  finalResult?: string;
  resultDate?: string;
  confirmationCriteria?: string;
  observations?: string;
  sorologias: Sorologia[];
}

export interface Appointment {
  id: string;
  patientId: string;
  date: string;
  prontuarioLocation?: string;
  context: "ambulatorio" | "ambulatorio-projeto";
  originRecord: "importado" | "sistema";
  observations?: string;
  pendencyNotes?: string;
  status: "completo" | "pendente";
  chagas?: Partial<ChagasDiagnosis>;
  vitalSigns?: VitalSigns;
  comorbidities?: Comorbidity[];
  medications?: Medication[];
  bzn?: Partial<BZNTreatment>;
  exams?: Exam[];
  referrals?: Referral[];
  notification?: Notification;
  projects?: string[];
}

export interface ImportLine {
  line: number;
  tab: string;
  status: "importada" | "importada-pendencia" | "rejeitada" | "conflito";
  reason?: string;
  reconciledPatient?: string;
}

export interface ImportBatch {
  id: string;
  lotCode: string;
  fileName: string;
  hash: string;
  date: string;
  status: "concluido" | "parcial" | "rejeitado" | "em-andamento";
  totalLines: number;
  imported: number;
  withPendency: number;
  rejected: number;
  conflicts: number;
  layoutVersion: string;
  manifestVersion: string;
  importerVersion: string;
  systemRevision: string;
  parentBatchId?: string;
  lines: ImportLine[];
}

export type Page =
  | "login"
  | "home"
  | "patients"
  | "patient-record"
  | "new-patient"
  | "new-appointment"
  | "pendencies"
  | "imports"
  | "import-detail"
  | "dashboard"
  | "users"
  | "my-account"
  | "error-403"
  | "error-404";

export interface NavState {
  page: Page;
  patientId?: string;
  appointmentId?: string;
  importId?: string;
  returnPage?: Page;
}
