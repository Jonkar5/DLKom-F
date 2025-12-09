
export enum EntityType {
  CLIENT = 'CLIENT',
  SUPPLIER = 'SUPPLIER'
}

export enum InvoiceStatus {
  PENDING = 'PENDING',
  PARTIAL = 'PARTIAL',
  PAID = 'PAID'
}

export interface Maturity {
  id: string;
  date: string; // ISO date string YYYY-MM-DD (Due Date)
  amount: number;
  paid: boolean;
  paymentDate?: string; // Date when it was actually paid
}

export interface Invoice {
  id: string;
  entityId: string;
  number: string;
  projectAddress?: string;
  date: string;
  totalAmount: number;
  maturities: Maturity[];
  status: InvoiceStatus;
  notes?: string;
  pdfData?: string; // Base64 encoded PDF
}

export interface Entity {
  id: string;
  type: EntityType;
  name: string;
  taxId?: string; // NIF/CIF
  address?: string;
  city?: string;
  postalCode?: string;
  email?: string;
  phone?: string;
  contactPerson?: string;
  notes?: string;
}

export type TabID = 'HOME' | 'INVOICES_CLIENT' | 'INVOICES_SUPPLIER' | 'CLIENTS' | 'SUPPLIERS' | 'PAYMENTS_CLIENT' | 'PAYMENTS_SUPPLIER';

export interface AppState {
  view: 'TABS' | 'DETAILS' | 'ADD_ENTITY' | 'ADD_INVOICE' | 'REPORTS';
  activeTab: TabID;
  activeEntityId: string | null;
  // Temporary storage for invoice creation context
  tempInvoiceType?: EntityType; 
  // Pre-selected entity when creating invoice from list view
  tempTargetEntityId?: string;
}
