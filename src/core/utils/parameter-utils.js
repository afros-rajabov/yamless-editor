/**
 * @prettier
 */

import { fromJS } from "immutable"

/**
 * Convert form data to OpenAPI parameter object
 * @param {Object} formData - Form state object
 * @returns {Object} OpenAPI parameter object
 */
export function formDataToParameter(formData) {
  const parameter = {
    name: formData.name,
    in: formData.in,
    description: formData.description || undefined,
    required: formData.required || false,
  }

  // Handle schema based on type
  if (formData.type) {
    if (formData.type.startsWith("#/components/schemas/")) {
      // Schema reference
      parameter.schema = {
        $ref: formData.type
      }
    } else {
      // Primitive type with schema object
      const schema = {
        type: formData.type
      }

      // Add format if provided
      if (formData.format) {
        schema.format = formData.format
      }


      // Add number constraints
      if (formData.minimum !== undefined && formData.minimum !== "") {
        schema.minimum = parseFloat(formData.minimum)
      }
      if (formData.maximum !== undefined && formData.maximum !== "") {
        schema.maximum = parseFloat(formData.maximum)
      }

      // Handle array items
      if (formData.type === "array" && formData.itemsType) {
        if (formData.itemsType.startsWith("#/components/schemas/")) {
          schema.items = {
            $ref: formData.itemsType
          }
        } else {
          schema.items = {
            type: formData.itemsType
          }
        }
      }

      parameter.schema = schema
    }
  }

  // Add default value if provided
  if (formData.default !== undefined && formData.default !== "") {
    parameter.schema = parameter.schema || {}
    parameter.schema.default = formData.default
  }

  // Add example if provided
  if (formData.example !== undefined && formData.example !== "") {
    parameter.example = formData.example
  }

  return parameter
}

/**
 * Convert OpenAPI parameter to form data
 * @param {Object} parameter - OpenAPI parameter object
 * @returns {Object} Form state object
 */
export function parameterToFormData(parameter) {
  const formData = {
    name: parameter.name || "",
    in: parameter.in || "query",
    description: parameter.description || "",
    required: parameter.required || false,
    default: "",
    example: parameter.example || "",
    enum: "",
    format: "",
    minimum: "",
    maximum: "",
    itemsType: ""
  }

  // Handle schema
  if (parameter.schema) {
    if (parameter.schema.$ref) {
      // Schema reference
      formData.type = parameter.schema.$ref
    } else {
      // Primitive type
      formData.type = parameter.schema.type || ""
      formData.format = parameter.schema.format || ""
      formData.default = parameter.schema.default || ""
      
      if (parameter.schema.minimum !== undefined) {
        formData.minimum = parameter.schema.minimum.toString()
      }
      
      if (parameter.schema.maximum !== undefined) {
        formData.maximum = parameter.schema.maximum.toString()
      }
      
      if (parameter.schema.items) {
        if (parameter.schema.items.$ref) {
          formData.itemsType = parameter.schema.items.$ref
        } else {
          formData.itemsType = parameter.schema.items.type || ""
        }
      }
    }
  }

  return formData
}

/**
 * Validate parameter form data
 * @param {Object} formData - Form state object
 * @returns {Object} Validation result with errors array
 */
export function validateParameterForm(formData) {
  const errors = []

  if (!formData.name || formData.name.trim() === "") {
    errors.push("Name is required")
  }

  if (!formData.in) {
    errors.push("Parameter location (in) is required")
  }

  if (!formData.type || formData.type.trim() === "") {
    errors.push("Type is required")
  }

  // Validate number constraints
  if (formData.minimum !== undefined && formData.minimum !== "" && isNaN(parseFloat(formData.minimum))) {
    errors.push("Minimum must be a valid number")
  }

  if (formData.maximum !== undefined && formData.maximum !== "" && isNaN(parseFloat(formData.maximum))) {
    errors.push("Maximum must be a valid number")
  }

  if (formData.minimum !== undefined && formData.maximum !== undefined && 
      formData.minimum !== "" && formData.maximum !== "" &&
      parseFloat(formData.minimum) > parseFloat(formData.maximum)) {
    errors.push("Minimum cannot be greater than maximum")
  }

  return {
    isValid: errors.length === 0,
    errors
  }
}

/**
 * Get primitive type options for SearchableSelect
 * @returns {Array} Array of primitive type options
 */
export function getPrimitiveTypeOptions() {
  return [
    { value: "string", label: "string" },
    { value: "number", label: "number" },
    { value: "integer", label: "integer" },
    { value: "boolean", label: "boolean" },
    { value: "array", label: "array" },
    { value: "object", label: "object" }
  ]
}

/**
 * Get parameter location options
 * @returns {Array} Array of location options
 */
export function getParameterLocationOptions() {
  return [
    { value: "query", label: "Query" },
    { value: "path", label: "Path" },
    { value: "header", label: "Header" },
    { value: "cookie", label: "Cookie" }
  ]
}


/**
 * Check if a type is a schema reference
 * @param {string} type - The type string
 * @returns {boolean} True if it's a schema reference
 */
export function isSchemaReference(type) {
  return type && type.startsWith("#/components/schemas/")
}

/**
 * Extract schema name from reference
 * @param {string} ref - The schema reference
 * @returns {string} The schema name
 */
export function extractSchemaName(ref) {
  if (isSchemaReference(ref)) {
    return ref.replace("#/components/schemas/", "")
  }
  return ref
}
