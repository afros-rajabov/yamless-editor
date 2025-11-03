/**
 * @prettier
 */
import React from "react"
import PropTypes from "prop-types"

export default class AddOperationDialog extends React.Component {
  static propTypes = {
    isOpen: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    getComponent: PropTypes.func.isRequired,
    specSelectors: PropTypes.object.isRequired,
    specActions: PropTypes.object.isRequired,
    layoutActions: PropTypes.object,
    layoutSelectors: PropTypes.object,
  }

  handleKeyDown = (e) => {
    if (e.key === "Escape") {
      this.props.onClose()
    }
  }

  handleSave = () => {
    this.props.onClose()
  }

  render() {
    const { isOpen, onClose, getComponent, specSelectors, specActions, layoutActions, layoutSelectors } = this.props

    if (!isOpen) {
      return null
    }

    const CloseIcon = getComponent("CloseIcon")
    const AddOperationForm = getComponent("AddOperationForm", true)

    return (
      <div className="dialog-ux" aria-modal="true" role="dialog">
        <div className="backdrop-ux" onClick={onClose}></div>
        <div className="modal-ux">
          <div className="modal-dialog-ux">
            <div className="modal-ux-inner">
              <div className="modal-ux-header">
                <h3>Add New Operation</h3>
                <button type="button" className="close-modal" onClick={onClose} aria-label="Close">
                  {CloseIcon ? <CloseIcon /> : "✕"}
                </button>
              </div>
              <div className="modal-ux-content" onKeyDown={this.handleKeyDown}>
                {AddOperationForm ? (
                  <AddOperationForm
                    specSelectors={specSelectors}
                    specActions={specActions}
                    layoutActions={layoutActions}
                    layoutSelectors={layoutSelectors}
                    onSave={this.handleSave}
                    onClose={onClose}
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

