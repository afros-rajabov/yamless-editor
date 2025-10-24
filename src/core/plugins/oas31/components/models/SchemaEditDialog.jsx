/**
 * @prettier
 */
import React, { useCallback, useState, useRef, useEffect } from "react"
import PropTypes from "prop-types"
import SearchableSelect from "./SearchableSelect"
import PropertyCard from "./PropertyCard"

const refPrefix = "#/components/schemas/"

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
  const [currentSchemaData, setCurrentSchemaData] = useState({
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
    compositionSchemas: [],
    enumType: "string",
    enumFormat: ""
  })
  const [validationErrors, setValidationErrors] = useState({})
  const [currentProperty, setCurrentProperty] = useState({
    name: "",
    type: "string",
    required: false,
    description: "",
    format: "",
    itemsType: "string",
    isComposition: false,
    compositionType: "anyOf",
    compositionSchemas: []
  })
  const [currentEnumValue, setCurrentEnumValue] = useState({
    value: ""
  })
  
  // Search filters for schema dropdowns
  const [propertyTypeSearch, setPropertyTypeSearch] = useState("")
  const [itemsTypeSearch, setItemsTypeSearch] = useState("")
  const [compositionSchemaSearch, setCompositionSchemaSearch] = useState("")
  const [propertyItemsTypeSearch, setPropertyItemsTypeSearch] = useState("")
  
  // Dropdown open states
  const [propertyDropdownOpen, setPropertyDropdownOpen] = useState(false)
  const [itemsDropdownOpen, setItemsDropdownOpen] = useState(false)
  const [compositionDropdownOpen, setCompositionDropdownOpen] = useState(false)
  const [propertyItemsDropdownOpen, setPropertyItemsDropdownOpen] = useState(false)
  
  // Edit states
  const [editingPropertyIndex, setEditingPropertyIndex] = useState(null)
  const [editingEnumIndex, setEditingEnumIndex] = useState(null)
  
  // Safe helper function to extract schema name from reference
  const safeExtractSchemaName = useCallback((ref) => {
    try {
      if (!ref || typeof ref !== 'string') {
        return ref || ''
      }
      // Extract schema name from the end of the reference
      const parts = ref.split('/')
      return parts[parts.length - 1] || ''
    } catch (e) {
      console.warn('Error extracting schema name from reference:', ref, e)
      return ''
    }
  }, [])
  
  // Helper function to parse raw schema into dialog format
  const parseSchemaToDialogFormat = useCallback((rawSchema) => {
    try {
      if (!rawSchema || typeof rawSchema !== 'object') {
        return {
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
        }
      }
    
    const parsed = {
      type: rawSchema.type || "object",
      title: rawSchema.title || "",
      description: rawSchema.description || "",
      example: rawSchema.example || "",
      properties: [],
      required: rawSchema.required || [],
      items: null,
      itemsType: "string",
      itemsRef: "",
      minItems: rawSchema.minItems || null,
      maxItems: rawSchema.maxItems || null,
      uniqueItems: rawSchema.uniqueItems || false,
      minLength: rawSchema.minLength || null,
      maxLength: rawSchema.maxLength || null,
      pattern: rawSchema.pattern || "",
      format: rawSchema.format || "",
      minimum: rawSchema.minimum || null,
      maximum: rawSchema.maximum || null,
      exclusiveMinimum: rawSchema.exclusiveMinimum || false,
      exclusiveMaximum: rawSchema.exclusiveMaximum || false,
      multipleOf: rawSchema.multipleOf || null,
      minProperties: rawSchema.minProperties || null,
      maxProperties: rawSchema.maxProperties || null,
      enum: rawSchema.enum || [],
      const: rawSchema.const || null,
      default: rawSchema.default || null,
      examples: rawSchema.examples || [],
      allOf: [],
      anyOf: [],
      oneOf: [],
      not: null,
      readOnly: rawSchema.readOnly || false,
      writeOnly: rawSchema.writeOnly || false,
      deprecated: rawSchema.deprecated || false,
      nullable: rawSchema.nullable || false,
      compositionType: "anyOf",
      compositionSchemas: [],
      enumType: "string",
      enumFormat: ""
    }
    
    // Handle composition schemas
    if (rawSchema.anyOf || rawSchema.oneOf || rawSchema.allOf) {
      if (rawSchema.anyOf && Array.isArray(rawSchema.anyOf)) {
        parsed.compositionType = "anyOf"
        parsed.anyOf = rawSchema.anyOf
        parsed.compositionSchemas = rawSchema.anyOf
          .filter(item => item && (item.$ref || item.$$ref) && typeof (item.$ref || item.$$ref) === 'string')
          .map(item => safeExtractSchemaName(item.$ref || item.$$ref))
          .filter(schemaName => schemaName) // Remove empty strings from invalid references
      } else if (rawSchema.oneOf && Array.isArray(rawSchema.oneOf)) {
        parsed.compositionType = "oneOf"
        parsed.oneOf = rawSchema.oneOf
        parsed.compositionSchemas = rawSchema.oneOf
          .filter(item => item && (item.$ref || item.$$ref) && typeof (item.$ref || item.$$ref) === 'string')
          .map(item => safeExtractSchemaName(item.$ref || item.$$ref))
          .filter(schemaName => schemaName) // Remove empty strings from invalid references
      } else if (rawSchema.allOf && Array.isArray(rawSchema.allOf)) {
        parsed.compositionType = "allOf"
        parsed.allOf = rawSchema.allOf
        parsed.compositionSchemas = rawSchema.allOf
          .filter(item => item && (item.$ref || item.$$ref) && typeof (item.$ref || item.$$ref) === 'string')
          .map(item => safeExtractSchemaName(item.$ref || item.$$ref))
          .filter(schemaName => schemaName) // Remove empty strings from invalid references
      }
    }
    
    // Handle object properties
    if (rawSchema.properties && typeof rawSchema.properties === 'object') {
      parsed.properties = Object.entries(rawSchema.properties).map(([propName, propSchema]) => {
        const property = {
          name: propName,
          required: rawSchema.required?.includes(propName) || false,
          description: propSchema.description || "",
          format: propSchema.format || "",
          itemsType: "string"
        }
        
        // Check if property is a composition
        if (propSchema.anyOf || propSchema.oneOf || propSchema.allOf) {
          property.isComposition = true
          if (propSchema.anyOf && Array.isArray(propSchema.anyOf)) {
            property.compositionType = "anyOf"
            property.anyOf = propSchema.anyOf
            property.compositionSchemas = propSchema.anyOf
              .filter(item => item && (item.$ref || item.$$ref) && typeof (item.$ref || item.$$ref) === 'string')
              .map(item => {
                const ref = item.$ref || item.$$ref
                const extracted = safeExtractSchemaName(ref)
                return extracted
              })
              .filter(schemaName => schemaName) // Remove empty strings from invalid references
          } else if (propSchema.oneOf && Array.isArray(propSchema.oneOf)) {
            property.compositionType = "oneOf"
            property.oneOf = propSchema.oneOf
            property.compositionSchemas = propSchema.oneOf
              .filter(item => item && (item.$ref || item.$$ref) && typeof (item.$ref || item.$$ref) === 'string')
              .map(item => safeExtractSchemaName(item.$ref || item.$$ref))
              .filter(schemaName => schemaName) // Remove empty strings from invalid references
          } else if (propSchema.allOf && Array.isArray(propSchema.allOf)) {
            property.compositionType = "allOf"
            property.allOf = propSchema.allOf
            property.compositionSchemas = propSchema.allOf
              .filter(item => item && (item.$ref || item.$$ref) && typeof (item.$ref || item.$$ref) === 'string')
              .map(item => safeExtractSchemaName(item.$ref || item.$$ref))
              .filter(schemaName => schemaName) // Remove empty strings from invalid references
          }
        } else {
          const ref = propSchema.$ref || propSchema.$$ref
          // Handle direct schema reference
          if (ref) {
            property.type = ref
          } else {
            property.type = propSchema.type || "string"
          }
        }
        
        // Handle array items
        if (propSchema.type === "array" && propSchema.items) {
          const ref = propSchema.items.$ref || propSchema.items.$$ref
          // Handle direct schema reference
          if (ref) {
            property.itemsType = ref
          } else {
            property.itemsType = propSchema.items.type || "string"
          }
        }
        
        return property
      })
    }
    
    // Handle array items
    if (rawSchema.type === "array" && rawSchema.items) {
      const ref = rawSchema.items.$ref || rawSchema.items.$$ref
      if (ref) {
        parsed.itemsType = `${refPrefix}${ref.split(refPrefix)[1]}`
      } else {
        parsed.itemsType = rawSchema.items.type || "string"
      }
    }
    
    // Handle enum schemas - detect by presence of enum array
    if (rawSchema.enum && Array.isArray(rawSchema.enum) && rawSchema.enum.length > 0) {
      // Set type to enum for UI purposes
      parsed.type = "enum"
      // Extract the actual type and format from the schema
      parsed.enumType = rawSchema.type || "string"
      parsed.enumFormat = rawSchema.format || ""
    }
    
      return parsed
    } catch (error) {
      console.error('Error parsing schema:', error)
      // Return default schema structure on error
      return {
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
        compositionSchemas: [],
        enumType: "string",
        enumFormat: ""
      }
    }
  }, [])
  
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
        setCurrentSchemaData({
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
      }
    }
  }, [schemaData, showDialog, parseSchemaToDialogFormat])
  
  // Helper function to filter schemas based on search input
  const filterSchemas = useCallback((searchTerm) => {
    if (!searchTerm.trim()) return Object.keys(schemas)
    const lowerSearch = searchTerm.toLowerCase()
    const schemaKeys = Object.keys(schemas)
    
    const startsWith = schemaKeys.filter(key => 
      key.toLowerCase().startsWith(lowerSearch)
    )
    const includes = schemaKeys.filter(key => 
      key.toLowerCase().includes(lowerSearch) && 
      !key.toLowerCase().startsWith(lowerSearch)
    )
    
    return [...startsWith, ...includes]
  }, [schemas])

  const resetForm = useCallback(() => {
    setSchemaMode("BUILD")
    setCurrentSchemaData({
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
      compositionSchemas: [],
      enumType: "string",
      enumFormat: ""
    })
    setValidationErrors({})
    setCurrentProperty({
      name: "",
      type: "string",
      required: false,
      description: "",
      format: "",
      itemsType: "string",
      isComposition: false,
      compositionType: "anyOf",
      compositionSchemas: []
    })
    setCurrentEnumValue({
      value: ""
    })
    setPropertyTypeSearch("")
    setItemsTypeSearch("")
    setCompositionSchemaSearch("")
    setPropertyItemsTypeSearch("")
    setPropertyDropdownOpen(false)
    setItemsDropdownOpen(false)
    setCompositionDropdownOpen(false)
    setPropertyItemsDropdownOpen(false)
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
      itemsType: currentProperty.itemsType
    }
    
    // Add type or composition data based on property type
    if (currentProperty.isComposition) {
      // For composition properties, add the composition keyword directly
      newProperty[currentProperty.compositionType] = currentProperty.compositionSchemas.map(schemaName => ({
        $ref: `${refPrefix}${schemaName}`
      }))
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
    setCurrentProperty({
      name: "",
      type: "string",
      required: false,
      description: "",
      format: "",
      itemsType: "string",
      isComposition: false,
      compositionType: "anyOf",
      compositionSchemas: []
    })
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
    setCurrentEnumValue({
      value: ""
    })
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
    setCurrentProperty({
      name: "",
      type: "string",
      required: false,
      description: "",
      format: "",
      itemsType: "string",
      isComposition: false,
      compositionType: "anyOf",
      compositionSchemas: []
    })
    setCurrentEnumValue({
      value: ""
    })
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

              {/* Mode Switcher - Hidden for composition schemas */}
              {!hideModeSwitcher && (
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
              )}

              {/* BUILD Mode Content */}
              {schemaMode === "BUILD" && (
                <div className="form-section">
                  <h4>Schema Type</h4>
                  <div className="form-field">
                    <label className="form-label" htmlFor="schema-type">Schema Type</label>
                    <select 
                      className="form-input" 
                      id="schema-type" 
                      value={currentSchemaData.type} 
                      onChange={(e) => setCurrentSchemaData({...currentSchemaData, type: e.target.value})}
                      disabled={isSchemaTypeLocked}
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
                        primitiveOptions={[]}
                        options={filterSchemas(compositionSchemaSearch).map(schemaKey => ({
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
                          disabled={currentProperty.isComposition || editingPropertyIndex !== null}
                          displayValue={currentProperty.type.includes(refPrefix) 
                            ? safeExtractSchemaName(currentProperty.type) 
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
                          <label className="form-label">Member Schemas <span className="required">*</span></label>
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
                              primitiveOptions={[]}
                              options={filterSchemas(compositionSchemaSearch).map(schemaKey => ({
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
                      <div className="form-field" style={{ marginBottom: '12px' }}>
                        <label className="form-label">Items Type <span className="required">*</span></label>
                        <SearchableSelect
                          value={
                            currentProperty.itemsType
                          }
                          onChange={(value) => setCurrentProperty({...currentProperty, itemsType: value})}
                          placeholder="Select items type..."
                          searchValue={propertyItemsTypeSearch}
                          onSearchChange={setPropertyItemsTypeSearch}
                          isOpen={propertyItemsDropdownOpen}
                          onToggle={setPropertyItemsDropdownOpen}
                          displayValue={currentProperty.itemsType.includes(refPrefix) 
                            ? safeExtractSchemaName(currentProperty.itemsType) 
                            : currentProperty.itemsType}
                          primitiveOptions={[
                            { value: "string", label: "String" },
                            { value: "number", label: "Number" },
                            { value: "integer", label: "Integer" },
                            { value: "boolean", label: "Boolean" },
                            { value: "object", label: "Object" },
                            { value: "array", label: "Array" }
                          ]}
                          options={filterSchemas(propertyItemsTypeSearch).map(schemaKey => ({
                            value: `${refPrefix}${schemaKey}`,
                            label: schemaKey
                          }))}
                        />
                      </div>
                    )}
                    
                    <div style={{ display: 'flex', gap: '15px', marginBottom: '12px' }}>
                      {!currentProperty.isComposition && (
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
                      primitiveOptions={[
                        { value: "string", label: "String" },
                        { value: "number", label: "Number" },
                        { value: "integer", label: "Integer" },
                        { value: "boolean", label: "Boolean" },
                        { value: "object", label: "Object" },
                        { value: "array", label: "Array" }
                      ]}
                      options={filterSchemas(itemsTypeSearch).map(schemaKey => ({
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

