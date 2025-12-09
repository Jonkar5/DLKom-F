
import { Entity, Invoice, EntityType, InvoiceStatus } from '../types';

const STORAGE_KEYS = {
  ENTITIES: 'gestor_entities',
  INVOICES: 'gestor_invoices',
};

// --- Entities (Clients/Suppliers) ---

export const getEntities = (type?: EntityType): Entity[] => {
  const data = localStorage.getItem(STORAGE_KEYS.ENTITIES);
  const all: Entity[] = data ? JSON.parse(data) : [];
  if (type) {
    return all.filter(e => e.type === type);
  }
  return all;
};

export const getEntityById = (id: string): Entity | undefined => {
  return getEntities().find(e => e.id === id);
};

export const saveEntity = (entity: Entity): void => {
  const all = getEntities();
  const index = all.findIndex(e => e.id === entity.id);
  if (index >= 0) {
    all[index] = entity;
  } else {
    all.push(entity);
  }
  localStorage.setItem(STORAGE_KEYS.ENTITIES, JSON.stringify(all));
};

export const deleteEntity = (id: string): void => {
  let all = getEntities();
  all = all.filter(e => e.id !== id);
  localStorage.setItem(STORAGE_KEYS.ENTITIES, JSON.stringify(all));

  // Also delete associated invoices
  let invoices = getInvoices();
  invoices = invoices.filter(inv => inv.entityId !== id);
  localStorage.setItem(STORAGE_KEYS.INVOICES, JSON.stringify(invoices));
};

// --- Invoices ---

export const getInvoices = (): Invoice[] => {
  const data = localStorage.getItem(STORAGE_KEYS.INVOICES);
  return data ? JSON.parse(data) : [];
};

export const getInvoicesByEntity = (entityId: string): Invoice[] => {
  return getInvoices().filter(i => i.entityId === entityId);
};

export const saveInvoice = (invoice: Invoice): void => {
  const all = getInvoices();
  const index = all.findIndex(i => i.id === invoice.id);
  if (index >= 0) {
    all[index] = invoice;
  } else {
    all.push(invoice);
  }
  localStorage.setItem(STORAGE_KEYS.INVOICES, JSON.stringify(all));
};

export const deleteInvoice = (id: string): void => {
  let all = getInvoices();
  all = all.filter(i => i.id !== id);
  localStorage.setItem(STORAGE_KEYS.INVOICES, JSON.stringify(all));
};

// --- Demo Data ---

export const seedDemoData = (): void => {
  if (getEntities().length === 0) {
    const demoEntities: Entity[] = [
      {
        id: '1',
        type: EntityType.CLIENT,
        name: 'Empresa Cliente A, S.L.',
        taxId: 'B12345678',
        address: 'C/ Gran Vía 12',
        city: 'Madrid',
        postalCode: '28013',
        email: 'contacto@cliente-a.com',
        phone: '912345678',
        contactPerson: 'Juan Pérez'
      },
      {
        id: '2',
        type: EntityType.SUPPLIER,
        name: 'Materiales Construcción B, S.A.',
        taxId: 'A87654321',
        address: 'Polígono Industrial Sur, Nave 3',
        city: 'Getafe',
        postalCode: '28901',
        email: 'ventas@materiales-b.com',
        phone: '911111111',
        contactPerson: 'Ana García'
      }
    ];
    localStorage.setItem(STORAGE_KEYS.ENTITIES, JSON.stringify(demoEntities));
    
    const demoInvoices: Invoice[] = [
      {
        id: '101',
        entityId: '1',
        number: 'F-2023-001',
        projectAddress: 'C/ Gran Vía 12',
        date: new Date().toISOString().split('T')[0],
        totalAmount: 1210.00,
        status: InvoiceStatus.PARTIAL,
        maturities: [
          { id: 'm1', date: new Date(Date.now() + 86400000 * 30).toISOString().split('T')[0], amount: 605, paid: true },
          { id: 'm2', date: new Date(Date.now() + 86400000 * 60).toISOString().split('T')[0], amount: 605, paid: false }
        ],
        // Dummy Base64 PDF to show the button (Minimal valid PDF)
        pdfData: 'data:application/pdf;base64,JVBERi0xLjcKCjEgMCBvYmogICUgZW50cnkgcG9pbnQKPDwKICAvVHlwZSAvQ2F0YWxvZwogIC9QYWdlcyAyIDAgUgo+PgplbmRvYmoKCjIgMCBvYmoKPDwKICAvVHlwZSAvUGFnZXwKICAvTWVkaWFCb3ggWyAwIDAgMjAwIDIwMCBdCiAgL0NvdW50IDEKICAvS2lkcyBbIDMgMCBSIF0KPj4KZW5kb2JqCgozIDAgb2JqCjw8CiAgL1R5cGUgL1BhZ2UKICAvUGFyZW50IDIgMCBSC4gIC9SZXNvdXJjZXMgPDwKICAgIC9Gb250IDw8CiAgICAgIC9FMSA0IDAgUgogICAgPj4KICA+PgogIC9Db250ZW50cyA1IDAgUgo+PgplbmRvYmoKCjQgMCBvYmoKPDwKICAvVHlwZSAvRm9udAogIC9TdWJ0eXBlIC9UeXBlMQogIC9CYXNlRm9udCAvSGVsdmV0aWNhCj4+CmVuZG9iagoKNSAwIG9iago8PAogIC9MZW5ndGggNDQKPj4Kc3RyZWFtCkJUCjcwIDUwIFRECi9FMSAxMiBUZgooSGVsbG8sIHdvcmxkISkgVGoKRVQKZW5kc3RyZWFtCmVuZG9iagoKeHJlZgowIDYKMDAwMDAwMDAwMCA2NTUzNSBmIAowMDAwMDAwMDEwIDAwMDAwIG4gCjAwMDAwMDAwNjAgMDAwMDAgbiAKMDAwMDAwMDE1NyAwMDAwMCBuIAowMDAwMDAwMjU1IDAwMDAwIG4gCjAwMDAwMDAzNDEgMDAwMDAgbiAKdHJhaWxlcgo8PAogIC9TaXplIDYKICAvUm9vdCAxIDAgUgo+PgpzdGFydHhyZWYKNDM2CiUlRU9GCg=='
      }
    ];
    localStorage.setItem(STORAGE_KEYS.INVOICES, JSON.stringify(demoInvoices));
  }
};
