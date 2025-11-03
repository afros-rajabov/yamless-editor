/**
 * @prettier
 */
import React from "react"
import PropTypes from "prop-types"

const SaveIcon = ({ className = null, width = 20, height = 20, ...rest }) => (
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
    <path d="M15 3H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2zm-1 13H6V6h8v10zm-3-7H8v1h3V9zm0-2H8v1h3V7zm0 4H8v1h3v-1z"/>
  </svg>
)

SaveIcon.propTypes = {
  className: PropTypes.string,
  width: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  height: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
}

export default SaveIcon

