/**
 * @prettier
 */
import React from "react"
import {
  stringFormatOptions,
  numberFormatOptions,
  enumStringFormatOptions,
  compositionTypeOptions
} from "./schemaDialogUtils"

/**
 * Reusable Format Select Component
 * @param {object} props - Component props
 * @param {string} props.type - Type: "string", "number", or "integer"
 * @param {string} props.value - Current format value
 * @param {function} props.onChange - Change handler
 * @param {boolean} props.includeBinary - Whether to include binary option (for enum vs property)
 * @param {string} props.className - CSS class name
 * @param {string} props.id - HTML id attribute
 * @param {string} props.label - Label text
 * @returns {JSX.Element} - Format select element
 */
export const FormatSelect = ({ 
  type, 
  value, 
  onChange, 
  includeBinary = true, 
  className = "form-input", 
  id, 
  label 
}) => {
  const getFormatOptions = () => {
    if (type === "string") {
      return includeBinary ? stringFormatOptions : enumStringFormatOptions
    } else if (type === "number" || type === "integer") {
      return numberFormatOptions
    }
    return []
  }

  const formatOptions = getFormatOptions()

  return (
    <select 
      className={className} 
      id={id}
      value={value} 
      onChange={onChange}
    >
      <option value="">None</option>
      {formatOptions.map(option => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  )
}

/**
 * Reusable Composition Type Select Component
 * @param {object} props - Component props
 * @param {string} props.value - Current composition type value
 * @param {function} props.onChange - Change handler
 * @param {string} props.className - CSS class name
 * @param {string} props.id - HTML id attribute
 * @returns {JSX.Element} - Composition type select element
 */
export const CompositionTypeSelect = ({ 
  value, 
  onChange, 
  className = "form-input", 
  id 
}) => {
  return (
    <select 
      className={className} 
      id={id}
      value={value} 
      onChange={onChange}
    >
      {compositionTypeOptions.map(option => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  )
}

/**
 * Reusable Selected Schemas List Component
 * @param {object} props - Component props
 * @param {array} props.schemas - Array of schema names
 * @param {function} props.onRemove - Function to remove a schema by index
 * @returns {JSX.Element} - Selected schemas list element
 */
export const SelectedSchemasList = ({ schemas, onRemove }) => {
  return (
    <div className="selected-schemas">
      {schemas.map((schema, index) => (
        <div key={index} className="selected-schema">
          {schema}
          <button 
            type="button" 
            onClick={() => onRemove(index)}
          >
            Remove
          </button>
        </div>
      ))}
    </div>
  )
}

