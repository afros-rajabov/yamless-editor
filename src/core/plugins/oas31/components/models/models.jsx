/**
 * @prettier
 */
import React, { useCallback, useEffect, useState } from "react"
import PropTypes from "prop-types"
import classNames from "classnames"
import SchemaDialog from "./SchemaDialog"

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
  const Collapse = getComponent("Collapse")
  const JSONSchema202012 = getComponent("JSONSchema202012")
  const ArrowUpIcon = getComponent("ArrowUpIcon")
  const ArrowDownIcon = getComponent("ArrowDownIcon")
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
  }, [])
  
  const closeDialog = useCallback(() => {
    setShowDialog(false)
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
    } catch (e) {
      console.error("Error adding schema:", e)
    }
  }, [specSelectors, specActions])

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
      <SchemaDialog
        showDialog={showDialog}
        onClose={closeDialog}
        onAddSchema={handleAddSchema}
        schemas={schemas}
        getComponent={getComponent}
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
