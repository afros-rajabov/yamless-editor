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

    // Allowed content types
const allowedContentTypes = [
  "application/json", 
  "application/xml",
  "application/yaml",
  "multipart/form-data"
]

export default class RequestBodyEditForm extends Component {
  static propTypes = {
    requestBody: ImPropTypes.map,
    onSave: PropTypes.func.isRequired,
    onDelete: PropTypes.func.isRequired,
    isOperationEditMode: PropTypes.bool,
    specSelectors: PropTypes.object.isRequired,
    path: PropTypes.string,
    method: PropTypes.string,
  }

  static defaultProps = {
    requestBody: null,
    isOperationEditMode: true,
  }

  constructor(props) {
    super(props)

    this.state = this.initializeState(props)
  }

  componentDidUpdate(prevProps) {
    if (prevProps.requestBody !== this.props.requestBody) {
      this.setState(this.initializeState(this.props))
    }
  }

  initializeState = (props) => {
    const { requestBody, specSelectors, path, method } = props
    let description = ""
    let required = false
    let contentType = "application/json"
    let schemaType = ""

    
    if (requestBody) {
      // Handle Immutable Map
      if (requestBody.get && typeof requestBody.get === "function") {
        description = requestBody.get("description") || ""
        required = requestBody.get("required") || false
        const content = requestBody.get("content")
        if (content && content.keySeq && content.keySeq().size > 0) {
          const firstContentType = content.keySeq().first()
          // Only use the contentType if it's in our allowed list, otherwise default to application/json
          contentType = allowedContentTypes.includes(firstContentType) ? firstContentType : "application/json"
          // Get schema from the first content type (even if not in allowed list) to preserve schema data
          const mediaTypeObj = content.get(firstContentType)
          if (mediaTypeObj) {
            let schema = mediaTypeObj.get("schema")
            if (schema) {
              // Try to get $ref from Immutable Map first
              let schemaRef = null
              
              if (schema.get && typeof schema.get === "function") {
                schemaRef = schema.get("$ref")
              }
              
              // If not found, convert to plain object and check again
              if (!schemaRef) {
                const schemaObj = schema.toJS ? schema.toJS() : schema
                schemaRef = schemaObj?.$ref
              }
              
              // If still not found and we have path/method, try to get it from the original spec
              if (!schemaRef && specSelectors && path && method) {
                try {
                  const specJson = specSelectors.specJson()
                  if (specJson) {
                    const originalRequestBody = specJson.getIn(["paths", path, method, "requestBody"])
                    if (originalRequestBody) {
                      const originalContent = originalRequestBody.get("content")
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
        const requestBodyObj = requestBody.toJS ? requestBody.toJS() : requestBody
        description = requestBodyObj?.description || ""
        required = requestBodyObj?.required || false
        
        if (requestBodyObj?.content && typeof requestBodyObj.content === "object") {
          const contentKeys = Object.keys(requestBodyObj.content)
          if (contentKeys.length > 0) {
            const firstContentType = contentKeys[0]
            // Only use the contentType if it's in our allowed list, otherwise default to application/json
            contentType = allowedContentTypes.includes(firstContentType) ? firstContentType : "application/json"
            // Get schema from the first content type (even if not in allowed list) to preserve schema data
            const mediaTypeObj = requestBodyObj.content[firstContentType]
            if (mediaTypeObj?.schema) {
              const schema = mediaTypeObj.schema
              // Always check for $ref first (schema reference)
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
      description,
      required,
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
    if (this.props.requestBody) {
      this.props.onDelete()
    }
  }

  handleSave = () => {
    const { description, required, contentType, schemaType } = this.state

    const trimmedDescription = (description || "").trim()
    const trimmedContentType = (contentType || "").trim()

    const errors = []

    if (!trimmedContentType) {
      errors.push("Content type is required")
    }

    if (!schemaType) {
      errors.push("Schema type is required")
    }

    if (errors.length > 0) {
      this.setState({ validationErrors: errors })
      return
    }

    // Build request body payload with content structure
    const requestBodyPayload = {}
    
    // Only include description if it's not empty
    if (trimmedDescription) {
      requestBodyPayload.description = trimmedDescription
    }

    // Include required flag
    requestBodyPayload.required = required

    // Build schema object
    let schema = {}
    if (isSchemaReference(schemaType)) {
      schema = { $ref: schemaType }
    } else {
      schema = { type: schemaType }
    }

    // Add content with media type
    requestBodyPayload.content = {
      [trimmedContentType]: {
        schema
      }
    }

    this.props.onSave(requestBodyPayload)
  }

  render() {
    const { description, required, contentType, schemaType, validationErrors, typeSearch, typeDropdownOpen } = this.state
    const { requestBody, isOperationEditMode, specSelectors } = this.props
    const isEditing = Boolean(requestBody)

    const saveLabel = isOperationEditMode
      ? (isEditing ? "Stage Update" : "Stage New Request Body")
      : (isEditing ? "Update Request Body" : "Add Request Body")

    const allPrimitiveTypeOptions = getPrimitiveTypeOptions()
    const schemas = specSelectors.selectSchemas()
    const schemaOptions = filterSchemas(typeSearch, schemas).map(schemaKey => ({
      value: `#/components/schemas/${schemaKey}`,
      label: schemaKey
    }))

    const contentTypeOptions = allowedContentTypes.map(contentType => ({
      value: contentType,
      label: contentType
    }))

    return (
      <div className="request-body-edit-form">
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
            <textarea
              className="form-input"
              value={description}
              onChange={(event) => this.handleInputChange("description", event.target.value)}
              placeholder="Describe the request body"
              rows="3"
            />
          </div>

          <div className="form-field">
            <label className="form-checkbox">
              <input
                type="checkbox"
                checked={required}
                onChange={(e) => this.handleInputChange("required", e.target.checked)}
              />
              <span className="form-checkbox-label">Required</span>
            </label>
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
              {isOperationEditMode ? "Stage Deletion" : "Delete Request Body"}
            </button>
          ) : null}
        </div>
      </div>
    )
  }
}


