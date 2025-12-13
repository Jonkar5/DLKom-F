import React, { useState, useEffect } from 'react';
import { Invoice, InvoiceStatus, Maturity, Entity, EntityType } from '../types';
import { Input } from './Input';
import { Save, ArrowLeft, Trash2, Calendar, ChevronRight, Paperclip, AlertTriangle, CheckCircle, Circle } from './Icon';
import { v4 as uuidv4 } from 'uuid';

interface InvoiceFormProps {
  entityId?: string | null;
  entityType?: EntityType | null;
  availableEntities?: Entity[];
  initialInvoice?: Invoice; // Support for editing
  onSave: (invoice: Invoice) => void;
  onCancel: () => void;
}

// Extend Maturity type locally to handle the UI percentage input
interface UIMaturity extends Maturity {
  tempPercentage?: string;
}

export const InvoiceForm: React.FC<InvoiceFormProps> = ({ entityId, entityType, availableEntities, initialInvoice, onSave, onCancel }) => {
  const [selectedEntityId, setSelectedEntityId] = useState(initialInvoice?.entityId || entityId || '');
  const [projectAddress, setProjectAddress] = useState(initialInvoice?.projectAddress || '');
  const [number, setNumber] = useState(initialInvoice?.number || '');
  const [date, setDate] = useState(initialInvoice?.date || new Date().toISOString().split('T')[0]);
  const [totalAmount, setTotalAmount] = useState<string>(initialInvoice?.totalAmount?.toString() || '');
  const [maturities, setMaturities] = useState<UIMaturity[]>([]);
  const [pdfData, setPdfData] = useState<string>(initialInvoice?.pdfData || '');
  const [pdfName, setPdfName] = useState<string>(initialInvoice?.pdfData ? 'Archivo adjunto existente' : '');

  // Local state for Payment/Unpayment Modals inside the form
  const [modalState, setModalState] = useState<{
    type: 'PAY' | 'UNPAY' | null;
    index: number | null;
    date: string;
  }>({ type: null, index: null, date: '' });

  // Initialize maturities
  useEffect(() => {
    if (initialInvoice && initialInvoice.maturities.length > 0) {
      setMaturities(initialInvoice.maturities.map(m => ({ ...m, tempPercentage: '' })));
    } else if (maturities.length === 0) {
      addMaturity();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialInvoice]);

  // Recalculate maturity amounts if Total Amount changes and percentages exist
  useEffect(() => {
    const total = parseFloat(totalAmount) || 0;
    if (total > 0 && maturities.some(m => m.tempPercentage)) {
      setMaturities(prevMaturities => prevMaturities.map(m => {
        if (m.tempPercentage) {
          const percent = parseFloat(m.tempPercentage);
          if (!isNaN(percent)) {
             const calculatedAmount = parseFloat(((total * percent) / 100).toFixed(2));
             return { ...m, amount: calculatedAmount };
          }
        }
        return m;
      }));
    }
  }, [totalAmount]);

  const addMaturity = () => {
    setMaturities(prev => [
      ...prev,
      { id: uuidv4(), date: '', amount: 0, paid: false, tempPercentage: '' }
    ]);
  };

  const removeMaturity = (id: string) => {
    if (maturities.length === 1) return; // Keep at least one
    setMaturities(prev => prev.filter(m => m.id !== id));
  };

  const updateMaturity = (id: string, field: keyof UIMaturity, value: any) => {
    setMaturities(prev => prev.map(m => {
      if (m.id === id) {
        const updates: UIMaturity = { ...m, [field]: value };
        if (field === 'amount') {
          updates.tempPercentage = ''; 
        }
        return updates;
      }
      return m;
    }));
  };

  const updateMaturityPercentage = (id: string, percentStr: string) => {
    const percent = parseFloat(percentStr);
    const total = parseFloat(totalAmount) || 0;
    
    setMaturities(prev => prev.map(m => {
      if (m.id === id) {
        if (!isNaN(percent) && total > 0) {
          const calculatedAmount = parseFloat(((total * percent) / 100).toFixed(2));
          return { ...m, tempPercentage: percentStr, amount: calculatedAmount };
        } else {
          return { ...m, tempPercentage: percentStr };
        }
      }
      return m;
    }));
  };

  // --- Modal Logic for Payments inside Form ---

  const handlePaidClick = (index: number) => {
    const mat = maturities[index];
    if (!mat.paid) {
        // Open PAY modal
        setModalState({ 
            type: 'PAY', 
            index: index, 
            date: new Date().toISOString().split('T')[0] // Default to today
        });
    } else {
        // Open UNPAY modal
        setModalState({ 
            type: 'UNPAY', 
            index: index, 
            date: '' 
        });
    }
  };

  const confirmModalAction = () => {
      if (modalState.index === null) return;

      const newMaturities = [...maturities];
      const mat = newMaturities[modalState.index];

      if (modalState.type === 'PAY') {
          mat.paid = true;
          mat.paymentDate = modalState.date; // Capture the date from modal
      } else if (modalState.type === 'UNPAY') {
          mat.paid = false;
          mat.paymentDate = undefined;
      }

      setMaturities(newMaturities);
      setModalState({ type: null, index: null, date: '' });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) { 
         alert("El archivo es demasiado grande. Máximo 2MB.");
         return;
      }
      setPdfName(file.name);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPdfData(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const calculateTotalMaturities = () => {
    return maturities.reduce((sum, m) => sum + (Number(m.amount) || 0), 0);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEntityId || !number || !totalAmount) return;

    const cleanedMaturities = maturities.map(({ tempPercentage, ...rest }) => rest);
    
    // Determine Invoice Status based on paid maturities
    const allPaid = cleanedMaturities.every(m => m.paid);
    const somePaid = cleanedMaturities.some(m => m.paid);
    let initialStatus = InvoiceStatus.PENDING;
    if (allPaid) initialStatus = InvoiceStatus.PAID;
    else if (somePaid) initialStatus = InvoiceStatus.PARTIAL;

    const invoice: Invoice = {
      id: initialInvoice?.id || uuidv4(), // Reuse ID if editing
      entityId: selectedEntityId,
      number,
      projectAddress,
      date,
      totalAmount: Number(totalAmount),
      maturities: cleanedMaturities,
      status: initialStatus,
      pdfData: pdfData || undefined
    };
    onSave(invoice);
  };

  const totalNum = Number(totalAmount) || 0;
  const currentSum = calculateTotalMaturities();
  const remainder = totalNum - currentSum;
  const isBalanced = Math.abs(remainder) < 0.01;

  let statusMessage = '';
  if (!selectedEntityId) statusMessage = 'Selecciona un Cliente/Proveedor';
  else if (!number) statusMessage = 'Falta el Nº de Factura';
  else if (!totalNum) statusMessage = 'Falta el Importe Total';
  else if (!isBalanced) statusMessage = 'Los importes no coinciden';

  const isClient = entityType === EntityType.CLIENT;
  const entityLabel = isClient ? 'Cliente' : (entityType === EntityType.SUPPLIER ? 'Proveedor' : 'Entidad');
  const selectorLabel = `Seleccionar ${entityLabel}`;
  const isLocked = !!entityId; // If created from details view

  return (
    <div className="flex flex-col h-full bg-slate-50 relative">
      
      {/* --- PAYMENT MODAL OVERLAY --- */}
      {modalState.type === 'PAY' && (
        <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
           <div className="bg-white rounded-[32px] p-6 shadow-2xl w-full max-w-sm animate-in fade-in zoom-in duration-200">
              <div className="flex justify-center mb-4 text-emerald-500">
                <CheckCircle size={56} />
              </div>
              <h3 className="text-xl font-bold text-center text-slate-800 mb-2">Confirmar Pago</h3>
              <p className="text-center text-slate-500 mb-6 text-sm">
                 Confirma la fecha del pago para marcar este vencimiento.
              </p>
              <div className="mb-6">
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 text-center">Fecha de Pago</label>
                  <input 
                    type="date" 
                    className="w-full p-4 rounded-xl border-2 border-emerald-100 bg-emerald-50/50 text-center font-bold text-slate-800 focus:outline-none focus:border-emerald-500"
                    value={modalState.date}
                    onChange={(e) => setModalState({ ...modalState, date: e.target.value })}
                  />
              </div>
              <div className="flex gap-3">
                 <button type="button" onClick={() => setModalState({ ...modalState, type: null })} className="flex-1 py-3 rounded-[18px] border border-slate-200 font-semibold text-slate-600 active:bg-slate-50">Cancelar</button>
                 <button type="button" onClick={confirmModalAction} disabled={!modalState.date} className="flex-1 py-3 rounded-[18px] bg-emerald-600 font-bold text-white shadow-lg shadow-emerald-200 active:scale-95 transition-transform disabled:opacity-50">Confirmar</button>
              </div>
           </div>
        </div>
      )}

      {/* --- UNPAY MODAL OVERLAY --- */}
      {modalState.type === 'UNPAY' && (
        <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
           <div className="bg-white rounded-[32px] p-6 shadow-2xl w-full max-w-sm animate-in fade-in zoom-in duration-200">
              <div className="flex justify-center mb-4 text-orange-500">
                <AlertTriangle size={56} />
              </div>
              <h3 className="text-xl font-bold text-center text-slate-800 mb-2">¿Anular Pago?</h3>
              <p className="text-center text-slate-500 mb-6 text-sm">
                 El vencimiento volverá a estar pendiente.
              </p>
              <div className="flex gap-3">
                 <button type="button" onClick={() => setModalState({ ...modalState, type: null })} className="flex-1 py-3 rounded-[18px] border border-slate-200 font-semibold text-slate-600 active:bg-slate-50">Cancelar</button>
                 <button type="button" onClick={confirmModalAction} className="flex-1 py-3 rounded-[18px] bg-orange-500 font-bold text-white shadow-lg shadow-orange-200 active:scale-95 transition-transform">Anular</button>
              </div>
           </div>
        </div>
      )}

      <div className="flex items-center p-4 bg-white shadow-sm sticky top-0 z-10">
        <button onClick={onCancel} className="p-2 -ml-2 text-slate-600">
          <ArrowLeft size={24} />
        </button>
        <h2 className="ml-2 text-xl font-bold text-slate-800">{initialInvoice ? 'Editar Factura' : 'Nueva Factura'}</h2>
      </div>

      <form onSubmit={handleSubmit} className="flex-1 p-5 overflow-y-auto pb-36">
        <div className="bg-white p-4 rounded-2xl shadow-sm mb-6 border border-slate-100">
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-600 mb-1">
              {selectorLabel} <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <select
                className={`w-full px-4 py-3 rounded-xl border ${!selectedEntityId ? 'border-red-300' : 'border-slate-200'} ${isLocked ? 'bg-slate-100 text-slate-500' : 'bg-white text-slate-900'} focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none`}
                value={selectedEntityId}
                onChange={(e) => setSelectedEntityId(e.target.value)}
                disabled={isLocked}
                required
              >
                <option value="" disabled>{selectorLabel}...</option>
                {availableEntities?.map(e => (
                  <option key={e.id} value={e.id}>{e.name}</option>
                ))}
              </select>
              <div className="absolute right-4 top-3.5 text-slate-400 pointer-events-none">
                <ChevronRight size={18} className="rotate-90" />
              </div>
            </div>
            {!selectedEntityId && (
              <p className="text-red-400 text-xs mt-1 ml-1 flex items-center gap-1">
                <AlertTriangle size={12} /> Campo obligatorio
              </p>
            )}
          </div>

          <Input 
            label="Dirección de la Reforma" 
            value={projectAddress} 
            onChange={e => setProjectAddress(e.target.value)} 
            placeholder="Ej. C/ Mayor 12, 1ºA"
          />

          <div className="flex gap-4">
            <div className="flex-1">
              <Input 
                label="Nº Factura" 
                value={number} 
                onChange={e => setNumber(e.target.value)} 
                placeholder="F-2023-001"
                required
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-slate-600 mb-1">
                Importe Total
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  className="w-full pl-4 pr-8 py-3 rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  value={totalAmount}
                  onChange={e => setTotalAmount(e.target.value)}
                  placeholder="0.00"
                  required
                />
                <span className="absolute right-3 top-3.5 text-slate-400 font-medium">€</span>
              </div>
            </div>
          </div>
          
          <div className="mb-4">
             <label className="block text-sm font-medium text-slate-600 mb-1">Fecha de Emisión</label>
             <input 
               type="date"
               className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
               value={date}
               onChange={(e) => setDate(e.target.value)}
               required
             />
          </div>

          <div className="mb-2">
            <label className="block text-sm font-medium text-slate-600 mb-1">Adjuntar Factura (PDF)</label>
            <div className="relative">
              <input 
                type="file" 
                accept="application/pdf"
                onChange={handleFileChange}
                className="hidden"
                id="pdf-upload"
              />
              <label 
                htmlFor="pdf-upload"
                className={`flex items-center gap-3 px-4 py-4 rounded-xl border transition-all cursor-pointer ${pdfName ? 'bg-green-50 border-green-500 ring-1 ring-green-500' : 'bg-slate-50 border-dashed border-slate-300 hover:bg-slate-100'}`}
              >
                <div className={`p-2 rounded-lg border ${pdfName ? 'bg-green-100 border-green-200 text-green-700' : 'bg-white border-slate-200 text-blue-500'}`}>
                  {pdfName ? <CheckCircle size={24} /> : <Paperclip size={24} />}
                </div>
                <div className="flex-1 overflow-hidden">
                  {pdfName ? (
                    <>
                        <p className="text-xs font-bold text-green-700 uppercase tracking-wide">¡Archivo cargado!</p>
                        <p className="text-sm font-bold text-slate-800 truncate">{pdfName}</p>
                    </>
                  ) : (
                    <span className="text-sm font-medium text-slate-600">Seleccionar archivo PDF...</span>
                  )}
                </div>
              </label>
            </div>
          </div>

        </div>

        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Calendar size={20} className="text-blue-500"/>
            Vencimientos
          </h3>
          <button 
            type="button"
            onClick={addMaturity}
            className="text-sm bg-blue-50 text-blue-600 px-3 py-1 rounded-full font-medium"
          >
            + Añadir
          </button>
        </div>

        <div className="space-y-3">
          {maturities.map((mat, index) => (
            <div key={mat.id} className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-2 relative">
              
              {/* Row Header: Label + Delete Button */}
              <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-bold text-slate-400 uppercase">Vencimiento {index + 1}</span>
                  <button 
                    type="button"
                    onClick={() => removeMaturity(mat.id)}
                    className="p-1 text-slate-300 hover:text-red-500 transition-colors"
                    disabled={maturities.length === 1}
                  >
                    <Trash2 size={16} />
                  </button>
              </div>

              <div className="flex gap-3 items-end">
                  {/* Payment Button - TRIGGERS MODAL */}
                  <div className="mb-2">
                      <button 
                        type="button"
                        onClick={() => handlePaidClick(index)}
                        className={`transition-colors p-1 ${mat.paid ? 'text-green-500' : 'text-slate-300 hover:text-slate-400'}`}
                        title={mat.paid ? "Anular pago" : "Marcar como pagado"}
                      >
                        {mat.paid ? <CheckCircle size={28} /> : <Circle size={28} />}
                      </button>
                  </div>

                  {/* Date Input */}
                  <div className="flex-[2]">
                    <label className="text-[10px] text-slate-500 block mb-1">Fecha</label>
                    <div className="relative h-10 w-full bg-slate-50 border border-slate-200 rounded-lg flex items-center px-2">
                       <span className="text-sm text-slate-700 flex-1 truncate">
                          {mat.date ? mat.date.split('-').reverse().join('/') : <span className="text-slate-400">dd/mm/aaaa</span>}
                       </span>
                       <Calendar size={16} className="text-slate-400 shrink-0" />
                       <input 
                          type="date" 
                          className="absolute inset-0 opacity-0 w-full h-full z-10"
                          value={mat.date}
                          onChange={e => updateMaturity(mat.id, 'date', e.target.value)}
                          required
                        />
                    </div>
                    {/* Show payment date if paid */}
                    {mat.paid && mat.paymentDate && (
                        <p className="text-[10px] text-green-600 font-bold mt-1 ml-1 truncate">
                            Pagado: {mat.paymentDate.split('-').reverse().join('/')}
                        </p>
                    )}
                  </div>

                  {/* Percentage Input */}
                  <div className="flex-1 min-w-[50px]">
                    <label className="text-[10px] text-slate-500 block mb-1">%</label>
                    <input 
                      type="number" 
                      className="w-full h-10 bg-slate-50 border border-slate-200 rounded-lg px-2 text-sm text-center focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      value={mat.tempPercentage || ''}
                      onChange={e => updateMaturityPercentage(mat.id, e.target.value)}
                      placeholder="%"
                    />
                  </div>

                  {/* Amount Input */}
                  <div className="flex-[2] relative">
                    <label className="text-[10px] text-slate-500 block mb-1">Importe</label>
                    <div className="relative">
                      <input 
                        type="number" 
                        step="0.01"
                        className="w-full h-10 bg-slate-50 border border-slate-200 rounded-lg pl-2 pr-6 text-sm text-right font-medium"
                        value={mat.amount || ''}
                        onChange={e => updateMaturity(mat.id, 'amount', Number(e.target.value))}
                        required
                      />
                      <span className="absolute right-2 top-2.5 text-xs text-slate-400 font-bold">€</span>
                    </div>
                  </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 p-4 bg-slate-100 rounded-xl text-sm space-y-2">
           <div className="flex justify-between">
             <span className="text-slate-500">Total Factura:</span>
             <span className="font-semibold">{totalNum.toFixed(2)} €</span>
           </div>
           
           <div className="flex justify-between">
             <span className="text-slate-500">Total Vencimientos:</span>
             <span className={`${isBalanced ? 'text-green-600 font-bold' : 'text-orange-500 font-bold'}`}>
               {currentSum.toFixed(2)} €
             </span>
           </div>

           {!isBalanced ? (
             <div className="flex justify-between text-red-500 font-medium pt-2 border-t border-slate-200">
               <span>Diferencia:</span>
               <span>{remainder.toFixed(2)} €</span>
             </div>
           ) : (
             <div className="flex justify-between font-bold pt-2 border-t border-slate-200">
               <span className="text-slate-600">Estado Inicial:</span>
               {maturities.every(m => m.paid) ? (
                   <span className="text-green-600">PAGADO</span>
               ) : maturities.some(m => m.paid) ? (
                   <span className="text-orange-500">PARCIAL</span>
               ) : (
                   <span className="text-blue-600">PENDIENTE</span>
               )}
             </div>
           )}
        </div>

      </form>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-slate-100 pb-8">
        {statusMessage && (
            <div className="mb-2 text-center text-xs font-bold text-red-500 animate-pulse">
                {statusMessage}
            </div>
        )}
        <button 
          onClick={handleSubmit}
          disabled={!!statusMessage}
          className={`w-full font-semibold py-4 rounded-2xl flex items-center justify-center gap-2 shadow-lg transition-all
            ${statusMessage 
              ? 'bg-slate-200 text-slate-400 cursor-not-allowed' 
              : 'bg-slate-900 text-white active:scale-95'}`}
        >
          <Save size={20} />
          {initialInvoice ? 'Actualizar Factura' : 'Guardar Factura'}
        </button>
      </div>
    </div>
  );
};