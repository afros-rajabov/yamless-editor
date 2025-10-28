/**
 * @prettier
 */

import React, { Component } from "react"
import PropTypes from "prop-types"
import SearchableSelect from "core/plugins/oas31/components/models/SearchableSelect"
import { filterSchemas } from "core/plugins/oas31/components/models/schemaDialogUtils"
import {
  formDataToParameter,
  parameterToFormData,
  validateParameterForm,
  getPrimitiveTypeOptions,
  getParameterLocationOptions,
  isSchemaReference,
  extractSchemaName
} from "core/utils/parameter-utils"

export default class ParameterEditForm extends Component {
  static propTypes = {
    parameter: PropTypes.object, // Current parameter being edited (null for new)
    onSave: PropTypes.func.isRequired,
    onDelete: PropTypes.func.isRequired,
    onClear: PropTypes.func.isRequired,
    schemas: PropTypes.array.isRequired,
    pathMethod: PropTypes.array.isRequired,
    specSelectors: PropTypes.object.isRequired,
    isOperationEditMode: PropTypes.bool
  }

  static defaultProps = {
    isOperationEditMode: false
  }

  constructor(props) {
    super(props)
    
    this.state = {
      formData: this.initializeFormData(),
      typeSearch: "",
      typeDropdownOpen: false,
      itemsTypeSearch: "",
      itemsTypeDropdownOpen: false,
      validationErrors: []
    }
  }

  componentDidUpdate(prevProps) {
    if (prevProps.parameter !== this.props.parameter) {
      this.setState({
        formData: this.initializeFormData(),
        validationErrors: []
      })
    }
  }

  initializeFormData = () => {
    if (this.props.parameter) {
      return parameterToFormData(this.props.parameter.toJS())
    }
    
    return {
      name: "",
      in: "query",
      description: "",
      required: false,
      type: "",
      format: "",
      default: "",
      example: "",
      minimum: "",
      maximum: "",
      itemsType: ""
    }
  }

  handleInputChange = (field, value) => {
    this.setState(prevState => {
      const newFormData = {
        ...prevState.formData,
        [field]: value
      }
      
      // If location changes from "query" to something else, clear schema references and complex types
      if (field === "in" && value !== "query" && prevState.formData.in === "query") {
        // Clear type if it's a schema reference, array, or object
        if (isSchemaReference(newFormData.type) || 
            newFormData.type === "array" || 
            newFormData.type === "object") {
          newFormData.type = ""
        }
        // Clear itemsType if it's a schema reference
        if (isSchemaReference(newFormData.itemsType)) {
          newFormData.itemsType = ""
        }
      }
      
      return {
        formData: newFormData,
        validationErrors: []
      }
    })
  }

  handleTypeChange = (type) => {
    this.handleInputChange("type", type)
    // Clear format when type changes
    this.handleInputChange("format", "")
  }

  handleItemsTypeChange = (itemsType) => {
    this.handleInputChange("itemsType", itemsType)
  }

  handleSave = () => {
    const validation = validateParameterForm(this.state.formData)
    
    if (!validation.isValid) {
      this.setState({ validationErrors: validation.errors })
      return
    }

    const parameter = formDataToParameter(this.state.formData)
    
    if (this.props.parameter) {
      // Editing existing parameter
      const oldIdentifier = {
        name: this.props.parameter.get("name"),
        in: this.props.parameter.get("in")
      }
      this.props.onSave(parameter, oldIdentifier)
    } else {
      // Adding new parameter
      this.props.onSave(parameter)
    }
  }

  handleDelete = () => {
    if (this.props.parameter) {
      const identifier = {
        name: this.props.parameter.get("name"),
        in: this.props.parameter.get("in")
      }
      this.props.onDelete(identifier)
    }
  }

  handleClear = () => {
    this.setState({
      formData: this.initializeFormData(),
      validationErrors: []
    })
    this.props.onClear()
  }

