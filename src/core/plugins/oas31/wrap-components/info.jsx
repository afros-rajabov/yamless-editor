/**
 * @prettier
 */
import React from "react"

import { createOnlyOAS31ComponentWrapper } from "../fn"

const InfoWrapper = createOnlyOAS31ComponentWrapper(({ getSystem, ...props }) => {
  const system = getSystem()
  const OAS31Info = system.getComponent("OAS31Info", true)

  return <OAS31Info getSystem={getSystem} {...props} />
})

export default InfoWrapper
