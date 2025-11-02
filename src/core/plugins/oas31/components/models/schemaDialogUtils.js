/**
 * @prettier
 */

export const refPrefix = "#/components/schemas/"

/**
 * Primitive type options for schema selection dropdowns
 */
export const primitiveTypeOptions = [
  { value: "string", label: "String" },
  { value: "number", label: "Number" },
  { value: "integer", label: "Integer" },
  { value: "boolean", label: "Boolean" },
  { value: "array", label: "Array" },
  { value: "object", label: "Object" }
]

/**
 * Empty primitive options (used when only schema references are needed)
 */
export const emptyPrimitiveOptions = []

/**
 * Extract composition schema names from an array of composition items
 * Handles schema references, primitive type objects, and direct primitive strings
 * @param {Array} compositionItems - Array of composition schema items
 * @returns {Array} - Array of extracted schema names and primitive types
 */
export const extractCompositionSchemas = (compositionItems) => {
  if (!Array.isArray(compositionItems)) {
    return []
  }
  
  return compositionItems
    .map(item => {
      // Handle schema references
      if (item && (item.$ref || item.$$ref) && typeof (item.$ref || item.$$ref) === 'string') {
        const ref = item.$ref || item.$$ref
        return safeExtractSchemaName(ref)
      }
      // Handle primitive types
      else if (item && typeof item === 'object' && item.type && typeof item.type === 'string') {
        return item.type
      }
      // Handle direct primitive type strings
      else if (typeof item === 'string' && primitiveTypeOptions.some(option => option.value === item)) {
        return item
      }
      return null
    })
    .filter(schemaName => schemaName) // Remove null values and empty strings
}

/**
 * Safe helper function to extract schema name from reference
 * @param {string} ref - The reference string
 * @returns {string} - The extracted schema name
 */
export const safeExtractSchemaName = (ref) => {
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
}

export const safeExtractRef = (ref) => {
  try {
    if (!ref || typeof ref !== 'string') {
      return ref || ''
    }
    // Extract schema name from the end of the reference
    const parts = ref.split(refPrefix)
    return `${refPrefix}${parts[parts.length - 1] || 'unknown'}`
  } catch (e) {
    console.warn('Error extracting schema ref from reference:', ref, e)
    return ''
  }
}

/**
 * Helper function to parse raw schema into dialog format
 * @param {object} rawSchema - The raw schema object
 * @returns {object} - The parsed schema in dialog format
 */
export const parseSchemaToDialogFormat = (rawSchema) => {
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
        compositionSchemas: [],
        enumType: "string",
        enumFormat: ""
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
      parsed.compositionSchemas = extractCompositionSchemas(rawSchema.anyOf)
    } else if (rawSchema.oneOf && Array.isArray(rawSchema.oneOf)) {
      parsed.compositionType = "oneOf"
      parsed.oneOf = rawSchema.oneOf
      parsed.compositionSchemas = extractCompositionSchemas(rawSchema.oneOf)
    } else if (rawSchema.allOf && Array.isArray(rawSchema.allOf)) {
      parsed.compositionType = "allOf"
      parsed.allOf = rawSchema.allOf
      parsed.compositionSchemas = extractCompositionSchemas(rawSchema.allOf)
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
        const compositionType = propSchema.anyOf ? 'anyOf' : propSchema.oneOf ? 'oneOf' : 'allOf'
        const compositionSchemas = propSchema[compositionType]
        
        if (Array.isArray(compositionSchemas)) {
          property.compositionType = compositionType
          property[compositionType] = compositionSchemas
          property.compositionSchemas = extractCompositionSchemas(compositionSchemas)
        }
      } else {
        const ref = propSchema.$ref || propSchema.$$ref
        // Handle direct schema reference
        if (ref) {
          property.type = safeExtractRef(ref)
        } else {
          property.type = propSchema.type || "string"
        }
      }
      
      // Handle array items
      if (propSchema.type === "array" && propSchema.items) {
        const ref = propSchema.items.$ref || propSchema.items.$$ref
        // Handle direct schema reference
        if (ref) {
          property.itemsType = safeExtractRef(ref)
        } else {
          property.itemsType = propSchema.items.type || "string"
          // Extract items format if present
          if (propSchema.items.format) {
            property.itemsFormat = propSchema.items.format
          }
        }
      }
      
      // Handle contentMediaType and contentSchema for string properties
      if (propSchema.type === "string") {
        if (propSchema.contentMediaType) {
          property.contentMediaType = propSchema.contentMediaType
        }
        if (propSchema.contentSchema) {
          const ref = propSchema.contentSchema.$ref || propSchema.contentSchema.$$ref
          if (ref) {
            property.contentSchema = safeExtractRef(ref)
          }
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
}

/**
 * Helper function to filter schemas based on search input
 * @param {string} searchTerm - The search term
 * @param {object} schemas - The schemas object
 * @returns {array} - Filtered schema keys
 */
export const filterSchemas = (searchTerm, schemas) => {
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
}

/**
 * Get the default schema data structure
 * @returns {object} - Default schema data
 */
export const getDefaultSchemaData = () => ({
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

/**
 * Get the default property data structure
 * @returns {object} - Default property data
 */
export const getDefaultPropertyData = () => ({
  name: "",
  type: "string",
  required: false,
  description: "",
  format: "",
  itemsType: "string",
  itemsFormat: "",
  contentMediaType: "",
  contentSchema: "",
  isComposition: false,
  compositionType: "anyOf",
  compositionSchemas: []
})

/**
 * Get the default enum value data structure
 * @returns {object} - Default enum value data
 */
export const getDefaultEnumValueData = () => ({
  value: ""
})

/**
 * Helper function to create appropriate schema object for composition schemas
 * @param {string} schemaName - The schema name or primitive type
 * @returns {object} - Schema object with type or $ref
 */
export const createSchemaOrReference = (schemaName) => {
  // Check if it's a primitive type
  const primitiveTypes = ["string", "number", "integer", "boolean", "array", "object"]
  
  if (primitiveTypes.includes(schemaName)) {
    return { type: schemaName }
  } else {
    return { $ref: `${refPrefix}${schemaName}` }
  }
}