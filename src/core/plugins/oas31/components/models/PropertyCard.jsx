/**
 * @prettier
 */
import React from "react"
import PropTypes from "prop-types"

const refPrefix = "#/components/schemas/"

const PropertyCard = ({ 
  property, 
  index, 
  onRemove, 
  onEdit,
  safeExtractSchemaName 
}) => {
  const renderPropertyInfo = () => {
    if (property.anyOf || property.oneOf || property.allOf) {
      const compositionType = property.anyOf ? 'anyOf' : property.oneOf ? 'oneOf' : 'allOf'
      const schemas = property[compositionType].map(cType => {
        const refValue = cType.$ref || cType.$$ref
        return refValue ? safeExtractSchemaName(refValue): cType.type
      }
      ).join(', ')
      return `(${compositionType}[${schemas}] ${property.required ? ', required' : ''})`
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
    <div className="property-card" style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '10px',
      margin: '5px 0',
      border: '1px solid #e0e0e0',
      borderRadius: '4px',
      backgroundColor: '#f9f9f9'
    }}>
      <div className="property-info">
        <strong>{property.name}</strong>
        <span style={{ margin: '0 10px', color: '#666' }}>
          {renderPropertyInfo()}
        </span>
        {property.description && (
          <span style={{ color: '#666', fontSize: '0.9em' }}>
            - {property.description}
          </span>
        )}
      </div>
      <div className="property-actions" style={{ display: 'flex', gap: '8px' }}>
        {onEdit && (
          <button 
            type="button" 
            className="btn btn-secondary btn-sm" 
            onClick={() => onEdit(index)}
          >
            Edit
          </button>
        )}
        <button 
          type="button" 
          className="btn btn-danger btn-sm" 
          onClick={() => onRemove(index)}
        >
          Remove
        </button>
      </div>
    </div>
  )
}

PropertyCard.propTypes = {
  property: PropTypes.object.isRequired,
  index: PropTypes.number.isRequired,
  onRemove: PropTypes.func.isRequired,
  onEdit: PropTypes.func,
  safeExtractSchemaName: PropTypes.func.isRequired
}

export default PropertyCard
