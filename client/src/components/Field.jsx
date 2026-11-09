import { useState } from 'react';

export default function Field({ label, id, error, type = 'text', ...props }) {
  const [show, setShow] = useState(false);
  const isPw = type === 'password';
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium mb-1.5">{label}</label>
      <div className="relative">
        <input
          id={id} name={id} type={isPw && show ? 'text' : type}
          aria-invalid={!!error} aria-describedby={error ? `${id}-e` : undefined}
          className={`inp ${isPw ? 'pr-16' : ''}`} {...props}
        />
        {isPw && (
          <button type="button" onClick={() => setShow((s) => !s)}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-medium text-brand px-2 py-1">
            {show ? 'Hide' : 'Show'}
          </button>
        )}
      </div>
      {error && <p id={`${id}-e`} role="alert" className="text-sm text-err mt-1.5">{error}</p>}
    </div>
  );
}
