/**
 * @prettier
 */
import React from "react"
import PropTypes from "prop-types"

const EditIcon = ({ className = null, width = 20, height = 20, ...rest }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 20 20"
    className={className}
    width={width}
    height={height}
    fill="currentColor"
    aria-hidden="true"
    focusable="false"
    {...rest}
  >
    <path d="M2.5 14.375L13.787 3.088a1.25 1.25 0 0 1 1.768 0l1.768 1.768a1.25 1.25 0 0 1 0 1.768L5.625 17.5H2.5v-3.125zm2.5 2.5h2.122l7.5-7.5L12.622 7.75l-7.5 7.5v2.122z"/>
  </svg>
)

EditIcon.propTypes = {
  className: PropTypes.string,
  width: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  height: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
}

export default EditIcon

