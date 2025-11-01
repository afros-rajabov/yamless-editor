/**
 * @prettier
 */

import React, { Component } from "react"
import PropTypes from "prop-types"
import ImPropTypes from "react-immutable-proptypes"
import SearchableSelect from "core/plugins/oas31/components/models/SearchableSelect"
import { filterSchemas } from "core/plugins/oas31/components/models/schemaDialogUtils"
import {
  getPrimitiveTypeOptions,
  isSchemaReference,
  extractSchemaName
} from "core/utils/parameter-utils"

export default class ResponseEditForm extends Component {
  static propTypes = {
    initialCode: PropTypes.string,
    response: ImPropTypes.map,
    existingCodes: PropTypes.arrayOf(PropTypes.string),
    onSave: PropTypes.func.isRequired,
    onDelete: PropTypes.func.isRequired,
    isOperationEditMode: PropTypes.bool,
    specSelectors: PropTypes.object.isRequired,
    path: PropTypes.string,
    method: PropTypes.string,
  }

  static defaultProps = {
    initialCode: "",
    response: null,
    existingCodes: [],
    isOperationEditMode: true,
  }

  constructor(props) {
    super(props)

    this.state = this.initializeState(props)
  }

  componentDidUpdate(prevProps) {
    if (prevProps.initialCode !== this.props.initialCode || prevProps.response !== this.props.response) {
      this.setState(this.initializeState(this.props))
    }
  }

  initializeState = (props) => {
    const { initialCode, response, specSelectors, path, method } = props
    let description = ""
    let contentType = "application/json"
    let schemaType = ""
    
    if (response) {
      // Handle Immutable Map
      if (response.get && typeof response.get === "function") {
        description = response.get("description") || ""
        const content = response.get("content")
        if (content && content.keySeq && content.keySeq().size > 0) {
          contentType = content.keySeq().first()
          const mediaTypeObj = content.get(contentType)
          if (mediaTypeObj) {
            let schema = mediaTypeObj.get("schema")
            if (schema) {
              // For existing responses, schema might be resolved but should still have $ref
              // Check $ref in both Immutable Map format and plain object format
              let schemaRef = null
              
              // Try to get $ref from Immutable Map first
              if (schema.get && typeof schema.get === "function") {
                schemaRef = schema.get("$ref")
              }
              
              // If not found, convert to plain object and check again
              if (!schemaRef) {
                const schemaObj = schema.toJS ? schema.toJS() : schema
                schemaRef = schemaObj?.$ref
              }
              
              // If still not found and we have path/method, try to get it from the original spec
              if (!schemaRef && specSelectors && initialCode && path && method) {
                try {
                  // Get the original unresolved response from specJson
                  const specJson = specSelectors.specJson()
                  if (specJson) {
                    const originalResponse = specJson.getIn(["paths", path, method, "responses", initialCode])
                    if (originalResponse) {
                      const originalContent = originalResponse.get("content")
                      if (originalContent) {
                        const originalMediaTypeObj = originalContent.get(contentType)
                        if (originalMediaTypeObj) {
                          const originalSchema = originalMediaTypeObj.get("schema")
                          if (originalSchema) {
                            schemaRef = originalSchema.get("$ref")
                            if (!schemaRef) {
                              const originalSchemaObj = originalSchema.toJS ? originalSchema.toJS() : originalSchema
                              schemaRef = originalSchemaObj?.$ref
                            }
                          }
                        }
                      }
                    }
                  }
                } catch (e) {
                  // Ignore errors trying to access spec
                }
              }
              
              // Always prioritize $ref if it exists
              if (schemaRef) {
                schemaType = schemaRef
              } else {
                // Fall back to type only if no $ref
                const schemaObj = schema.toJS ? schema.toJS() : schema
                const schemaTypeValue = schemaObj?.type
                if (schemaTypeValue) {
                  schemaType = schemaTypeValue
                }
              }
            }
          }
        }
      } else {
        // Handle plain JS object
        const responseObj = response.toJS ? response.toJS() : response
        description = responseObj?.description || ""
        
        if (responseObj?.content && typeof responseObj.content === "object") {
          const contentKeys = Object.keys(responseObj.content)
          if (contentKeys.length > 0) {
            contentType = contentKeys[0]
            const mediaTypeObj = responseObj.content[contentType]
            if (mediaTypeObj?.schema) {
              const schema = mediaTypeObj.schema
              // Always check for $ref first (schema reference) - even if schema has been resolved
              if (schema.$ref) {
                schemaType = schema.$ref
              } else if (schema.type) {
                schemaType = schema.type
              }
            }
          }
        }
      }
    }

    return {
      code: initialCode || "",
      description,
      contentType,
      schemaType,
      typeSearch: "",
      typeDropdownOpen: false,
      validationErrors: [],
    }
  }

  handleInputChange = (field, value) => {
    this.setState({
      [field]: value,
      validationErrors: [],
    })
  }

  handleTypeChange = (type) => {
    this.handleInputChange("schemaType", type)
  }

