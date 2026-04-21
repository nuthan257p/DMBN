'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'next/navigation';
import RichTextEditor from '../../components/RichTextEditor';

export default function SitePage() {
  const params = useParams();
  const siteId = params.siteId;
  
  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
  // Normal User State
  const [tabs, setTabs] = useState([]);
  const [activeTabId, setActiveTabId] = useState(null);
  const [isSplitScreen, setIsSplitScreen] = useState(false);
  const [secondaryTabId, setSecondaryTabId] = useState(null);
  const [saveState, setSaveState] = useState('saved'); 
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [pwdError, setPwdError] = useState('');

  // Admin State
  const [adminSites, setAdminSites] = useState([]);
  const [newSiteId, setNewSiteId] = useState('');
  const [newSitePwd, setNewSitePwd] = useState('');
  const [adminMsg, setAdminMsg] = useState('');

  // General State
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [theme, setTheme] = useState('dark');
  const fileInputRef = useRef(null);

  // Apply Theme
  useEffect(() => {
    const savedTheme = localStorage.getItem('dmbn-theme') || 'dark';
    setTheme(savedTheme);
    document.documentElement.setAttribute('data-theme', savedTheme);
  }, []);

  const changeTheme = (newTheme) => {
    setTheme(newTheme);
    localStorage.setItem('dmbn-theme', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  const loadAdminData = async (pwd) => {
    try {
      const res = await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ siteId, password: pwd, action: 'admin_getAllSites' })
      });
      if (res.ok) {
        const data = await res.json();
        setAdminSites(data.sites || []);
      }
    } catch(err) {
      console.error(err);
    }
  };

  const fetchNotes = async (pwd) => {
    try {
      const res = await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ siteId, password: pwd, action: 'read' })
      });
      const data = await res.json();
      
      if (res.ok) {
        setIsAuthenticated(true);
        if (siteId === '257') {
          // It's the admin
          await loadAdminData(pwd);
        } else {
          const fetchedTabs = (data.tabs && data.tabs.length > 0) ? data.tabs : [{ id: Date.now().toString(), content: '' }];
          setTabs(fetchedTabs);
          if (!activeTabId) setActiveTabId(fetchedTabs[0].id);
          if (!secondaryTabId && fetchedTabs.length > 1) {
            setSecondaryTabId(fetchedTabs[1].id);
          }
        }
      } else {
        setError(data.error || 'Authentication failed');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const pwd = fd.get('pwdInput');
    setPassword(pwd);
    
    setLoading(true);
    setError('');
    
    await fetchNotes(pwd);
    setLoading(false);
  };

  const handleRefresh = async () => {
    setSaveState('refreshing');
    await fetchNotes(password);
    setSaveState('saved');
  };

  const handleSave = useCallback(async (tabsToSave) => {
    if (siteId === '257') return; // Admin doesn't save text
    if (!tabsToSave || tabsToSave.length === 0) return;
    setSaveState('saving');
    try {
      const res = await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ siteId, password, action: 'write', tabs: tabsToSave })
      });
      if (res.ok) setSaveState('saved');
      else setSaveState('error');
    } catch (err) {
      setSaveState('error');
    }
  }, [siteId, password]);

  useEffect(() => {
    if (!isAuthenticated || siteId === '257') return;
    const handler = setTimeout(() => {
      handleSave(tabs);
    }, 1000);
    return () => clearTimeout(handler);
  }, [tabs, isAuthenticated, handleSave]);

  const updateTabContent = (id, newContent) => {
    setTabs(prev => prev.map(t => t.id === id ? { ...t, content: newContent } : t));
    setSaveState('saving');
  };

  const addTab = () => {
    const newTab = { id: Date.now().toString(), content: '' };
    const nextTabs = [...tabs, newTab];
    setTabs(nextTabs);
    setActiveTabId(newTab.id);
    handleSave(nextTabs);
    return newTab;
  };

  const deleteTab = (idToDelete, e) => {
    e.stopPropagation();
    if (tabs.length === 1) return;
    const nextTabs = tabs.filter(t => t.id !== idToDelete);
    setTabs(nextTabs);
    
    if (activeTabId === idToDelete) {
      setActiveTabId(nextTabs[nextTabs.length - 1].id);
    }
    if (secondaryTabId === idToDelete) {
      setSecondaryTabId(nextTabs[0].id !== activeTabId ? nextTabs[0].id : null);
    }
    
    handleSave(nextTabs);
  };

  const toggleSplitScreen = () => {
    if (!isSplitScreen) {
      let otherTabIds = tabs.filter(t => t.id !== activeTabId);
      if (otherTabIds.length === 0) {
        const newT = addTab();
        setSecondaryTabId(newT.id);
      } else {
        setSecondaryTabId(otherTabIds[0].id);
      }
    }
    setIsSplitScreen(!isSplitScreen);
  };

  // PDF Features
  const downloadPdf = async () => {
    const activeTabObj = tabs.find(t => t.id === activeTabId) || tabs[0];
    if (!activeTabObj || !activeTabObj.content) return;
    try {
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF();
      const splitText = doc.splitTextToSize(activeTabObj.content, 180);
      doc.text(splitText, 15, 15);
      doc.save(`Note_${siteId}_${new Date().toLocaleDateString()}.pdf`);
    } catch(err) {
      console.error("PDF Download Error", err);
      alert("Failed to create PDF.");
    }
  };

  const uploadPdf = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      alert("File exceeds maximum allowed size of 10MB.");
      e.target.value = null;
      return;
    }

    setSaveState('processing pdf...');
    
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      const res = await fetch('/api/pdf-extract', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (res.ok && data.text) {
        const newTab = { id: Date.now().toString(), content: data.text };
        const nextTabs = [...tabs, newTab];
        setTabs(nextTabs);
        setActiveTabId(newTab.id);
        handleSave(nextTabs);
        setSaveState('saved');
      } else {
        alert("Could not extract text.");
        setSaveState('error');
      }
    } catch(err) {
      console.error(err);
      setSaveState('error');
    }
    
    e.target.value = null; // reset input
  };

  const handleChangePasswordSubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const newPwd = fd.get('newPwdInput');
    
    setPwdError('');
    try {
      const res = await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ siteId, password, action: 'changePassword', newPassword: newPwd })
      });
      if (res.ok) {
        setPassword(newPwd);
        setIsPasswordModalOpen(false);
      } else {
        const data = await res.json();
        setPwdError(data.error || 'Failed to change password');
      }
    } catch (err) {
      setPwdError('An error occurred.');
    }
  };

  const handleAdminCreateSite = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          siteId: '257', password, action: 'admin_createSite',
          newSiteId, newSitePassword: newSitePwd
        })
      });
      const data = await res.json();
      if (res.ok) {
        setAdminMsg('Site created successfully.');
        setNewSiteId('');
        setNewSitePwd('');
        loadAdminData(password);
      } else {
        setAdminMsg(data.error || 'Creation failed.');
      }
    } catch(err) {
      setAdminMsg('Error connecting to server.');
    }
  };

  if (!isAuthenticated) {
    return (
      <main>
        <div className="glass-panel scale-up">
          <h1>Site: {siteId}</h1>
          <p className="subtitle">This space is fully protected. Enter key.</p>
          <div className="error-msg">{error}</div>
          <form onSubmit={handleLogin} suppressHydrationWarning>
            <div className="input-group">
              <input 
                name="pwdInput"
                type="password" 
                placeholder="Secure Password"
                suppressHydrationWarning
                autoFocus
              />
            </div>
            <button type="submit" disabled={loading} className="btn-primary" suppressHydrationWarning>
              {loading ? 'Decrypting Space...' : 'Unlock Notes'}
            </button>
          </form>
        </div>
      </main>
    );
  }

  // --- Admin View ---
  if (siteId === '257') {
    return (
      <main>
        <div className="glass-panel expanded">
          <div className="header-row">
            <h2>Admin Dashboard</h2>
            <div className="header-toolbar">
              <button className="icon-btn" onClick={() => loadAdminData(password)} title="Refresh Data">
                🔄 Refresh
              </button>
              <select value={theme} onChange={(e) => changeTheme(e.target.value)} className="theme-select">
                <option value="dark">Dark Theme</option>
                <option value="light">Light Theme</option>
                <option value="blue-glass">Blue Glass</option>
                <option value="neon-cyber">Neon Cyber</option>
                <option value="sunset-glow">Sunset Glow</option>
                <option value="forest-minimal">Forest Minimal</option>
              </select>
            </div>
          </div>
          
          <div className="admin-grid">
             <div className="admin-card">
               <h3>Create New Site</h3>
               <form onSubmit={handleAdminCreateSite} className="admin-form">
                 {adminMsg && <div className={adminMsg.includes('success') ? 'text-success' : 'text-error'}>{adminMsg}</div>}
                 <input value={newSiteId} onChange={e => setNewSiteId(e.target.value)} placeholder="New Site ID" required/>
                 <input value={newSitePwd} onChange={e => setNewSitePwd(e.target.value)} placeholder="Initial Password" required/>
                 <button type="submit">Create Credentials</button>
               </form>
             </div>
             
             <div className="admin-card table-card">
               <h3>All Active Sites</h3>
               <div className="table-responsive">
                 <table>
                   <thead>
                     <tr>
                       <th>Site ID</th>
                       <th>Current Password</th>
                     </tr>
                   </thead>
                   <tbody>
                     {adminSites.map(s => (
                       <tr key={s.siteId}>
                         <td>{s.siteId}</td>
                         <td><code>{s.password}</code></td>
                       </tr>
                     ))}
                   </tbody>
                 </table>
               </div>
             </div>
          </div>
        </div>
      </main>
    );
  }

  // --- Normal User View ---
  const activeTab = tabs.find(t => t.id === activeTabId) || tabs[0];
  const secondaryTab = isSplitScreen ? (tabs.find(t => t.id === secondaryTabId) || tabs[1]) : null;

  return (
    <main>
      <div className="glass-panel expanded fade-in">
        <div className="header-row">
          <h2>Site: {siteId}</h2>
          <div className="header-toolbar">
            <button className={`auto-save ${saveState}`}>
              {saveState === 'saved' && '✓ Saved'}
              {saveState === 'saving' && 'Saving...'}
              {saveState === 'refreshing' && 'Syncing...'}
              {saveState === 'error' && 'Error'}
              {saveState.includes('pdf') && saveState}
            </button>
            <button className="icon-btn" onClick={handleRefresh} title="Fetch Live Changes">🔄</button>
            
            <input type="file" accept="application/pdf" ref={fileInputRef} style={{ display: 'none' }} onChange={uploadPdf} />
            <button className="icon-btn" onClick={() => fileInputRef.current?.click()} title="Upload PDF">📄⬆️</button>
            <button className="icon-btn" onClick={downloadPdf} title="Download PDF">📄⬇️</button>

            <button 
              className={isSplitScreen ? 'active-toggle' : ''} 
              onClick={toggleSplitScreen}
            >
              Split View
            </button>
            <button onClick={() => setIsPasswordModalOpen(true)}>
              Change Key
            </button>
            
            <select value={theme} onChange={(e) => changeTheme(e.target.value)} className="theme-select">
              <option value="dark">Dark</option>
              <option value="light">Light</option>
              <option value="blue-glass">Ocean</option>
              <option value="neon-cyber">Cyber</option>
              <option value="sunset-glow">Sunset</option>
              <option value="forest-minimal">Forest</option>
            </select>
          </div>
        </div>

        <div className="tabs-container">
          {tabs.map((tab, idx) => {
            const title = tab.content.trim() 
              ? tab.content.substring(0, 15).replace(/\n/g, ' ') + '...'
              : `Tab ${idx + 1}`;
            
            let isActive = tab.id === activeTabId;
            let isSecondary = isSplitScreen && tab.id === secondaryTabId;
            let btnClass = 'tab-btn';
            if (isActive) btnClass += ' active';
            else if (isSecondary) btnClass += ' secondary-active';
            
            return (
              <div 
                key={tab.id}
                className={btnClass}
                onClick={() => handleTabClick(tab.id)}
              >
                <span>{title}</span>
                {tabs.length > 1 && (
                  <button 
                    className="tab-delete-btn" 
                    onClick={(e) => deleteTab(tab.id, e)}
                  >
                    ×
                  </button>
                )}
              </div>
            );
          })}
          <button className="add-tab-btn" onClick={() => addTab()} title="New Tab">
             + New Note
          </button>
        </div>

        <div className={`editor-wrapper ${isSplitScreen ? 'split' : ''}`}>
          <div className="editor-container">
             {isSplitScreen && <h4>Primary Note</h4>}
             <RichTextEditor 
                key={`primary-${activeTab?.id}`}
                value={activeTab?.content || ''}
                onChange={(val) => updateTabContent(activeTab.id, val)}
                placeholder="Type your primary notes here..."
              />
          </div>
          
          {isSplitScreen && secondaryTab && (
            <div className="editor-container">
              <h4>Secondary Note</h4>
              <RichTextEditor 
                key={`secondary-${secondaryTab.id}`}
                value={secondaryTab.content || ''}
                onChange={(val) => updateTabContent(secondaryTab.id, val)}
                placeholder="Type your secondary notes here..."
              />
            </div>
          )}
        </div>
      </div>

      {isPasswordModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content scale-up">
            <h3>Update Master Key</h3>
            {pwdError && <div className="error-msg">{pwdError}</div>}
            <form onSubmit={handleChangePasswordSubmit}>
              <div className="input-group">
                <input 
                  name="newPwdInput"
                  type="password"
                  placeholder="New Secure Password"
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="cancel" onClick={() => setIsPasswordModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Update Key
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );

  function handleTabClick(id) {
    if (isSplitScreen && id !== activeTabId) {
      setSecondaryTabId(id);
    } else {
      setActiveTabId(id);
    }
  }
}
