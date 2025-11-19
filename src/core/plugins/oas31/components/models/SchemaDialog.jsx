/**
 * @prettier
 */
import React, { useCallback, useState, useEffect } from "react"
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
  emptyPrimitiveOptions,
  getSchemaOptionsWithRef,
  getSchemaOptionsWithoutRef,
  contentMediaTypeOptions
} from "./schemaDialogUtils"
import {
  FormatSelect,
  CompositionTypeSelect,
  SelectedSchemasList
} from "./SchemaDialogComponents"

const SchemaDialog = ({
  showDialog,
  onClose,
  onAddSchema,
  onUpdateSchema,
  schemas,
  getComponent,
  initialData = null,
  sourceSchemaName = null,
  schemaName: schemaNameProp = null,
  schemaData: schemaDataProp = null
}) => {
  // Determine mode: edit mode if schemaName and schemaData are provided as props, and onUpdateSchema exists
  const isEditMode = !!(schemaNameProp && schemaDataProp && onUpdateSchema)
  
  // Schema name: state in add mode, prop in edit mode
  const [schemaNameState, setSchemaNameState] = useState("")
  const schemaName = isEditMode ? schemaNameProp : schemaNameState
  
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
  
  // Edit states (only used in edit mode)
  const [editingPropertyIndex, setEditingPropertyIndex] = useState(null)
  const [editingEnumIndex, setEditingEnumIndex] = useState(null)
  
  // Helper to check if current schema is a composition type
  const isCompositionType = schemaData.type === "composition"
  
  // Helper functions to get schema options with/without ref prefix, excluding current schema (only in edit mode)
  const getSchemaOptionsWithRefHelper = useCallback((searchTerm) => {
    return getSchemaOptionsWithRef(searchTerm, schemas, isEditMode ? schemaName : null)
  }, [schemas, schemaName, isEditMode])
  
  const getSchemaOptionsWithoutRefHelper = useCallback((searchTerm) => {
    return getSchemaOptionsWithoutRef(searchTerm, schemas, isEditMode ? schemaName : null)
  }, [schemas, schemaName, isEditMode])
  
  // Effect to populate form when initialData (add mode) or schemaData (edit mode) is provided
  useEffect(() => {
    const dataToUse = isEditMode ? schemaDataProp : initialData
    if (dataToUse && showDialog) {
      try {
        const parsedData = parseSchemaToDialogFormat(dataToUse)
        
        // Set type to "composition" if schema has composition keywords
        const hasComposition = dataToUse.anyOf || dataToUse.oneOf || dataToUse.allOf
        if (hasComposition) {
          parsedData.type = "composition"
        }
        
        setSchemaData(parsedData)
        
        // Clear schema name for new schema (add mode only)
        if (!isEditMode) {
          setSchemaNameState("")
        }
        
        // Clear validation errors
        setValidationErrors({})
      } catch (error) {
        console.error('Error populating form with schema data:', error)
        // Reset to default state on error
        setSchemaData(getDefaultSchemaData())
        if (!isEditMode) {
          setSchemaNameState("")
        }
        setValidationErrors({})
      }
    }
  }, [initialData, schemaDataProp, showDialog, isEditMode])
  


  const resetForm = useCallback(() => {
    if (!isEditMode) {
      setSchemaNameState("")
    }
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
    setEditingPropertyIndex(null)
    setEditingEnumIndex(null)
  }, [isEditMode])

  const closeDialog = useCallback(() => {
    resetForm()
    onClose()
  }, [resetForm, onClose])
  
  const validateForm = useCallback(() => {
    const errors = {}
    
    // Validate schema name (only in add mode)
    if (!isEditMode) {
      if (!schemaName.trim()) {
        errors.schemaName = "Schema name is required"
      } else if (schemas[schemaName.trim()]) {
        errors.schemaName = "Schema name already exists"
      }
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
    if (schemaData.type === "enum" && !isCompositionType) {
      if (!schemaData.enum || schemaData.enum.length === 0) {
        errors.enum = "Enum schema must have at least one value"
      }
    }
    
    // Validate composition schemas
    if (isCompositionType) {
      if (!schemaData.compositionSchemas || schemaData.compositionSchemas.length === 0) {
        errors.compositionSchemas = "At least one schema must be selected for composition"
      }
    }
    
    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }, [schemaName, schemaData, schemas, isCompositionType, isEditMode])
  
  const handleAddProperty = useCallback(() => {
    // Validate current property
    if (!currentProperty.name.trim()) {
      setValidationErrors({ propertyName: "Property name is required" })
      return
    }
    
    // Check for duplicate property names
    const existingProperty = schemaData.properties.find(prop => prop.name === currentProperty.name.trim())
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
      updatedProperties = [...schemaData.properties]
      updatedProperties[editingPropertyIndex] = newProperty
    } else {
      // Add new property
      updatedProperties = [...schemaData.properties, newProperty]
    }
    
    setSchemaData({
      ...schemaData,
      properties: updatedProperties
    })
    
    // Reset form
    setCurrentProperty(getDefaultPropertyData())
    setEditingPropertyIndex(null)
  }, [currentProperty, schemaData, editingPropertyIndex])

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
    if (existingValue && editingEnumIndex === null) {
      setValidationErrors({ enumValue: "Enum value already exists" })
      return
    }
    
    // Clear any previous enum validation errors
    setValidationErrors(prev => ({ ...prev, enumValue: undefined }))
    
    // Add or update enum value to schema data
    const newValue = (schemaData.enumType === "number" || schemaData.enumType === "integer") ? parseFloat(currentEnumValue.value) : currentEnumValue.value.trim()
    
    let updatedEnum
    if (editingEnumIndex !== null) {
      // Update existing enum value
      updatedEnum = [...schemaData.enum]
      updatedEnum[editingEnumIndex] = newValue
    } else {
      // Add new enum value
      updatedEnum = [...schemaData.enum, newValue]
    }
    
    setSchemaData({
      ...schemaData,
      enum: updatedEnum
    })
    
    // Reset form
    setCurrentEnumValue(getDefaultEnumValueData())
    setEditingEnumIndex(null)
  }, [currentEnumValue, schemaData, editingEnumIndex])

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
    
    // Derive schemaMode from type for backward compatibility with handlers
    const schemaMode = processedSchemaData.type === "composition" ? "COMPOSITE" : "BUILD"
    onAddSchema(schemaName.trim(), processedSchemaData, schemaMode)
    closeDialog()
  }, [schemaName, schemaData, validateForm, onAddSchema, closeDialog])

  const handleUpdateSchema = useCallback(() => {
    if (!validateForm()) {
      return
    }
    
    // Set default values for array types
    let processedSchemaData = { ...schemaData }
    
    // If schema is array type, set default to empty array
    if (processedSchemaData.type === "array") {
      processedSchemaData.default = []
    }
    
    // Derive schemaMode from type for backward compatibility with handlers
    const schemaMode = processedSchemaData.type === "composition" ? "COMPOSITE" : "BUILD"
    onUpdateSchema(processedSchemaData, schemaMode)
    closeDialog()
  }, [schemaData, validateForm, onUpdateSchema, closeDialog])

  const handleEditProperty = useCallback((index) => {
    const property = schemaData.properties[index]
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
  }, [schemaData.properties])

  const handleEditEnumValue = useCallback((index) => {
    const enumValue = schemaData.enum[index]
    setCurrentEnumValue({
      value: typeof enumValue === 'number' ? enumValue.toString() : enumValue
    })
    setEditingEnumIndex(index)
  }, [schemaData.enum])

  const handleCancelEdit = useCallback(() => {
    setCurrentProperty(getDefaultPropertyData())
    setCurrentEnumValue(getDefaultEnumValueData())
    setEditingPropertyIndex(null)
    setEditingEnumIndex(null)
  }, [])

  
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
              <h3>
                {isEditMode 
                  ? `Edit Schema: ${schemaName}` 
                  : sourceSchemaName 
                    ? `Clone Schema from ${sourceSchemaName}` 
                    : "Add Schema"}
              </h3>
              <button type="button" className="close-modal" onClick={closeDialog}>
                {CloseIcon ? <CloseIcon /> : "✕"}
              </button>
            </div>
            <div className="modal-ux-content">
              {/* Section 1: Basic Info */}
              <div className="form-section">
                <div style={{ display: 'flex', gap: '15px', marginBottom: '12px' }}>
                  {/* Schema name input - only in add mode */}
                  {!isEditMode && (
                    <div className="form-field" style={{ flex: 1 }}>
                      <label className="form-label" htmlFor="schema-name">Schema Name (Key) <span className="required">*</span></label>
                      <input 
                        className="form-input" 
                        id="schema-name" 
                        type="text" 
                        value={schemaNameState} 
                        onChange={(e) => setSchemaNameState(e.target.value)}
                        placeholder="UserCreateRequest"
                      />
                      {validationErrors.schemaName && (
                        <div className="form-error">{validationErrors.schemaName}</div>
                      )}
                    </div>
                  )}
                  
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

              {/* Schema Construct Selection */}
              {(!isEditMode && !sourceSchemaName) && (
                <div className="form-section">
                  <h4>Schema Construct</h4>
                  <div className="form-field">
                    {/* <label className="form-label" htmlFor="schema-type">Schema Construct</label> */}
                    <select 
                      className="form-input" 
                      id="schema-type" 
                      value={schemaData.type} 
                      onChange={(e) => {
                        const newType = e.target.value
                        if (newType === "composition") {
                          // Initialize composition data when switching to composition
                          setSchemaData({
                            ...schemaData, 
                            type: newType,
                            compositionType: schemaData.compositionType || "anyOf",
                            compositionSchemas: schemaData.compositionSchemas || []
                          })
                        } else {
                          // Clear composition data when switching away from composition
                          setSchemaData({
                            ...schemaData, 
                            type: newType,
                            compositionType: "anyOf",
                            compositionSchemas: []
                          })
                        }
                      }}
                    >
                      <option value="object">Object</option>
                      <option value="array">Array</option>
                      <option value="enum">Enum</option>
                      <option value="composition">Composition</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Composition Content */}
              {isCompositionType && (
                <div className="form-section">
                  {(isEditMode || sourceSchemaName) && <h4>Composition</h4>}
                  <div className="form-field">
                    <label className="form-label" htmlFor="composition-type">Composition Type <span className="required">*</span></label>
                    <CompositionTypeSelect
                      id="composition-type"
                      value={schemaData.compositionType}
                      onChange={(e) => setSchemaData({...schemaData, compositionType: e.target.value})}
                    />
                  </div>
                  
                  <div className="form-field">
                    <label className="form-label">Member Schemas</label>
                    <div className="schema-selection">
                      <SelectedSchemasList
                        schemas={schemaData.compositionSchemas}
                        onRemove={(index) => setSchemaData({
                          ...schemaData, 
                          compositionSchemas: schemaData.compositionSchemas.filter((_, i) => i !== index)
                        })}
                      />
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
                        options={isEditMode 
                          ? getSchemaOptionsWithoutRefHelper(compositionSchemaSearch)
                          : getSchemaOptionsWithoutRef(compositionSchemaSearch, schemas)}
                      />
                    </div>
                    {validationErrors.compositionSchemas && (
                      <div className="form-error">{validationErrors.compositionSchemas}</div>
                    )}
                  </div>
                </div>
              )}

              {/* Section 2: Properties (for object type) */}
              {schemaData.type === "object" && !isCompositionType && (
                <div className="form-section">
                  <h4>Object Properties</h4>
                  
                  {/* Added Properties List (Read-only) */}
                  {schemaData.properties.length > 0 && (
                    <div className="added-properties">
                      {schemaData.properties.map((property, index) => (
                        <PropertyCard
                          key={index}
                          property={property}
                          index={index}
                          onRemove={(index) => {
                            const newProperties = schemaData.properties.filter((_, i) => i !== index)
                            setSchemaData({...schemaData, properties: newProperties})
                          }}
                          onEdit={isEditMode ? handleEditProperty : undefined}
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
                          disabled={editingPropertyIndex !== null}
                          type="checkbox" 
                          checked={currentProperty.isComposition} 
                          onChange={(e) => setCurrentProperty({
                            ...currentProperty, 
                            isComposition: e.target.checked,
                            format: e.target.checked ? "" : currentProperty.format
                          })}
                          style={checkboxInputStyle}
                        />
                        {isEditMode ? 'Is Composition' : 'Use Composition'}
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
                          options={isEditMode 
                            ? getSchemaOptionsWithRefHelper(propertyTypeSearch)
                            : getSchemaOptionsWithRef(propertyTypeSearch, schemas)}
                        />
                      </div>
                    </div>
                    
                    
                    {/* Composition Controls */}
                    {currentProperty.isComposition && (
                      <>
                        <div className="form-field" style={{ marginBottom: '12px' }}>
                          <label className="form-label">Composition Type <span className="required">*</span></label>
                          <CompositionTypeSelect
                            value={currentProperty.compositionType}
                            onChange={(e) => setCurrentProperty({...currentProperty, compositionType: e.target.value})}
                          />
                        </div>
                        
                        <div className="form-field">
                          <label className="form-label">Member Schemas/Types<span className="required">*</span></label>
                          <div className="schema-selection">
                            <SelectedSchemasList
                              schemas={currentProperty.compositionSchemas}
                              onRemove={(index) => setCurrentProperty({
                                ...currentProperty, 
                                compositionSchemas: currentProperty.compositionSchemas.filter((_, i) => i !== index)
                              })}
                            />
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
                              options={isEditMode 
                                ? getSchemaOptionsWithoutRefHelper(compositionSchemaSearch)
                                : getSchemaOptionsWithoutRef(compositionSchemaSearch, schemas)}
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
                              options={isEditMode 
                                ? getSchemaOptionsWithRefHelper(propertyItemsTypeSearch)
                                : getSchemaOptionsWithRef(propertyItemsTypeSearch, schemas)}
                          />
                        </div>
                        {currentProperty.itemsType && 
                         !currentProperty.itemsType.includes(refPrefix) && 
                         (currentProperty.itemsType === "string" || 
                          currentProperty.itemsType === "number" || 
                          currentProperty.itemsType === "integer") && (
                          <div className="form-field" style={{ marginBottom: '12px' }}>
                            <label className="form-label">Items Format</label>
                            <FormatSelect
                              type={currentProperty.itemsType}
                              value={currentProperty.itemsFormat}
                              onChange={(e) => setCurrentProperty({...currentProperty, itemsFormat: e.target.value})}
                              includeBinary={true}
                            />
                          </div>
                        )}
                      </>
                    )}
                    
                    {/* Content Media Type and Schema (only for string type) */}
                    {currentProperty.type === "string" && currentProperty.isComposition == false && !currentProperty.format && (
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
                            {contentMediaTypeOptions.map(option => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
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
                            disabled={!currentProperty.contentMediaType}
                            displayValue={currentProperty.contentSchema && currentProperty.contentSchema.includes(refPrefix) 
                              ? safeExtractSchemaName(currentProperty.contentSchema) 
                              : currentProperty.contentSchema || ""}
                            primitiveOptions={emptyPrimitiveOptions}
                            options={isEditMode 
                              ? getSchemaOptionsWithRefHelper(contentSchemaSearch)
                              : getSchemaOptionsWithRef(contentSchemaSearch, schemas)}
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
                          <FormatSelect
                            type={currentProperty.type}
                            value={currentProperty.format}
                            onChange={(e) => setCurrentProperty({
                              ...currentProperty, 
                              format: e.target.value,
                              contentMediaType: "", // Clear contentMediaType when format is set
                              contentSchema: "" // Clear contentSchema when format is set
                            })}
                            includeBinary={true}
                          />
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
                    
                    <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                      {editingPropertyIndex !== null && (
                        <button 
                          type="button" 
                          className="btn btn-secondary" 
                          onClick={handleCancelEdit}
                        >
                          Cancel Edit
                        </button>
                      )}
                      <button 
                        type="button" 
                        className="btn btn-primary" 
                        onClick={handleAddProperty}
                      >
                        {editingPropertyIndex !== null ? 'Update Property' : 'Add Property'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Section 3: Array Items (for array type) */}
              {schemaData.type === "array" && !isCompositionType && (
                <div className="form-section">
                  {(isEditMode || sourceSchemaName) && <h4>Array</h4>}
                  
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
                      options={isEditMode 
                        ? getSchemaOptionsWithRefHelper(itemsTypeSearch)
                        : getSchemaOptionsWithRef(itemsTypeSearch, schemas)}
                    />
                  </div>
                </div>
              )}

              {/* Section 4: Enum Values (for enum type) */}
              {schemaData.type === "enum" && !isCompositionType && (
                <div className="form-section">
                  {(isEditMode || sourceSchemaName) && <h4>Enum</h4>}
                  
                  {/* Enum Type and Format Selection */}
                  <div style={{ display: 'flex', gap: '15px', marginBottom: '20px' }}>
                    <div className="form-field" style={{ flex: 1 }}>
                      <label className="form-label">Enum Type <span className="required">*</span></label>
                      <select 
                        className="form-input" 
                        value={schemaData.enumType} 
                        onChange={(e) => setSchemaData({...schemaData, enumType: e.target.value, enumFormat: ""})}
                        disabled={isEditMode || sourceSchemaName}
                        style={isEditMode || sourceSchemaName ? { backgroundColor: '#f5f5f5', cursor: 'not-allowed' } : {}}
                      >
                        <option value="string">String</option>
                        <option value="number">Number</option>
                        <option value="integer">Integer</option>
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
                          <div style={{ display: 'flex', gap: '8px' }}>
                            {isEditMode && (
                              <button 
                                type="button" 
                                className="btn btn-secondary btn-sm" 
                                onClick={() => handleEditEnumValue(index)}
                              >
                                Edit
                              </button>
                            )}
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
                <Button 
                  className="btn modal-btn authorize" 
                  onClick={isEditMode ? handleUpdateSchema : handleAddSchema}
                >
                  {isEditMode ? 'Update Schema' : 'Add Schema'}
                </Button>
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
  onAddSchema: PropTypes.func,
  onUpdateSchema: PropTypes.func,
  schemas: PropTypes.object.isRequired,
  getComponent: PropTypes.func.isRequired,
  initialData: PropTypes.object,
  sourceSchemaName: PropTypes.string,
  schemaName: PropTypes.string,
  schemaData: PropTypes.object,
}

export default SchemaDialog