  render() {
    const { formData, validationErrors, typeSearch, typeDropdownOpen, itemsTypeSearch, itemsTypeDropdownOpen } = this.state
    const { parameter, isOperationEditMode } = this.props
    const isEditing = !!parameter

    const allPrimitiveTypeOptions = getPrimitiveTypeOptions()
    const locationOptions = getParameterLocationOptions()
    
    // Filter primitive types based on location - exclude array and object for non-query locations
    const primitiveTypeOptions = formData.in === "query" 
      ? allPrimitiveTypeOptions
      : allPrimitiveTypeOptions.filter(option => 
          option.value !== "array" && option.value !== "object"
        )
    
    // Get schemas from specSelectors like the property forms do
    const schemas = this.props.specSelectors.selectSchemas()
    // Only include schema options if location is "query"
    const schemaOptions = formData.in === "query" 
      ? filterSchemas(typeSearch, schemas).map(schemaKey => ({
          value: `#/components/schemas/${schemaKey}`,
          label: schemaKey
        }))
      : []

    return (
      <div className="parameter-edit-form">
        <div className="parameter-edit-form-header">
          <h4>{isEditing ? "Edit Parameter" : "Add New Parameter"}</h4>
        </div>

        {validationErrors.length > 0 && (
          <div className="parameter-edit-form-errors">
            {validationErrors.map((error, index) => (
              <div key={index} className="error-message">{error}</div>
            ))}
          </div>
        )}

        <div className="parameter-edit-form-fields">
          <div className="form-row">
            <div className="form-field">
              <label className="form-label">
                Location <span className="required">*</span>
              </label>
              <select
                className="form-input"
                value={formData.in}
                onChange={(e) => this.handleInputChange("in", e.target.value)}
                disabled={isEditing}
              >
                {locationOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-field">
              <label className="form-label">
                Name <span className="required">*</span>
              </label>
              <input
                type="text"
                className="form-input"
                value={formData.name}
                onChange={(e) => this.handleInputChange("name", e.target.value)}
                placeholder="Parameter name"
              />
            </div>
          </div>

          <div className="form-field">
            <label className="form-label">Description</label>
            <input
              type="text"
              className="form-input"
              value={formData.description}
              onChange={(e) => this.handleInputChange("description", e.target.value)}
              placeholder="Parameter description"
            />
          </div>

          <div className="form-row">
            <div className="form-field">
              <label className="form-label">
                Type <span className="required">*</span>
              </label>
              <SearchableSelect
                value={formData.type}
                onChange={this.handleTypeChange}
                placeholder="Select type..."
                searchValue={typeSearch}
                onSearchChange={(value) => this.setState({ typeSearch: value })}
                isOpen={typeDropdownOpen}
                onToggle={(open) => this.setState({ typeDropdownOpen: open })}
                displayValue={isSchemaReference(formData.type) 
                  ? extractSchemaName(formData.type) 
                  : formData.type}
                primitiveOptions={primitiveTypeOptions}
                options={schemaOptions}
              />
            </div>

            {formData.type && !isSchemaReference(formData.type) && (
              <div className="form-field">
                <label className="form-label">Format</label>
                <select
                  className="form-input"
                  value={formData.format}
                  onChange={(e) => this.handleInputChange("format", e.target.value)}
                >
                  <option value="">None</option>
                  {formData.type === "string" && (
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
                  {(formData.type === "number" || formData.type === "integer") && (
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
          </div>

          {formData.type === "array" && !isSchemaReference(formData.type) && (
            <div className="form-field">
              <label className="form-label">Items Type</label>
              <SearchableSelect
                value={formData.itemsType}
                onChange={this.handleItemsTypeChange}
                placeholder="Select items type..."
                searchValue={itemsTypeSearch}
                onSearchChange={(value) => this.setState({ itemsTypeSearch: value })}
                isOpen={itemsTypeDropdownOpen}
                onToggle={(open) => this.setState({ itemsTypeDropdownOpen: open })}
                displayValue={isSchemaReference(formData.itemsType) 
                  ? extractSchemaName(formData.itemsType) 
                  : formData.itemsType}
                primitiveOptions={primitiveTypeOptions}
                options={formData.in === "query" 
                  ? filterSchemas(itemsTypeSearch, schemas).map(schemaKey => ({
                      value: `#/components/schemas/${schemaKey}`,
                      label: schemaKey
                    }))
                  : []}
              />
            </div>
          )}

          <div className="form-row">
            <div className="form-field">
              <label className="form-label">Default Value</label>
              <input
                type="text"
                className="form-input"
                value={formData.default}
                onChange={(e) => this.handleInputChange("default", e.target.value)}
                placeholder="Default value"
              />
            </div>

            <div className="form-field">
              <label className="form-label">Example</label>
              <input
                type="text"
                className="form-input"
                value={formData.example}
                onChange={(e) => this.handleInputChange("example", e.target.value)}
                placeholder="Example value"
              />
            </div>
          </div>


          {(formData.type === "number" || formData.type === "integer") && !isSchemaReference(formData.type) && (
            <div className="form-row">
              <div className="form-field">
                <label className="form-label">Minimum</label>
                <input
                  type="number"
                  className="form-input"
                  value={formData.minimum}
                  onChange={(e) => this.handleInputChange("minimum", e.target.value)}
                  placeholder="Minimum value"
                />
              </div>

              <div className="form-field">
                <label className="form-label">Maximum</label>
                <input
                  type="number"
                  className="form-input"
                  value={formData.maximum}
                  onChange={(e) => this.handleInputChange("maximum", e.target.value)}
                  placeholder="Maximum value"
                />
              </div>
            </div>
          )}

          <div className="form-field">
            <label className="form-checkbox">
              <input
                type="checkbox"
                checked={formData.required}
                onChange={(e) => this.handleInputChange("required", e.target.checked)}
              />
              <span className="form-checkbox-label">Required</span>
            </label>
          </div>
        </div>

        <div className="parameter-edit-form-actions">
          <button
            className="btn btn-primary"
            onClick={this.handleSave}
          >
            {isOperationEditMode 
              ? (isEditing ? "Stage Update" : "Stage New Parameter")
              : (isEditing ? "Update Parameter" : "Add Parameter")
            }
          </button>
          
          <button
            className="btn btn-secondary"
            onClick={this.handleClear}
          >
            Clear
          </button>
          
          {isEditing && (
            <button
              className="btn btn-danger"
              onClick={this.handleDelete}
            >
              {isOperationEditMode ? "Stage Deletion" : "Delete Parameter"}
            </button>
          )}
        </div>
      </div>
    )
  }
}
