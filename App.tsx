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

// Force new version key for GitHub release
const APP_VERSION = "3.5";

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
                <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">DLKom <span className="w-2 h-2 rounded-full bg-blue-500"></span></h1>
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
                               {inv.pdfData && (<button onClick={(e) => { e.stopPropagation(); downloadPdf(inv.pdfData!, `factura-${inv.number}.pdf`); }} className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 hover:scale-105 active:scale-95 transition-all shadow-sm border border-red-100 ml-2" title="Descargar PDF"><Download size={16} /><span className="text-xs font-bold tracking-wide">PDF</span></button>)}
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

  const renderEntityList = (type: EntityType) => {
    const isClient = type === EntityType.CLIENT;
    const title = isClient ? 'Clientes' : 'Proveedores';
    
    const filteredEntities = entities.filter(e => e.type === type)
      .sort((a, b) => a.name.localeCompare(b.name));

    return (
      <div className="flex flex-col h-full bg-slate-50">
        {renderHeader(title, 
            <button onClick={() => goToAddEntity(type)} className="p-2 rounded-2xl bg-slate-900 text-white shadow-sm active:scale-95 transition-all">
                <Plus size={24} />
            </button>
        )}
        <div className="p-4 space-y-3 pb-32 overflow-y-auto">
          {filteredEntities.length === 0 ? (
             <div className="text-center py-20 text-slate-400"><p>No hay {title.toLowerCase()} registrados.</p></div>
          ) : (
             filteredEntities.map(entity => (
               <div key={entity.id} onClick={() => goToDetails(entity.id)} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between active:scale-95 transition-transform cursor-pointer">
                  <div className="flex items-center gap-4">
                     <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isClient ? 'bg-blue-50 text-blue-500' : 'bg-amber-50 text-amber-500'}`}>
                        {isClient ? <Users size={20} /> : <Truck size={20} />}
                     </div>
                     <div>
                        <h3 className="font-bold text-slate-800 text-lg leading-tight">{entity.name}</h3>
                        <p className="text-xs text-slate-500 font-medium">{entity.contactPerson || entity.email || entity.phone || 'Sin datos de contacto'}</p>
                     </div>
                  </div>
                  <ChevronRight size={20} className="text-slate-300" />
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
      
      const allItems: { maturity: Maturity, invoice: Invoice, entity: Entity }[] = [];
      
      invoices.forEach(inv => {
          const entity = entities.find(e => e.id === inv.entityId);
          if (entity && entity.type === type) {
              inv.maturities.forEach(m => {
                  allItems.push({
                      maturity: m,
                      invoice: inv,
                      entity: entity
                  });
              });
          }
      });

      // Sort: Pending first, then by Date Ascending
      allItems.sort((a, b) => {
          if (a.maturity.paid === b.maturity.paid) {
              return new Date(a.maturity.date).getTime() - new Date(b.maturity.date).getTime();
          }
          return a.maturity.paid ? 1 : -1;
      });

      return (
        <div className="flex flex-col h-full bg-slate-50">
           {renderHeader(title)}
           <div className="p-4 space-y-3 pb-32 overflow-y-auto">
              {allItems.length === 0 ? (
                  <div className="text-center py-20 text-slate-400"><p>No hay registros.</p></div>
              ) : (
                  allItems.map(({ maturity: m, invoice, entity }) => {
                      const isOverdue = !m.paid && new Date(m.date) < new Date();
                      return (
                      <div key={m.id} className={`bg-white p-4 rounded-2xl shadow-sm border flex items-center gap-3 ${isOverdue ? 'border-red-200 bg-red-50/30' : 'border-slate-100'}`}>
                          <button onClick={() => handleMaturityClick(invoice, m)} className={`shrink-0 transition-colors ${m.paid ? 'text-green-500' : 'text-slate-300 hover:text-slate-400'}`}>
                              {m.paid ? <CheckCircle size={28} /> : <Circle size={28} />}
                          </button>
                          <div className="flex-1 overflow-hidden cursor-pointer" onClick={() => goToDetails(invoice.entityId)}>
                              <div className="flex justify-between items-start mb-1">
                                  <h4 className="font-bold text-slate-800 truncate text-sm">{entity.name}</h4>
                                  <span className={`text-sm font-bold ${m.paid ? 'text-slate-400 line-through' : 'text-slate-800'}`}>{m.amount.toFixed(2)} €</span>
                              </div>
                              <div className="flex justify-between text-xs text-slate-500 font-medium items-center">
                                  <div className="flex gap-2">
                                     <span className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">{invoice.number}</span>
                                     {isOverdue && <span className="text-red-500 flex items-center gap-1"><AlertTriangle size={10} /> Vencido</span>}
                                  </div>
                                  <span className={`${isOverdue ? 'text-red-500 font-bold' : ''}`}>{m.date.split('-').reverse().join('/')}</span>
                              </div>
                          </div>
                      </div>
                  )})
              )}
           </div>
        </div>
      );
  };

  const renderReports = () => {
      let clientTotal = 0;
      let clientPending = 0;
      let supplierTotal = 0;
      let supplierPending = 0;

      // Calculate totals for all time
      invoices.forEach(inv => {
          const entity = entities.find(e => e.id === inv.entityId);
          if (!entity) return;
          
          const isClient = entity.type === EntityType.CLIENT;
          
          if (isClient) {
              clientTotal += inv.totalAmount;
              clientPending += inv.maturities.filter(m => !m.paid).reduce((sum, m) => sum + m.amount, 0);
          } else {
              supplierTotal += inv.totalAmount;
              supplierPending += inv.maturities.filter(m => !m.paid).reduce((sum, m) => sum + m.amount, 0);
          }
      });
      
      const benefit = clientTotal - supplierTotal;
      const cashFlow = (clientTotal - clientPending) - (supplierTotal - supplierPending);

      return (
          <div className="flex flex-col h-full bg-slate-50">
              {renderHeader("Informes")}
              <div className="p-4 space-y-4 pb-32 overflow-y-auto">
                  
                  {/* Global Balance Card */}
                  <div className="bg-slate-900 text-white p-6 rounded-[32px] shadow-xl relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/20 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>
                      <div className="relative z-10">
                        <h3 className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Beneficio Neto (Facturado)</h3>
                        <div className="flex items-baseline gap-2 mb-4">
                            <span className="text-3xl font-bold tracking-tight">{benefit.toFixed(2)} €</span>
                        </div>
                        
                        <div className="h-px bg-slate-800 w-full mb-4"></div>
                        
                        <h3 className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Flujo de Caja (Real)</h3>
                        <div className="flex items-baseline gap-2">
                            <span className={`text-2xl font-bold tracking-tight ${cashFlow >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{cashFlow.toFixed(2)} €</span>
                        </div>
                      </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                      {/* Clients Report */}
                      <div className="bg-white p-5 rounded-[24px] shadow-sm border border-slate-100 flex flex-col justify-between h-40">
                          <div>
                            <div className="flex items-center gap-2 mb-2 text-blue-500">
                                <Users size={20} />
                                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Ventas</span>
                            </div>
                            <span className="text-xl font-bold text-slate-800">{clientTotal.toFixed(2)} €</span>
                          </div>
                          <div>
                            <div className="text-xs text-slate-500 mb-1">Pendiente de cobro</div>
                            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                                <div className="bg-orange-400 h-full" style={{ width: `${clientTotal > 0 ? (clientPending / clientTotal) * 100 : 0}%` }}></div>
                            </div>
                            <span className="text-xs font-bold text-orange-500 mt-1 block">{clientPending.toFixed(2)} €</span>
                          </div>
                      </div>

                      {/* Suppliers Report */}
                      <div className="bg-white p-5 rounded-[24px] shadow-sm border border-slate-100 flex flex-col justify-between h-40">
                          <div>
                            <div className="flex items-center gap-2 mb-2 text-rose-500">
                                <Truck size={20} />
                                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Gastos</span>
                            </div>
                            <span className="text-xl font-bold text-slate-800">{supplierTotal.toFixed(2)} €</span>
                          </div>
                          <div>
                            <div className="text-xs text-slate-500 mb-1">Pendiente de pago</div>
                            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                                <div className="bg-red-400 h-full" style={{ width: `${supplierTotal > 0 ? (supplierPending / supplierTotal) * 100 : 0}%` }}></div>
                            </div>
                            <span className="text-xs font-bold text-red-500 mt-1 block">{supplierPending.toFixed(2)} €</span>
                          </div>
                      </div>
                  </div>
                  
                  {/* Simple Help Text */}
                  <div className="bg-indigo-50 p-4 rounded-2xl border border-indigo-100">
                      <h4 className="text-indigo-800 font-bold text-sm mb-1 flex items-center gap-2"><AlertTriangle size={16}/> Nota</h4>
                      <p className="text-indigo-600 text-xs leading-relaxed">
                          Estos informes se basan en todas las facturas registradas. El "Flujo de Caja" representa la diferencia real entre cobros realizados y pagos realizados.
                      </p>
                  </div>
              </div>
          </div>
      );
  };

  const showBottomNav = state.view === 'TABS';

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