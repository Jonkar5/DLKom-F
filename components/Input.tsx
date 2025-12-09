import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

export const Input: React.FC<InputProps> = ({ label, className, ...props }) => {
  return (
    <div className={`mb-4 ${className || ''}`}>
      <label className="block text-sm font-medium text-slate-600 mb-1">
        {label}
      </label>
      <input
        className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
        {...props}
      />
    </div>
  );
};