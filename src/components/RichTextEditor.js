'use client';

import React, { useRef, useEffect, useState } from 'react';

const FONTS = [
  'Arial', 'Times New Roman', 'Courier New', 'Georgia', 
  'Verdana', 'Tahoma', 'Trebuchet MS', 'Impact', 'Comic Sans MS', 'Garamond'
];

export default function RichTextEditor({ value, onChange, placeholder = "Type your notes here..." }) {
  const editorRef = useRef(null);
  const [ieeeMode, setIeeeMode] = useState(false);

  // Sync initial value only if editor is empty, prevents cursor jumping
  useEffect(() => {
    if (editorRef.current && value !== editorRef.current.innerHTML) {
       editorRef.current.innerHTML = value || '';
    }
  }, [value]);

  const handleInput = () => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  const execCommand = (command, val = null) => {
    document.execCommand(command, false, val);
    if (editorRef.current) {
      editorRef.current.focus();
    }
    handleInput();
  };

  const formatBlock = (tag) => {
    execCommand('formatBlock', tag);
  };

  const setFontSize = (e) => {
    // execCommand fontSize accepts 1-7. For more granular control we could manipulate range.
    execCommand('fontSize', e.target.value);
    e.target.value = "";
  };

  const setFontFamily = (e) => {
    execCommand('fontName', e.target.value);
    e.target.value = "";
  };

  return (
    <div className={`rt-editor-wrapper ${ieeeMode ? 'ieee-active' : ''}`}>
      <div className="rt-toolbar">
        {/* Formatting Block */}
        <div className="rt-group">
          <button type="button" onClick={() => execCommand('bold')} title="Bold"><b>B</b></button>
          <button type="button" onClick={() => execCommand('italic')} title="Italic"><i>I</i></button>
          <button type="button" onClick={() => execCommand('underline')} title="Underline"><u>U</u></button>
        </div>

        {/* Alignment */}
        <div className="rt-group">
          <button type="button" onClick={() => execCommand('justifyLeft')} title="Align Left">⫷</button>
          <button type="button" onClick={() => execCommand('justifyCenter')} title="Align Center">⫸⫷</button>
          <button type="button" onClick={() => execCommand('justifyRight')} title="Align Right">⫸</button>
          <button type="button" onClick={() => execCommand('justifyFull')} title="Justify">☰</button>
        </div>
        
        {/* Headings */}
        <div className="rt-group">
          <button type="button" onClick={() => formatBlock('H1')} title="Heading 1 (IEEE Title)">H1</button>
          <button type="button" onClick={() => formatBlock('H2')} title="Heading 2">H2</button>
          <button type="button" onClick={() => formatBlock('P')} title="Paragraph">P</button>
        </div>

        {/* Fonts */}
        <div className="rt-group">
          <select onChange={setFontFamily} title="Font Family">
            <option value="">Font Style...</option>
            {FONTS.map(font => (
              <option key={font} value={font} style={{ fontFamily: font }}>{font}</option>
            ))}
          </select>
          <select onChange={setFontSize} title="Font Size">
            <option value="">Size...</option>
            <option value="1">Small</option>
            <option value="3">Normal</option>
            <option value="5">Large</option>
            <option value="7">Huge</option>
          </select>
        </div>

        <div className="rt-group rt-right">
          <button 
            type="button" 
            className={`ieee-toggle ${ieeeMode ? 'active' : ''}`}
            onClick={() => setIeeeMode(!ieeeMode)}
            title="Toggle IEEE Two-Column Format"
          >
            IEEE Format {ieeeMode ? 'ON' : 'OFF'}
          </button>
        </div>
      </div>
      
      <div 
        className={`rt-content ${ieeeMode ? 'ieee-format' : ''}`}
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        onBlur={handleInput}
        suppressContentEditableWarning={true}
        data-placeholder={placeholder}
      />
    </div>
  );
}
