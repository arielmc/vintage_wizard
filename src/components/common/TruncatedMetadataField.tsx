import React, { useState, useEffect, useRef, KeyboardEvent, CSSProperties } from 'react';

interface TruncatedMetadataFieldProps {
  label: string;
  value: string | undefined;
  onChange: (value: string) => void;
  placeholder?: string;
  fieldKey?: string;
  maxLength?: number;
}

/**
 * Editable metadata field with truncation and mobile drawer
 */
const TruncatedMetadataField: React.FC<TruncatedMetadataFieldProps> = ({ 
  label, 
  value, 
  onChange, 
  placeholder, 
  maxLength = 200 
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const [editValue, setEditValue] = useState(value || "");
  const [isOverflowing, setIsOverflowing] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const fieldRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const displayValue = value || placeholder || "";

  useEffect(() => {
    const checkMobileAndOverflow = () => {
      setIsMobile(window.innerWidth <= 480);
      if (fieldRef.current) {
        const shouldCheck = window.innerWidth <= 768;
        if (shouldCheck) {
          const hasOverflow = fieldRef.current.scrollWidth > fieldRef.current.clientWidth;
          setIsOverflowing(hasOverflow);
        } else {
          setIsOverflowing(false);
        }
      }
    };
    checkMobileAndOverflow();
    window.addEventListener('resize', checkMobileAndOverflow);
    return () => window.removeEventListener('resize', checkMobileAndOverflow);
  }, [value]);

  useEffect(() => {
    if (textareaRef.current && isEditing) {
      textareaRef.current.style.height = 'auto';
      const newHeight = Math.min(Math.max(textareaRef.current.scrollHeight, 100), 200);
      textareaRef.current.style.height = newHeight + 'px';
    }
  }, [editValue, isEditing]);

  const handleFieldClick = () => {
    setEditValue(value || "");
    setIsEditing(true);
    setTimeout(() => textareaRef.current?.focus(), 50);
  };

  const handleSave = () => {
    onChange(editValue);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditValue(value || "");
    setIsEditing(false);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Escape') {
      handleCancel();
    } else if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      handleSave();
    }
  };

  const handleBackdropClick = () => handleSave();

  const metadataStyles = `
    .metadata-value {
      white-space: normal;
      overflow: visible;
      max-width: 100%;
      cursor: pointer;
      padding: 4px 8px;
      background: #FAFAF8;
      border-radius: 6px;
      border: 1.5px solid transparent;
      transition: all 0.2s;
      font-size: 10px;
      line-height: 1.4;
      min-height: 24px;
      display: block;
      word-wrap: break-word;
      word-break: break-word;
    }
    .metadata-value:hover {
      background: #F5F3F0;
      border-color: #E5E0D9;
    }
    @media (max-width: 768px) {
      .metadata-value {
        min-height: 40px;
        max-height: 120px;
        overflow-y: auto;
        padding: 10px 12px;
        font-size: 12px;
        line-height: 1.5;
      }
    }
    @media (max-width: 480px) {
      .metadata-value {
        min-height: 48px;
        max-height: 150px;
        padding: 12px 14px;
        font-size: 13px;
      }
    }
    @media (hover: none) and (pointer: coarse) {
      .tooltip:not(.editing) {
        display: none !important;
      }
    }
  `;

  // Mobile: Bottom drawer
  if (isMobile && isEditing) {
    return (
      <>
        <div
          ref={fieldRef}
          onClick={handleFieldClick}
          className={`metadata-value ${isOverflowing ? 'has-overflow' : ''} ${!value ? 'text-stone-400' : 'text-stone-800'}`}
        >
          {displayValue}
        </div>
        <div
          onClick={handleBackdropClick}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.4)',
            zIndex: 998,
          }}
        />
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            background: 'white',
            borderRadius: '20px 20px 0 0',
            padding: '12px 20px 32px',
            boxShadow: '0 -8px 32px rgba(0, 0, 0, 0.15)',
            zIndex: 999,
          }}
        >
          <div style={{ width: '36px', height: '4px', background: '#D4CFC7', borderRadius: '2px', margin: '0 auto 16px' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#9CA3AF' }}>{label}</span>
            <button
              onClick={handleCancel}
              style={{ width: '32px', height: '32px', borderRadius: '50%', border: 'none', background: '#F5F3F0', color: '#7A7267', fontSize: '1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >✕</button>
          </div>
          <textarea
            ref={textareaRef}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            maxLength={maxLength}
            style={{
              width: '100%',
              minHeight: '120px',
              padding: '14px 16px',
              border: '1.5px solid #E5E0D9',
              borderRadius: '12px',
              fontFamily: 'inherit',
              fontSize: '1rem',
              lineHeight: 1.6,
              resize: 'none',
              color: '#2D2A26',
              outline: 'none',
            }}
            placeholder={placeholder}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px' }}>
            <span style={{ fontSize: '0.75rem', color: '#9CA3AF' }}>{editValue.length}/{maxLength}</span>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={handleCancel}
                style={{ padding: '12px 20px', background: '#F5F3F0', border: 'none', borderRadius: '10px', fontSize: '0.95rem', fontWeight: 500, color: '#7A7267', cursor: 'pointer' }}
              >Cancel</button>
              <button
                onClick={handleSave}
                style={{ padding: '12px 24px', background: '#1a1816', border: 'none', borderRadius: '10px', fontSize: '0.95rem', fontWeight: 500, color: 'white', cursor: 'pointer' }}
              >Done</button>
            </div>
          </div>
        </div>
        <style>{metadataStyles}</style>
      </>
    );
  }

  // Desktop/Tablet: Tooltip behavior
  const wrapperStyle: CSSProperties = { 
    position: 'relative', 
    overflow: 'visible', 
    zIndex: isEditing ? 9999 : 'auto' 
  };

  return (
    <>
      <div
        className="metadata-value-wrapper"
        style={wrapperStyle}
        onMouseEnter={() => !isEditing && setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
      >
        <div
          ref={fieldRef}
          onClick={handleFieldClick}
          className={`metadata-value ${isOverflowing ? 'has-overflow' : ''} ${!value ? 'text-stone-400' : 'text-stone-800'}`}
          role="button"
          tabIndex={0}
          aria-label={`${label}: ${displayValue}. Click to edit.`}
          onKeyDown={(e) => e.key === 'Enter' && handleFieldClick()}
        >
          {displayValue}
        </div>

        {isHovering && !isEditing && isOverflowing && (
          <div
            role="tooltip"
            style={{
              position: 'absolute',
              bottom: 'calc(100% + 10px)',
              left: '50%',
              transform: 'translateX(-50%)',
              background: '#1a1816',
              color: 'white',
              padding: '12px 16px',
              borderRadius: '10px',
              fontSize: '0.9rem',
              lineHeight: 1.5,
              maxWidth: '300px',
              width: 'max-content',
              boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
              zIndex: 9999,
              pointerEvents: 'none',
            }}
          >
            {displayValue}
            <div
              style={{
                position: 'absolute',
                top: '100%',
                left: '50%',
                transform: 'translateX(-50%)',
                border: '8px solid transparent',
                borderTopColor: '#1a1816',
              }}
            />
          </div>
        )}

        {isEditing && (
          <>
            <div
              onClick={handleBackdropClick}
              style={{
                position: 'fixed',
                inset: 0,
                background: 'transparent',
                zIndex: 9998,
              }}
            />
            <div
              className="tooltip editing"
              role="dialog"
              aria-label={`Edit ${label}`}
              style={{
                position: 'absolute',
                bottom: 'calc(100% + 10px)',
                left: '50%',
                transform: 'translateX(-50%)',
                background: 'white',
                color: '#2D2A26',
                border: '1.5px solid #D4A574',
                borderRadius: '10px',
                boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
                zIndex: 9999,
                minWidth: '320px',
                maxWidth: '400px',
                overflow: 'hidden',
              }}
            >
              <textarea
                ref={textareaRef}
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onKeyDown={handleKeyDown}
                maxLength={maxLength}
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  border: 'none',
                  fontFamily: 'inherit',
                  fontSize: '0.95rem',
                  lineHeight: 1.6,
                  resize: 'none',
                  minHeight: '100px',
                  maxHeight: '200px',
                  overflowY: 'auto',
                  color: '#2D2A26',
                  outline: 'none',
                }}
                placeholder={placeholder}
              />
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '10px 14px',
                  background: '#FAFAF8',
                  borderTop: '1px solid #F0EDE9',
                }}
              >
                <span style={{ fontSize: '0.75rem', color: '#9CA3AF' }}>{editValue.length}/{maxLength}</span>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={handleCancel}
                    type="button"
                    style={{ padding: '8px 14px', background: 'transparent', border: 'none', color: '#7A7267', fontSize: '0.85rem', fontWeight: 500, cursor: 'pointer', borderRadius: '6px' }}
                  >Cancel</button>
                  <button
                    onClick={handleSave}
                    type="button"
                    style={{ padding: '8px 16px', background: '#1a1816', color: 'white', border: 'none', fontSize: '0.85rem', fontWeight: 500, cursor: 'pointer', borderRadius: '6px' }}
                  >Done</button>
                </div>
              </div>
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  border: '8px solid transparent',
                  borderTopColor: '#D4A574',
                }}
              />
            </div>
          </>
        )}
      </div>
      <style>{metadataStyles}</style>
    </>
  );
};

export default TruncatedMetadataField;
