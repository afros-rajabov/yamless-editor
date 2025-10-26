import React from "react"
import PropTypes from "prop-types"

export default class TagContextMenu extends React.Component {
  static propTypes = {
    isOpen: PropTypes.bool.isRequired,
    position: PropTypes.shape({
      x: PropTypes.number.isRequired,
      y: PropTypes.number.isRequired
    }),
    onEdit: PropTypes.func.isRequired,
    onDelete: PropTypes.func.isRequired,
    onClose: PropTypes.func.isRequired
  }

  componentDidMount() {
    if (this.props.isOpen) {
      document.addEventListener('click', this.handleOutsideClick)
      document.addEventListener('keydown', this.handleKeyDown)
    }
  }

  componentWillUnmount() {
    document.removeEventListener('click', this.handleOutsideClick)
    document.removeEventListener('keydown', this.handleKeyDown)
  }

  componentDidUpdate(prevProps) {
    if (this.props.isOpen && !prevProps.isOpen) {
      document.addEventListener('click', this.handleOutsideClick)
      document.addEventListener('keydown', this.handleKeyDown)
    } else if (!this.props.isOpen && prevProps.isOpen) {
      document.removeEventListener('click', this.handleOutsideClick)
      document.removeEventListener('keydown', this.handleKeyDown)
    }
  }

  handleOutsideClick = (e) => {
    if (this.menuRef && !this.menuRef.contains(e.target)) {
      this.props.onClose()
    }
  }

  handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      this.props.onClose()
    }
  }

  handleEdit = () => {
    this.props.onEdit()
    this.props.onClose()
  }

  handleDelete = () => {
    this.props.onDelete()
    this.props.onClose()
  }

  render() {
    const { isOpen, position } = this.props

    if (!isOpen) {
      return null
    }

    return (
      <div
        ref={ref => this.menuRef = ref}
        className="tag-badge-context-menu"
        style={{
          position: 'fixed',
          left: position.x,
          top: position.y,
          zIndex: 10000
        }}
      >
        <div className="tag-badge-context-menu-item" onClick={this.handleEdit}>
          Edit
        </div>
        <div className="tag-badge-context-menu-item" onClick={this.handleDelete}>
          Delete
        </div>
      </div>
    )
  }
}
