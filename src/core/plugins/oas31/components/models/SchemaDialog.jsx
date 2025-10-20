/**
 * @prettier
 */
import React, { useCallback, useState, useRef, useEffect } from "react"
import PropTypes from "prop-types"

const SchemaDialog = ({
  showDialog,
  onClose,
  onAddSchema,
  schemas,
  getComponent
}) => {
  const [schemaName, setSchemaName] = useState("")
  const [schemaMode, setSchemaMode] = useState("BUILD") // "BUILD" or "COMPOSITE"
  const [schemaData, setSchemaData] = useState({
    type: "object",
    title: "",
    description: "",
    example: "",
    properties: [],
    required: [],
    items: null,
    itemsType: "string",
    itemsRef: "",
    minItems: null,
    maxItems: null,
    uniqueItems: false,
    minLength: null,
    maxLength: null,
    pattern: "",
    format: "",
    minimum: null,
    maximum: null,
    exclusiveMinimum: false,
    exclusiveMaximum: false,
    multipleOf: null,
    minProperties: null,
    maxProperties: null,
    enum: [],
    const: null,
    default: null,
    examples: [],
    allOf: [],
    anyOf: [],
    oneOf: [],
    not: null,
    readOnly: false,
    writeOnly: false,
    deprecated: false,
    nullable: false,
    compositionType: "anyOf",
    compositionSchemas: []
  })
  const [validationErrors, setValidationErrors] = useState({})
  const [currentProperty, setCurrentProperty] = useState({
    name: "",
    type: "string",
    required: false,
    description: "",
    format: "",
    itemsType: "string"
  })
  const [currentEnumValue, setCurrentEnumValue] = useState({
    value: "",
    type: "string"
  })
  
  // Search filters for schema dropdowns
  const [propertyTypeSearch, setPropertyTypeSearch] = useState("")
  const [itemsTypeSearch, setItemsTypeSearch] = useState("")
  const [compositionSchemaSearch, setCompositionSchemaSearch] = useState("")
  
  // Dropdown open states
  const [propertyDropdownOpen, setPropertyDropdownOpen] = useState(false)
  const [itemsDropdownOpen, setItemsDropdownOpen] = useState(false)
  const [compositionDropdownOpen, setCompositionDropdownOpen] = useState(false)
  
  // Reusable styles for checkboxes
  const checkboxLabelStyle = { display: 'flex', alignItems: 'center', gap: '8px' }
  const checkboxInputStyle = { 
    width: '16px', 
    height: '16px', 
    cursor: 'pointer' 
  }
  
  const CloseIcon = getComponent("CloseIcon")
  const Button = getComponent("Button")
  
  // Helper function to filter schemas based on search input
  const filterSchemas = useCallback((searchTerm) => {
    if (!searchTerm.trim()) return Object.keys(schemas)
    return Object.keys(schemas).filter(key => 
      key.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [schemas])

  // Custom SearchableSelect component
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
    displayValue
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
    const filteredOptions = allOptions.filter(option => 
      option.label.toLowerCase().includes(searchValue.toLowerCase())
    )
    
    return (
      <div ref={dropdownRef} style={{ position: 'relative', width: '100%' }}>
        <div 
          className="form-input" 
          style={{ 
            cursor: 'pointer', 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            backgroundColor: '#fff'
          }}
          onClick={() => onToggle(!isOpen)}
        >
          <span>{displayValue || value || placeholder}</span>
          <span style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
            ▼
          </span>
        </div>
        
        {isOpen && (
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
                  {option.label}
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

  const resetForm = useCallback(() => {
    setSchemaName("")
    setSchemaMode("BUILD")
    setSchemaData({
      type: "object",
      title: "",
      description: "",
      example: "",
      properties: [],
      required: [],
      items: null,
      itemsType: "string",
      itemsRef: "",
      minItems: null,
      maxItems: null,
      uniqueItems: false,
      minLength: null,
      maxLength: null,
      pattern: "",
      format: "",
      minimum: null,
      maximum: null,
      exclusiveMinimum: false,
      exclusiveMaximum: false,
      multipleOf: null,
      minProperties: null,
      maxProperties: null,
      enum: [],
      const: null,
      default: null,
      examples: [],
      allOf: [],
      anyOf: [],
      oneOf: [],
      not: null,
      readOnly: false,
      writeOnly: false,
      deprecated: false,
      nullable: false,
      compositionType: "anyOf",
      compositionSchemas: []
    })
    setValidationErrors({})
    setCurrentProperty({
      name: "",
      type: "string",
      required: false,
      description: "",
      format: "",
      itemsType: "string"
    })
    setCurrentEnumValue({
      value: "",
      type: "string"
    })
    setPropertyTypeSearch("")
    setItemsTypeSearch("")
    setCompositionSchemaSearch("")
    setPropertyDropdownOpen(false)
    setItemsDropdownOpen(false)
    setCompositionDropdownOpen(false)
  }, [])

  const closeDialog = useCallback(() => {
    resetForm()
    onClose()
  }, [resetForm, onClose])
  
  const validateForm = useCallback(() => {
    const errors = {}
    
    // Validate schema name
    if (!schemaName.trim()) {
      errors.schemaName = "Schema name is required"
    } else if (schemas[schemaName.trim()]) {
      errors.schemaName = "Schema name already exists"
    }
    
    // Validate numeric constraints
    if (schemaData.minimum !== null && schemaData.maximum !== null && schemaData.minimum > schemaData.maximum) {
      errors.minimum = "Minimum must be less than or equal to maximum"
    }
    
    if (schemaData.minLength !== null && schemaData.maxLength !== null && schemaData.minLength > schemaData.maxLength) {
      errors.minLength = "Min length must be less than or equal to max length"
    }
    
    if (schemaData.minItems !== null && schemaData.maxItems !== null && schemaData.minItems > schemaData.maxItems) {
      errors.minItems = "Min items must be less than or equal to max items"
    }
    
    if (schemaData.minProperties !== null && schemaData.maxProperties !== null && schemaData.minProperties > schemaData.maxProperties) {
      errors.minProperties = "Min properties must be less than or equal to max properties"
    }
    
    // Validate pattern regex
    if (schemaData.pattern) {
      try {
        new RegExp(schemaData.pattern)
      } catch (e) {
        errors.pattern = "Invalid regex pattern"
      }
    }
    
    // Validate enum schemas
    if (schemaData.type === "enum" && schemaMode === "BUILD") {
      if (!schemaData.enum || schemaData.enum.length === 0) {
        errors.enum = "Enum schema must have at least one value"
      }
    }
    
    // Validate composition schemas
    if (schemaMode === "COMPOSITE") {
      if (!schemaData.compositionSchemas || schemaData.compositionSchemas.length === 0) {
        errors.compositionSchemas = "At least one schema must be selected for composition"
      }
    }
    
    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }, [schemaName, schemaData, schemas, schemaMode])
  
  const handleAddProperty = useCallback(() => {
    // Validate current property
    if (!currentProperty.name.trim()) {
      setValidationErrors({ propertyName: "Property name is required" })
      return
    }
    
    // Check for duplicate property names
    const existingProperty = schemaData.properties.find(prop => prop.name === currentProperty.name.trim())
    if (existingProperty) {
      setValidationErrors({ propertyName: "Property name already exists" })
      return
    }
    
    // Clear any previous property validation errors
    setValidationErrors(prev => ({ ...prev, propertyName: undefined }))
    
    // Add property to schema data
    const newProperty = {
      name: currentProperty.name.trim(),
      type: currentProperty.type,
      required: currentProperty.required,
      description: currentProperty.description,
      format: currentProperty.format,
      itemsType: currentProperty.itemsType
    }
    
    setSchemaData({
      ...schemaData,
      properties: [...schemaData.properties, newProperty]
    })
    
    // Reset form
    setCurrentProperty({
      name: "",
      type: "string",
      required: false,
      description: "",
      format: "",
      itemsType: "string"
    })
  }, [currentProperty, schemaData])

  const handleAddEnumValue = useCallback(() => {
    // Validate current enum value
    if (!currentEnumValue.value.trim()) {
      setValidationErrors({ enumValue: "Enum value is required" })
      return
    }
    
    // Check for duplicate enum values
    const existingValue = schemaData.enum.find(enumItem => {
      const currentValue = currentEnumValue.type === "number" ? parseFloat(currentEnumValue.value) : currentEnumValue.value.trim()
      return enumItem === currentValue
    })
    if (existingValue) {
      setValidationErrors({ enumValue: "Enum value already exists" })
      return
    }
    
    // Clear any previous enum validation errors
    setValidationErrors(prev => ({ ...prev, enumValue: undefined }))
    
    // Add enum value to schema data
    const newValue = currentEnumValue.type === "number" ? parseFloat(currentEnumValue.value) : currentEnumValue.value.trim()
    
    setSchemaData({
      ...schemaData,
      enum: [...schemaData.enum, newValue]
    })
    
    // Reset form
    setCurrentEnumValue({
      value: "",
      type: "string"
    })
  }, [currentEnumValue, schemaData])

  const handleAddSchema = useCallback(() => {
    if (!validateForm()) {
      return
    }
    
    // Set default values for array types
    let processedSchemaData = { ...schemaData }
    
    // If schema is array type, set default to empty array
    if (processedSchemaData.type === "array") {
      processedSchemaData.default = []
    }
    
    onAddSchema(schemaName.trim(), processedSchemaData, schemaMode)
    closeDialog()
  }, [schemaName, schemaData, schemaMode, validateForm, onAddSchema, closeDialog])

  if (!showDialog) {
    return null
  }

  return (
    <div className="dialog-ux">
      <div className="backdrop-ux" onClick={closeDialog}></div>
      <div className="modal-ux schema-dialog">
        <div className="modal-dialog-ux">
          <div className="modal-ux-inner">
            <div className="modal-ux-header">
              <h3>Add Schema</h3>
              <button type="button" className="close-modal" onClick={closeDialog}>
                {CloseIcon ? <CloseIcon /> : "✕"}
              </button>
            </div>
            <div className="modal-ux-content">
              {/* Section 1: Basic Info */}
              <div className="form-section">
                <div style={{ display: 'flex', gap: '15px', marginBottom: '12px' }}>
                  <div className="form-field" style={{ flex: 1 }}>
                    <label className="form-label" htmlFor="schema-name">Schema Name (Key) <span className="required">*</span></label>
                    <input 
                      className="form-input" 
                      id="schema-name" 
                      type="text" 
                      value={schemaName} 
                      onChange={(e) => setSchemaName(e.target.value)}
                      placeholder="UserCreateRequest"
                    />
                    {validationErrors.schemaName && (
                      <div className="form-error">{validationErrors.schemaName}</div>
                    )}
                  </div>
                  
                  <div className="form-field" style={{ flex: 1 }}>
                    <label className="form-label" htmlFor="schema-description">Description</label>
                    <input 
                      className="form-input" 
                      id="schema-description" 
                      type="text" 
                      value={schemaData.description} 
                      onChange={(e) => setSchemaData({...schemaData, description: e.target.value})}
                    />
                  </div>
                </div>
              </div>

              {/* Mode Switcher */}
              <div className="form-section">
                <h4>Schema Mode</h4>
                <div className="mode-switcher" style={{ 
                  display: 'flex', 
                  marginBottom: '20px',
                  border: '1px solid #dee2e6',
                  borderRadius: '4px',
                  overflow: 'hidden'
                }}>
                  <button 
                    type="button"
                    className="btn tab-switcher-btn"
                    onClick={() => setSchemaMode("BUILD")}
                    style={{ 
                      flex: 1,
                      backgroundColor: schemaMode === "BUILD" ? 'rgba(0, 0, 0, .051)' : '#ffffff',
                      color: schemaMode === "BUILD" ? '#000000' : '#6c757d',
                      border: 'none',
                      borderRadius: 0,
                      borderRight: '1px solid #dee2e6',
                      margin: 0,
                      transition: 'box-shadow 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      if (schemaMode !== "BUILD") {
                        e.target.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.1)'
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.boxShadow = 'none'
                    }}
                  >
                    BUILD
                  </button>
                  <button 
                    type="button"
                    className="btn tab-switcher-btn"
                    onClick={() => setSchemaMode("COMPOSITE")}
                    style={{ 
                      flex: 1,
                      backgroundColor: schemaMode === "COMPOSITE" ? 'rgba(0, 0, 0, .051)' : '#ffffff',
                      color: schemaMode === "COMPOSITE" ? '#000000' : '#6c757d',
                      border: 'none',
                      borderRadius: 0,
                      margin: 0,
                      transition: 'box-shadow 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      if (schemaMode !== "COMPOSITE") {
                        e.target.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.1)'
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.boxShadow = 'none'
                    }}
                  >
                    COMPOSITE
                  </button>
                </div>
              </div>

              {/* BUILD Mode Content */}
              {schemaMode === "BUILD" && (
                <div className="form-section">
                  <h4>Schema Type</h4>
                  <div className="form-field">
                    <label className="form-label" htmlFor="schema-type">Schema Type</label>
                    <select 
                      className="form-input" 
                      id="schema-type" 
                      value={schemaData.type} 
                      onChange={(e) => setSchemaData({...schemaData, type: e.target.value})}
                    >
                      <option value="object">Object</option>
                      <option value="array">Array</option>
                      <option value="enum">Enum</option>
                    </select>
                  </div>
                </div>
              )}

              {/* COMPOSITE Mode Content */}
              {schemaMode === "COMPOSITE" && (
                <div className="form-section">
                  <h4>Composition</h4>
                  <div className="form-field">
                    <label className="form-label" htmlFor="composition-type">Composition Type</label>
                    <select 
                      className="form-input" 
                      id="composition-type" 
                      value={schemaData.compositionType} 
                      onChange={(e) => setSchemaData({...schemaData, compositionType: e.target.value})}
                    >
                      <option value="anyOf">anyOf (Union - any can match)</option>
                      <option value="oneOf">oneOf (Exclusive Union - exactly one must match)</option>
                      <option value="allOf">allOf (Intersection - all must match)</option>
                    </select>
                  </div>
                  
                  <div className="form-field">
                    <label className="form-label">Member Schemas</label>
                    <div className="schema-selection">
                      <SearchableSelect
                        value=""
                        onChange={(value) => {
                          if (value && !schemaData.compositionSchemas.includes(value)) {
                            setSchemaData({
                              ...schemaData, 
                              compositionSchemas: [...schemaData.compositionSchemas, value]
                            })
                          }
                        }}
                        placeholder="Select existing schema..."
                        searchValue={compositionSchemaSearch}
                        onSearchChange={setCompositionSchemaSearch}
                        isOpen={compositionDropdownOpen}
                        onToggle={setCompositionDropdownOpen}
                        primitiveOptions={[]}
                        options={filterSchemas(compositionSchemaSearch).map(schemaKey => ({
                          value: schemaKey,
                          label: schemaKey
                        }))}
                      />
                      <div className="selected-schemas">
                        {schemaData.compositionSchemas.map((schema, index) => (
                          <div key={index} className="selected-schema">
                            {schema}
                            <button 
                              type="button" 
                              onClick={() => setSchemaData({
                                ...schemaData, 
                                compositionSchemas: schemaData.compositionSchemas.filter((_, i) => i !== index)
                              })}
                            >
                              Remove
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                    {validationErrors.compositionSchemas && (
                      <div className="form-error">{validationErrors.compositionSchemas}</div>
                    )}
                  </div>
                </div>
              )}

              {/* Section 2: Properties (for object type) */}
              {schemaData.type === "object" && schemaMode === "BUILD" && (
                <div className="form-section">
                  <h4>Properties</h4>
                  
                  {/* Added Properties List (Read-only) */}
                  {schemaData.properties.length > 0 && (
                    <div className="added-properties">
                      <h5>Added Properties:</h5>
                      {schemaData.properties.map((property, index) => (
                        <div key={index} className="property-card" style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '10px',
                          margin: '5px 0',
                          border: '1px solid #e0e0e0',
                          borderRadius: '4px',
                          backgroundColor: '#f9f9f9'
                        }}>
                          <div className="property-info">
                            <strong>{property.name}</strong>
                            <span style={{ margin: '0 10px', color: '#666' }}>
                              ({property.type}
                              {property.format && `, ${property.format}`}
                              {property.required && ', required'})
                            </span>
                            {property.description && (
                              <span style={{ color: '#666', fontSize: '0.9em' }}>
                                - {property.description}
                              </span>
                            )}
                          </div>
                          <button 
                            type="button" 
                            className="btn btn-danger btn-sm" 
                            onClick={() => {
                              const newProperties = schemaData.properties.filter((_, i) => i !== index)
                              setSchemaData({...schemaData, properties: newProperties})
                            }}
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {/* Add Property Form */}
                  <div className="add-property-form" style={{
                    marginTop: '20px',
                    padding: '15px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    backgroundColor: '#fafafa'
                  }}>
                    <h5>Add New Property:</h5>
                    
                    <div style={{ display: 'flex', gap: '15px', marginBottom: '12px' }}>
                      <div className="form-field" style={{ flex: 1 }}>
                        <label className="form-label">Property Name <span className="required">*</span></label>
                        <input 
                          className="form-input" 
                          type="text" 
                          value={currentProperty.name} 
                          onChange={(e) => setCurrentProperty({...currentProperty, name: e.target.value})}
                          placeholder="e.g., username"
                        />
                        {validationErrors.propertyName && (
                          <div className="form-error">{validationErrors.propertyName}</div>
                        )}
                      </div>
                      
                      <div className="form-field" style={{ flex: 1 }}>
                        <label className="form-label">Property Type <span className="required">*</span></label>
                        <SearchableSelect
                          value={currentProperty.type}
                          onChange={(value) => setCurrentProperty({...currentProperty, type: value, format: ""})}
                          placeholder="Select property type..."
                          searchValue={propertyTypeSearch}
                          onSearchChange={setPropertyTypeSearch}
                          isOpen={propertyDropdownOpen}
                          onToggle={setPropertyDropdownOpen}
                          displayValue={currentProperty.type.startsWith('#/components/schemas/') 
                            ? currentProperty.type.replace('#/components/schemas/', '') 
                            : currentProperty.type}
                          primitiveOptions={[
                            { value: "string", label: "String" },
                            { value: "number", label: "Number" },
                            { value: "integer", label: "Integer" },
                            { value: "boolean", label: "Boolean" },
                            { value: "array", label: "Array" },
                            { value: "object", label: "Object" }
                          ]}
                          options={filterSchemas(propertyTypeSearch).map(schemaKey => ({
                            value: `#/components/schemas/${schemaKey}`,
                            label: schemaKey
                          }))}
                        />
                      </div>
                    </div>
                    
                    <div style={{ display: 'flex', gap: '15px', marginBottom: '12px' }}>
                      <div className="form-field" style={{ flex: 1 }}>
                        <label className="form-label">Format</label>
                        <select 
                          className="form-input" 
                          value={currentProperty.format} 
                          onChange={(e) => setCurrentProperty({...currentProperty, format: e.target.value})}
                        >
                          <option value="">None</option>
                          {currentProperty.type === "string" && (
                            <>
                              <option value="date">Date</option>
                              <option value="date-time">Date-Time</option>
                              <option value="email">Email</option>
                              <option value="uri">URI</option>
                              <option value="uuid">UUID</option>
                              <option value="password">Password</option>
                              <option value="hostname">Hostname</option>
                              <option value="ipv4">IPv4</option>
                              <option value="ipv6">IPv6</option>
                            </>
                          )}
                          {(currentProperty.type === "number" || currentProperty.type === "integer") && (
                            <>
                              <option value="int32">int32</option>
                              <option value="int64">int64</option>
                              <option value="float">Float</option>
                              <option value="double">Double</option>
                            </>
                          )}
                        </select>
                      </div>
                      
                      <div className="form-field" style={{ flex: 1 }}>
                        <label className="form-label">Description</label>
                        <input 
                          className="form-input" 
                          type="text" 
                          value={currentProperty.description} 
                          onChange={(e) => setCurrentProperty({...currentProperty, description: e.target.value})}
                          placeholder="Property description"
                        />
                      </div>
                    </div>
                    
                    {currentProperty.type === "array" && (
                      <div className="form-field" style={{ marginBottom: '12px' }}>
                        <label className="form-label">Items Type <span className="required">*</span></label>
                        <select 
                          className="form-input" 
                          value={currentProperty.itemsType} 
                          onChange={(e) => setCurrentProperty({...currentProperty, itemsType: e.target.value})}
                        >
                          <option value="string">String</option>
                          <option value="number">Number</option>
                          <option value="integer">Integer</option>
                          <option value="boolean">Boolean</option>
                          <option value="object">Object</option>
                          <option value="array">Array</option>
                          {Object.keys(schemas).map(schemaKey => (
                            <option key={schemaKey} value={`#/components/schemas/${schemaKey}`}>
                              {schemaKey} (Reference)
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                    
                    <div style={{ display: 'flex', gap: '15px', alignItems: 'center', marginBottom: '12px' }}>
                      <label style={checkboxLabelStyle}>
                        <input 
                          type="checkbox" 
                          checked={currentProperty.required} 
                          onChange={(e) => setCurrentProperty({...currentProperty, required: e.target.checked})}
                          style={checkboxInputStyle}
                        />
                        Required
                      </label>
                    </div>
                    
                    <button 
                      type="button" 
                      className="btn btn-primary" 
                      onClick={handleAddProperty}
                    >
                      Add Property
                    </button>
                  </div>
                </div>
              )}

              {/* Section 3: Array Items (for array type) */}
              {schemaData.type === "array" && schemaMode === "BUILD" && (
                <div className="form-section">
                  <h4>Array Items</h4>
                  
                  <div className="form-field">
                    <label className="form-label">Items Type <span className="required">*</span></label>
                    <SearchableSelect
                      value={schemaData.itemsType}
                      onChange={(value) => setSchemaData({...schemaData, itemsType: value})}
                      placeholder="Select items type..."
                      searchValue={itemsTypeSearch}
                      onSearchChange={setItemsTypeSearch}
                      isOpen={itemsDropdownOpen}
                      onToggle={setItemsDropdownOpen}
                      displayValue={schemaData.itemsType.startsWith('#/components/schemas/') 
                        ? schemaData.itemsType.replace('#/components/schemas/', '') 
                        : schemaData.itemsType}
                      primitiveOptions={[
                        { value: "string", label: "String" },
                        { value: "number", label: "Number" },
                        { value: "integer", label: "Integer" },
                        { value: "boolean", label: "Boolean" },
                        { value: "object", label: "Object" },
                        { value: "array", label: "Array" }
                      ]}
                      options={filterSchemas(itemsTypeSearch).map(schemaKey => ({
                        value: `#/components/schemas/${schemaKey}`,
                        label: schemaKey
                      }))}
                    />
                  </div>
                </div>
              )}

              {/* Section 4: Enum Values (for enum type) */}
              {schemaData.type === "enum" && schemaMode === "BUILD" && (
                <div className="form-section">
                  <h4>Enum Values</h4>
                  
                  {/* Added Enum Values List (Read-only) */}
                  {schemaData.enum.length > 0 && (
                    <div className="added-enum-values">
                      <h5>Added Enum Values:</h5>
                      {schemaData.enum.map((enumItem, index) => (
                        <div key={index} className="enum-value-card" style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '10px',
                          margin: '5px 0',
                          border: '1px solid #e0e0e0',
                          borderRadius: '4px',
                          backgroundColor: '#f9f9f9'
                        }}>
                          <div className="enum-value-info">
                            <strong>"{typeof enumItem === 'string' ? enumItem : enumItem.toString()}"</strong>
                            <span style={{ margin: '0 10px', color: '#666' }}>
                              ({typeof enumItem === 'number' ? 'number' : 'string'})
                            </span>
                          </div>
                          <button 
                            type="button" 
                            className="btn btn-danger btn-sm" 
                            onClick={() => {
                              const newEnum = schemaData.enum.filter((_, i) => i !== index)
                              setSchemaData({...schemaData, enum: newEnum})
                            }}
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {/* Add Enum Value Form */}
                  <div className="add-enum-value-form" style={{
                    marginTop: '20px',
                    padding: '15px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    backgroundColor: '#fafafa'
                  }}>
                    <h5>Add New Enum Value:</h5>
                    
                    <div style={{ display: 'flex', gap: '15px', marginBottom: '12px' }}>
                      <div className="form-field" style={{ flex: 1 }}>
                        <label className="form-label">Value <span className="required">*</span></label>
                        <input 
                          className="form-input" 
                          type="text" 
                          value={currentEnumValue.value} 
                          onChange={(e) => setCurrentEnumValue({...currentEnumValue, value: e.target.value})}
                          placeholder="Enter enum value"
                        />
                        {validationErrors.enumValue && (
                          <div className="form-error">{validationErrors.enumValue}</div>
                        )}
                      </div>
                      
                      <div className="form-field" style={{ flex: 1 }}>
                        <label className="form-label">Type</label>
                        <select 
                          className="form-input" 
                          value={currentEnumValue.type} 
                          onChange={(e) => setCurrentEnumValue({...currentEnumValue, type: e.target.value})}
                        >
                          <option value="string">String</option>
                          <option value="number">Number</option>
                        </select>
                      </div>
                    </div>
                    
                    <button 
                      type="button" 
                      className="btn btn-primary" 
                      onClick={handleAddEnumValue}
                    >
                      Add Enum Value
                    </button>
                  </div>
                </div>
              )}

              {/* Section 4: Additional Schema Properties */}
              <div className="form-section">
                <h4>Additional Schema Properties</h4>
                
                <div className="form-field">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <label style={checkboxLabelStyle}>
                      <input 
                        type="checkbox" 
                        checked={schemaData.nullable} 
                        onChange={(e) => setSchemaData({...schemaData, nullable: e.target.checked})}
                        style={checkboxInputStyle}
                      />
                      Nullable (value can be null)
                    </label>
                    
                    <label style={checkboxLabelStyle}>
                      <input 
                        type="checkbox" 
                        checked={schemaData.deprecated} 
                        onChange={(e) => setSchemaData({...schemaData, deprecated: e.target.checked})}
                        style={checkboxInputStyle}
                      />
                      Deprecated
                    </label>
                  </div>
                </div>
              </div>

              {validationErrors.general && (
                <div className="form-error">{validationErrors.general}</div>
              )}

              <div className="modal-actions-row">
                <Button className="btn modal-btn" onClick={closeDialog}>Cancel</Button>
                <Button className="btn modal-btn" onClick={handleAddSchema}>Add Schema</Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

SchemaDialog.propTypes = {
  showDialog: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onAddSchema: PropTypes.func.isRequired,
  schemas: PropTypes.object.isRequired,
  getComponent: PropTypes.func.isRequired,
}

export default SchemaDialog
