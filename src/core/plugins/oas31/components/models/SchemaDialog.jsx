/**
 * @prettier
 */
import React, { useCallback, useState, useRef, useEffect } from "react"
import PropTypes from "prop-types"
import SearchableSelect from "./SearchableSelect"
import PropertyCard from "./PropertyCard"
import { 
  safeExtractSchemaName, 
  parseSchemaToDialogFormat, 
  filterSchemas, 
  getDefaultSchemaData, 
  getDefaultPropertyData, 
  getDefaultEnumValueData,
  createSchemaOrReference,
  refPrefix,
  primitiveTypeOptions,
  emptyPrimitiveOptions
} from "./schemaDialogUtils"

const SchemaDialog = ({
  showDialog,
  onClose,
  onAddSchema,
  schemas,
  getComponent,
  initialData = null,
  sourceSchemaName = null
}) => {
  const [schemaName, setSchemaName] = useState("")
  const [schemaMode, setSchemaMode] = useState("BUILD") // "BUILD" or "COMPOSITE"
  const [schemaData, setSchemaData] = useState(getDefaultSchemaData())
  const [validationErrors, setValidationErrors] = useState({})
  const [currentProperty, setCurrentProperty] = useState(getDefaultPropertyData())
  const [currentEnumValue, setCurrentEnumValue] = useState(getDefaultEnumValueData())
  
  // Search filters for schema dropdowns
  const [propertyTypeSearch, setPropertyTypeSearch] = useState("")
  const [itemsTypeSearch, setItemsTypeSearch] = useState("")
  const [compositionSchemaSearch, setCompositionSchemaSearch] = useState("")
  const [propertyItemsTypeSearch, setPropertyItemsTypeSearch] = useState("")
  const [contentSchemaSearch, setContentSchemaSearch] = useState("")
  
  // Dropdown open states
  const [propertyDropdownOpen, setPropertyDropdownOpen] = useState(false)
  const [itemsDropdownOpen, setItemsDropdownOpen] = useState(false)
  const [compositionDropdownOpen, setCompositionDropdownOpen] = useState(false)
  const [propertyItemsDropdownOpen, setPropertyItemsDropdownOpen] = useState(false)
  const [contentSchemaDropdownOpen, setContentSchemaDropdownOpen] = useState(false)
  
  
  
  
  // Effect to populate form when initialData is provided
  useEffect(() => {
    if (initialData && showDialog) {
      try {
        const parsedData = parseSchemaToDialogFormat(initialData)
        
        // Determine mode based on schema structure
        const hasComposition = initialData.anyOf || initialData.oneOf || initialData.allOf
        const mode = hasComposition ? "COMPOSITE" : "BUILD"
        
        setSchemaMode(mode)
        setSchemaData(parsedData)
        
        // Clear schema name for new schema
        setSchemaName("")
        
        // Clear validation errors
        setValidationErrors({})
      } catch (error) {
        console.error('Error populating form with initial data:', error)
        // Reset to default state on error
        setSchemaMode("BUILD")
        setSchemaData(getDefaultSchemaData())
        setSchemaName("")
        setValidationErrors({})
      }
    }
  }, [initialData, showDialog, parseSchemaToDialogFormat])
  


  const resetForm = useCallback(() => {
    setSchemaName("")
    setSchemaMode("BUILD")
    setSchemaData(getDefaultSchemaData())
    setValidationErrors({})
    setCurrentProperty(getDefaultPropertyData())
    setCurrentEnumValue(getDefaultEnumValueData())
    setPropertyTypeSearch("")
    setItemsTypeSearch("")
    setCompositionSchemaSearch("")
    setPropertyItemsTypeSearch("")
    setContentSchemaSearch("")
    setPropertyDropdownOpen(false)
    setItemsDropdownOpen(false)
    setCompositionDropdownOpen(false)
    setPropertyItemsDropdownOpen(false)
    setContentSchemaDropdownOpen(false)
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
    
    // Validate composition properties
    if (currentProperty.isComposition) {
      if (!currentProperty.compositionSchemas || currentProperty.compositionSchemas.length === 0) {
        setValidationErrors({ compositionSchemas: "At least one schema must be selected for composition" })
        return
      }
    }
    
    // Clear any previous property validation errors
    setValidationErrors(prev => ({ ...prev, propertyName: undefined, compositionSchemas: undefined }))
    
    // Add property to schema data
    const newProperty = {
      name: currentProperty.name.trim(),
      required: currentProperty.required,
      description: currentProperty.description,
      format: currentProperty.format,
      itemsType: currentProperty.itemsType,
      itemsFormat: currentProperty.itemsFormat,
      contentMediaType: currentProperty.contentMediaType,
      contentSchema: currentProperty.contentSchema
    }
    
    // Add type or composition data based on property type
    if (currentProperty.isComposition) {
      // For composition properties, add the composition keyword directly
      newProperty[currentProperty.compositionType] = currentProperty.compositionSchemas.map(schemaName => 
        createSchemaOrReference(schemaName)
      )
    } else {
      // For regular properties, add the type
      newProperty.type = currentProperty.type
    }
    
    setSchemaData({
      ...schemaData,
      properties: [...schemaData.properties, newProperty]
    })
    
    // Reset form
    setCurrentProperty(getDefaultPropertyData())
  }, [currentProperty, schemaData])

  const handleAddEnumValue = useCallback(() => {
    // Validate current enum value
    if (!currentEnumValue.value.trim()) {
      setValidationErrors({ enumValue: "Enum value is required" })
      return
    }
    
    // Check for duplicate enum values
    const existingValue = schemaData.enum.find(enumItem => {
      const currentValue = (schemaData.enumType === "number" || schemaData.enumType === "integer") ? parseFloat(currentEnumValue.value) : currentEnumValue.value.trim()
      return enumItem === currentValue
    })
    if (existingValue) {
      setValidationErrors({ enumValue: "Enum value already exists" })
      return
    }
    
    // Clear any previous enum validation errors
    setValidationErrors(prev => ({ ...prev, enumValue: undefined }))
    
    // Add enum value to schema data
    const newValue = (schemaData.enumType === "number" || schemaData.enumType === "integer") ? parseFloat(currentEnumValue.value) : currentEnumValue.value.trim()
    
    setSchemaData({
      ...schemaData,
      enum: [...schemaData.enum, newValue]
    })
    
    // Reset form
    setCurrentEnumValue(getDefaultEnumValueData())
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

  
  // Reusable styles for checkboxes
  const checkboxLabelStyle = { display: 'flex', alignItems: 'center', gap: '8px' }
  const checkboxInputStyle = { 
    width: '16px', 
    height: '16px', 
    cursor: 'pointer' 
  }
  
  const CloseIcon = getComponent("CloseIcon")
  const Button = getComponent("Button")
  
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
              <h3>{sourceSchemaName ? `Clone Schema from ${sourceSchemaName}` : "Add Schema"}</h3>
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
                        primitiveOptions={emptyPrimitiveOptions}
                        options={filterSchemas(compositionSchemaSearch, schemas).map(schemaKey => ({
                          value: schemaKey,
                          label: schemaKey
                        }))}
                      />
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
                        <PropertyCard
                          key={index}
                          property={property}
                          index={index}
                          onRemove={(index) => {
                            const newProperties = schemaData.properties.filter((_, i) => i !== index)
                            setSchemaData({...schemaData, properties: newProperties})
                          }}
                          safeExtractSchemaName={safeExtractSchemaName}
                        />
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
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <h5 style={{ margin: 0 }}>Add New Property:</h5>
                      <label style={checkboxLabelStyle}>
                        <input 
                          type="checkbox" 
                          checked={currentProperty.isComposition} 
                          onChange={(e) => setCurrentProperty({
                            ...currentProperty, 
                            isComposition: e.target.checked,
                            format: e.target.checked ? "" : currentProperty.format
                          })}
                          style={checkboxInputStyle}
                        />
                        Use Composition
                      </label>
                    </div>
                    
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
                          disabled={currentProperty.isComposition}
                          displayValue={currentProperty.type.includes(refPrefix) 
                            ? safeExtractSchemaName(currentProperty.type) 
                            : currentProperty.type}
                          primitiveOptions={primitiveTypeOptions}
                          options={filterSchemas(propertyTypeSearch, schemas).map(schemaKey => ({
                            value: `${refPrefix}${schemaKey}`,
                            label: schemaKey
                          }))}
                        />
                      </div>
                    </div>
                    
                    
                    {/* Composition Controls */}
                    {currentProperty.isComposition && (
                      <>
                        <div className="form-field" style={{ marginBottom: '12px' }}>
                          <label className="form-label">Composition Type <span className="required">*</span></label>
                          <select 
                            className="form-input" 
                            value={currentProperty.compositionType} 
                            onChange={(e) => setCurrentProperty({...currentProperty, compositionType: e.target.value})}
                          >
                            <option value="anyOf">anyOf (Union - any can match)</option>
                            <option value="oneOf">oneOf (Exclusive Union - exactly one must match)</option>
                            <option value="allOf">allOf (Intersection - all must match)</option>
                          </select>
                        </div>
                        
                        <div className="form-field">
                          <label className="form-label">Member Schemas/Types<span className="required">*</span></label>
                          <div className="schema-selection">
                            <div className="selected-schemas">
                              {currentProperty.compositionSchemas.map((schema, index) => (
                                <div key={index} className="selected-schema">
                                  {schema}
                                  <button 
                                    type="button" 
                                    onClick={() => setCurrentProperty({
                                      ...currentProperty, 
                                      compositionSchemas: currentProperty.compositionSchemas.filter((_, i) => i !== index)
                                    })}
                                  >
                                    Remove
                                  </button>
                                </div>
                              ))}
                            </div>
                            <SearchableSelect
                              value=""
                              onChange={(value) => {
                                if (value && !currentProperty.compositionSchemas.includes(value)) {
                                  setCurrentProperty({
                                    ...currentProperty, 
                                    compositionSchemas: [...currentProperty.compositionSchemas, value]
                                  })
                                }
                              }}
                              placeholder="Select existing schema..."
                              searchValue={compositionSchemaSearch}
                              onSearchChange={setCompositionSchemaSearch}
                              isOpen={compositionDropdownOpen}
                              onToggle={setCompositionDropdownOpen}
                              primitiveOptions={primitiveTypeOptions}
                              options={filterSchemas(compositionSchemaSearch, schemas).map(schemaKey => ({
                                value: schemaKey,
                                label: schemaKey
                              }))}
                            />
                          </div>
                          {validationErrors.compositionSchemas && (
                            <div className="form-error">{validationErrors.compositionSchemas}</div>
                          )}
                        </div>
                      </>
                    )}
                    
                    {currentProperty.type === "array" && (
                      <>
                        <div className="form-field" style={{ marginBottom: '12px' }}>
                          <label className="form-label">Items Type <span className="required">*</span></label>
                          <SearchableSelect
                            value={
                              currentProperty.itemsType
                            }
                            onChange={(value) => setCurrentProperty({...currentProperty, itemsType: value, itemsFormat: ""})}
                            placeholder="Select items type..."
                            searchValue={propertyItemsTypeSearch}
                            onSearchChange={setPropertyItemsTypeSearch}
                            isOpen={propertyItemsDropdownOpen}
                            onToggle={setPropertyItemsDropdownOpen}
                            displayValue={currentProperty.itemsType.includes(refPrefix) 
                              ? safeExtractSchemaName(currentProperty.itemsType) 
                              : currentProperty.itemsType}
                            primitiveOptions={primitiveTypeOptions}
                            options={filterSchemas(propertyItemsTypeSearch, schemas).map(schemaKey => ({
                              value: `${refPrefix}${schemaKey}`,
                              label: schemaKey
                            }))}
                          />
                        </div>
                        {currentProperty.itemsType && 
                         !currentProperty.itemsType.includes(refPrefix) && 
                         (currentProperty.itemsType === "string" || 
                          currentProperty.itemsType === "number" || 
                          currentProperty.itemsType === "integer") && (
                          <div className="form-field" style={{ marginBottom: '12px' }}>
                            <label className="form-label">Items Format</label>
                            <select 
                              className="form-input" 
                              value={currentProperty.itemsFormat} 
                              onChange={(e) => setCurrentProperty({...currentProperty, itemsFormat: e.target.value})}
                            >
                              <option value="">None</option>
                              {currentProperty.itemsType === "string" && (
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
                                  <option value="binary">Binary</option>
                                </>
                              )}
                              {(currentProperty.itemsType === "number" || currentProperty.itemsType === "integer") && (
                                <>
                                  <option value="int32">int32</option>
                                  <option value="int64">int64</option>
                                  <option value="float">Float</option>
                                  <option value="double">Double</option>
                                </>
                              )}
                            </select>
                          </div>
                        )}
                      </>
                    )}
                    
                    {/* Content Media Type and Schema (only for string type) */}
                    {currentProperty.type === "string" && (
                      <div style={{ display: 'flex', gap: '15px', marginBottom: '12px' }}>
                        <div className="form-field" style={{ flex: 1 }}>
                          <label className="form-label">Content Media Type</label>
                          <select 
                            className="form-input" 
                            value={currentProperty.contentMediaType} 
                            onChange={(e) => setCurrentProperty({
                              ...currentProperty, 
                              contentMediaType: e.target.value,
                              format: "" // Clear format when contentMediaType is set
                            })}
                          >
                            <option value="">None</option>
                            <option value="application/json">application/json</option>
                            <option value="application/xml">application/xml</option>
                            <option value="application/octet-stream">application/octet-stream</option>
                            <option value="text/plain">text/plain</option>
                            <option value="text/html">text/html</option>
                            <option value="text/css">text/css</option>
                            <option value="text/javascript">text/javascript</option>
                            <option value="image/png">image/png</option>
                            <option value="image/jpeg">image/jpeg</option>
                            <option value="image/gif">image/gif</option>
                            <option value="image/svg+xml">image/svg+xml</option>
                            <option value="image/webp">image/webp</option>
                            <option value="multipart/form-data">multipart/form-data</option>
                            <option value="application/x-www-form-urlencoded">application/x-www-form-urlencoded</option>
                            <option value="application/pdf">application/pdf</option>
                            <option value="application/zip">application/zip</option>
                            <option value="audio/mpeg">audio/mpeg</option>
                            <option value="audio/wav">audio/wav</option>
                            <option value="video/mp4">video/mp4</option>
                            <option value="video/quicktime">video/quicktime</option>
                          </select>
                        </div>
                        <div className="form-field" style={{ flex: 1 }}>
                          <label className="form-label">Content Schema</label>
                          <SearchableSelect
                            value={currentProperty.contentSchema}
                            onChange={(value) => setCurrentProperty({
                              ...currentProperty, 
                              contentSchema: value,
                              format: "" // Clear format when contentSchema is set
                            })}
                            placeholder="Select content schema..."
                            searchValue={contentSchemaSearch}
                            onSearchChange={setContentSchemaSearch}
                            isOpen={contentSchemaDropdownOpen}
                            onToggle={setContentSchemaDropdownOpen}
                            displayValue={currentProperty.contentSchema && currentProperty.contentSchema.includes(refPrefix) 
                              ? safeExtractSchemaName(currentProperty.contentSchema) 
                              : currentProperty.contentSchema || ""}
                            primitiveOptions={emptyPrimitiveOptions}
                            options={filterSchemas(contentSchemaSearch, schemas).map(schemaKey => ({
                              value: `${refPrefix}${schemaKey}`,
                              label: schemaKey
                            }))}
                          />
                        </div>
                      </div>
                    )}
                    
                    <div style={{ display: 'flex', gap: '15px', marginBottom: '12px' }}>
                      {!currentProperty.isComposition && 
                       (currentProperty.type === "string" || 
                        currentProperty.type === "number" || 
                        currentProperty.type === "integer") &&
                       !currentProperty.contentMediaType &&
                       !currentProperty.contentSchema && (
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
                                <option value="binary">Binary</option>
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
                      )}
                      
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
                      displayValue={schemaData.itemsType.includes(refPrefix) 
                        ? safeExtractSchemaName(schemaData.itemsType) 
                        : schemaData.itemsType}
                      primitiveOptions={primitiveTypeOptions}
                      options={filterSchemas(itemsTypeSearch, schemas).map(schemaKey => ({
                        value: `${refPrefix}${schemaKey}`,
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
                  
                  {/* Enum Type and Format Selection */}
                  <div style={{ display: 'flex', gap: '15px', marginBottom: '20px' }}>
                    <div className="form-field" style={{ flex: 1 }}>
                      <label className="form-label">Enum Type <span className="required">*</span></label>
                      <select 
                        className="form-input" 
                        value={schemaData.enumType} 
                        onChange={(e) => setSchemaData({...schemaData, enumType: e.target.value, enumFormat: ""})}
                      >
                        <option value="string">String</option>
                        <option value="number">Number</option>
                        <option value="integer">Integer</option>
                      </select>
                    </div>
                    
                    <div className="form-field" style={{ flex: 1 }}>
                      <label className="form-label">Format</label>
                      <select 
                        className="form-input" 
                        value={schemaData.enumFormat} 
                        onChange={(e) => setSchemaData({...schemaData, enumFormat: e.target.value})}
                      >
                        <option value="">None</option>
                        {schemaData.enumType === "string" && (
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
                        {(schemaData.enumType === "number" || schemaData.enumType === "integer") && (
                          <>
                            <option value="int32">int32</option>
                            <option value="int64">int64</option>
                            <option value="float">Float</option>
                            <option value="double">Double</option>
                          </>
                        )}
                      </select>
                    </div>
                  </div>
                  
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
                    
                    <div className="form-field" style={{ marginBottom: '12px' }}>
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
                <Button className="btn modal-btn authorize" onClick={handleAddSchema}>Add Schema</Button>
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
  initialData: PropTypes.object,
  sourceSchemaName: PropTypes.string,
}

export default SchemaDialog