  handleReset = () => {
    this.setState(this.initializeState(this.props))
  }

  handleDelete = () => {
    if (this.props.initialCode) {
      this.props.onDelete(this.props.initialCode)
    }
  }

  handleSave = () => {
    const { code, description, contentType, schemaType } = this.state
    const { existingCodes, initialCode } = this.props

    const trimmedCode = (code || "").trim()
    const trimmedDescription = (description || "").trim()
    const trimmedContentType = (contentType || "").trim()

    const errors = []

    if (!trimmedCode) {
      errors.push("Status code is required")
    }

    if (!trimmedContentType) {
      errors.push("Content type is required")
    }

    if (!schemaType) {
      errors.push("Schema type is required")
    }

    if (trimmedCode && trimmedCode !== initialCode && existingCodes.includes(trimmedCode)) {
      errors.push(`A response for status code '${trimmedCode}' already exists`)
    }

    if (errors.length > 0) {
      this.setState({ validationErrors: errors })
      return
    }

    // Build response payload with content structure
    const responsePayload = {}
    
    // Only include description if it's not empty
    if (trimmedDescription) {
      responsePayload.description = trimmedDescription
    }

    // Build schema object
    let schema = {}
    if (isSchemaReference(schemaType)) {
      schema = { $ref: schemaType }
    } else {
      schema = { type: schemaType }
    }

    // Add content with media type
    responsePayload.content = {
      [trimmedContentType]: {
        schema
      }
    }

    this.props.onSave({
      code: trimmedCode,
      response: responsePayload,
    })
  }

  render() {
    const { code, description, contentType, schemaType, validationErrors, typeSearch, typeDropdownOpen } = this.state
    const { initialCode, isOperationEditMode, specSelectors } = this.props
    const isEditing = Boolean(initialCode)

    const saveLabel = isOperationEditMode
      ? (isEditing ? "Stage Update" : "Stage New Response")
      : (isEditing ? "Update Response" : "Add Response")

    const allPrimitiveTypeOptions = getPrimitiveTypeOptions()
    const schemas = specSelectors.selectSchemas()
    const schemaOptions = filterSchemas(typeSearch, schemas).map(schemaKey => ({
      value: `#/components/schemas/${schemaKey}`,
      label: schemaKey
    }))

    const contentTypeOptions = [
      { value: "application/json", label: "application/json" },
      { value: "application/xml", label: "application/xml" },
      { value: "text/plain", label: "text/plain" },
      { value: "text/html", label: "text/html" },
      { value: "application/octet-stream", label: "application/octet-stream" },
    ]

    return (
      <div className="response-edit-form">
        {validationErrors.length > 0 && (
          <div className="parameter-edit-form-errors">
            {validationErrors.map((error, index) => (
              <div key={index} className="error-message">{error}</div>
            ))}
          </div>
        )}

        <div className="parameter-edit-form-fields">
          <div className="form-field">
            <label className="form-label">
              Status Code <span className="required">*</span>
            </label>
            <input
              type="text"
              className="form-input"
              value={code}
              onChange={(event) => this.handleInputChange("code", event.target.value)}
              placeholder="e.g. 200, 404, default"
            />
          </div>

          <div className="form-field">
            <label className="form-label">
              Content Type <span className="required">*</span>
            </label>
            <select
              className="form-input"
              value={contentType}
              onChange={(e) => this.handleInputChange("contentType", e.target.value)}
            >
              {contentTypeOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="form-field">
            <label className="form-label">
              Schema Type <span className="required">*</span>
            </label>
            <SearchableSelect
              value={schemaType}
              onChange={this.handleTypeChange}
              placeholder="Select schema type..."
              searchValue={typeSearch}
              onSearchChange={(value) => this.setState({ typeSearch: value })}
              isOpen={typeDropdownOpen}
              onToggle={(open) => this.setState({ typeDropdownOpen: open })}
              displayValue={isSchemaReference(schemaType) 
                ? extractSchemaName(schemaType) 
                : schemaType}
              primitiveOptions={allPrimitiveTypeOptions}
              options={schemaOptions}
            />
          </div>

          <div className="form-field">
            <label className="form-label">
              Description
            </label>
            <input
              type="text"
              className="form-input"
              value={description}
              onChange={(event) => this.handleInputChange("description", event.target.value)}
              placeholder="Describe the response"
            />
          </div>
        </div>

        <div className="parameter-edit-form-actions" style={{ display: "flex", gap: "8px" }}>
          <button
            className="btn btn-primary"
            onClick={this.handleSave}
          >
            {saveLabel}
          </button>

          <button
            className="btn btn-secondary"
            onClick={this.handleReset}
          >
            Reset
          </button>

          {isEditing ? (
            <button
              className="btn btn-danger"
              onClick={this.handleDelete}
            >
              {isOperationEditMode ? "Stage Deletion" : "Delete Response"}
            </button>
          ) : null}
        </div>
      </div>
    )
  }
}


