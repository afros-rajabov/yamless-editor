/**
 * @prettier
 */
import React, { useCallback, useEffect, useState } from "react"
import PropTypes from "prop-types"
import classNames from "classnames"
import SchemaDialog from "./SchemaDialog"
import SchemaEditDialog from "./SchemaEditDialog"
import { refPrefix } from "./schemaDialogUtils"

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
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [deleteSchemaName, setDeleteSchemaName] = useState("")
  const [deleteError, setDeleteError] = useState("")
  const [cloneSourceName, setCloneSourceName] = useState("")
  const [cloneInitialData, setCloneInitialData] = useState(null)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [editSchemaName, setEditSchemaName] = useState("")
  const [editSchemaData, setEditSchemaData] = useState(null)
  const Collapse = getComponent("Collapse")
  const JSONSchema202012 = getComponent("JSONSchema202012")
  const ArrowUpIcon = getComponent("ArrowUpIcon")
  const ArrowDownIcon = getComponent("ArrowDownIcon")
  const { getTitle } = fn.jsonSchema202012

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

  const openDialog = useCallback(() => {
    setShowDialog(true)
  }, [])
  
  const closeDialog = useCallback(() => {
    setShowDialog(false)
    setCloneSourceName("")
    setCloneInitialData(null)
  }, [])
  
  const handleCreateFrom = useCallback((schemaName) => {
    const schema = schemas[schemaName]
    if (schema) {
      setCloneSourceName(schemaName)
      setCloneInitialData(schema)
      setShowDialog(true)
    }
  }, [schemas])

  /**
   * Check if a schema is referenced anywhere in the spec
   */
  const checkSchemaReferences = useCallback((schemaName) => {
    try {
      const spec = specSelectors.specJson()
      const js = spec && typeof spec.toJS === "function" ? spec.toJS() : {}
      const references = []
      const schemaRef = `#/components/schemas/${schemaName}`

      // Helper function to format usage location in a more readable way
      const formatUsageLocation = (path) => {
        const pathArray = path.split('.')
        
        // Handle different types of usage
        if (pathArray[0] === 'paths') {
          // API endpoint usage: paths./api/v1/users.post.responses.200
          const endpoint = pathArray[1]
          const method = pathArray[2]
          const type = pathArray[3] // requestBody, responses, parameters
          const status = pathArray[4] // for responses
          const content = pathArray[5] // content type
          
          if (type === 'responses' && status && content) {
            return `API ${method.toUpperCase()} ${endpoint} → Response ${status}`
          } else if (type === 'requestBody' && content) {
            return `API ${method.toUpperCase()} ${endpoint} → Request Body`
          } else if (type === 'parameters') {
            return `API ${method.toUpperCase()} ${endpoint} → Parameter`
          }
          return `API ${method.toUpperCase()} ${endpoint}`
        } else if (pathArray[0] === 'components' && pathArray[1] === 'schemas') {
          // Schema composition usage
          const schemaName = pathArray[2]
          const property = pathArray[4]
          const composition = pathArray[5] // anyOf, oneOf, allOf
          
          if (composition) {
            return `Schema "${schemaName}" → Property "${property}" (${composition})`
          } else if (property) {
            return `Schema "${schemaName}" → Property "${property}"`
          }
          return `Schema "${schemaName}"`
        }
        
        // Fallback to simplified path
        return pathArray.slice(0, 3).join(' → ')
      }

      // Helper function to recursively search for references
      const searchForRefs = (obj, path = []) => {
        if (typeof obj !== 'object' || obj === null) return

        if (Array.isArray(obj)) {
          obj.forEach((item, index) => {
            searchForRefs(item, [...path, index])
          })
        } else {
          Object.entries(obj).forEach(([key, value]) => {
            const currentPath = [...path, key]
            
            // Check if this is a $ref to our schema
            if (key === '$ref' && value === schemaRef) {
              const fullPath = currentPath.slice(0, -1).join('.')
              references.push({
                path: fullPath,
                location: formatUsageLocation(fullPath)
              })
            }
            
            // Recursively search nested objects
            if (typeof value === 'object' && value !== null) {
              searchForRefs(value, currentPath)
            }
          })
        }
      }

      // Search through the entire spec
      searchForRefs(js)

      return references
    } catch (e) {
      console.error("Error checking schema references:", e)
      return []
    }
  }, [specSelectors])

  /**
   * Handle schema deletion with dependency checking
   */
  const handleDeleteSchema = useCallback((schemaName) => {
    try {
      // Check for references first
      const references = checkSchemaReferences(schemaName)
      
      if (references.length > 0) {
        // Show error message with locations formatted as a list
        const locationsList = references.map(ref => `• ${ref.location}`).join('\n')
        setDeleteError(`Cannot delete schema "${schemaName}" because it is referenced in the following locations:\n\n${locationsList}\n\nPlease remove these references first.`)
        setDeleteSchemaName(schemaName)
        setShowDeleteDialog(true)
        return
      }

      // Show confirmation dialog
      setDeleteError("")
      setDeleteSchemaName(schemaName)
      setShowDeleteDialog(true)
    } catch (e) {
      console.error("Error deleting schema:", e)
      setDeleteError("Failed to delete schema. Please try again.")
      setDeleteSchemaName(schemaName)
      setShowDeleteDialog(true)
    }
  }, [checkSchemaReferences])

  /**
   * Confirm schema deletion
   */
  const confirmDeleteSchema = useCallback(() => {
    try {
      // Delete the schema
      const spec = specSelectors.specJson()
      const js = spec && typeof spec.toJS === "function" ? spec.toJS() : {}
      const next = { ...js }
      
      // Ensure components.schemas exists
      if (next.components && next.components.schemas) {
        delete next.components.schemas[deleteSchemaName]
        
        // If no schemas left, clean up empty objects
        if (Object.keys(next.components.schemas).length === 0) {
          delete next.components.schemas
          if (Object.keys(next.components).length === 0) {
            delete next.components
          }
        }
        
        const asString = JSON.stringify(next, null, 2)
        specActions.updateSpec(asString)
      }
      
      // Close dialog
      setShowDeleteDialog(false)
      setDeleteSchemaName("")
      setDeleteError("")
    } catch (e) {
      console.error("Error deleting schema:", e)
      setDeleteError("Failed to delete schema. Please try again.")
    }
  }, [deleteSchemaName, specSelectors, specActions])

  /**
   * Cancel schema deletion
   */
  const cancelDeleteSchema = useCallback(() => {
    setShowDeleteDialog(false)
    setDeleteSchemaName("")
    setDeleteError("")
  }, [])

  const handleAddSchema = useCallback((schemaName, schemaData, schemaMode) => {
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
      if (schemaMode === "COMPOSITE") {
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
                
                // Handle composition properties (anyOf, oneOf, allOf)
                if (prop.anyOf || prop.oneOf || prop.allOf) {
                  if (prop.anyOf) propSchema.anyOf = prop.anyOf
                  if (prop.oneOf) propSchema.oneOf = prop.oneOf
                  if (prop.allOf) propSchema.allOf = prop.allOf
                } else if (prop.type && prop.type.startsWith("#/components/schemas/")) {
                  propSchema.$$ref = prop.type
                  propSchema.$ref = prop.type
                } else if (prop.type) {
                  propSchema.type = prop.type
                  
                  // Handle array items
                  if (prop.type === "array" && prop.itemsType) {
                    if (prop.itemsType.startsWith("#/components/schemas/")) {
                      propSchema.items = { $$ref: prop.itemsType, $ref: prop.itemsType }
                    } else {
                      propSchema.items = { type: prop.itemsType }
                      if (prop.itemsFormat) {
                        propSchema.items.format = prop.itemsFormat
                      }
                    }
                    propSchema.default = []
                  }
                }
                
                if (prop.format) propSchema.format = prop.format
                if (prop.description) propSchema.description = prop.description
                
                // Handle contentMediaType and contentSchema for string properties
                if (prop.type === "string") {
                  if (prop.contentMediaType) {
                    propSchema.contentMediaType = prop.contentMediaType
                  }
                  if (prop.contentSchema) {
                    if (prop.contentSchema.startsWith("#/components/schemas/")) {
                      propSchema.contentSchema = { $ref: prop.contentSchema }
                    }
                  }
                }
                
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
          // For enum type, set the proper type and format
          schema.type = schemaData.enumType
          if (schemaData.enumFormat) {
            schema.format = schemaData.enumFormat
          }
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
    } catch (e) {
      console.error("Error adding schema:", e)
    }
  }, [specSelectors, specActions])

  const handleEditSchema = useCallback((schemaName) => {
    const schema = schemas[schemaName]
    if (schema) {
      setEditSchemaName(schemaName)
      setEditSchemaData(schema)
      setShowEditDialog(true)
    }
  }, [schemas])

  const closeEditDialog = useCallback(() => {
    setShowEditDialog(false)
    setEditSchemaName("")
    setEditSchemaData(null)
  }, [])

  const handleUpdateSchema = useCallback((schemaData, schemaMode) => {
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
      if (schemaMode === "COMPOSITE") {
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
                
                // Handle composition properties (anyOf, oneOf, allOf)
                if (prop.anyOf || prop.oneOf || prop.allOf) {
                  if (prop.anyOf) propSchema.anyOf = prop.anyOf
                  if (prop.oneOf) propSchema.oneOf = prop.oneOf
                  if (prop.allOf) propSchema.allOf = prop.allOf
                } else if (prop.type && prop.type.startsWith("#/components/schemas/")) {
                  propSchema.$$ref = prop.type
                  propSchema.$ref = prop.type
                } else if (prop.type) {
                  propSchema.type = prop.type
                  
                  // Handle array items
                  if (prop.type === "array" && prop.itemsType) {
                    if (prop.itemsType.startsWith("#/components/schemas/")) {
                      propSchema.items = { $$ref: prop.itemsType, $ref: prop.itemsType }
                    } else {
                      propSchema.items = { type: prop.itemsType }
                      if (prop.itemsFormat) {
                        propSchema.items.format = prop.itemsFormat
                      }
                    }
                    propSchema.default = []
                  }
                }
                
                if (prop.format) propSchema.format = prop.format
                if (prop.description) propSchema.description = prop.description
                
                // Handle contentMediaType and contentSchema for string properties
                if (prop.type === "string") {
                  if (prop.contentMediaType) {
                    propSchema.contentMediaType = prop.contentMediaType
                  }
                  if (prop.contentSchema) {
                    if (prop.contentSchema.startsWith("#/components/schemas/")) {
                      propSchema.contentSchema = { $ref: prop.contentSchema }
                    }
                  }
                }
                
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
          // For enum type, set the proper type and format
          schema.type = schemaData.enumType
          if (schemaData.enumFormat) {
            schema.format = schemaData.enumFormat
          }
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
      
      // Update existing schema in spec
      next.components.schemas[editSchemaName] = schema
      
      const asString = JSON.stringify(next, null, 2)
      specActions.updateSpec(asString)
      
      // Close edit dialog
      closeEditDialog()
    } catch (e) {
      console.error("Error updating schema:", e)
    }
  }, [editSchemaName, specSelectors, specActions, closeEditDialog])

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
                onDelete={() => handleDeleteSchema(schemaName)}
                onCreateFrom={() => handleCreateFrom(schemaName)}
                onEdit={() => handleEditSchema(schemaName)}
              />
            )
          })}
        </Collapse>
      </section>
      <SchemaDialog
        showDialog={showDialog}
        onClose={closeDialog}
        onAddSchema={handleAddSchema}
        schemas={schemas}
        getComponent={getComponent}
        initialData={cloneInitialData}
        sourceSchemaName={cloneSourceName}
      />
      {showDeleteDialog && (
        <div className="dialog-ux">
          <div className="backdrop-ux" onClick={cancelDeleteSchema}></div>
          <div className="modal-ux delete-schema-dialog">
            <div className="modal-dialog-ux">
              <div className="modal-ux-inner">
                <div className="modal-ux-header">
                  <h3>{deleteError ? "Cannot Delete Schema" : "Delete Schema"}</h3>
                  <button type="button" className="close-modal" onClick={cancelDeleteSchema}>
                    ✕
                  </button>
                </div>
                <div className="modal-ux-content">
                  {deleteError ? (
                    <div>
                      <div className="delete-error-box">
                        <div className="delete-error-content">
                          <div className="delete-error-icon">⚠️</div>
                          <div>
                            <h4 className="delete-error-title">
                              Schema Cannot Be Deleted
                            </h4>
                            <p className="delete-error-message">
                              {deleteError}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="modal-actions-row">
                        <button className="btn modal-btn" onClick={cancelDeleteSchema}>Close</button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="delete-confirmation-content">
                        <div className="delete-confirmation-icon">🗑️</div>
                        <h4 className="delete-confirmation-title">
                          Delete Schema
                        </h4>
                        <p className="delete-confirmation-message">
                          Are you sure you want to delete the schema <strong className="delete-schema-name">"{deleteSchemaName}"</strong>?
                        </p>
                        <div className="delete-warning-box">
                          ⚠️ This action cannot be undone.
                        </div>
                      </div>
                      <div className="modal-actions-row">
                        <button className="btn modal-btn" onClick={cancelDeleteSchema}>Cancel</button>
                        <button className="btn btn-danger modal-btn" onClick={confirmDeleteSchema}>Delete Schema</button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      <SchemaEditDialog
        showDialog={showEditDialog}
        onClose={closeEditDialog}
        onUpdateSchema={handleUpdateSchema}
        schemas={schemas}
        getComponent={getComponent}
        schemaName={editSchemaName}
        schemaData={editSchemaData}
      />
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
