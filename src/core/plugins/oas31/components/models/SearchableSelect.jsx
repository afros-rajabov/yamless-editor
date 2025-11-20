/**
 * @prettier
 */
import React, { useRef, useEffect } from "react"
import PropTypes from "prop-types"

const SearchableSelect = ({ 
  value, 
  onChange, 
  placeholder, 
  searchValue, 
  onSearchChange, 
  isOpen, 
  onToggle,
  options,
  primitiveOptions = [],
  displayValue,
  disabled = false
}) => {
  const dropdownRef = useRef(null)
  const searchInputRef = useRef(null)
  
  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        onToggle(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [onToggle])
  
  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus()
    }
  }, [isOpen])
  
  // Combine all options and filter them
  const allOptions = [...primitiveOptions, ...options]
  const lowerSearch = searchValue.toLowerCase()

  const startsWithMatches = allOptions.filter(option => 
    option.label.toLowerCase().startsWith(lowerSearch)
  )
  const includesMatches = allOptions.filter(option => 
    option.label.toLowerCase().includes(lowerSearch) &&
    !option.label.toLowerCase().startsWith(lowerSearch)
  )

  const filteredOptions = [...startsWithMatches, ...includesMatches]
  
  return (
    <div ref={dropdownRef} style={{ position: 'relative', width: '100%' }}>
      <div 
        className="form-input" 
        style={{ 
          cursor: disabled ? 'not-allowed' : 'pointer', 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          backgroundColor: disabled ? '#f5f5f5' : '#fff',
          opacity: disabled ? 0.6 : 1
        }}
        onClick={() => !disabled && onToggle(!isOpen)}
      >
        <span>{displayValue || value || placeholder}</span>
        <span style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
          ▼
        </span>
      </div>
      
      {isOpen && !disabled && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          backgroundColor: '#fff',
          border: '1px solid #ccc',
          borderRadius: '4px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          zIndex: 1000,
          maxHeight: '200px',
          overflow: 'hidden'
        }}>
          <div style={{ padding: '8px', borderBottom: '1px solid #eee' }}>
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search..."
              value={searchValue}
              onChange={(e) => onSearchChange(e.target.value)}
              style={{
                width: '100%',
                padding: '6px 8px',
                border: '1px solid #ddd',
                borderRadius: '3px',
                fontSize: '14px'
              }}
              onClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
            />
          </div>
          <div style={{ maxHeight: '150px', overflowY: 'auto' }}>
            {filteredOptions.map(option => (
              <div
                key={option.value}
                style={{
                  padding: '8px 12px',
                  cursor: 'pointer',
                  backgroundColor: value === option.value ? '#f0f8ff' : 'transparent',
                  borderBottom: '1px solid #f0f0f0'
                }}
                onClick={() => {
                  onChange(option.value)
                  onSearchChange("") // Reset search input when option is selected
                  onToggle(false)
                }}
              >
                {option.label.length > 30 ? `${option.label.substring(0, 30)}...` : option.label}
              </div>
            ))}
            {filteredOptions.length === 0 && searchValue && (
              <div style={{ padding: '8px 12px', color: '#666', fontStyle: 'italic' }}>
                No matching options found
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

SearchableSelect.propTypes = {
  value: PropTypes.string,
  onChange: PropTypes.func.isRequired,
  placeholder: PropTypes.string,
  searchValue: PropTypes.string.isRequired,
  onSearchChange: PropTypes.func.isRequired,
  isOpen: PropTypes.bool.isRequired,
  onToggle: PropTypes.func.isRequired,
  options: PropTypes.arrayOf(PropTypes.shape({
    value: PropTypes.string.isRequired,
    label: PropTypes.string.isRequired
  })).isRequired,
  primitiveOptions: PropTypes.arrayOf(PropTypes.shape({
    value: PropTypes.string.isRequired,
    label: PropTypes.string.isRequired
  })),
  displayValue: PropTypes.string
}

export default SearchableSelect
