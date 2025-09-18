// client/src/components/FormError.jsx
import React from 'react';

export function FormError({ error, className = "" }) {
  if (!error) return null;
  
  return (
    <div className={`text-danger small mt-1 ${className}`}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="me-1">
        <circle cx="12" cy="12" r="10"/>
        <line x1="15" y1="9" x2="9" y2="15"/>
        <line x1="9" y1="9" x2="15" y2="15"/>
      </svg>
      {error}
    </div>
  );
}

export function FormErrors({ errors, className = "" }) {
  if (!errors || Object.keys(errors).length === 0) return null;
  
  return (
    <div className={`alert alert-danger ${className}`}>
      <div className="d-flex align-items-center mb-2">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="me-2">
          <circle cx="12" cy="12" r="10"/>
          <line x1="15" y1="9" x2="9" y2="15"/>
          <line x1="9" y1="9" x2="15" y2="15"/>
        </svg>
        <strong>Please fix the following errors:</strong>
      </div>
      <ul className="mb-0">
        {Object.entries(errors).map(([field, error]) => (
          <li key={field}>{error}</li>
        ))}
      </ul>
    </div>
  );
}

export function FieldError({ error, className = "" }) {
  if (!error) return null;
  
  return (
    <div className={`invalid-feedback d-block ${className}`}>
      {error}
    </div>
  );
}
