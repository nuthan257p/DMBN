'use client';
import { useState } from 'react';

export default function Home() {
  const [errorMsg, setErrorMsg] = useState('');

  const handleGo = (e) => {
    e.preventDefault();
    const formElement = e.target;
    const formData = new FormData(formElement);
    const id = formData.get('siteIdInput');

    if (id && id.trim()) {
      window.location.href = `/${encodeURIComponent(id.trim())}`;
    } else {
      setErrorMsg('Please enter a Site ID (e.g., F21)');
    }
  };

  return (
    <main>
      <div className="glass-panel">
        <h1>DMBN</h1>
        <p className="subtitle">Your premium secure notepad.</p>
        
        {errorMsg && <div className="error-msg" style={{color: 'var(--error-color)', marginBottom: '1rem', textAlign: 'center'}}>{errorMsg}</div>}

        <form onSubmit={handleGo} suppressHydrationWarning>
          <div className="input-group">
            <input 
              name="siteIdInput"
              type="text" 
              placeholder="Enter Site ID (e.g. F21, E85)"
              suppressHydrationWarning
            />
          </div>
          <button type="submit">
            Access Notes
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14"></path>
              <path d="M12 5l7 7-7 7"></path>
            </svg>
          </button>
        </form>
      </div>
    </main>
  );
}
