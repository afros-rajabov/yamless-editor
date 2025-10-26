import React from "react"
import PropTypes from "prop-types"

export default class TagDeleteDialog extends React.Component {
  static propTypes = {
    isOpen: PropTypes.bool.isRequired,
    tagName: PropTypes.string.isRequired,
    operationCount: PropTypes.number.isRequired,
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
    const { isOpen, tagName, operationCount, onConfirm, onCancel, getComponent } = this.props

    if (!isOpen) {
      return null
    }

    const Button = getComponent("Button")
    const CloseIcon = getComponent("CloseIcon")

    const hasOperations = operationCount > 0

    return (
      <div className="dialog-ux">
        <div className="backdrop-ux" onClick={onCancel}></div>
        <div className="modal-ux">
          <div className="modal-dialog-ux">
            <div className="modal-ux-inner">
              <div className="modal-ux-header">
                <h3>Delete tag</h3>
                <button type="button" className="close-modal" onClick={onCancel}>
                  {CloseIcon ? <CloseIcon /> : "✕"}
                </button>
              </div>
              <div className="modal-ux-content" onKeyDown={this.handleKeyDown}>
                <p>
                  {hasOperations ? (
                    <>
                      Are you sure you want to delete the tag <strong>"{tagName}"</strong>?
                      <br />
                      <span className="tag-delete-warning">
                        This tag is used by {operationCount} operation{operationCount !== 1 ? 's' : ''}. 
                        The tag reference will be removed from these operations.
                      </span>
                    </>
                  ) : (
                    `Are you sure you want to delete the tag "${tagName}"?`
                  )}
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
