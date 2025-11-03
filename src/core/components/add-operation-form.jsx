/**
 * @prettier
 */
import React, { Component } from "react"
import PropTypes from "prop-types"
import SearchableSelect from "core/plugins/oas31/components/models/SearchableSelect"
import { validatePath, checkOperationExists } from "core/utils/path-validation"

export default class AddOperationForm extends Component {
  static propTypes = {
    specSelectors: PropTypes.object.isRequired,
    specActions: PropTypes.object.isRequired,
    layoutActions: PropTypes.object,
    layoutSelectors: PropTypes.object,
    onSave: PropTypes.func.isRequired,
    onClose: PropTypes.func.isRequired,
  }

  constructor(props) {
    super(props)
    this.state = {
      method: "get",
      path: "",
      tag: "",
      tagSearch: "",
      tagDropdownOpen: false,
      pathValidationError: null,
      uniquenessError: null,
    }
  }

  handleMethodChange = (e) => {
    this.setState({
      method: e.target.value,
      uniquenessError: null,
    })
  }

  handlePathChange = (e) => {
    const newPath = e.target.value
    this.setState({
      path: newPath,
      pathValidationError: null,
      uniquenessError: null,
    })

    // Validate path on change
    if (newPath) {
      const validation = validatePath(newPath)
      if (!validation.isValid) {
        this.setState({ pathValidationError: validation.error })
      }
    }
  }

  handleTagChange = (value) => {
    this.setState({
      tag: value,
      tagSearch: "",
      tagDropdownOpen: false,
    })
  }

  handleTagSearchChange = (value) => {
    this.setState({ tagSearch: value })
  }

  handleTagToggle = (open) => {
    this.setState({ tagDropdownOpen: open })
  }

  getTagOptions = () => {
    const { specSelectors } = this.props
    const tags = specSelectors.tags()

    if (!tags || tags.size === 0) {
      return []
    }

    return tags
      .map((tag) => {
        const name = tag.get("name")
        return name
          ? {
              value: name,
              label: name,
            }
          : null
      })
      .filter(Boolean)
      .toArray()
  }

  handleSubmit = (e) => {
    e.preventDefault()

    const { method, path, tag } = this.state
    const { specSelectors, specActions, layoutActions, layoutSelectors, onSave } = this.props

    // Reset errors
    this.setState({
      pathValidationError: null,
      uniquenessError: null,
    })

    // Validate required fields
    if (!method) {
      return
    }

    if (!path || !path.trim()) {
      this.setState({ pathValidationError: "Path cannot be empty" })
      return
    }

    if (!tag) {
      return
    }

    // Validate path
    const pathValidation = validatePath(path.trim())
    if (!pathValidation.isValid) {
      this.setState({ pathValidationError: pathValidation.error })
      return
    }

    // Check for uniqueness
    const trimmedPath = path.trim()
    if (checkOperationExists(specSelectors, trimmedPath, method.toLowerCase())) {
      this.setState({
        uniquenessError: `An operation with method '${method.toUpperCase()}' and path '${trimmedPath}' already exists`,
      })
      return
    }

    // Auto-detect path parameters from the path
    const paramNameRegex = /\{([^\}]+)\}/g
    const detectedParamNames = new Set()
    let match
    while ((match = paramNameRegex.exec(trimmedPath)) !== null) {
      const name = (match[1] || "").trim()
      if (name) {
        detectedParamNames.add(name)
      }
    }

    // Create parameters array with detected path parameters
    const parameters = Array.from(detectedParamNames).map((name) => ({
      name,
      in: "path",
      required: true,
      schema: { type: "string" },
    }))

