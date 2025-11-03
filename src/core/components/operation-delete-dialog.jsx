import React from "react"
import PropTypes from "prop-types"

export default class OperationDeleteDialog extends React.Component {
  static propTypes = {
    isOpen: PropTypes.bool.isRequired,
    method: PropTypes.string.isRequired,
    path: PropTypes.string.isRequired,
    onConfirm: PropTypes.func.isRequired,
    onCancel: PropTypes.func.isRequired,
    getComponent: PropTypes.func.isRequired
  }

  handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      this.props.onCancel()
    }
  }

  render() {
    const { isOpen, method, path, onConfirm, onCancel, getComponent } = this.props

    if (!isOpen) {
      return null
    }

    const Button = getComponent("Button")
    const CloseIcon = getComponent("CloseIcon")

    return (
      <div className="dialog-ux">
        <div className="backdrop-ux" onClick={onCancel}></div>
        <div className="modal-ux">
          <div className="modal-dialog-ux">
            <div className="modal-ux-inner">
              <div className="modal-ux-header">
                <h3>Delete operation</h3>
                <button type="button" className="close-modal" onClick={onCancel}>
                  {CloseIcon ? <CloseIcon /> : "✕"}
                </button>
              </div>
              <div className="modal-ux-content" onKeyDown={this.handleKeyDown}>
                <p>
                  Are you sure you want to delete the operation <strong>"{method.toUpperCase()} {path}"</strong>?
                  <br />
                  <span className="tag-delete-warning">
                    This action cannot be undone.
                  </span>
                </p>
                <div className="modal-actions-row">
                  <Button className="btn modal-btn" onClick={onCancel}>Cancel</Button>
                  <Button className="btn modal-btn btn-danger" onClick={onConfirm}>
                    Delete
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }
}

