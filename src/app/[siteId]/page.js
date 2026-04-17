'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';

export default function SitePage() {
  const params = useParams();
  const siteId = params.siteId;
  
  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
  const [tabs, setTabs] = useState([]);
  const [activeTabId, setActiveTabId] = useState(null);
  
  const [isSplitScreen, setIsSplitScreen] = useState(false);
  const [secondaryTabId, setSecondaryTabId] = useState(null);
  
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [saveState, setSaveState] = useState('saved'); 
  
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [pwdError, setPwdError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const pwd = fd.get('pwdInput');
    setPassword(pwd); // Store for future saves
    
    setLoading(true);
    setError('');
    
    try {
      const res = await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ siteId, password: pwd, action: 'read' })
      });
      const data = await res.json();
      
      if (res.ok) {
        setIsAuthenticated(true);
        const fetchedTabs = (data.tabs && data.tabs.length > 0) ? data.tabs : [{ id: Date.now().toString(), content: '' }];
        setTabs(fetchedTabs);
        setActiveTabId(fetchedTabs[0].id);
        if (fetchedTabs.length > 1) {
          setSecondaryTabId(fetchedTabs[1].id);
        }
      } else {
        setError(data.error || 'Authentication failed');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = useCallback(async (tabsToSave) => {
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
    if (!isAuthenticated) return;
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

  const handleTabClick = (id) => {
    if (isSplitScreen && id !== activeTabId) {
      setSecondaryTabId(id);
    } else {
      setActiveTabId(id);
    }
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

  const activeTab = tabs.find(t => t.id === activeTabId) || tabs[0];
  const secondaryTab = isSplitScreen ? (tabs.find(t => t.id === secondaryTabId) || tabs[1]) : null;

  if (!isAuthenticated) {
    return (
      <main>
        <div className="glass-panel">
          <h1>Site: {siteId}</h1>
          <p className="subtitle">This site is protected. Enter password.</p>
          <div className="error-msg">{error}</div>
          <form onSubmit={handleLogin} suppressHydrationWarning>
            <div className="input-group">
              <input 
                name="pwdInput"
                type="password" 
                placeholder="Password"
                suppressHydrationWarning
              />
            </div>
            <button type="submit" disabled={loading}>
              {loading ? 'Decrypting...' : 'Unlock'}
            </button>
          </form>
        </div>
      </main>
    );
  }

  return (
    <main>
      <div className="glass-panel expanded">
        <div className="header-row">
          <h2>Site: {siteId}</h2>
          <div className="header-toolbar">
            <button className={`auto-save ${saveState}`}>
              {saveState === 'saved' && '✓ Saved'}
              {saveState === 'saving' && 'Saving...'}
              {saveState === 'error' && 'Error'}
            </button>
            <button 
              className={isSplitScreen ? 'active-toggle' : ''} 
              onClick={toggleSplitScreen}
            >
              {isSplitScreen ? 'Exit Split' : 'Split View'}
            </button>
            <button onClick={() => setIsPasswordModalOpen(true)}>
              Change Password
            </button>
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
             +
          </button>
        </div>

        <div className={`editor-wrapper ${isSplitScreen ? 'split' : ''}`}>
          <div className="editor-container">
             {isSplitScreen && <h4>Primary Note</h4>}
             <textarea 
                key={`primary-${activeTab?.id}`}
                value={activeTab?.content || ''}
                onChange={(e) => updateTabContent(activeTab.id, e.target.value)}
                placeholder="Type your primary notes here..."
                spellCheck="false"
              />
          </div>
          
          {isSplitScreen && secondaryTab && (
            <div className="editor-container">
              <h4>Secondary Note</h4>
              <textarea 
                key={`secondary-${secondaryTab.id}`}
                value={secondaryTab.content || ''}
                onChange={(e) => updateTabContent(secondaryTab.id, e.target.value)}
                placeholder="Type your secondary notes here..."
                spellCheck="false"
              />
            </div>
          )}
        </div>
      </div>

      {isPasswordModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Change Password</h3>
            {pwdError && <div className="error-msg">{pwdError}</div>}
            <form onSubmit={handleChangePasswordSubmit}>
              <div className="input-group">
                <input 
                  name="newPwdInput"
                  type="password"
                  placeholder="New Password"
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="cancel" onClick={() => setIsPasswordModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit">
                  Save Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
