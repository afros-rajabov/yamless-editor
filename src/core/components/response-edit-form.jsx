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

const dataContentTypes = {
  json: [
    { value: 'application/json', label: 'JSON Data' },
  ],
  xml: [
    { value: 'application/xml', label: 'XML Data' },
    { value: 'application/soap+xml', label: 'SOAP XML' }
  ],
  yaml: [
    { value: 'application/yaml', label: 'YAML Data' },
    { value: 'application/x-yaml', label: 'YAML Structured' },
  ],
  text: [
    { value: 'text/plain', label: 'Plain Text' },
    { value: 'text/xml', label: 'XML Text' },
    { value: 'text/yaml', label: 'YAML Text' },
    { value: 'text/html', label: 'HTML' },
    { value: 'text/csv', label: 'CSV' },
    { value: 'text/css', label: 'CSS Stylesheet' },
    { value: 'text/javascript', label: 'JavaScript' },
    { value: 'text/markdown', label: 'Markdown' },
  ],
}

const fileContentTypes = {
  documents: [
    { value: 'application/pdf', label: 'PDF Document' },
    { value: 'application/msword', label: 'Word Document (.doc)' },
    { value: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', label: 'Word Document (.docx)' }
  ],
  images: [
    { value: 'image/jpeg', label: 'JPEG Image' },
    { value: 'image/png', label: 'PNG Image' },
    { value: 'image/gif', label: 'GIF Image' },
    { value: 'image/svg+xml', label: 'SVG Image' },
    { value: 'image/webp', label: 'WebP Image' },
  ],
  spreadsheets: [
    { value: 'text/csv', label: 'CSV File' },
    { value: 'application/vnd.ms-excel', label: 'Excel Spreadsheet (.xls)' },
    { value: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', label: 'Excel Spreadsheet (.xlsx)' },
  ],
  archives: [
    { value: 'application/zip', label: 'ZIP Archive' },
    { value: 'application/x-rar-compressed', label: 'RAR Archive' },
    { value: 'application/x-tar', label: 'TAR Archive' },
    { value: 'application/gzip', label: 'GZIP Compressed' },
    { value: 'application/x-7z-compressed', label: '7-Zip Archive' },
    { value: 'application/x-bzip2', label: 'BZIP2 Archive' },
    { value: 'application/java-archive', label: 'JAR Archive' },
  ],
  audio: [
    { value: 'audio/mpeg', label: 'MP3 Audio' },
    { value: 'audio/wav', label: 'WAV Audio' },
    { value: 'audio/ogg', label: 'OGG Audio' },
    { value: 'audio/webm', label: 'WebM Audio' },
    { value: 'audio/aac', label: 'AAC Audio' },
    { value: 'audio/x-m4a', label: 'M4A Audio' },
    { value: 'audio/flac', label: 'FLAC Audio' },
    { value: 'audio/x-ms-wma', label: 'WMA Audio' },
    { value: 'audio/midi', label: 'MIDI Audio' },
    { value: 'audio/x-aiff', label: 'AIFF Audio' }
  ],
  video: [
    { value: 'video/mp4', label: 'MP4 Video' },
    { value: 'video/mpeg', label: 'MPEG Video' },
    { value: 'video/ogg', label: 'OGG Video' },
    { value: 'video/webm', label: 'WebM Video' },
    { value: 'video/quicktime', label: 'QuickTime (.mov)' },
    { value: 'video/x-msvideo', label: 'AVI Video' },
    { value: 'video/x-ms-wmv', label: 'WMV Video' },
    { value: 'video/x-flv', label: 'Flash Video (.flv)' },
    { value: 'video/3gpp', label: '3GPP Video' },
    { value: 'video/x-matroska', label: 'Matroska (.mkv)' }
  ],
  generic: [
    { value: 'application/octet-stream', label: 'Binary File (generic)' },
    { value: 'text/plain', label: 'Plain Text' }
  ]
}

// File dataType display name to key mapping
const fileDataTypeDisplayMap = {
  Document: "documents",
  Image: "images",
  Audio: "audio",
  Video: "video",
  Spreadsheet: "spreadsheets",
  Archive: "archives",
  Generic: "generic"
}

// File dataType key to display name mapping
const fileDataTypeKeyToDisplay = {
  documents: "Document",
  images: "Image",
  audio: "Audio",
  video: "Video",
  spreadsheets: "Spreadsheet",
  archives: "Archive",
  generic: "Generic"
}

// Helper function to determine dataType from contentType
const getDataTypeFromContentType = (contentType) => {
  if (!contentType) return "json"
  
  for (const [dataType, options] of Object.entries(dataContentTypes)) {
    if (options.some(opt => opt.value === contentType)) {
      return dataType
    }
  }
  
  // Default to json if no match found
  return "json"
}

// Helper function to determine file dataType from contentType
const getFileDataTypeFromContentType = (contentType) => {
  if (!contentType) return "generic"
  
  for (const [fileDataType, options] of Object.entries(fileContentTypes)) {
    if (options.some(opt => opt.value === contentType)) {
      return fileDataType
    }
  }
  
  // Default to generic if no match found
  return "generic"
}

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
    let dataType = "json"
    let responseMode = "data"
    
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
              // Check if this is a file response (type: string, format: binary)
              const schemaObj = schema.toJS ? schema.toJS() : schema
              const schemaTypeValue = schemaObj?.type
              const schemaFormat = schemaObj?.format
              
              // Detect file response
              if (schemaTypeValue === "string" && schemaFormat === "binary") {
                responseMode = "file"
                dataType = getFileDataTypeFromContentType(contentType)
                // Ensure contentType is valid for the detected file dataType, otherwise reset
                const validOptions = fileContentTypes[dataType] || []
                if (!validOptions.some(opt => opt.value === contentType)) {
                  contentType = validOptions.length > 0 ? validOptions[0].value : fileContentTypes.generic[0].value
                  dataType = "generic"
                }
              } else {
                // For existing responses, schema might be resolved but should still have $ref
                // Check $ref in both Immutable Map format and plain object format
                let schemaRef = null
                
                // Try to get $ref from Immutable Map first
                if (schema.get && typeof schema.get === "function") {
                  schemaRef = schema.get("$ref")
                }
                
                // If not found, convert to plain object and check again
                if (!schemaRef) {
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
                } else if (schemaTypeValue) {
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
              
              // Check if this is a file response (type: string, format: binary)
              if (schema.type === "string" && schema.format === "binary") {
                responseMode = "file"
                dataType = getFileDataTypeFromContentType(contentType)
                // Ensure contentType is valid for the detected file dataType, otherwise reset
                const validOptions = fileContentTypes[dataType] || []
                if (!validOptions.some(opt => opt.value === contentType)) {
                  contentType = validOptions.length > 0 ? validOptions[0].value : fileContentTypes.generic[0].value
                  dataType = "generic"
                }
              } else {
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
    }

    // If not detected as file, determine dataType from contentType for data mode
    if (responseMode === "data") {
      dataType = getDataTypeFromContentType(contentType)
      
      // If contentType doesn't match any dataType, default to json and set contentType to first json option
      if (!dataContentTypes[dataType].some(opt => opt.value === contentType)) {
        dataType = "json"
        contentType = dataContentTypes.json[0].value
      }
    }

    return {
      code: initialCode || "",
      description,
      contentType,
      schemaType,
      dataType,
      responseMode,
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

  handleModeChange = (newMode) => {
    const { responseMode } = this.state
    const { initialCode } = this.props
    const isEditing = Boolean(initialCode)
    
    // Prevent mode change when editing
    if (isEditing) return
    
    if (newMode === responseMode) return
    
    if (newMode === "file") {
      // Switch to file mode
      const defaultFileDataType = "generic"
      const defaultContentType = fileContentTypes[defaultFileDataType][0].value
      
      this.setState({
        responseMode: "file",
        dataType: defaultFileDataType,
        contentType: defaultContentType,
        schemaType: "",
        validationErrors: [],
      })
    } else {
      // Switch to data mode
      const defaultDataType = "json"
      const defaultContentType = dataContentTypes[defaultDataType][0].value
      
      this.setState({
        responseMode: "data",
        dataType: defaultDataType,
        contentType: defaultContentType,
        schemaType: "",
        validationErrors: [],
      })
    }
  }

  handleDataTypeChange = (newDataType) => {
    const { contentType, responseMode } = this.state
    
    if (responseMode === "file") {
      // Handle file data type change
      const validOptions = fileContentTypes[newDataType] || []
      const isCurrentContentTypeValid = validOptions.some(opt => opt.value === contentType)
      
      // If current contentType is not valid for new dataType, reset to first option of new dataType
      const newContentType = isCurrentContentTypeValid 
        ? contentType 
        : (validOptions.length > 0 ? validOptions[0].value : fileContentTypes.generic[0].value)
      
      this.setState({
        dataType: newDataType,
        contentType: newContentType,
        validationErrors: [],
      })
    } else {
      // Handle data type change (existing logic)
      const validOptions = dataContentTypes[newDataType] || []
      const isCurrentContentTypeValid = validOptions.some(opt => opt.value === contentType)
      
      // If current contentType is not valid for new dataType, reset to first option of new dataType
      const newContentType = isCurrentContentTypeValid 
        ? contentType 
        : (validOptions.length > 0 ? validOptions[0].value : "application/json")
      
      this.setState({
        dataType: newDataType,
        contentType: newContentType,
        validationErrors: [],
      })
    }
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
    const { code, description, contentType, schemaType, dataType, responseMode } = this.state
    const { existingCodes, initialCode } = this.props

    const trimmedCode = (code || "").trim()
    const trimmedDescription = (description || "").trim()
    const trimmedContentType = (contentType || "").trim()

    const errors = []

    if (!trimmedCode) {
      errors.push("Status code is required")
    }

    if (!dataType) {
      errors.push("Data type is required")
    }

    if (!trimmedContentType) {
      errors.push("Content type is required")
    }

    // Schema type is only required when in data mode and dataType is not "text"
    if (responseMode === "data" && dataType !== "text" && !schemaType) {
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

    // Build content object
    const mediaTypeObj = {}
    
    if (responseMode === "file") {
      // File mode: always use { type: "string", format: "binary" }
      mediaTypeObj.schema = {
        type: "string",
        format: "binary"
      }
    } else if (dataType !== "text") {
      // Data mode: Build schema object (only if not text)
      let schema = {}
      if (isSchemaReference(schemaType)) {
        schema = { $ref: schemaType }
      } else {
        schema = { type: schemaType }
      }
      mediaTypeObj.schema = schema
    }

    // Add content with media type
    responsePayload.content = {
      [trimmedContentType]: mediaTypeObj
    }

    this.props.onSave({
      code: trimmedCode,
      response: responsePayload,
    })
  }

  render() {
    const { code, description, contentType, schemaType, dataType, responseMode, validationErrors, typeSearch, typeDropdownOpen } = this.state
    const { initialCode, isOperationEditMode, specSelectors } = this.props
    const isEditing = Boolean(initialCode)

    const saveLabel = isOperationEditMode
      ? (isEditing ? "Update" : "Add")
      : (isEditing ? "Update Response" : "Add Response")

    const allPrimitiveTypeOptions = getPrimitiveTypeOptions()
    const schemas = specSelectors.selectSchemas()
    const schemaOptions = filterSchemas(typeSearch, schemas).map(schemaKey => ({
      value: `#/components/schemas/${schemaKey}`,
      label: schemaKey
    }))

    // Filter contentTypeOptions based on selected dataType and mode
    const contentTypeOptions = responseMode === "file"
      ? (fileContentTypes[dataType] || [])
      : (dataType && dataContentTypes[dataType] ? dataContentTypes[dataType] : [])

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
            <div className="mode-switcher" style={{ 
              display: 'flex', 
              marginBottom: '20px',
              border: '1px solid #dee2e6',
              borderRadius: '4px',
              overflow: 'hidden'
            }}>
              <button 
                type="button"
                className="btn tab-switcher-btn"
                onClick={() => this.handleModeChange("data")}
                disabled={isEditing}
                style={{ 
                  flex: 1,
                  backgroundColor: responseMode === "data" ? 'rgba(0, 0, 0, .051)' : '#ffffff',
                  color: responseMode === "data" ? '#000000' : '#6c757d',
                  border: 'none',
                  borderRadius: 0,
                  borderRight: '1px solid #dee2e6',
                  margin: 0,
                  transition: 'box-shadow 0.2s ease',
                  opacity: isEditing ? 0.6 : 1,
                  cursor: isEditing ? 'not-allowed' : 'pointer'
                }}
                onMouseEnter={(e) => {
                  if (!isEditing && responseMode !== "data") {
                    e.target.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.1)'
                  }
                }}
                onMouseLeave={(e) => {
                  e.target.style.boxShadow = 'none'
                }}
              >
                Data
              </button>
              <button 
                type="button"
                className="btn tab-switcher-btn"
                onClick={() => this.handleModeChange("file")}
                disabled={isEditing}
                style={{ 
                  flex: 1,
                  backgroundColor: responseMode === "file" ? 'rgba(0, 0, 0, .051)' : '#ffffff',
                  color: responseMode === "file" ? '#000000' : '#6c757d',
                  border: 'none',
                  borderRadius: 0,
                  margin: 0,
                  transition: 'box-shadow 0.2s ease',
                  opacity: isEditing ? 0.6 : 1,
                  cursor: isEditing ? 'not-allowed' : 'pointer'
                }}
                onMouseEnter={(e) => {
                  if (!isEditing && responseMode !== "file") {
                    e.target.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.1)'
                  }
                }}
                onMouseLeave={(e) => {
                  e.target.style.boxShadow = 'none'
                }}
              >
                File
              </button>
            </div>
          </div>

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
              Data Type <span className="required">*</span>
            </label>
            <select
              className="form-input"
              value={responseMode === "file" ? fileDataTypeKeyToDisplay[dataType] : dataType}
              onChange={(e) => {
                if (responseMode === "file") {
                  // Convert display name back to key
                  const fileDataTypeKey = fileDataTypeDisplayMap[e.target.value]
                  this.handleDataTypeChange(fileDataTypeKey)
                } else {
                  this.handleDataTypeChange(e.target.value)
                }
              }}
              disabled={isEditing}
            >
              {responseMode === "file" ? (
                <>
                  <option value="Document">Document</option>
                  <option value="Image">Image</option>
                  <option value="Audio">Audio</option>
                  <option value="Video">Video</option>
                  <option value="Spreadsheet">Spreadsheet</option>
                  <option value="Archive">Archive</option>
                  <option value="Generic">Generic</option>
                </>
              ) : (
                <>
                  <option value="json">JSON</option>
                  <option value="yaml">YAML</option>
                  <option value="xml">XML</option>
                  <option value="text">Text</option>
                </>
              )}
            </select>
          </div>

          <div className="form-field">
            <label className="form-label">
              Content Type <span className="required">*</span>
            </label>
            <select
              className="form-input"
              value={contentType}
              onChange={(e) => this.handleInputChange("contentType", e.target.value)}
              disabled={!dataType}
            >
              {contentTypeOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label || option.value}
                </option>
              ))}
            </select>
          </div>

          {responseMode === "data" && dataType !== "text" && (
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
          )}

          <div className="form-field">
            <label className="form-label">
              Description
            </label>
            <textarea
              className="form-textarea"
              value={description}
              onChange={(event) => this.handleInputChange("description", event.target.value)}
              placeholder="Describe the response"
              rows={6}
            />
          </div>
        </div>

        <div className="parameter-edit-form-actions">
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
              {isOperationEditMode ? "Delete" : "Delete"}
            </button>
          ) : null}

          <button
            className="btn btn-primary"
            onClick={this.handleSave}
          >
            {saveLabel}
          </button>
        </div>
      </div>
    )
  }
}


