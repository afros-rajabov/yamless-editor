/**
 * @prettier
 */
import React, { useCallback, useEffect, useState } from "react"
import PropTypes from "prop-types"
import classNames from "classnames"

const Models = ({
  specActions,
  specSelectors,
  layoutSelectors,
  layoutActions,
  getComponent,
  getConfigs,
  fn,
}) => {
  const schemas = specSelectors.selectSchemas()
  const hasSchemas = Object.keys(schemas).length > 0
  const schemasPath = ["components", "schemas"]
  const { docExpansion, defaultModelsExpandDepth } = getConfigs()
  const isOpenDefault = defaultModelsExpandDepth > 0 && docExpansion !== "none"
  const isOpen = layoutSelectors.isShown(schemasPath, isOpenDefault)
  const [showDialog, setShowDialog] = useState(false)
  const [schemaName, setSchemaName] = useState("")
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
    useComposition: false,
    compositionType: "anyOf",
    compositionSchemas: []
  })
  const [validationErrors, setValidationErrors] = useState({})
  const Collapse = getComponent("Collapse")
  const JSONSchema202012 = getComponent("JSONSchema202012")
  const ArrowUpIcon = getComponent("ArrowUpIcon")
  const ArrowDownIcon = getComponent("ArrowDownIcon")
  const CloseIcon = getComponent("CloseIcon")
  const Button = getComponent("Button")
  const { getTitle } = fn.jsonSchema202012.useFn()

  /**
   * Effects.
   */
  useEffect(() => {
    const includesExpandedSchema = Object.entries(schemas).some(
      ([schemaName]) =>
        layoutSelectors.isShown([...schemasPath, schemaName], false)
    )
    const isOpenAndExpanded =
      isOpen && (defaultModelsExpandDepth > 1 || includesExpandedSchema)
    const isResolved = specSelectors.specResolvedSubtree(schemasPath) != null
    if (isOpenAndExpanded && !isResolved) {
      specActions.requestResolvedSubtree(schemasPath)
    }
  }, [isOpen, defaultModelsExpandDepth])

  /**
   * Event handlers.
   */

  const handleModelsExpand = useCallback(() => {
    layoutActions.show(schemasPath, !isOpen)
  }, [isOpen])
  const handleModelsRef = useCallback((node) => {
    if (node !== null) {
      layoutActions.readyToScroll(schemasPath, node)
    }
  }, [])
  const handleJSONSchema202012Ref = (schemaName) => (node) => {
    if (node !== null) {
      layoutActions.readyToScroll([...schemasPath, schemaName], node)
    }
  }
  const handleJSONSchema202012Expand = (schemaName) => (e, expanded) => {
    const schemaPath = [...schemasPath, schemaName]
    if (expanded) {
      const isResolved = specSelectors.specResolvedSubtree(schemaPath) != null
      if (!isResolved) {
        specActions.requestResolvedSubtree([...schemasPath, schemaName])
      }
      layoutActions.show(schemaPath, true)
    } else {
      layoutActions.show(schemaPath, false)
    }
  }

  const openDialog = useCallback(() => {
    setShowDialog(true)
    setSchemaName("")
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
      useComposition: false,
      compositionType: "anyOf",
      compositionSchemas: []
    })
    setValidationErrors({})
  }, [])
  
  const closeDialog = useCallback(() => {
    setShowDialog(false)
  }, [])
  
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
    if (schemaData.type === "enum") {
      if (!schemaData.enum || schemaData.enum.length === 0) {
        errors.enum = "Enum schema must have at least one value"
      }
    }
    
    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }, [schemaName, schemaData, schemas])
  
  const handleAddSchema = useCallback(() => {
    if (!validateForm()) {
      return
    }
    
    try {
      const spec = specSelectors.specJson()
      const js = spec && typeof spec.toJS === "function" ? spec.toJS() : {}
      const next = { ...js }
      
      // Ensure components.schemas exists
      if (!next.components) {
        next.components = {}
      }
      if (!next.components.schemas) {
        next.components.schemas = {}
      }
      
      // Build the schema object
      const schema = {}
      
      // Basic fields
      if (schemaData.description) schema.description = schemaData.description
      if (schemaData.example) schema.example = schemaData.example
      
      // Handle composition types
      if (schemaData.useComposition) {
        if (schemaData.compositionSchemas.length > 0) {
          const refs = schemaData.compositionSchemas.map(schemaName => ({
            $ref: `#/components/schemas/${schemaName}`
          }))
          
          if (schemaData.compositionType === "anyOf") {
            schema.anyOf = refs
          } else if (schemaData.compositionType === "oneOf") {
            schema.oneOf = refs
          } else if (schemaData.compositionType === "allOf") {
            schema.allOf = refs
          }
        }
      } else {
        // Regular schema type
        schema.type = schemaData.type
        
        // Type-specific constraints
        if (schemaData.type === "string") {
          if (schemaData.minLength !== null) schema.minLength = schemaData.minLength
          if (schemaData.maxLength !== null) schema.maxLength = schemaData.maxLength
          if (schemaData.pattern) schema.pattern = schemaData.pattern
          if (schemaData.format) schema.format = schemaData.format
        } else if (schemaData.type === "number" || schemaData.type === "integer") {
          if (schemaData.minimum !== null) schema.minimum = schemaData.minimum
          if (schemaData.maximum !== null) schema.maximum = schemaData.maximum
          if (schemaData.exclusiveMinimum) schema.exclusiveMinimum = schemaData.exclusiveMinimum
          if (schemaData.exclusiveMaximum) schema.exclusiveMaximum = schemaData.exclusiveMaximum
          if (schemaData.multipleOf !== null) schema.multipleOf = schemaData.multipleOf
          if (schemaData.format) schema.format = schemaData.format
        } else if (schemaData.type === "array") {
          if (schemaData.minItems !== null) schema.minItems = schemaData.minItems
          if (schemaData.maxItems !== null) schema.maxItems = schemaData.maxItems
          if (schemaData.uniqueItems) schema.uniqueItems = schemaData.uniqueItems
          
          // Items schema
          if (schemaData.itemsType) {
            if (schemaData.itemsType.startsWith("#/components/schemas/")) {
              schema.items = { $ref: schemaData.itemsType }
            } else {
              schema.items = { type: schemaData.itemsType }
            }
          }
        } else if (schemaData.type === "object") {
          if (schemaData.minProperties !== null) schema.minProperties = schemaData.minProperties
          if (schemaData.maxProperties !== null) schema.maxProperties = schemaData.maxProperties
          
          // Properties
          if (schemaData.properties && schemaData.properties.length > 0) {
            schema.properties = {}
            const requiredProps = []
            
            schemaData.properties.forEach(prop => {
              if (prop.name) {
                const propSchema = {}
                
                if (prop.type && prop.type.startsWith("#/components/schemas/")) {
                  propSchema.$ref = prop.type
                } else if (prop.type) {
                  propSchema.type = prop.type
                  
                  // Handle array items
                  if (prop.type === "array" && prop.itemsType) {
                    if (prop.itemsType.startsWith("#/components/schemas/")) {
                      propSchema.items = { $ref: prop.itemsType }
                    } else {
                      propSchema.items = { type: prop.itemsType }
                    }
                  }
                }
                
                if (prop.format) propSchema.format = prop.format
                if (prop.description) propSchema.description = prop.description
                
                schema.properties[prop.name] = propSchema
                
                if (prop.required) {
                  requiredProps.push(prop.name)
                }
              }
            })
            
            if (requiredProps.length > 0) {
              schema.required = requiredProps
            }
          }
          
        } else if (schemaData.type === "enum") {
          // For enum type, we only need the enum array, no type field
          // The enum values are already in schemaData.enum
        }
      }
      
      // Value constraints
      if (schemaData.enum && schemaData.enum.length > 0) {
        schema.enum = schemaData.enum
      }
      if (schemaData.const !== null) {
        schema.const = schemaData.const
      }
      if (schemaData.default !== null) {
        schema.default = schemaData.default
      }
      
      // Advanced features
      if (schemaData.readOnly) schema.readOnly = true
      if (schemaData.writeOnly) schema.writeOnly = true
      if (schemaData.deprecated) schema.deprecated = true
      if (schemaData.nullable) schema.nullable = true
      
      // Add to spec
      next.components.schemas[schemaName.trim()] = schema
      
      const asString = JSON.stringify(next, null, 2)
      specActions.updateSpec(asString)
    closeDialog()
    } catch (e) {
      console.error("Error adding schema:", e)
      setValidationErrors({ general: "Failed to add schema: " + e.message })
    }
  }, [schemaName, schemaData, schemas, specSelectors, specActions, validateForm, closeDialog])

  /**
   * Rendering.
   */

  if (!hasSchemas || defaultModelsExpandDepth < 0) {
    return null
  }

  return (
    <>
      <section
        className={classNames("models", { "is-open": isOpen })}
        ref={handleModelsRef}
      >
        <h4>
          <button
            aria-expanded={isOpen}
            className="models-control"
            onClick={handleModelsExpand}
          >
            <span>Schemas</span>
            {isOpen ? <ArrowUpIcon /> : <ArrowDownIcon />}
          </button>
        </h4>
        <Collapse isOpened={isOpen}>
          <div className="models-actions">
            <button className="btn tags-badges-add models-add-btn" title="Add" onClick={openDialog}>Add</button>
          </div>
          {Object.entries(schemas).map(([schemaName, schema]) => {
            const name = getTitle(schema, { lookup: "basic" }) || schemaName

            return (
              <JSONSchema202012
                key={schemaName}
                ref={handleJSONSchema202012Ref(schemaName)}
                schema={schema}
                name={name}
                onExpand={handleJSONSchema202012Expand(schemaName)}
              />
            )
          })}
        </Collapse>
      </section>
      {showDialog && (
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
                    <div className="form-field">
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
                    
                    <div className="form-field">
                      <label className="form-label" htmlFor="schema-description">Description</label>
                      <input 
                        className="form-input" 
                        id="schema-description" 
                        type="text" 
                        value={schemaData.description} 
                        onChange={(e) => setSchemaData({...schemaData, description: e.target.value})}
                      />
                    </div>
                    
                    <div className="form-field">
                      <label className="form-label" htmlFor="schema-type">Schema Type</label>
                      <select 
                        className="form-input" 
                        id="schema-type" 
                        value={schemaData.type} 
                        onChange={(e) => setSchemaData({...schemaData, type: e.target.value})}
                        disabled={schemaData.useComposition}
                      >
                        <option value="object">Object</option>
                        <option value="array">Array</option>
                        <option value="enum">Enum</option>
                      </select>
                    </div>
                  </div>

                  {/* Composition Types */}
                  <div className="form-section">
                    <h4>Composition (Advanced)</h4>
                    <div className="form-field">
                      <label>
                        <input 
                          type="checkbox" 
                          checked={schemaData.useComposition} 
                          onChange={(e) => setSchemaData({...schemaData, useComposition: e.target.checked})}
                        />
                        Use Composition Types (anyOf, oneOf, allOf)
                      </label>
                    </div>
                    
                    {schemaData.useComposition && (
                      <>
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
                            <select 
                              className="form-input" 
                              onChange={(e) => {
                                if (e.target.value && !schemaData.compositionSchemas.includes(e.target.value)) {
                                  setSchemaData({
                                    ...schemaData, 
                                    compositionSchemas: [...schemaData.compositionSchemas, e.target.value]
                                  })
                                }
                                e.target.value = ""
                              }}
                            >
                              <option value="">Select existing schema...</option>
                              {Object.keys(schemas).map(schemaKey => (
                                <option key={schemaKey} value={schemaKey}>{schemaKey}</option>
                              ))}
                            </select>
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
                        </div>
                      </>
                    )}
                  </div>

                  {/* Section 2: Properties (for object type) */}
                  {schemaData.type === "object" && !schemaData.useComposition && (
                    <div className="form-section">
                      <h4>Properties</h4>
                      
                      {schemaData.properties.map((property, index) => (
                        <div key={index} className="property-row">
                          <div className="property-fields">
                            <div className="form-field">
                              <label className="form-label">Property Name <span className="required">*</span></label>
                              <input 
                                className="form-input" 
                                type="text" 
                                value={property.name || ""} 
                                onChange={(e) => {
                                  const newProperties = [...schemaData.properties]
                                  newProperties[index] = {...newProperties[index], name: e.target.value}
                                  setSchemaData({...schemaData, properties: newProperties})
                                }}
                                placeholder="e.g., username"
                              />
                            </div>
                            
                            <div className="form-field">
                              <label className="form-label">Property Type <span className="required">*</span></label>
                              <select 
                                className="form-input" 
                                value={property.type || "string"} 
                                onChange={(e) => {
                                  const newProperties = [...schemaData.properties]
                                  newProperties[index] = {...newProperties[index], type: e.target.value, format: ""}
                                  setSchemaData({...schemaData, properties: newProperties})
                                }}
                              >
                                <option value="string">String</option>
                                <option value="number">Number</option>
                                <option value="integer">Integer</option>
                                <option value="boolean">Boolean</option>
                                <option value="array">Array</option>
                                <option value="object">Object</option>
                                {Object.keys(schemas).map(schemaKey => (
                                  <option key={schemaKey} value={`#/components/schemas/${schemaKey}`}>
                                    {schemaKey} (Reference)
                                  </option>
                                ))}
                              </select>
                            </div>
                            
                            <div className="form-field">
                              <label className="form-label">Format</label>
                              <select 
                                className="form-input" 
                                value={property.format || ""} 
                                onChange={(e) => {
                                  const newProperties = [...schemaData.properties]
                                  newProperties[index] = {...newProperties[index], format: e.target.value}
                                  setSchemaData({...schemaData, properties: newProperties})
                                }}
                              >
                                <option value="">None</option>
                                {property.type === "string" && (
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
                                {(property.type === "number" || property.type === "integer") && (
                                  <>
                                    <option value="int32">int32</option>
                                    <option value="int64">int64</option>
                                    <option value="float">Float</option>
                                    <option value="double">Double</option>
                                  </>
                                )}
                              </select>
                            </div>
                            
                            <div className="form-field">
                              <label>
                                <input 
                                  type="checkbox" 
                                  checked={property.required || false} 
                                  onChange={(e) => {
                                    const newProperties = [...schemaData.properties]
                                    newProperties[index] = {...newProperties[index], required: e.target.checked}
                                    setSchemaData({...schemaData, properties: newProperties})
                                  }}
                                />
                                Required
                              </label>
                            </div>
                            
                            <div className="form-field">
                              <label className="form-label">Description</label>
                              <input 
                                className="form-input" 
                                type="text" 
                                value={property.description || ""} 
                                onChange={(e) => {
                                  const newProperties = [...schemaData.properties]
                                  newProperties[index] = {...newProperties[index], description: e.target.value}
                                  setSchemaData({...schemaData, properties: newProperties})
                                }}
                                placeholder="Property description"
                              />
                            </div>
                            
                            {property.type === "array" && (
                              <div className="form-field">
                                <label className="form-label">Items Type <span className="required">*</span></label>
                                <select 
                                  className="form-input" 
                                  value={property.itemsType || "string"} 
                                  onChange={(e) => {
                                    const newProperties = [...schemaData.properties]
                                    newProperties[index] = {...newProperties[index], itemsType: e.target.value}
                                    setSchemaData({...schemaData, properties: newProperties})
                                  }}
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
                          </div>
                          
                          <button 
                            type="button" 
                            className="btn btn-danger btn-sm" 
                            onClick={() => {
                              const newProperties = schemaData.properties.filter((_, i) => i !== index)
                              setSchemaData({...schemaData, properties: newProperties})
                            }}
                          >
                            Remove Property
                          </button>
                        </div>
                      ))}
                      
                      <button 
                        type="button" 
                        className="btn btn-primary" 
                        onClick={() => setSchemaData({
                          ...schemaData, 
                          properties: [...schemaData.properties, {name: "", type: "string", required: false, description: "", itemsType: "string"}]
                        })}
                      >
                        Add Property
                      </button>
                    </div>
                  )}

                  {/* Section 3: Array Items (for array type) */}
                  {schemaData.type === "array" && !schemaData.useComposition && (
                    <div className="form-section">
                      <h4>Array Items</h4>
                      
                      <div className="form-field">
                        <label className="form-label">Items Type <span className="required">*</span></label>
                        <select 
                          className="form-input" 
                          value={schemaData.itemsType} 
                          onChange={(e) => setSchemaData({...schemaData, itemsType: e.target.value})}
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
                    </div>
                  )}

                  {/* Section 4: Enum Values (for enum type) */}
                  {schemaData.type === "enum" && !schemaData.useComposition && (
                    <div className="form-section">
                      <h4>Enum Values</h4>
                      
                      {schemaData.enum.map((enumItem, index) => (
                        <div key={index} className="enum-value-row" style={{ 
                          display: 'flex', 
                          gap: '10px', 
                          alignItems: 'end', 
                          marginBottom: '10px',
                          padding: '10px',
                          border: '1px solid #e0e0e0',
                          borderRadius: '4px',
                          background: '#fafafa'
                        }}>
                          <div style={{ flex: 1 }}>
                            <label className="form-label">Value <span className="required">*</span></label>
                            <input 
                              className="form-input" 
                              type="text" 
                              value={typeof enumItem === 'string' ? enumItem : enumItem.toString()} 
                              onChange={(e) => {
                                const newEnum = [...schemaData.enum]
                                const value = enumItem.type === "number" ? parseFloat(e.target.value) : e.target.value
                                if (!isNaN(value) || enumItem.type === "string") {
                                  newEnum[index] = value
                                  setSchemaData({...schemaData, enum: newEnum})
                                }
                              }}
                              placeholder="Enter enum value"
                            />
                          </div>
                          <div>
                            <label className="form-label">Type</label>
                            <select 
                              className="form-input" 
                              value={typeof enumItem === 'number' ? 'number' : 'string'} 
                              onChange={(e) => {
                                const newEnum = [...schemaData.enum]
                                const currentValue = enumItem.toString()
                                const newValue = e.target.value === "number" ? parseFloat(currentValue) : currentValue
                                if (!isNaN(newValue) || e.target.value === "string") {
                                  newEnum[index] = newValue
                                  setSchemaData({...schemaData, enum: newEnum})
                                }
                              }}
                            >
                              <option value="string">String</option>
                              <option value="number">Number</option>
                            </select>
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
                      
                      <button 
                        type="button" 
                        className="btn btn-primary" 
                        onClick={() => setSchemaData({
                          ...schemaData, 
                          enum: [...schemaData.enum, ""]
                        })}
                      >
                        Add Enum Value
                      </button>
                      
                      {validationErrors.enum && (
                        <div className="form-error">{validationErrors.enum}</div>
                      )}
                    </div>
                  )}

                  {/* Section 4: Additional Schema Properties */}
                  <div className="form-section">
                    <h4>Additional Schema Properties</h4>
                    
                    <div className="form-field">
                      <div style={{ display: 'flex', gap: '20px' }}>
                        <label>
                          <input 
                            type="checkbox" 
                            checked={schemaData.nullable} 
                            onChange={(e) => setSchemaData({...schemaData, nullable: e.target.checked})}
                          />
                          Nullable (value can be null)
                        </label>
                        
                        <label>
                          <input 
                            type="checkbox" 
                            checked={schemaData.deprecated} 
                            onChange={(e) => setSchemaData({...schemaData, deprecated: e.target.checked})}
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
      )}
    </>
  )
}

Models.propTypes = {
  getComponent: PropTypes.func.isRequired,
  getConfigs: PropTypes.func.isRequired,
  specSelectors: PropTypes.shape({
    selectSchemas: PropTypes.func.isRequired,
    specResolvedSubtree: PropTypes.func.isRequired,
  }).isRequired,
  specActions: PropTypes.shape({
    requestResolvedSubtree: PropTypes.func.isRequired,
  }).isRequired,
  layoutSelectors: PropTypes.shape({
    isShown: PropTypes.func.isRequired,
  }).isRequired,
  layoutActions: PropTypes.shape({
    show: PropTypes.func.isRequired,
    readyToScroll: PropTypes.func.isRequired,
  }).isRequired,
  fn: PropTypes.shape({
    jsonSchema202012: PropTypes.func.shape({
      useFn: PropTypes.func.isRequired,
    }).isRequired,
  }).isRequired,
}

export default Models
