import React from "react"
import PropTypes from "prop-types"

export default class TagEditDialog extends React.Component {
  static propTypes = {
    isOpen: PropTypes.bool.isRequired,
    tag: PropTypes.shape({
      name: PropTypes.string.isRequired,
      description: PropTypes.string
    }),
    allTags: PropTypes.object.isRequired,
    onSave: PropTypes.func.isRequired,
    onClose: PropTypes.func.isRequired,
    getComponent: PropTypes.func.isRequired
  }

  constructor(props) {
    super(props)
    this.state = {
      name: props.tag ? props.tag.name : "",
      description: props.tag ? (props.tag.description || "") : "",
      error: ""
    }
  }

  componentDidUpdate(prevProps) {
    if (this.props.isOpen && !prevProps.isOpen && this.props.tag) {
      this.setState({
        name: this.props.tag.name,
        description: this.props.tag.description || "",
        error: ""
      })
    }
  }

  handleNameChange = (e) => {
    this.setState({ name: e.target.value, error: "" })
  }

  handleDescriptionChange = (e) => {
    this.setState({ description: e.target.value })
  }

  handleSave = () => {
    const { name, description } = this.state
    const trimmedName = name.trim()
    const trimmedDescription = description.trim()

    if (!trimmedName) {
      this.setState({ error: "Tag name is required" })
      return
    }

    // Check for duplicate names (excluding current tag)
    const currentTagName = this.props.tag ? this.props.tag.name : ""
    const isDuplicate = this.props.allTags && this.props.allTags.some(tag => {
      const tagName = tag.get ? tag.get("name") : tag.name
      return tagName === trimmedName && tagName !== currentTagName
    })

    if (isDuplicate) {
      this.setState({ error: "A tag with this name already exists" })
      return
    }

    const updatedTag = {
      name: trimmedName,
      description: trimmedDescription || undefined
    }

    this.props.onSave(updatedTag)
  }

  handleKeyDown = (e) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      this.handleSave()
    } else if (e.key === 'Escape') {
      this.props.onClose()
    }
  }

  render() {
    const { isOpen, onClose, getComponent } = this.props
    const { name, description, error } = this.state

    if (!isOpen) {
      return null
    }

    const Button = getComponent("Button")
    const CloseIcon = getComponent("CloseIcon")

    return (
      <div className="dialog-ux">
        <div className="backdrop-ux" onClick={onClose}></div>
        <div className="modal-ux">
          <div className="modal-dialog-ux">
            <div className="modal-ux-inner">
              <div className="modal-ux-header">
                <h3>Edit tag</h3>
                <button type="button" className="close-modal" onClick={onClose}>
                  {CloseIcon ? <CloseIcon /> : "✕"}
                </button>
              </div>
              <div className="modal-ux-content">
                <div className="form-field">
                  <label className="form-label" htmlFor="edit-tag-name">Tag name</label>
                  <input 
                    className="form-input" 
                    autoFocus 
                    id="edit-tag-name" 
                    type="text" 
                    value={name} 
                    onChange={this.handleNameChange}
                    onKeyDown={this.handleKeyDown}
                  />
                </div>
                <div className="form-field">
                  <label className="form-label" htmlFor="edit-tag-description">Description (optional)</label>
                  <input 
                    className="form-input" 
                    id="edit-tag-description" 
                    type="text" 
                    value={description} 
                    onChange={this.handleDescriptionChange}
                    onKeyDown={this.handleKeyDown}
                  />
                </div>
                {error && (
                  <div className="form-error">
                    {error}
                  </div>
                )}
                <div className="modal-actions-row">
                  <Button className="btn modal-btn" onClick={onClose}>Cancel</Button>
                  <Button className="btn modal-btn" onClick={this.handleSave}>Save</Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }
}
