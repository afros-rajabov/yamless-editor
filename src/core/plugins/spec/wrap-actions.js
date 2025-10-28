import get from "lodash/get"
import isPlainObject from "lodash/isPlainObject"

// Flag to track if we're in a batched operation to defer resolution
let isBatchedOperation = false

export const updateSpec = (ori, {specActions}) => (...args) => {
  ori(...args)
  
  // Only trigger parseToJson if we're not in a batched operation
  if (!isBatchedOperation) {
    specActions.parseToJson(...args)
  }
}

export const batchUpdateOperation = (ori, {specActions}) => (...args) => {
  isBatchedOperation = true
  const result = ori(...args)
  
  // Extract the final path and method from the payload for targeted resolution
  const [payload] = args
  const finalPath = payload.newPath || payload.oldPath
  const finalMethod = payload.newMethod || payload.oldMethod
  
  // Reset the flag immediately since we're not using parseToJson
  isBatchedOperation = false
  
  // Only request resolution for the specific updated operation
  // Skip parseToJson since the reducer already updated the spec string
  if (finalPath && finalMethod) {
    specActions.requestResolvedSubtree(["paths", finalPath, finalMethod])
  }
  
  return result
}

export const updateJsonSpec = (ori, {specActions}) => (...args) => {
  ori(...args)

  specActions.invalidateResolvedSubtreeCache()

  // Trigger resolution of any path-level $refs.
  const [json] = args
  const pathItems = get(json, ["paths"]) || {}
  const pathItemKeys = Object.keys(pathItems)

  pathItemKeys.forEach(k => {
    const val = get(pathItems, [k])

    if (isPlainObject(val) && val.$ref) {
      specActions.requestResolvedSubtree(["paths", k])
    }
  })

  // Trigger resolution of any securitySchemes-level $refs.
  specActions.requestResolvedSubtree(["components", "securitySchemes"])
}

// Log the request ( just for debugging, shouldn't affect prod )
export const executeRequest = (ori, { specActions }) => (req) => {
  specActions.logRequest(req)
  return ori(req)
}

export const validateParams = (ori, { specSelectors }) => (req) => {
  return ori(req, specSelectors.isOAS3())
}
