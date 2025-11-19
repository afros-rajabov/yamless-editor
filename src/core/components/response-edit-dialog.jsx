/**
 * @prettier
 */
import React from "react"
import PropTypes from "prop-types"
import ImPropTypes from "react-immutable-proptypes"

export default class ResponseEditDialog extends React.Component {
  static propTypes = {
    isOpen: PropTypes.bool.isRequired,
    code: PropTypes.string,
    response: ImPropTypes.map,
    existingCodes: PropTypes.arrayOf(PropTypes.string),
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
    code: null,
    response: null,
    existingCodes: [],
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
      code,
      response,
      onClose,
      getComponent,
      onSave,
      onDelete,
      existingCodes,
      isOperationEditMode,
      specSelectors,
    } = this.props

    if (!isOpen) {
      return null
    }

    const Button = getComponent("Button")
    const CloseIcon = getComponent("CloseIcon")
    const ResponseEditForm = getComponent("responseEditForm")

    const handleSave = (payload) => {
      onSave(payload, code)
      onClose()
    }

    const handleDelete = (codeToDelete) => {
      onDelete(codeToDelete)
      onClose()
    }

    const title = code ? "Edit Response" : "Add New Response"

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
                {ResponseEditForm ? (
                  <ResponseEditForm
                    initialCode={code}
                    response={response}
                    existingCodes={existingCodes}
                    onSave={handleSave}
                    onDelete={handleDelete}
                    isOperationEditMode={isOperationEditMode}
                    specSelectors={specSelectors}
                    path={this.props.path}
                    method={this.props.method}
                  />
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }
}


