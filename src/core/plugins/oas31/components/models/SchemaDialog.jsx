/**
 * @prettier
 */
import React, { useCallback, useState, useEffect } from "react"
import PropTypes from "prop-types"
import SearchableSelect from "./SearchableSelect"
import PropertyForm from "./PropertyForm"
import { 
  safeExtractSchemaName,
  getSchemaTitleFromRef,
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
  SelectedSchemasList,
  SelectedPropertiesList,
  SelectedEnumValuesList
} from "./SchemaDialogComponents"
import { checkboxLabelStyle, checkboxInputStyle } from "core/utils/form-styles"

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
  
  // Show property form state
  const [showPropertyForm, setShowPropertyForm] = useState(false)
  
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
    setShowPropertyForm(false)
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
    setShowPropertyForm(false)
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
    // if (processedSchemaData.type === "array") {
    //   processedSchemaData.default = []
    // }
    
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
    // if (processedSchemaData.type === "array") {
    //   processedSchemaData.default = []
    // }
    
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
    setShowPropertyForm(true)
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
    setShowPropertyForm(false)
  }, [])

  const handleCancelAdd = useCallback(() => {
    setShowPropertyForm(false)
  }, [])

  
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
                  ? `Edit Schema: ${schemaDataProp?.title || schemaName}` 
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
                        schemasObject={schemas}
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
                  <h4>Properties</h4>
                  
                  {/* Added Properties List (Read-only) */}
                  {schemaData.properties.length > 0 && (
                    <div className="schema-selection">
                      <SelectedPropertiesList
                        properties={schemaData.properties}
                        onRemove={(index) => {
                          const newProperties = schemaData.properties.filter((_, i) => i !== index)
                          setSchemaData({...schemaData, properties: newProperties})
                        }}
                        onEdit={isEditMode ? handleEditProperty : undefined}
                        isEditMode={isEditMode}
                        safeExtractSchemaName={safeExtractSchemaName}
                        schemas={schemas}
                      />
                    </div>
                  )}
                  
                  {/* New Property Button - shown when form is hidden */}
                  {!(showPropertyForm || editingPropertyIndex !== null) && (
                    <div style={{ marginTop: '20px' }}>
                      <button 
                        type="button" 
                        className="btn btn-primary" 
                        onClick={() => {
                          setShowPropertyForm(true)
                          setCurrentProperty(getDefaultPropertyData())
                        }}
                      >
                        New Property
                      </button>
                    </div>
                  )}
                  
                  {/* Add Property Form - shown when adding or editing */}
                  {(showPropertyForm || editingPropertyIndex !== null) && (
                    <PropertyForm
                      currentProperty={currentProperty}
                      setCurrentProperty={setCurrentProperty}
                      editingPropertyIndex={editingPropertyIndex}
                      validationErrors={validationErrors}
                      propertyTypeSearch={propertyTypeSearch}
                      setPropertyTypeSearch={setPropertyTypeSearch}
                      propertyItemsTypeSearch={propertyItemsTypeSearch}
                      setPropertyItemsTypeSearch={setPropertyItemsTypeSearch}
                      compositionSchemaSearch={compositionSchemaSearch}
                      setCompositionSchemaSearch={setCompositionSchemaSearch}
                      contentSchemaSearch={contentSchemaSearch}
                      setContentSchemaSearch={setContentSchemaSearch}
                      propertyDropdownOpen={propertyDropdownOpen}
                      setPropertyDropdownOpen={setPropertyDropdownOpen}
                      propertyItemsDropdownOpen={propertyItemsDropdownOpen}
                      setPropertyItemsDropdownOpen={setPropertyItemsDropdownOpen}
                      compositionDropdownOpen={compositionDropdownOpen}
                      setCompositionDropdownOpen={setCompositionDropdownOpen}
                      contentSchemaDropdownOpen={contentSchemaDropdownOpen}
                      setContentSchemaDropdownOpen={setContentSchemaDropdownOpen}
                      isEditMode={isEditMode}
                      schemas={schemas}
                      getSchemaOptionsWithRefHelper={getSchemaOptionsWithRefHelper}
                      getSchemaOptionsWithoutRefHelper={getSchemaOptionsWithoutRefHelper}
                      getSchemaOptionsWithRef={getSchemaOptionsWithRef}
                      getSchemaOptionsWithoutRef={getSchemaOptionsWithoutRef}
                      handleAddProperty={handleAddProperty}
                      handleCancelEdit={handleCancelEdit}
                      handleCancelAdd={handleCancelAdd}
                      checkboxLabelStyle={checkboxLabelStyle}
                      checkboxInputStyle={checkboxInputStyle}
                    />
                  )}
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
                        ? getSchemaTitleFromRef(schemaData.itemsType, schemas) 
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
                    <div className="schema-selection">
                      <SelectedEnumValuesList
                        enumValues={schemaData.enum}
                        enumType={schemaData.enumType}
                        onRemove={(index) => {
                          const newEnum = schemaData.enum.filter((_, i) => i !== index)
                          setSchemaData({...schemaData, enum: newEnum})
                        }}
                        onEdit={isEditMode ? handleEditEnumValue : undefined}
                        isEditMode={isEditMode}
                      />
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
                <h4>Statuses</h4>
                
                <div className="form-field">
                  <div style={{ display: 'flex', flexDirection: 'row', gap: '12px' }}>
                    <label style={checkboxLabelStyle}>
                      <input 
                        type="checkbox" 
                        checked={schemaData.nullable} 
                        onChange={(e) => setSchemaData({...schemaData, nullable: e.target.checked})}
                        style={checkboxInputStyle}
                      />
                      Nullable
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
