/**
 * @prettier
 */
import React from "react"
import PropTypes from "prop-types"

export default class ParameterEditDialog extends React.Component {
  static propTypes = {
    isOpen: PropTypes.bool.isRequired,
    parameter: PropTypes.object, // Immutable.Map or null
    onSave: PropTypes.func.isRequired,
    onDelete: PropTypes.func.isRequired,
    onClear: PropTypes.func.isRequired,
    onClose: PropTypes.func.isRequired,
    getComponent: PropTypes.func.isRequired,
    specSelectors: PropTypes.object.isRequired,
    pathMethod: PropTypes.array.isRequired,
    isOperationEditMode: PropTypes.bool
  }

  static defaultProps = {
    isOperationEditMode: true
  }

  handleKeyDown = (e) => {
    if (e.key === "Escape") {
      this.props.onClose()
    }
  }

  render() {
    const { isOpen, parameter, onClose, getComponent, specSelectors, pathMethod, onSave, onDelete, onClear, isOperationEditMode } = this.props

    if (!isOpen) {
      return null
    }

    const Button = getComponent("Button")
    const CloseIcon = getComponent("CloseIcon")
    const ParameterEditForm = getComponent("parameterEditForm")

    const handleSave = (param, oldIdentifier) => {
      onSave(param, oldIdentifier)
      onClose()
    }

    const handleDelete = (identifier) => {
      onDelete(identifier)
      onClose()
    }

    const handleClear = () => {
      onClear()
    }

    const title = parameter ? "Edit Parameter" : "Add New Parameter"

    return (
      <div className="dialog-ux" aria-modal="true" role="dialog">
        <div className="backdrop-ux" onClick={onClose}></div>
        <div className="modal-ux">
          <div className="modal-dialog-ux">
            <div className="modal-ux-inner">
              <div className="modal-ux-header">
                <h3>{title}</h3>
                <button type="button" className="close-modal" onClick={onClose} aria-label="Close">
                  {CloseIcon ? <CloseIcon /> : "✕"}
                </button>
              </div>
              <div className="modal-ux-content" onKeyDown={this.handleKeyDown}>
                <ParameterEditForm
                  parameter={parameter}
                  onSave={handleSave}
                  onDelete={handleDelete}
                  onClear={handleClear}
                  pathMethod={pathMethod}
                  specSelectors={specSelectors}
                  isOperationEditMode={isOperationEditMode}
                />
                <div className="modal-actions-row">
                  <Button className="btn modal-btn" onClick={onClose}>Close</Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }
}


