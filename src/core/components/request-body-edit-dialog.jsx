/**
 * @prettier
 */
import React from "react"
import PropTypes from "prop-types"
import ImPropTypes from "react-immutable-proptypes"

export default class RequestBodyEditDialog extends React.Component {
  static propTypes = {
    isOpen: PropTypes.bool.isRequired,
    requestBody: ImPropTypes.map,
    onSave: PropTypes.func.isRequired,
    onDelete: PropTypes.func.isRequired,
    onClose: PropTypes.func.isRequired,
    getComponent: PropTypes.func.isRequired,
    isOperationEditMode: PropTypes.bool,
    specSelectors: PropTypes.object.isRequired,
    path: PropTypes.string,
    method: PropTypes.string,
  }

  static defaultProps = {
    requestBody: null,
    isOperationEditMode: true,
  }

  handleKeyDown = (event) => {
    if (event.key === "Escape") {
      this.props.onClose()
    }
  }

  render() {
    const {
      isOpen,
      requestBody,
      onClose,
      getComponent,
      onSave,
      onDelete,
      isOperationEditMode,
      specSelectors,
      path,
      method,
    } = this.props

    if (!isOpen) {
      return null
    }

    const Button = getComponent("Button")
    const CloseIcon = getComponent("CloseIcon")
    const RequestBodyEditForm = getComponent("requestBodyEditForm")

    const handleSave = (requestBodyPayload) => {
      onSave(requestBodyPayload)
      onClose()
    }

    const handleDelete = () => {
      onDelete()
      onClose()
    }

    const title = requestBody ? "Edit Request Body" : "Add New Request Body"

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
              <div className="modal-ux-content" onKeyDown={this.handleKeyDown} style={{ maxHeight: "90vh", minHeight: "500px", overflowY: "auto" }}>
                {RequestBodyEditForm ? (
                  <RequestBodyEditForm
                    requestBody={requestBody}
                    onSave={handleSave}
                    onDelete={handleDelete}
                    isOperationEditMode={isOperationEditMode}
                    specSelectors={specSelectors}
                    path={path}
                    method={method}
                  />
                ) : null}
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


