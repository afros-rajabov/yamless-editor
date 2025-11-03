/**
 * @prettier
 */
import React from "react"
import PropTypes from "prop-types"

export default class AddOperationButton extends React.Component {
  static propTypes = {
    specSelectors: PropTypes.object.isRequired,
    specActions: PropTypes.object.isRequired,
    getComponent: PropTypes.func.isRequired,
  }

  constructor(props) {
    super(props)
    this.state = {
      isDialogOpen: false,
    }
  }

  handleClick = () => {
    this.setState({ isDialogOpen: true })
  }

  handleCloseDialog = () => {
    this.setState({ isDialogOpen: false })
  }

  render() {
    const { specSelectors, specActions, getComponent, layoutActions, layoutSelectors } = this.props
    const { isDialogOpen } = this.state

    const AddOperationDialog = getComponent("AddOperationDialog", true)

    return (
      <>
        <div style={{ textAlign: "right", marginBottom: "10px" }}>
          <button className="btn" type="button" onClick={this.handleClick}>
            Add Operation
          </button>
        </div>
        {AddOperationDialog ? (
          <AddOperationDialog
            isOpen={isDialogOpen}
            onClose={this.handleCloseDialog}
            getComponent={getComponent}
            specSelectors={specSelectors}
            specActions={specActions}
            layoutActions={layoutActions}
            layoutSelectors={layoutSelectors}
          />
        ) : null}
      </>
    )
  }
}