    // Create the operation
    try {
      const spec = specSelectors.specJson()
      const js = spec && typeof spec.toJS === "function" ? spec.toJS() : {}

      if (!js.paths) {
        js.paths = {}
      }

      if (!js.paths[trimmedPath]) {
        js.paths[trimmedPath] = {}
      }

      // Create new operation object with summary, description, tags, and parameters
      const newOperation = {
        summary: "Default Summary",
        description: "# Hello World",
        tags: [tag],
      }

      // Add parameters if any were detected
      if (parameters.length > 0) {
        newOperation.parameters = parameters
      }

      js.paths[trimmedPath][method.toLowerCase()] = newOperation

      // Convert back to string and update spec
      const asString = JSON.stringify(js, null, 2)
      specActions.updateSpec(asString)

      // Close all opened operations and tags, then open the tag with the new operation
      if (layoutActions && layoutSelectors) {
        // Close all opened operations
        const taggedOps = specSelectors.taggedOperations()
        if (taggedOps && taggedOps.forEach) {
          taggedOps.forEach((tagObj, tagName) => {
            const operations = tagObj.get("operations")
            if (operations && operations.forEach) {
              operations.forEach((op) => {
                const operationId = op.get("id")
                if (operationId) {
                  layoutActions.show(["operations", tagName, operationId], false)
                }
              })
            }
          })
        }

        // Close all tags except the one with the new operation
        const tags = specSelectors.tags()
        if (tags && tags.forEach) {
          tags.forEach((t) => {
            const tagName = t && t.get && t.get("name")
            if (tagName) {
              layoutActions.show(["operations-tag", tagName], tagName === tag)
            }
          })
        }
      }

      // Close dialog and reset form
      this.setState({
        method: "get",
        path: "",
        tag: "",
        tagSearch: "",
        pathValidationError: null,
        uniquenessError: null,
      })

      onSave()
    } catch (e) {
      console.error("Failed to add operation:", e)
    }
  }

  render() {
    const { method, path, tag, tagSearch, tagDropdownOpen, pathValidationError, uniquenessError } = this.state

    const methodOptions = [
      { value: "get", label: "GET" },
      { value: "post", label: "POST" },
      { value: "put", label: "PUT" },
      { value: "delete", label: "DELETE" },
      { value: "patch", label: "PATCH" },
      { value: "options", label: "OPTIONS" },
      { value: "head", label: "HEAD" },
    ]

    const tagOptions = this.getTagOptions()

    return (
      <form onSubmit={this.handleSubmit}>
                <div className="form-field">
          <label className="form-label">
            Tag <span className="required">*</span>
          </label>
          <SearchableSelect
            value={tag}
            onChange={this.handleTagChange}
            placeholder="Select tag..."
            searchValue={tagSearch}
            onSearchChange={this.handleTagSearchChange}
            isOpen={tagDropdownOpen}
            onToggle={this.handleTagToggle}
            displayValue={tag}
            options={tagOptions}
            primitiveOptions={[]}
          />
        </div>
        
        <div className="form-field">
          <label className="form-label">
            Method <span className="required">*</span>
          </label>
          <select className="form-input" value={method} onChange={this.handleMethodChange} required>
            <option value="">Select method...</option>
            {methodOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="form-field">
          <label className="form-label">
            Path <span className="required">*</span>
          </label>
          <input
            type="text"
            className={`form-input ${pathValidationError || uniquenessError ? "invalid" : ""}`}
            value={path}
            onChange={this.handlePathChange}
            placeholder="Enter path (e.g., /users/{id})"
            required
          />
          {pathValidationError && (
            <div className="form-validation-error" style={{ color: "#d32f2f", fontSize: "12px", marginTop: "4px" }}>
              {pathValidationError}
            </div>
          )}
          {uniquenessError && (
            <div className="form-validation-error" style={{ color: "#d32f2f", fontSize: "12px", marginTop: "4px" }}>
              {uniquenessError}
            </div>
          )}
        </div>

        <div className="modal-actions-row">
          <button type="button" className="btn modal-btn" onClick={this.props.onClose}>
            Cancel
          </button>
          <button type="submit" className="btn modal-btn" disabled={!method || !path.trim() || !tag}>
            Add Operation
          </button>
        </div>
      </form>
    )
  }
}

