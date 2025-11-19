/**
 * @prettier
 */
import React from "react"
import PropTypes from "prop-types"
import SearchableSelect from "./SearchableSelect"
import {
  safeExtractSchemaName,
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
  SelectedSchemasList
} from "./SchemaDialogComponents"

const PropertyForm = ({
  currentProperty,
  setCurrentProperty,
  editingPropertyIndex,
  validationErrors,
  propertyTypeSearch,
  setPropertyTypeSearch,
  propertyItemsTypeSearch,
  setPropertyItemsTypeSearch,
  compositionSchemaSearch,
  setCompositionSchemaSearch,
  contentSchemaSearch,
  setContentSchemaSearch,
  propertyDropdownOpen,
  setPropertyDropdownOpen,
  propertyItemsDropdownOpen,
  setPropertyItemsDropdownOpen,
  compositionDropdownOpen,
  setCompositionDropdownOpen,
  contentSchemaDropdownOpen,
  setContentSchemaDropdownOpen,
  isEditMode,
  schemas,
  getSchemaOptionsWithRefHelper,
  getSchemaOptionsWithoutRefHelper,
  getSchemaOptionsWithRef,
  getSchemaOptionsWithoutRef,
  handleAddProperty,
  handleCancelEdit,
  checkboxLabelStyle,
  checkboxInputStyle
}) => {
  return (
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
            disabled={editingPropertyIndex !== null}
            type="checkbox" 
            checked={currentProperty.isComposition} 
            onChange={(e) => setCurrentProperty({
              ...currentProperty, 
              isComposition: e.target.checked,
              format: e.target.checked ? "" : currentProperty.format
            })}
            style={checkboxInputStyle}
          />
          {isEditMode ? 'Is Composition' : 'Use Composition'}
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
            primitiveOptions={primitiveTypeOptions}
            options={isEditMode 
              ? getSchemaOptionsWithRefHelper(propertyTypeSearch)
              : getSchemaOptionsWithRef(propertyTypeSearch, schemas)}
          />
        </div>
      </div>
      
      
      {/* Composition Controls */}
      {currentProperty.isComposition && (
        <>
          <div className="form-field" style={{ marginBottom: '12px' }}>
            <label className="form-label">Composition Type <span className="required">*</span></label>
            <CompositionTypeSelect
              value={currentProperty.compositionType}
              onChange={(e) => setCurrentProperty({...currentProperty, compositionType: e.target.value})}
            />
          </div>
          
          <div className="form-field">
            <label className="form-label">Member Schemas/Types<span className="required">*</span></label>
            <div className="schema-selection">
              <SelectedSchemasList
                schemas={currentProperty.compositionSchemas}
                onRemove={(index) => setCurrentProperty({
                  ...currentProperty, 
                  compositionSchemas: currentProperty.compositionSchemas.filter((_, i) => i !== index)
                })}
              />
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
                primitiveOptions={primitiveTypeOptions}
                options={isEditMode 
                  ? getSchemaOptionsWithoutRefHelper(compositionSchemaSearch)
                  : getSchemaOptionsWithoutRef(compositionSchemaSearch, schemas)}
              />
            </div>
            {validationErrors.compositionSchemas && (
              <div className="form-error">{validationErrors.compositionSchemas}</div>
            )}
          </div>
        </>
      )}
      
      {currentProperty.type === "array" && (
        <>
          <div className="form-field" style={{ marginBottom: '12px' }}>
            <label className="form-label">Items Type <span className="required">*</span></label>
            <SearchableSelect
              value={
                currentProperty.itemsType
              }
              onChange={(value) => setCurrentProperty({...currentProperty, itemsType: value, itemsFormat: ""})}
              placeholder="Select items type..."
              searchValue={propertyItemsTypeSearch}
              onSearchChange={setPropertyItemsTypeSearch}
              isOpen={propertyItemsDropdownOpen}
              onToggle={setPropertyItemsDropdownOpen}
              displayValue={currentProperty.itemsType.includes(refPrefix) 
                ? safeExtractSchemaName(currentProperty.itemsType) 
                : currentProperty.itemsType}
              primitiveOptions={primitiveTypeOptions}
                options={isEditMode 
                  ? getSchemaOptionsWithRefHelper(propertyItemsTypeSearch)
                  : getSchemaOptionsWithRef(propertyItemsTypeSearch, schemas)}
            />
          </div>
          {currentProperty.itemsType && 
           !currentProperty.itemsType.includes(refPrefix) && 
           (currentProperty.itemsType === "string" || 
            currentProperty.itemsType === "number" || 
            currentProperty.itemsType === "integer") && (
            <div className="form-field" style={{ marginBottom: '12px' }}>
              <label className="form-label">Items Format</label>
              <FormatSelect
                type={currentProperty.itemsType}
                value={currentProperty.itemsFormat}
                onChange={(e) => setCurrentProperty({...currentProperty, itemsFormat: e.target.value})}
                includeBinary={true}
              />
            </div>
          )}
        </>
      )}
      
      {/* Content Media Type and Schema (only for string type) */}
      {currentProperty.type === "string" && currentProperty.isComposition == false && !currentProperty.format && (
        <div style={{ display: 'flex', gap: '15px', marginBottom: '12px' }}>
          <div className="form-field" style={{ flex: 1 }}>
            <label className="form-label">Content Media Type</label>
            <select 
              className="form-input" 
              value={currentProperty.contentMediaType} 
              onChange={(e) => setCurrentProperty({
                ...currentProperty, 
                contentMediaType: e.target.value,
                format: "" // Clear format when contentMediaType is set
              })}
            >
              <option value="">None</option>
              {contentMediaTypeOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div className="form-field" style={{ flex: 1 }}>
            <label className="form-label">Content Schema</label>
            <SearchableSelect
              value={currentProperty.contentSchema}
              onChange={(value) => setCurrentProperty({
                ...currentProperty, 
                contentSchema: value,
                format: "" // Clear format when contentSchema is set
              })}
              placeholder="Select content schema..."
              searchValue={contentSchemaSearch}
              onSearchChange={setContentSchemaSearch}
              isOpen={contentSchemaDropdownOpen}
              onToggle={setContentSchemaDropdownOpen}
              disabled={!currentProperty.contentMediaType}
              displayValue={currentProperty.contentSchema && currentProperty.contentSchema.includes(refPrefix) 
                ? safeExtractSchemaName(currentProperty.contentSchema) 
                : currentProperty.contentSchema || ""}
              primitiveOptions={emptyPrimitiveOptions}
              options={isEditMode 
                ? getSchemaOptionsWithRefHelper(contentSchemaSearch)
                : getSchemaOptionsWithRef(contentSchemaSearch, schemas)}
            />
          </div>
        </div>
      )}
      
      <div style={{ display: 'flex', gap: '15px', marginBottom: '12px' }}>
        {!currentProperty.isComposition && 
         (currentProperty.type === "string" || 
          currentProperty.type === "number" || 
          currentProperty.type === "integer") &&
         !currentProperty.contentMediaType &&
         !currentProperty.contentSchema && (
          <div className="form-field" style={{ flex: 1 }}>
            <label className="form-label">Format</label>
            <FormatSelect
              type={currentProperty.type}
              value={currentProperty.format}
              onChange={(e) => setCurrentProperty({
                ...currentProperty, 
                format: e.target.value,
                contentMediaType: "", // Clear contentMediaType when format is set
                contentSchema: "" // Clear contentSchema when format is set
              })}
              includeBinary={true}
            />
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
      
      <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
        {editingPropertyIndex !== null && (
          <button 
            type="button" 
            className="btn btn-secondary" 
            onClick={handleCancelEdit}
          >
            Cancel Edit
          </button>
        )}
        <button 
          type="button" 
          className="btn btn-primary" 
          onClick={handleAddProperty}
        >
          {editingPropertyIndex !== null ? 'Update Property' : 'Add Property'}
        </button>
      </div>
    </div>
  )
}

PropertyForm.propTypes = {
  currentProperty: PropTypes.object.isRequired,
  setCurrentProperty: PropTypes.func.isRequired,
  editingPropertyIndex: PropTypes.number,
  validationErrors: PropTypes.object.isRequired,
  propertyTypeSearch: PropTypes.string.isRequired,
  setPropertyTypeSearch: PropTypes.func.isRequired,
  propertyItemsTypeSearch: PropTypes.string.isRequired,
  setPropertyItemsTypeSearch: PropTypes.func.isRequired,
  compositionSchemaSearch: PropTypes.string.isRequired,
  setCompositionSchemaSearch: PropTypes.func.isRequired,
  contentSchemaSearch: PropTypes.string.isRequired,
  setContentSchemaSearch: PropTypes.func.isRequired,
  propertyDropdownOpen: PropTypes.bool.isRequired,
  setPropertyDropdownOpen: PropTypes.func.isRequired,
  propertyItemsDropdownOpen: PropTypes.bool.isRequired,
  setPropertyItemsDropdownOpen: PropTypes.func.isRequired,
  compositionDropdownOpen: PropTypes.bool.isRequired,
  setCompositionDropdownOpen: PropTypes.func.isRequired,
  contentSchemaDropdownOpen: PropTypes.bool.isRequired,
  setContentSchemaDropdownOpen: PropTypes.func.isRequired,
  isEditMode: PropTypes.bool.isRequired,
  schemas: PropTypes.object.isRequired,
  getSchemaOptionsWithRefHelper: PropTypes.func.isRequired,
  getSchemaOptionsWithoutRefHelper: PropTypes.func.isRequired,
  getSchemaOptionsWithRef: PropTypes.func.isRequired,
  getSchemaOptionsWithoutRef: PropTypes.func.isRequired,
  handleAddProperty: PropTypes.func.isRequired,
  handleCancelEdit: PropTypes.func.isRequired,
  checkboxLabelStyle: PropTypes.object.isRequired,
  checkboxInputStyle: PropTypes.object.isRequired
}

export default PropertyForm

