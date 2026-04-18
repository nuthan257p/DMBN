'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const [errorMsg, setErrorMsg] = useState('');
  const router = useRouter();

  const handleGo = (e) => {
    e.preventDefault();
    const formElement = e.target;
    const formData = new FormData(formElement);
    const id = formData.get('siteIdInput');

    if (id && id.trim()) {
      router.push(`/${encodeURIComponent(id.trim())}`);
    } else {
      setErrorMsg('Please enter a Site ID (e.g., F21)');
    }
  };

  return (
    <main>
      <div className="glass-panel fade-in">
        <h1>DMBN Spaces</h1>
        <p className="subtitle">Premium encrypted workspace.</p>
        
        {errorMsg && <div className="error-msg text-error">{errorMsg}</div>}

        <form onSubmit={handleGo} suppressHydrationWarning>
          <div className="input-group">
            <input 
              name="siteIdInput"
              type="text" 
              placeholder="Enter Site ID (e.g. 257, F21)"
              suppressHydrationWarning
              autoFocus
            />
          </div>
          <button type="submit" className="btn-primary" suppressHydrationWarning>
            Access Notes Space
          </button>
        </form>
      </div>
    </main>
  );
}
