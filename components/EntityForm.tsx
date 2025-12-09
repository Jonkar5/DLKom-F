
import React, { useState } from 'react';
import { Entity, EntityType } from '../types';
import { Input } from './Input';
import { Save, ArrowLeft, CheckCircle } from './Icon';
import { v4 as uuidv4 } from 'uuid';

interface EntityFormProps {
  type: EntityType;
  initialData?: Entity;
  onSave: (entity: Entity) => void;
  onCancel: () => void;
}

// Regex for loose validation of Spanish IDs (NIF, CIF, NIE)
const TAX_ID_REGEX = /^([A-Z]\d{8})|(\d{8}[A-Z])|([A-Z]\d{7}[A-Z])|([A-Z]\d{7}\d)$/;

export const EntityForm: React.FC<EntityFormProps> = ({ type, initialData, onSave, onCancel }) => {
  const [name, setName] = useState(initialData?.name || '');
  const [taxId, setTaxId] = useState(initialData?.taxId || '');
  const [address, setAddress] = useState(initialData?.address || '');
  const [city, setCity] = useState(initialData?.city || '');
  const [postalCode, setPostalCode] = useState(initialData?.postalCode || '');
  const [email, setEmail] = useState(initialData?.email || '');
  const [phone, setPhone] = useState(initialData?.phone || '');
  const [contactPerson, setContactPerson] = useState(initialData?.contactPerson || '');
  
  const [errors, setErrors] = useState<{taxId?: string}>({});

  const validateTaxId = (value: string) => {
    if (!value) return true; // Optional
    if (value.length !== 9 || !TAX_ID_REGEX.test(value)) {
      return false;
    }
    return true;
  };

  const handleTaxIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.toUpperCase();
    setTaxId(val);
    if (val && !validateTaxId(val)) {
      setErrors(prev => ({ ...prev, taxId: 'Formato incorrecto (Ej: 12345678Z)' }));
    } else {
      setErrors(prev => ({ ...prev, taxId: undefined }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    
    // Final validation before save
    if (taxId && !validateTaxId(taxId)) {
       setErrors(prev => ({ ...prev, taxId: 'El NIF/CIF no es válido' }));
       return;
    }

    const entity: Entity = {
      id: initialData?.id || uuidv4(),
      type,
      name,
      taxId,
      address,
      city,
      postalCode,
      email,
      phone,
      contactPerson
    };
    onSave(entity);
  };

  const baseTitle = type === EntityType.CLIENT ? 'Cliente' : 'Proveedor';
  const title = initialData ? 'Editar' : `Nuevo ${baseTitle}`;

  return (
    <div className="flex flex-col h-full bg-slate-50">
      <div className="flex items-center p-4 bg-white shadow-sm sticky top-0 z-10">
        <button onClick={onCancel} className="p-2 -ml-2 text-slate-600">
          <ArrowLeft size={24} />
        </button>
        <h2 className="ml-2 text-xl font-bold text-slate-800">{title}</h2>
      </div>

      <form onSubmit={handleSubmit} className="flex-1 p-5 overflow-y-auto pb-24">
        <Input 
          label="Nombre / Razón Social" 
          value={name} 
          onChange={e => setName(e.target.value)} 
          placeholder="Ej. Empresa S.L."
          required
        />
        
        <div className="flex gap-4">
          <div className="flex-1 mb-4">
            <label className="block text-sm font-medium text-slate-600 mb-1">
              NIF / CIF
            </label>
            <div className="relative">
              <input
                className={`w-full px-4 py-3 rounded-xl border ${errors.taxId ? 'border-red-500 focus:ring-red-200' : 'border-slate-200 focus:ring-blue-500'} bg-white text-slate-900 focus:outline-none focus:ring-2 transition-all uppercase`}
                value={taxId} 
                onChange={handleTaxIdChange} 
                placeholder="B12345678"
                maxLength={9}
              />
              {taxId && !errors.taxId && (
                <div className="absolute right-3 top-3 text-emerald-500">
                  <CheckCircle size={20} />
                </div>
              )}
            </div>
            {errors.taxId && (
               <p className="text-red-500 text-xs mt-1 ml-1">{errors.taxId}</p>
            )}
          </div>

          <Input 
            label="Teléfono" 
            type="tel"
            className="flex-1"
            value={phone} 
            onChange={e => setPhone(e.target.value)} 
            placeholder="600 000 000"
          />
        </div>

        <Input 
          label="Dirección" 
          value={address} 
          onChange={e => setAddress(e.target.value)} 
          placeholder="C/ Ejemplo, 123"
        />

        <div className="flex gap-4">
          <Input 
            label="Localidad" 
            className="flex-1"
            value={city} 
            onChange={e => setCity(e.target.value)} 
            placeholder="Madrid"
          />
          <Input 
            label="C.P." 
            className="w-1/3"
            value={postalCode} 
            onChange={e => setPostalCode(e.target.value)} 
            placeholder="28000"
          />
        </div>

        <Input 
          label="Email" 
          type="email"
          value={email} 
          onChange={e => setEmail(e.target.value)} 
          placeholder="contacto@empresa.com"
        />

        <Input 
          label="Persona de Contacto" 
          value={contactPerson} 
          onChange={e => setContactPerson(e.target.value)} 
          placeholder="Nombre del responsable"
        />

        <div className="h-8"></div>
      </form>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-slate-100 pb-8">
        <button 
          onClick={handleSubmit}
          className="w-full bg-slate-900 text-white font-semibold py-4 rounded-2xl flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-transform"
        >
          <Save size={20} />
          Guardar
        </button>
      </div>
    </div>
  );
};
