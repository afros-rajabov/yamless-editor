/**
 * @prettier
 */
import React from "react"
import PropTypes from "prop-types"

const DuplicateIcon = ({ className = null, width = 20, height = 20, ...rest }) => (
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
    <path d="M7 2h9a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zm0 2v9h9V4H7zm2 2h5v1H9V6zm0 2h5v1H9V8zm0 2h3v1H9v-1zM4 5h2v10H2V7a2 2 0 0 1 2-2z"/>
  </svg>
)

DuplicateIcon.propTypes = {
  className: PropTypes.string,
  width: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  height: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
}

export default DuplicateIcon

