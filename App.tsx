import React, { useState, useEffect, useRef } from 'react';
import { 
  Users, 
  Truck, 
  Plus, 
  ChevronRight, 
  ArrowLeft,
  Calendar,
  Wallet,
  CheckCircle,
  Circle,
  Trash2,
  CreditCard,
  BarChart3,
  Cloud,
  RefreshCw,
  FilePlus,
  FileText,
  Home,
  Briefcase,
  UserPlus,
  Save,
  Download,
  AlertTriangle,
  X,
  Paperclip,
  Pencil
} from './components/Icon';
import { EntityType, AppState, Entity, Invoice, Maturity, InvoiceStatus, TabID } from './types';
import { 
  getEntities, 
  saveEntity, 
  deleteEntity,
  getInvoices,
  saveInvoice,
  deleteInvoice,
  seedDemoData
} from './services/storage';
import { EntityForm } from './components/EntityForm';
import { InvoiceForm } from './components/InvoiceForm';

// Force new version key
const APP_VERSION = "3.4";

function App() {
  // Key state to force re-render on version change if needed
  const [versionKey, setVersionKey] = useState(APP_VERSION);

  const [state, setState] = useState<AppState>({
    view: 'TABS',
    activeTab: 'HOME', // Default to Home Dashboard
    activeEntityId: null,
    activeInvoiceId: null
  });

  const [entities, setEntities] = useState<Entity[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  
  // Custom modal state
  const [deleteModal, setDeleteModal] = useState<{show: boolean, type: 'ENTITY' | 'INVOICE', id: string}>({
    show: false,
    type: 'ENTITY',
    id: ''
  });

  // Custom modal state for Payment Confirmation
  const [paymentModal, setPaymentModal] = useState<{show: boolean, invoice: Invoice | null, maturity: Maturity | null, date: string}>({
    show: false,
    invoice: null,
    maturity: null,
    date: new Date().toISOString().split('T')[0]
  });

  // Custom modal state for Un-Payment
  const [unpayModal, setUnpayModal] = useState<{show: boolean, invoice: Invoice | null, maturity: Maturity | null}>({
    show: false,
    invoice: null,
    maturity: null
  });
  
  // Logo state
  const [logo, setLogo] = useState<string | null>(localStorage.getItem('dlkom_logo'));
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Refresh data helper
  const refreshData = () => {
    seedDemoData(); // Ensure demo data exists if empty
    setEntities(getEntities());
    setInvoices(getInvoices());
  };

  useEffect(() => {
    refreshData();
    console.log(`App Version ${APP_VERSION} initialized`);
  }, []);

  // --- Navigation Handlers ---

  const switchTab = (tab: TabID) => {
    setState(prev => ({ ...prev, view: 'TABS', activeTab: tab, activeEntityId: null, activeInvoiceId: null, tempTargetEntityId: undefined }));
  };

  const goToDetails = (entityId: string) => {
    setState(prev => ({ ...prev, view: 'DETAILS', activeEntityId: entityId, activeInvoiceId: null }));
  };

  const goToAddEntity = (type: EntityType) => {
    setState(prev => ({ ...prev, view: 'ADD_ENTITY', tempInvoiceType: type }));
  };

  const goToAddInvoice = (type: EntityType, targetEntityId?: string) => {
    setState(prev => ({ 
      ...prev, 
      view: 'ADD_INVOICE', 
      tempInvoiceType: type, 
      tempTargetEntityId: targetEntityId, 
      activeInvoiceId: null 
    }));
  };

  const goToEditInvoice = (invoice: Invoice) => {
    const entity = entities.find(e => e.id === invoice.entityId);
    setState(prev => ({ 
      ...prev, 
      view: 'ADD_INVOICE', 
      tempInvoiceType: entity?.type, 
      activeInvoiceId: invoice.id 
    }));
  };

  const goToReports = () => {
    setState(prev => ({ ...prev, view: 'REPORTS' }));
  };

  // --- Action Handlers ---

  const handleSaveEntity = (entity: Entity) => {
    saveEntity(entity);
    refreshData();
    const targetTab: TabID = entity.type === EntityType.CLIENT ? 'CLIENTS' : 'SUPPLIERS';
    switchTab(targetTab);
  };

  const handleSaveInvoice = (invoice: Invoice) => {
    saveInvoice(invoice);
    refreshData();
    if (state.activeEntityId) {
      goToDetails(state.activeEntityId);
    } else {
       const entity = entities.find(e => e.id === invoice.entityId);
       if (entity) {
           goToDetails(entity.id);
       } else {
           const targetTab: TabID = entity?.type === EntityType.SUPPLIER ? 'INVOICES_SUPPLIER' : 'INVOICES_CLIENT';
           switchTab(targetTab);
       }
    }
  };

  const confirmDelete = (type: 'ENTITY' | 'INVOICE', id: string) => {
    setDeleteModal({ show: true, type, id });
  };

  const executeDelete = () => {
    if (deleteModal.type === 'ENTITY') {
       const ent = entities.find(e => e.id === deleteModal.id);
       deleteEntity(deleteModal.id);
       refreshData();
       setDeleteModal({ ...deleteModal, show: false });
       if (ent) switchTab(ent.type === EntityType.CLIENT ? 'CLIENTS' : 'SUPPLIERS');
    } else {
       deleteInvoice(deleteModal.id);
       refreshData();
       setDeleteModal({ ...deleteModal, show: false });
    }
  };

  // --- PAYMENT LOGIC ---

  const handleMaturityClick = (invoice: Invoice, maturity: Maturity) => {
    if (!maturity.paid) {
        setPaymentModal({
            show: true,
            invoice,
            maturity,
            date: new Date().toISOString().split('T')[0]
        });
    } else {
        setUnpayModal({
            show: true,
            invoice,
            maturity
        });
    }
  };

  const executeTogglePaid = (invoice: Invoice, maturity: Maturity, isPaid: boolean, date?: string) => {
    const updatedMaturities = invoice.maturities.map(m => 
      m.id === maturity.id ? { ...m, paid: isPaid, paymentDate: isPaid ? date : undefined } : m
    );
    
    const allPaid = updatedMaturities.every(m => m.paid);
    const somePaid = updatedMaturities.some(m => m.paid);
    
    let newStatus = invoice.status;
    if (allPaid) newStatus = InvoiceStatus.PAID;
    else if (somePaid) newStatus = InvoiceStatus.PARTIAL;
    else newStatus = InvoiceStatus.PENDING;

    const updatedInvoice = { 
      ...invoice, 
      maturities: updatedMaturities,
      status: newStatus
    };
    
    saveInvoice(updatedInvoice);
    refreshData();
  };

  const confirmPaymentDate = () => {
      if (paymentModal.invoice && paymentModal.maturity && paymentModal.date) {
          executeTogglePaid(paymentModal.invoice, paymentModal.maturity, true, paymentModal.date);
          setPaymentModal({ ...paymentModal, show: false, invoice: null, maturity: null });
      }
  };

  const confirmUnpay = () => {
      if (unpayModal.invoice && unpayModal.maturity) {
          executeTogglePaid(unpayModal.invoice, unpayModal.maturity, false, undefined);
          setUnpayModal({ ...unpayModal, show: false, invoice: null, maturity: null });
      }
  };

  const handleSync = () => {
    setIsSyncing(true);
    setTimeout(() => {
      setIsSyncing(false);
      refreshData();
    }, 1500);
  };

  const handleReload = () => {
    window.location.reload();
  };

  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setLogo(base64String);
        localStorage.setItem('dlkom_logo', base64String);
      };
      reader.readAsDataURL(file);
    }
  };

  const downloadPdf = (base64: string, filename: string) => {
    const link = document.createElement('a');
    link.href = base64;
    link.download = filename || 'document.pdf';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- Sub-Renderers ---

  const renderHeader = (title: string, actionButton?: React.ReactNode) => (
    <div className="sticky top-0 bg-white/95 backdrop-blur-md z-20 px-4 py-3 shadow-sm border-b border-slate-100 flex items-center justify-between">
      <div className="flex items-center gap-3">
         {state.activeTab !== 'HOME' && (
           <button 
             onClick={() => switchTab('HOME')} 
             className="p-2 -ml-2 rounded-2xl text-slate-500 hover:bg-slate-100 hover:text-blue-600 transition-colors active:scale-95"
           >
             <ArrowLeft size={24} />
           </button>
         )}
         <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center text-white overflow-hidden shadow-sm cursor-pointer shrink-0" onClick={() => fileInputRef.current?.click()}>
            {logo ? <img src={logo} alt="Logo" className="w-full h-full object-cover" /> : <span className="font-bold text-sm">DL</span>}
         </div>
         <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleLogoUpload} />
         <h2 className="text-xl font-bold text-slate-800 leading-tight">{title}</h2>
      </div>
      <div className="flex gap-2 items-center">
         <button onClick={handleSync} className={`p-2 rounded-2xl bg-slate-50 text-slate-500 hover:bg-blue-50 hover:text-blue-600 transition-colors ${isSyncing ? 'animate-spin text-blue-500' : ''}`}>
           <Cloud size={24} />
         </button>
         {actionButton}
      </div>
    </div>
  );

  const renderDashboard = () => (
    <div className="flex flex-col h-full bg-slate-50">
       <div className="sticky top-0 bg-white/95 backdrop-blur-md z-20 px-4 py-3 shadow-sm border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
             <div className="w-16 h-16 bg-slate-900 rounded-[22px] flex items-center justify-center text-white overflow-hidden shadow-md cursor-pointer shrink-0" onClick={() => fileInputRef.current?.click()}>
                {logo ? <img src={logo} alt="Logo" className="w-full h-full object-cover" /> : <span className="font-bold text-xl">DL</span>}
             </div>
             <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleLogoUpload} />
             <div>
                <h1 className="text-2xl font-bold text-slate-800">DLKom</h1>
                <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Facturación</p>
             </div>
          </div>
          <div className="flex gap-2">
             <button onClick={handleSync} className={`p-3 rounded-[20px] bg-blue-50 text-blue-600 hover:bg-blue-100 hover:scale-105 active:scale-95 transition-all shadow-sm ${isSyncing ? 'animate-spin' : ''}`}><Cloud size={28} /></button>
             <button onClick={handleReload} className="p-3 rounded-[20px] bg-indigo-50 text-indigo-600 hover:bg-indigo-100 hover:scale-105 active:scale-95 transition-all shadow-sm"><RefreshCw size={28} /></button>
          </div>
       </div>

       <div className="p-4 grid grid-cols-2 gap-4 h-full content-start overflow-hidden">
          <DashboardCard title="Facturación" icon={<FileText size={32} strokeWidth={2} />} color="bg-blue-50 text-blue-600" onClick={() => switchTab('INVOICES_CLIENT')} heightClass="h-36" />
          <DashboardCard title="Facturas Prov." icon={<FileText size={32} strokeWidth={2} />} color="bg-rose-50 text-rose-600" onClick={() => switchTab('INVOICES_SUPPLIER')} heightClass="h-36" />
          <DashboardCard title="Clientes" icon={<Users size={32} strokeWidth={2} />} color="bg-violet-50 text-violet-600" onClick={() => switchTab('CLIENTS')} heightClass="h-28" />
          <DashboardCard title="Proveedores" icon={<Truck size={32} strokeWidth={2} />} color="bg-amber-50 text-amber-600" onClick={() => switchTab('SUPPLIERS')} heightClass="h-28" />
          <DashboardCard title="Cobros" icon={<Wallet size={32} strokeWidth={2} />} color="bg-indigo-50 text-indigo-600" onClick={() => switchTab('PAYMENTS_CLIENT')} heightClass="h-28" />
          <DashboardCard title="Pagos" icon={<CreditCard size={32} strokeWidth={2} />} color="bg-emerald-50 text-emerald-600" onClick={() => switchTab('PAYMENTS_SUPPLIER')} heightClass="h-28" />
          <div className="col-span-2">
             <DashboardCard title="Informes Generales" icon={<BarChart3 size={32} strokeWidth={2} />} color="bg-cyan-50 text-cyan-600" onClick={goToReports} fullWidth heightClass="h-24" />
          </div>
       </div>
    </div>
  );

  const DashboardCard = ({ title, icon, color, onClick, fullWidth, heightClass }: any) => (
    <button onClick={onClick} className={`group flex flex-col items-center justify-center p-4 rounded-[32px] shadow-[0_4px_16px_rgba(0,0,0,0.03)] border border-white bg-white transition-all duration-300 ease-out hover:scale-[1.02] hover:shadow-lg hover:-translate-y-1 active:scale-95 w-full ${fullWidth ? 'flex-row gap-6' : ''} ${heightClass || 'h-32'}`}>
      <div className={`w-16 h-16 flex items-center justify-center rounded-[24px] ${fullWidth ? 'mb-0' : 'mb-3'} ${color} transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3`}>{icon}</div>
      <span className="font-bold text-slate-700 text-sm tracking-wide">{title}</span>
    </button>
  );

  const renderInvoiceList = (type: EntityType) => {
    const isClient = type === EntityType.CLIENT;
    const title = isClient ? 'Facturación' : 'Facturas Prov.';
    const entityLabel = isClient ? 'cliente' : 'proveedor';
    const totalColor = isClient ? 'text-emerald-600' : 'text-blue-600';
    
    const filteredInvoices = invoices.filter(inv => {
        const entity = entities.find(e => e.id === inv.entityId);
        return entity && entity.type === type;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return (
      <div className="flex flex-col h-full bg-slate-50">
        {renderHeader(title)}
        
        <div className="bg-white p-3 shadow-sm z-10 space-y-3">
             <div className="flex gap-2">
                 {isClient ? (
                    <>
                        <button onClick={() => goToAddInvoice(type)} className="flex-1 py-1.5 px-2 rounded-xl flex items-center justify-center gap-1.5 font-bold text-white shadow-md active:scale-95 transition-transform text-[11px] uppercase tracking-wide bg-slate-900">
                        <Plus size={16} /><span>Nueva Factura</span>
                        </button>
                        <button onClick={() => goToAddEntity(EntityType.CLIENT)} className="flex-1 py-1.5 px-2 rounded-xl flex items-center justify-center gap-1.5 font-bold text-blue-600 bg-blue-50 border border-blue-100 shadow-sm active:scale-95 transition-transform text-[11px] uppercase tracking-wide">
                        <UserPlus size={16} /><span>Nuevo Cliente</span>
                        </button>
                    </>
                 ) : (
                    <>
                        <button onClick={() => goToAddInvoice(type)} className="flex-1 py-2 px-3 rounded-[18px] flex flex-row items-center justify-center gap-2 font-bold text-white shadow-md active:scale-95 transition-transform bg-emerald-600">
                        <div className="bg-white/20 p-1.5 rounded-full"><Plus size={18} /></div><span className="text-xs uppercase tracking-wide">Nueva Factura</span>
                        </button>
                        <button onClick={() => goToAddEntity(EntityType.SUPPLIER)} className="flex-1 py-2 px-3 rounded-[18px] flex flex-row items-center justify-center gap-2 font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 shadow-sm active:scale-95 transition-transform">
                        <div className="bg-white p-1.5 rounded-full shadow-sm"><Truck size={18} /></div><span className="text-xs uppercase tracking-wide">Nuevo Proveedor</span>
                        </button>
                    </>
                 )}
             </div>
             <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block ml-1">Factura Rápida para {entityLabel}:</label>
                <div className="relative">
                    <select
                        className="w-full p-2.5 pl-9 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-medium text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
                        onChange={(e) => {
                        if (e.target.value) {
                            goToAddInvoice(type, e.target.value);
                        }
                        }}
                        value=""
                    >
                        <option value="" disabled>Seleccionar {entityLabel}...</option>
                        {entities.filter(e => e.type === type).map(c => (<option key={c.id} value={c.id}>{c.name}</option>))}
                    </select>
                    <div className="absolute left-3 top-3 text-slate-400 pointer-events-none"><FilePlus size={16} /></div>
                    <div className="absolute right-3 top-3 text-slate-400 pointer-events-none"><ChevronRight size={16} className="rotate-90" /></div>
                </div>
             </div>
        </div>

        <div className="p-4 space-y-3 pb-32">
           {filteredInvoices.length === 0 ? (
               <div className="text-center py-20 text-slate-400"><p>No hay facturas.</p></div>
           ) : (
             filteredInvoices.map(inv => {
               const entity = entities.find(e => e.id === inv.entityId);
               const pendingAmount = inv.maturities.reduce((acc, m) => acc + (m.paid ? 0 : m.amount), 0);
               const hasPending = pendingAmount > 0.01;
               return (
                 <div key={inv.id} onClick={() => goToDetails(inv.entityId)} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col relative overflow-hidden transition-all hover:shadow-md active:scale-95 cursor-pointer">
                    <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${hasPending ? 'bg-blue-500' : 'bg-green-500'}`}></div>
                    <div className="pl-3">
                        <div className="mb-1"><span className="font-bold text-slate-800 text-lg line-clamp-1">{entity?.name}</span></div>
                        <div className="text-xs text-slate-500 mb-3 font-medium flex gap-2"><span>{inv.number}</span><span>•</span><span>{inv.date.split('-').reverse().join('/')}</span></div>
                        <div className="flex justify-between items-end border-t border-slate-50 pt-2">
                            <div><p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Total Factura</p><p className={`text-base font-bold ${totalColor}`}>{inv.totalAmount.toFixed(2)} €</p></div>
                            <div className="text-right"><p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Pte:</p>
                                {hasPending ? (<p className="text-base font-bold text-blue-600">{pendingAmount.toFixed(2)} €</p>) : (<p className="text-base font-bold text-green-500">0.00 €</p>)}
                            </div>
                        </div>
                    </div>
                 </div>
               );
             })
           )}
        </div>
      </div>
    );
  };

  const renderEntityList = (type: EntityType) => {
    const isClient = type === EntityType.CLIENT;
    const title = isClient ? 'Clientes' : 'Proveedores';
    const filtered = entities.filter(e => e.type === type);

    return (
      <div className="flex flex-col h-full bg-slate-50">
        {renderHeader(title, 
           <button onClick={() => goToAddEntity(type)} className={`p-2 rounded-2xl ${isClient ? 'bg-violet-100 text-violet-600' : 'bg-amber-100 text-amber-600'} shadow-sm active:scale-95 transition-transform`}><Plus size={24} /></button>
        )}
        
        <div className="bg-white px-4 py-3 border-b border-slate-100">
             <div className="relative">
                <select
                  className="w-full p-3 pl-10 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-medium appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
                  onChange={(e) => {
                    if (e.target.value) goToDetails(e.target.value);
                  }}
                  value=""
                >
                  <option value="" disabled>Ir a ficha de {isClient ? 'cliente' : 'proveedor'}...</option>
                  {filtered.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                <div className="absolute left-3 top-3.5 text-slate-400 pointer-events-none"><Users size={18} /></div>
             </div>
        </div>

        <div className="p-4 space-y-3 pb-32">
          {filtered.length === 0 ? (
            <div className="text-center py-20 text-slate-400">
              <p>No hay {isClient ? 'clientes' : 'proveedores'}.</p>
            </div>
          ) : (
            filtered.map(entity => (
              <div key={entity.id} onClick={() => goToDetails(entity.id)} className="bg-white p-4 rounded-[24px] shadow-sm border border-slate-100 flex items-center justify-between active:bg-slate-50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-[18px] flex items-center justify-center ${isClient ? 'bg-violet-50 text-violet-500' : 'bg-amber-50 text-amber-500'}`}>{isClient ? <Users size={20} /> : <Truck size={20} />}</div>
                  <div><h3 className="font-bold text-slate-800 text-lg">{entity.name}</h3><div className="flex gap-2 text-sm text-slate-500">{entity.phone && <span>{entity.phone}</span>}</div></div>
                </div>
                <ChevronRight className="text-slate-300" />
              </div>
            ))
          )}
        </div>
      </div>
    );
  };

  const renderPayments = (type: EntityType) => {
    const isClient = type === EntityType.CLIENT;
    const title = isClient ? 'Cobros' : 'Pagos';
    const themeColor = isClient ? 'text-indigo-600' : 'text-emerald-600';
    
    const relevantEntities = entities.filter(e => e.type === type);
    const relevantEntityIds = new Set(relevantEntities.map(e => e.id));
    const typeInvoices = invoices.filter(inv => relevantEntityIds.has(inv.entityId));
    
    const pendingList: any[] = [];
    typeInvoices.forEach(inv => {
      inv.maturities.forEach(mat => {
        if (!mat.paid) {
          const entity = entities.find(e => e.id === inv.entityId);
          pendingList.push({ invId: inv.id, invNumber: inv.number, entityName: entity?.name, maturity: mat });
        }
      });
    });

    pendingList.sort((a, b) => new Date(a.maturity.date).getTime() - new Date(b.maturity.date).getTime());

    return (
      <div className="flex flex-col h-full bg-slate-50">
        {renderHeader(title)}
        <div className="p-4 space-y-3 pb-32">
          {pendingList.length === 0 ? (
             <div className="text-center py-20 text-slate-400"><CheckCircle size={48} className="mx-auto mb-4 text-slate-300" /><p>¡Todo al día!</p></div>
          ) : (
            pendingList.map((item) => (
              <div key={item.maturity.id} onClick={() => goToDetails(typeInvoices.find(i => i.id === item.invId)?.entityId || '')} className="bg-white p-4 rounded-[24px] shadow-sm border border-slate-100 active:bg-slate-50">
                <div className="flex justify-between items-start mb-2">
                  <div><span className="text-sm font-bold text-slate-800 block">{item.entityName}</span><span className="text-xs text-slate-500">Factura {item.invNumber}</span></div>
                  <span className={`font-bold ${themeColor}`}>{item.maturity.amount.toFixed(2)} €</span>
                </div>
                <div className="flex justify-between items-center text-xs text-slate-500 bg-slate-50 p-2 rounded-lg"><span>Vence: {item.maturity.date.split('-').reverse().join('/')}</span><span className="text-orange-500 font-medium">Pendiente</span></div>
              </div>
            ))
          )}
        </div>
      </div>
    );
  };

  const renderReports = () => {
    const clientInvoices = invoices.filter(i => entities.find(ent => ent.id === i.entityId)?.type === EntityType.CLIENT);
    const supplierInvoices = invoices.filter(i => entities.find(ent => ent.id === i.entityId)?.type === EntityType.SUPPLIER);
    const totalBilled = clientInvoices.reduce((sum, i) => sum + i.totalAmount, 0);
    const totalExpenses = supplierInvoices.reduce((sum, i) => sum + i.totalAmount, 0);
    let pendingCollection = 0; clientInvoices.forEach(inv => inv.maturities.forEach(m => { if (!m.paid) pendingCollection += m.amount; }));
    let pendingPayment = 0; supplierInvoices.forEach(inv => inv.maturities.forEach(m => { if (!m.paid) pendingPayment += m.amount; }));

    return (
      <div className="flex flex-col h-full bg-slate-50">
        <div className="sticky top-0 bg-white/95 backdrop-blur-md z-20 px-4 py-3 shadow-sm border-b border-slate-100 flex items-center gap-2">
           <button onClick={() => switchTab('HOME')} className="p-2 -ml-2 text-slate-600 hover:text-blue-600 hover:bg-slate-100 rounded-2xl transition-colors active:scale-95"><ArrowLeft size={24} /></button>
           <h2 className="text-xl font-bold text-slate-800">Informes</h2>
        </div>
        <div className="p-4 space-y-4 pb-32">
           <div className="bg-white p-5 rounded-[24px] shadow-sm border border-slate-100">
             <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">Resumen Global</h3>
             <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-blue-50 rounded-[20px]"><p className="text-xs text-blue-500 mb-1">Total Facturado</p><p className="text-2xl font-bold text-blue-700">{totalBilled.toFixed(0)} €</p></div>
                <div className="p-4 bg-rose-50 rounded-[20px]"><p className="text-xs text-rose-500 mb-1">Total Gastos</p><p className="text-2xl font-bold text-rose-700">{totalExpenses.toFixed(0)} €</p></div>
             </div>
           </div>
           <div className="bg-white p-5 rounded-[24px] shadow-sm border border-slate-100">
             <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">Estado de Tesorería</h3>
             <div className="space-y-4">
                <div>
                   <div className="flex justify-between items-end mb-1"><span className="text-sm text-slate-600">Pendiente de Cobro</span><span className="font-bold text-indigo-500">{pendingCollection.toFixed(0)} €</span></div>
                   <div className="w-full bg-slate-100 rounded-full h-2"><div className="bg-indigo-400 h-2 rounded-full" style={{ width: `${Math.min((pendingCollection / (totalBilled || 1)) * 100, 100)}%` }}></div></div>
                </div>
                <div>
                   <div className="flex justify-between items-end mb-1"><span className="text-sm text-slate-600">Pendiente de Pago</span><span className="font-bold text-emerald-500">{pendingPayment.toFixed(0)} €</span></div>
                   <div className="w-full bg-slate-100 rounded-full h-2"><div className="bg-emerald-400 h-2 rounded-full" style={{ width: `${Math.min((pendingPayment / (totalExpenses || 1)) * 100, 100)}%` }}></div></div>
                </div>
             </div>
           </div>
        </div>
      </div>
    );
  };

  const renderDetails = () => {
    if (!state.activeEntityId) return null;
    const entity = entities.find(e => e.id === state.activeEntityId);
    if (!entity) return null;
    const entityInvoices = invoices.filter(i => i.entityId === entity.id).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const isClient = entity.type === EntityType.CLIENT;
    const totalPending = entityInvoices.reduce((sum, inv) => {
        return sum + inv.maturities.filter(m => !m.paid).reduce((mSum, m) => mSum + m.amount, 0);
    }, 0);

    return (
      <div className="flex flex-col h-full bg-slate-50">
         <div className="sticky top-0 bg-white/95 backdrop-blur-md z-20 px-4 py-3 shadow-sm border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center">
              <button onClick={() => switchTab(isClient ? 'INVOICES_CLIENT' : 'INVOICES_SUPPLIER')} className="p-2 -ml-2 text-slate-600 hover:text-blue-600 hover:bg-slate-100 rounded-2xl transition-colors active:scale-95"><ArrowLeft size={24} /></button>
              <h2 className="ml-2 text-xl font-bold text-slate-800 truncate max-w-[200px]">{entity.name}</h2>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setState(prev => ({ ...prev, view: 'ADD_ENTITY', tempInvoiceType: entity.type }))} className="p-2 rounded-2xl bg-orange-50 text-orange-600 shadow-sm active:scale-95 transition-all hover:bg-orange-100 hover:shadow-md"><Pencil size={20} /></button>
              <button onClick={() => confirmDelete('ENTITY', entity.id)} className="p-2 rounded-2xl bg-red-50 text-red-500"><Trash2 size={20} /></button>
            </div>
         </div>
         <div className="p-4 space-y-6 pb-32 overflow-y-auto">
            <div className="bg-white p-5 rounded-[24px] shadow-sm border border-slate-100">
               <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                 <div><p className="text-slate-400 text-xs uppercase tracking-wider mb-1">NIF/CIF</p><p className="font-medium text-slate-700">{entity.taxId || '-'}</p></div>
                 <div><p className="text-slate-400 text-xs uppercase tracking-wider mb-1">Teléfono</p><p className="font-medium text-slate-700">{entity.phone || '-'}</p></div>
                 <div className="col-span-2"><p className="text-slate-400 text-xs uppercase tracking-wider mb-1">Email</p><p className="font-medium text-slate-700">{entity.email || '-'}</p></div>
                 <div className="col-span-2"><p className="text-slate-400 text-xs uppercase tracking-wider mb-1">Dirección</p><p className="font-medium text-slate-700">{entity.address} {entity.city ? `, ${entity.city}` : ''} {entity.postalCode}</p></div>
               </div>
               <div className="pt-4 border-t border-slate-100 flex justify-between items-center mt-2">
                   <span className="text-slate-500 font-bold text-xs uppercase tracking-wider">Pendiente Total</span>
                   <span className="text-xl font-bold text-blue-600">{totalPending.toFixed(2)} €</span>
               </div>
            </div>
            <div>
               <div className="flex items-center justify-between mb-3"><h3 className="font-bold text-slate-800 text-lg">Facturas</h3><button onClick={() => goToAddInvoice(entity.type, entity.id)} className="text-sm font-bold bg-slate-900 text-white px-4 py-2 rounded-[18px] flex items-center gap-1 shadow-md active:scale-95"><Plus size={16} />Nueva</button></div>
               <div className="space-y-3">
                 {entityInvoices.map(inv => (
                   <div key={inv.id} className="bg-white rounded-[24px] shadow-sm border border-slate-100 overflow-hidden">
                      <div className="p-4 flex justify-between items-center border-b border-slate-50 bg-slate-50/50">
                         <div>
                            <div className="flex items-center gap-2 mb-1">
                               <span className="font-bold text-slate-700 text-lg">{inv.number}</span>
                               {inv.pdfData && (<button onClick={(e) => { e.stopPropagation(); downloadPdf(inv.pdfData!, `factura-${inv.number}.pdf`); }} className="flex items-center gap-1 px-2 py-1 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 border border-red-100 ml-1" title="Descargar PDF"><Download size={14} /><span className="text-[10px] font-bold tracking-wide">PDF</span></button>)}
                               <button onClick={() => goToEditInvoice(inv)} className="text-slate-400 hover:text-blue-500 p-1.5 transition-colors"><Pencil size={16} /></button>
                               <button onClick={() => confirmDelete('INVOICE', inv.id)} className="text-slate-400 hover:text-red-400 p-1.5 transition-colors"><Trash2 size={16} /></button>
                            </div>
                            <span className="text-xs text-slate-400">{inv.date.split('-').reverse().join('/')}</span>
                         </div>
                         <div className="flex items-center gap-3">
                            <span className="font-bold text-emerald-600 text-lg">{inv.totalAmount.toFixed(2)} €</span>
                         </div>
                      </div>
                      <div className="p-3 bg-white">
                         {inv.maturities.map(m => (
                           <div key={m.id} className="flex items-center justify-between py-2 border-b last:border-0 border-slate-50">
                              <div className="flex items-center gap-3">
                                <button onClick={() => handleMaturityClick(inv, m)} className={`transition-colors ${m.paid ? 'text-green-500' : 'text-slate-400'}`}>{m.paid ? <CheckCircle size={20} /> : <Circle size={20} />}</button>
                                <div>
                                    <span className={`text-sm block ${m.paid ? 'text-slate-400 line-through' : 'text-slate-600'}`}>{m.date.split('-').reverse().join('/')}</span>
                                    {m.paid && m.paymentDate && (<span className="text-[10px] font-bold text-emerald-600 block mt-0.5">Pagado: {m.paymentDate.split('-').reverse().join('/')}</span>)}
                                </div>
                              </div>
                              <span className={`text-sm font-medium ${m.paid ? 'text-slate-400' : 'text-slate-700'}`}>{m.amount.toFixed(2)} €</span>
                           </div>
                         ))}
                      </div>
                   </div>
                 ))}
               </div>
            </div>
         </div>
      </div>
    );
  };

  let content;
  switch (state.view) {
    case 'TABS':
      if (state.activeTab === 'HOME') content = renderDashboard();
      else if (state.activeTab === 'INVOICES_CLIENT') content = renderInvoiceList(EntityType.CLIENT);
      else if (state.activeTab === 'INVOICES_SUPPLIER') content = renderInvoiceList(EntityType.SUPPLIER);
      else if (state.activeTab === 'CLIENTS') content = renderEntityList(EntityType.CLIENT);
      else if (state.activeTab === 'SUPPLIERS') content = renderEntityList(EntityType.SUPPLIER);
      else if (state.activeTab === 'PAYMENTS_CLIENT') content = renderPayments(EntityType.CLIENT);
      else if (state.activeTab === 'PAYMENTS_SUPPLIER') content = renderPayments(EntityType.SUPPLIER);
      else content = renderDashboard();
      break;
    case 'DETAILS':
      content = renderDetails();
      break;
    case 'ADD_ENTITY':
      const entityToEdit = state.activeEntityId 
        ? entities.find(e => e.id === state.activeEntityId) 
        : undefined;
      
      content = (
        <EntityForm 
          type={state.tempInvoiceType || EntityType.CLIENT}
          initialData={entityToEdit}
          onSave={handleSaveEntity}
          onCancel={() => {
            if (state.activeEntityId) {
              goToDetails(state.activeEntityId);
            } else {
              switchTab(state.tempInvoiceType === EntityType.CLIENT ? 'CLIENTS' : 'SUPPLIERS');
            }
          }}
        />
      );
      break;
    case 'ADD_INVOICE':
      const invoiceToEdit = state.activeInvoiceId 
        ? invoices.find(i => i.id === state.activeInvoiceId) 
        : undefined;
      const targetType = state.tempInvoiceType || EntityType.CLIENT;

      content = (
        <InvoiceForm 
          entityId={state.tempTargetEntityId}
          entityType={targetType}
          availableEntities={entities.filter(e => e.type === targetType)}
          initialInvoice={invoiceToEdit}
          onSave={handleSaveInvoice}
          onCancel={() => {
            if (state.activeInvoiceId) {
                const inv = invoices.find(i => i.id === state.activeInvoiceId);
                if (inv) goToDetails(inv.entityId);
                else switchTab('HOME');
            } else if (state.tempTargetEntityId) {
                goToDetails(state.tempTargetEntityId);
            } else {
                switchTab(targetType === EntityType.CLIENT ? 'INVOICES_CLIENT' : 'INVOICES_SUPPLIER');
            }
          }}
        />
      );
      break;
    case 'REPORTS':
      content = renderReports();
      break;
    default:
      content = renderDashboard();
  }

  const showBottomNav = state.view === 'TABS';

  return (
    <div className="h-screen w-full bg-slate-50 flex flex-col font-sans text-slate-900 overflow-hidden relative" key={versionKey}>
      {paymentModal.show && (
        <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
           <div className="bg-white rounded-[32px] p-6 shadow-2xl w-full max-w-sm animate-in fade-in zoom-in duration-200">
              <div className="flex justify-center mb-4 text-emerald-500"><CheckCircle size={56} /></div>
              <h3 className="text-xl font-bold text-center text-slate-800 mb-2">Confirmar Pago</h3>
              <div className="mb-6">
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 text-center">Fecha de Pago</label>
                  <input type="date" className="w-full p-4 rounded-xl border-2 border-emerald-100 bg-emerald-50/50 text-center font-bold text-slate-800" value={paymentModal.date} onChange={(e) => setPaymentModal({ ...paymentModal, date: e.target.value })} />
              </div>
              <div className="flex gap-3">
                 <button onClick={() => setPaymentModal({ ...paymentModal, show: false })} className="flex-1 py-3 rounded-[18px] border border-slate-200 font-semibold text-slate-600">Cancelar</button>
                 <button onClick={confirmPaymentDate} disabled={!paymentModal.date} className="flex-1 py-3 rounded-[18px] bg-emerald-600 font-bold text-white shadow-lg">Confirmar</button>
              </div>
           </div>
        </div>
      )}
      
      {unpayModal.show && (
        <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
           <div className="bg-white rounded-[32px] p-6 shadow-2xl w-full max-w-sm animate-in fade-in zoom-in duration-200">
              <div className="flex justify-center mb-4 text-orange-500"><AlertTriangle size={56} /></div>
              <h3 className="text-xl font-bold text-center text-slate-800 mb-2">¿Anular Pago?</h3>
              <p className="text-center text-slate-500 mb-6 text-sm">Se borrará la fecha de pago.</p>
              <div className="flex gap-3 mt-6">
                 <button onClick={() => setUnpayModal({ ...unpayModal, show: false })} className="flex-1 py-3 rounded-[18px] border border-slate-200">Cancelar</button>
                 <button onClick={confirmUnpay} className="flex-1 py-3 rounded-[18px] bg-orange-500 font-bold text-white shadow-lg">Anular</button>
              </div>
           </div>
        </div>
      )}

      {deleteModal.show && (
        <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
           <div className="bg-white rounded-[32px] p-6 shadow-xl w-full max-w-sm animate-in fade-in zoom-in duration-200">
              <div className="flex justify-center mb-4 text-orange-500"><AlertTriangle size={48} /></div>
              <h3 className="text-xl font-bold text-center text-slate-800 mb-2">¿Confirmar eliminación?</h3>
              <div className="flex gap-3 mt-6">
                 <button onClick={() => setDeleteModal({ ...deleteModal, show: false })} className="flex-1 py-3 rounded-[18px] border border-slate-200">Cancelar</button>
                 <button onClick={executeDelete} className="flex-1 py-3 rounded-[18px] bg-red-500 font-bold text-white shadow-lg">Eliminar</button>
              </div>
           </div>
        </div>
      )}

      <div className="flex-1 overflow-hidden relative">{content}</div>
      
      {showBottomNav && (
        <div className="h-[80px] bg-white border-t border-slate-200 flex items-center shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-30 overflow-x-auto no-scrollbar pb-safe">
           <div className="flex w-full px-1 min-w-max justify-around">
              <NavButton active={state.activeTab === 'HOME'} onClick={() => switchTab('HOME')} icon={<Home size={24} />} label="Inicio" />
              <NavButton active={state.activeTab === 'INVOICES_CLIENT'} onClick={() => switchTab('INVOICES_CLIENT')} icon={<FileText size={24} />} label="Facturación" />
              <NavButton active={state.activeTab === 'INVOICES_SUPPLIER'} onClick={() => switchTab('INVOICES_SUPPLIER')} icon={<FileText size={24} />} label="Fact. Prov" />
              <NavButton active={state.activeTab === 'CLIENTS'} onClick={() => switchTab('CLIENTS')} icon={<Users size={24} />} label="Clientes" />
              <NavButton active={state.activeTab === 'SUPPLIERS'} onClick={() => switchTab('SUPPLIERS')} icon={<Truck size={24} />} label="Provee." />
              <NavButton active={state.activeTab === 'PAYMENTS_CLIENT'} onClick={() => switchTab('PAYMENTS_CLIENT')} icon={<Wallet size={24} />} label="Cobros" />
              <NavButton active={state.activeTab === 'PAYMENTS_SUPPLIER'} onClick={() => switchTab('PAYMENTS_SUPPLIER')} icon={<CreditCard size={24} />} label="Pagos" />
           </div>
        </div>
      )}
    </div>
  );
}

const NavButton = ({ active, onClick, icon, label }: any) => (
  <button onClick={onClick} className={`flex flex-col items-center justify-center min-w-[55px] flex-1 h-full gap-1 px-1 transition-colors ${active ? 'text-slate-900' : 'text-slate-400'}`}>
    <div className={`p-1.5 rounded-2xl ${active ? 'bg-slate-100' : 'bg-transparent'}`}>{React.cloneElement(icon, { size: active ? 24 : 22, strokeWidth: active ? 2.5 : 2 })}</div>
    <span className={`text-[9px] font-medium leading-none mt-1 ${active ? 'font-bold' : ''}`}>{label}</span>
  </button>
);

export default App;