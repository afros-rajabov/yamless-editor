/**
 * @prettier
 */
import React from "react"
import {
  stringFormatOptions,
  numberFormatOptions,
  enumStringFormatOptions,
  compositionTypeOptions,
  refPrefix
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

/**
 * Reusable Selected Properties List Component
 * @param {object} props - Component props
 * @param {array} props.properties - Array of property objects
 * @param {function} props.onRemove - Function to remove a property by index
 * @param {function} props.onEdit - Optional function to edit a property by index
 * @param {boolean} props.isEditMode - Whether edit mode is enabled
 * @param {function} props.safeExtractSchemaName - Function to extract schema name from ref
 * @returns {JSX.Element} - Selected properties list element
 */
export const SelectedPropertiesList = ({ 
  properties, 
  onRemove, 
  onEdit, 
  isEditMode,
  safeExtractSchemaName 
}) => {
  const renderPropertyInfo = (property) => {
    if (property.anyOf || property.oneOf || property.allOf) {
      const compositionType = property.anyOf ? 'anyOf' : property.oneOf ? 'oneOf' : 'allOf'
      const schemas = property[compositionType].map(cType => {
        const refValue = cType.$ref || cType.$$ref
        return refValue ? safeExtractSchemaName(refValue): cType.type
      }).join(', ')
      return `(${compositionType}[${schemas}]${property.required ? ', required' : ''})`
    } else {
      let typeDisplay = property.type.includes(refPrefix) 
        ? safeExtractSchemaName(property.type) 
        : property.type
      
      // Handle array types to show items type
      if (property.type === 'array' && property.itemsType) {
        const itemsType = property.itemsType.includes(refPrefix)
          ? safeExtractSchemaName(property.itemsType)
          : property.itemsType
        typeDisplay = `array[${itemsType}]`
      }
      
      return `(${typeDisplay}${property.format ? `, ${property.format}` : ''}${property.required ? ', required' : ''})`
    }
  }

  return (
    <div className="selected-schemas">
      {properties.map((property, index) => (
        <div key={index} className="selected-schema">
          <span>
            <strong>{property.name}</strong>
            <span style={{ margin: '0 10px', color: '#666' }}>
              {renderPropertyInfo(property)}
            </span>
            {property.description && (
              <span style={{ color: '#666', fontSize: '0.9em' }}>
                - {property.description}
              </span>
            )}
          </span>
          <div style={{ display: 'flex', gap: '8px' }}>
            {isEditMode && onEdit && (
              <button 
                type="button" 
                className="btn btn-secondary btn-sm" 
                onClick={() => onEdit(index)}
                style={{ background: '#6c757d', color: 'white', border: 'none', padding: '4px 8px', borderRadius: '3px', cursor: 'pointer', fontSize: '12px' }}
              >
                Edit
              </button>
            )}
            <button 
              type="button" 
              className="remove-button"
              onClick={() => onRemove(index)}
            >
              Remove
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}

/**
 * Reusable Selected Enum Values List Component
 * @param {object} props - Component props
 * @param {array} props.enumValues - Array of enum values
 * @param {string} props.enumType - Type of enum values ("string", "number", or "integer")
 * @param {function} props.onRemove - Function to remove an enum value by index
 * @param {function} props.onEdit - Optional function to edit an enum value by index
 * @param {boolean} props.isEditMode - Whether edit mode is enabled
 * @returns {JSX.Element} - Selected enum values list element
 */
export const SelectedEnumValuesList = ({ 
  enumValues, 
  enumType, 
  onRemove, 
  onEdit, 
  isEditMode 
}) => {
  return (
    <div className="selected-schemas">
      {enumValues.map((enumItem, index) => (
        <div key={index} className="selected-schema">
          <span>
            <strong>"{typeof enumItem === 'string' ? enumItem : enumItem.toString()}"</strong>
            <span style={{ margin: '0 10px', color: '#666' }}>
              ({typeof enumItem === 'number' ? 'number' : 'string'})
            </span>
          </span>
          <div style={{ display: 'flex', gap: '8px' }}>
            {isEditMode && onEdit && (
              <button 
                type="button" 
                className="btn btn-secondary btn-sm" 
                onClick={() => onEdit(index)}
                style={{ background: '#6c757d', color: 'white', border: 'none', padding: '4px 8px', borderRadius: '3px', cursor: 'pointer', fontSize: '12px' }}
              >
                Edit
              </button>
            )}
            <button 
              type="button" 
              className="remove-button"
              onClick={() => onRemove(index)}
            >
              Remove
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}

