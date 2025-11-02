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

const SchemaEditDialog = ({
  showDialog,
  onClose,
  onUpdateSchema,
  schemas,
  getComponent,
  schemaName,
  schemaData
}) => {
  const [schemaMode, setSchemaMode] = useState("BUILD") // "BUILD" or "COMPOSITE"
  const [currentSchemaData, setCurrentSchemaData] = useState(getDefaultSchemaData())
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
  
  // Edit states
  const [editingPropertyIndex, setEditingPropertyIndex] = useState(null)
  const [editingEnumIndex, setEditingEnumIndex] = useState(null)
  
  
  
  // Effect to populate form when schemaData is provided
  useEffect(() => {
    if (schemaData && showDialog) {
      try {
        const parsedData = parseSchemaToDialogFormat(schemaData)
        
        // Determine mode based on schema structure
        const hasComposition = schemaData.anyOf || schemaData.oneOf || schemaData.allOf
        const mode = hasComposition ? "COMPOSITE" : "BUILD"
        
        setSchemaMode(mode)
        setCurrentSchemaData(parsedData)
        
        // Clear validation errors
        setValidationErrors({})
      } catch (error) {
        console.error('Error populating form with schema data:', error)
        // Reset to default state on error
        setSchemaMode("BUILD")
        setCurrentSchemaData(getDefaultSchemaData())
        setValidationErrors({})
      }
    }
  }, [schemaData, showDialog, parseSchemaToDialogFormat])
  

  const resetForm = useCallback(() => {
    setSchemaMode("BUILD")
    setCurrentSchemaData(getDefaultSchemaData())
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
    setEditingPropertyIndex(null)
    setEditingEnumIndex(null)
  }, [])

  const closeDialog = useCallback(() => {
    resetForm()
    onClose()
  }, [resetForm, onClose])
  
  const validateForm = useCallback(() => {
    const errors = {}
    
    // Validate numeric constraints
    if (currentSchemaData.minimum !== null && currentSchemaData.maximum !== null && currentSchemaData.minimum > currentSchemaData.maximum) {
      errors.minimum = "Minimum must be less than or equal to maximum"
    }
    
    if (currentSchemaData.minLength !== null && currentSchemaData.maxLength !== null && currentSchemaData.minLength > currentSchemaData.maxLength) {
      errors.minLength = "Min length must be less than or equal to max length"
    }
    
    if (currentSchemaData.minItems !== null && currentSchemaData.maxItems !== null && currentSchemaData.minItems > currentSchemaData.maxItems) {
      errors.minItems = "Min items must be less than or equal to max items"
    }
    
    if (currentSchemaData.minProperties !== null && currentSchemaData.maxProperties !== null && currentSchemaData.minProperties > currentSchemaData.maxProperties) {
      errors.minProperties = "Min properties must be less than or equal to max properties"
    }
    
    // Validate pattern regex
    if (currentSchemaData.pattern) {
      try {
        new RegExp(currentSchemaData.pattern)
      } catch (e) {
        errors.pattern = "Invalid regex pattern"
      }
    }
    
    // Validate enum schemas
    if (currentSchemaData.type === "enum" && schemaMode === "BUILD") {
      if (!currentSchemaData.enum || currentSchemaData.enum.length === 0) {
        errors.enum = "Enum schema must have at least one value"
      }
    }
    
    // Validate composition schemas
    if (schemaMode === "COMPOSITE") {
      if (!currentSchemaData.compositionSchemas || currentSchemaData.compositionSchemas.length === 0) {
        errors.compositionSchemas = "At least one schema must be selected for composition"
      }
    }
    
    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }, [currentSchemaData, schemaMode])
  
  const handleAddProperty = useCallback(() => {
    // Validate current property
    if (!currentProperty.name.trim()) {
      setValidationErrors({ propertyName: "Property name is required" })
      return
    }
    
    // Check for duplicate property names
    const existingProperty = currentSchemaData.properties.find(prop => prop.name === currentProperty.name.trim())
    if (existingProperty && editingPropertyIndex === null) {
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
    
    // Add or update property to schema data
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
    
    let updatedProperties
    if (editingPropertyIndex !== null) {
      // Update existing property
      updatedProperties = [...currentSchemaData.properties]
      updatedProperties[editingPropertyIndex] = newProperty
    } else {
      // Add new property
      updatedProperties = [...currentSchemaData.properties, newProperty]
    }
    
    setCurrentSchemaData({
      ...currentSchemaData,
      properties: updatedProperties
    })
    
    // Reset form
    setCurrentProperty(getDefaultPropertyData())
    setEditingPropertyIndex(null)
  }, [currentProperty, currentSchemaData, editingPropertyIndex])

  const handleAddEnumValue = useCallback(() => {
    // Validate current enum value
    if (!currentEnumValue.value.trim()) {
      setValidationErrors({ enumValue: "Enum value is required" })
      return
    }
    
    // Check for duplicate enum values
    const existingValue = currentSchemaData.enum.find(enumItem => {
      const currentValue = (currentSchemaData.enumType === "number" || currentSchemaData.enumType === "integer") ? parseFloat(currentEnumValue.value) : currentEnumValue.value.trim()
      return enumItem === currentValue
    })
    if (existingValue && editingEnumIndex === null) {
      setValidationErrors({ enumValue: "Enum value already exists" })
      return
    }
    
    // Clear any previous enum validation errors
    setValidationErrors(prev => ({ ...prev, enumValue: undefined }))
    
    // Add or update enum value to schema data
    const newValue = (currentSchemaData.enumType === "number" || currentSchemaData.enumType === "integer") ? parseFloat(currentEnumValue.value) : currentEnumValue.value.trim()
    
    let updatedEnum
    if (editingEnumIndex !== null) {
      // Update existing enum value
      updatedEnum = [...currentSchemaData.enum]
      updatedEnum[editingEnumIndex] = newValue
    } else {
      // Add new enum value
      updatedEnum = [...currentSchemaData.enum, newValue]
    }
    
    setCurrentSchemaData({
      ...currentSchemaData,
      enum: updatedEnum
    })
    
    // Reset form
    setCurrentEnumValue(getDefaultEnumValueData())
    setEditingEnumIndex(null)
  }, [currentEnumValue, currentSchemaData, editingEnumIndex])

  const handleUpdateSchema = useCallback(() => {
    if (!validateForm()) {
      return
    }
    
    // Set default values for array types
    let processedSchemaData = { ...currentSchemaData }
    
    // If schema is array type, set default to empty array
    if (processedSchemaData.type === "array") {
      processedSchemaData.default = []
    }
    
    onUpdateSchema(processedSchemaData, schemaMode)
    closeDialog()
  }, [currentSchemaData, schemaMode, validateForm, onUpdateSchema, closeDialog])

  const handleEditProperty = useCallback((index) => {
    const property = currentSchemaData.properties[index]
    setCurrentProperty({
      name: property.name,
      type: property.type || "string",
      required: property.required,
      description: property.description,
      format: property.format,
      itemsType: property.itemsType || "string",
      itemsFormat: property.itemsFormat || "",
      contentMediaType: property.contentMediaType || "",
      contentSchema: property.contentSchema || "",
      isComposition: property.isComposition || false,
      compositionType: property.compositionType || "anyOf",
      compositionSchemas: property.compositionSchemas || []
    })
    setEditingPropertyIndex(index)
  }, [currentSchemaData.properties])

  const handleEditEnumValue = useCallback((index) => {
    const enumValue = currentSchemaData.enum[index]
    setCurrentEnumValue({
      value: typeof enumValue === 'number' ? enumValue.toString() : enumValue
    })
    setEditingEnumIndex(index)
  }, [currentSchemaData.enum])

  const handleCancelEdit = useCallback(() => {
    setCurrentProperty(getDefaultPropertyData())
    setCurrentEnumValue(getDefaultEnumValueData())
    setEditingPropertyIndex(null)
    setEditingEnumIndex(null)
  }, [])

  // Determine if schema type should be locked
  const isSchemaTypeLocked = currentSchemaData.type === "object" || 
                            currentSchemaData.type === "array" || 
                            currentSchemaData.type === "enum" ||
                            currentSchemaData.anyOf || 
                            currentSchemaData.oneOf || 
                            currentSchemaData.allOf

  // Determine if mode switcher should be hidden
  const hideModeSwitcher = currentSchemaData.anyOf || 
                          currentSchemaData.oneOf || 
                          currentSchemaData.allOf

  
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
              <h3>Edit Schema: {schemaName}</h3>
              <button type="button" className="close-modal" onClick={closeDialog}>
                {CloseIcon ? <CloseIcon /> : "✕"}
              </button>
            </div>
            <div className="modal-ux-content">
              {/* Section 1: Basic Info */}
              <div className="form-section">
                <div style={{ display: 'flex', gap: '15px', marginBottom: '12px' }}>
                  <div className="form-field" style={{ flex: 1 }}>
                    <label className="form-label" htmlFor="schema-description">Description</label>
                    <input 
                      className="form-input" 
                      id="schema-description" 
                      type="text" 
                      value={currentSchemaData.description} 
                      onChange={(e) => setCurrentSchemaData({...currentSchemaData, description: e.target.value})}
                    />
                  </div>
                </div>
              </div>

              {/* COMPOSITE Mode Content */}
              {schemaMode === "COMPOSITE" && (
                <div className="form-section">
                  <h4>Composition</h4>
                  <div className="form-field">
                    <label className="form-label" htmlFor="composition-type">Composition Type</label>
                    <select 
                      className="form-input" 
                      id="composition-type" 
                      value={currentSchemaData.compositionType} 
                      onChange={(e) => setCurrentSchemaData({...currentSchemaData, compositionType: e.target.value})}
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
                        {currentSchemaData.compositionSchemas.map((schema, index) => (
                          <div key={index} className="selected-schema">
                            {schema}
                            <button 
                              type="button" 
                              onClick={() => setCurrentSchemaData({
                                ...currentSchemaData, 
                                compositionSchemas: currentSchemaData.compositionSchemas.filter((_, i) => i !== index)
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
                          if (value && !currentSchemaData.compositionSchemas.includes(value)) {
                            setCurrentSchemaData({
                              ...currentSchemaData, 
                              compositionSchemas: [...currentSchemaData.compositionSchemas, value]
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
              {currentSchemaData.type === "object" && schemaMode === "BUILD" && (
                <div className="form-section">
                  <h4>Properties</h4>
                  
                  {/* Added Properties List (Read-only) */}
                  {currentSchemaData.properties.length > 0 && (
                    <div className="added-properties">
                      <h5>Added Properties:</h5>
                      {currentSchemaData.properties.map((property, index) => (
                        <PropertyCard
                          key={index}
                          property={property}
                          index={index}
                          onRemove={(index) => {
                            const newProperties = currentSchemaData.properties.filter((_, i) => i !== index)
                            setCurrentSchemaData({...currentSchemaData, properties: newProperties})
                          }}
                          onEdit={handleEditProperty}
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
                      <h5 style={{ margin: 0 }}>
                        {editingPropertyIndex !== null ? 'Edit Property:' : 'Add New Property:'}
                      </h5>
                      <label style={checkboxLabelStyle}>
                        <input 
                          disabled
                          type="checkbox" 
                          checked={currentProperty.isComposition} 
                          onChange={(e) => setCurrentProperty({
                            ...currentProperty, 
                            isComposition: e.target.checked,
                            format: e.target.checked ? "" : currentProperty.format
                          })}
                          style={checkboxInputStyle}
                        />
                        Is Composition
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
                          disabled={currentProperty.isComposition || editingPropertyIndex !== null}
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
                    
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button 
                        type="button" 
                        className="btn btn-primary" 
                        onClick={handleAddProperty}
                      >
                        {editingPropertyIndex !== null ? 'Update Property' : 'Add Property'}
                      </button>
                      {editingPropertyIndex !== null && (
                        <button 
                          type="button" 
                          className="btn btn-secondary" 
                          onClick={handleCancelEdit}
                        >
                          Cancel Edit
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Section 3: Array Items (for array type) */}
              {currentSchemaData.type === "array" && schemaMode === "BUILD" && (
                <div className="form-section">
                  <h4>Array Items</h4>
                  
                  <div className="form-field">
                    <label className="form-label">Items Type <span className="required">*</span></label>
                    <SearchableSelect
                      value={currentSchemaData.itemsType}
                      onChange={(value) => setCurrentSchemaData({...currentSchemaData, itemsType: value})}
                      placeholder="Select items type..."
                      searchValue={itemsTypeSearch}
                      onSearchChange={setItemsTypeSearch}
                      isOpen={itemsDropdownOpen}
                      onToggle={setItemsDropdownOpen}
                      displayValue={currentSchemaData.itemsType.includes(refPrefix) 
                        ? safeExtractSchemaName(currentSchemaData.itemsType) 
                        : currentSchemaData.itemsType}
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
              {currentSchemaData.type === "enum" && schemaMode === "BUILD" && (
                <div className="form-section">
                  <h4>Enum Values</h4>
                  
                  {/* Enum Type and Format Selection */}
                  <div style={{ display: 'flex', gap: '15px', marginBottom: '20px' }}>
                    <div className="form-field" style={{ flex: 1 }}>
                      <label className="form-label">Enum Type <span className="required">*</span></label>
                      <select 
                        className="form-input" 
                        value={currentSchemaData.enumType} 
                        disabled={true}
                        style={{ backgroundColor: '#f5f5f5', cursor: 'not-allowed' }}
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
                        value={currentSchemaData.enumFormat} 
                        onChange={(e) => setCurrentSchemaData({...currentSchemaData, enumFormat: e.target.value})}
                      >
                        <option value="">None</option>
                        {currentSchemaData.enumType === "string" && (
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
                        {(currentSchemaData.enumType === "number" || currentSchemaData.enumType === "integer") && (
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
                  {currentSchemaData.enum.length > 0 && (
                    <div className="added-enum-values">
                      <h5>Added Enum Values:</h5>
                      {currentSchemaData.enum.map((enumItem, index) => (
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
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button 
                              type="button" 
                              className="btn btn-secondary btn-sm" 
                              onClick={() => handleEditEnumValue(index)}
                            >
                              Edit
                            </button>
                            <button 
                              type="button" 
                              className="btn btn-danger btn-sm" 
                              onClick={() => {
                                const newEnum = currentSchemaData.enum.filter((_, i) => i !== index)
                                setCurrentSchemaData({...currentSchemaData, enum: newEnum})
                              }}
                            >
                              Remove
                            </button>
                          </div>
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
                    <h5>
                      {editingEnumIndex !== null ? 'Edit Enum Value:' : 'Add New Enum Value:'}
                    </h5>
                    
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
                    
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button 
                        type="button" 
                        className="btn btn-primary" 
                        onClick={handleAddEnumValue}
                      >
                        {editingEnumIndex !== null ? 'Update Enum Value' : 'Add Enum Value'}
                      </button>
                      {editingEnumIndex !== null && (
                        <button 
                          type="button" 
                          className="btn btn-secondary" 
                          onClick={handleCancelEdit}
                        >
                          Cancel Edit
                        </button>
                      )}
                    </div>
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
                        checked={currentSchemaData.nullable} 
                        onChange={(e) => setCurrentSchemaData({...currentSchemaData, nullable: e.target.checked})}
                        style={checkboxInputStyle}
                      />
                      Nullable (value can be null)
                    </label>
                    
                    <label style={checkboxLabelStyle}>
                      <input 
                        type="checkbox" 
                        checked={currentSchemaData.deprecated} 
                        onChange={(e) => setCurrentSchemaData({...currentSchemaData, deprecated: e.target.checked})}
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
                <Button className="btn modal-btn" onClick={handleUpdateSchema}>Update Schema</Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

SchemaEditDialog.propTypes = {
  showDialog: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onUpdateSchema: PropTypes.func.isRequired,
  schemas: PropTypes.object.isRequired,
  getComponent: PropTypes.func.isRequired,
  schemaName: PropTypes.string.isRequired,
  schemaData: PropTypes.object.isRequired,
}

export default SchemaEditDialog

