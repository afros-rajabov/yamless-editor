import { fromJS, List } from "immutable"
import { fromJSOrdered, validateParam, paramToValue, paramToIdentifier } from "core/utils"
import win from "core/window"

// selector-in-reducer is suboptimal, but `operationWithMeta` is more of a helper
import {
  specJsonWithResolvedSubtrees,
  parameterValues,
  parameterInclusionSettingFor,
} from "./selectors"

import {
  UPDATE_SPEC,
  UPDATE_URL,
  UPDATE_JSON,
  UPDATE_PARAM,
  UPDATE_EMPTY_PARAM_INCLUSION,
  VALIDATE_PARAMS,
  SET_RESPONSE,
  SET_REQUEST,
  SET_MUTATED_REQUEST,
  UPDATE_RESOLVED,
  UPDATE_RESOLVED_SUBTREE,
  UPDATE_OPERATION_META_VALUE,
  CLEAR_RESPONSE,
  CLEAR_REQUEST,
  CLEAR_VALIDATE_PARAMS,
  UPDATE_OPERATION_METHOD,
  UPDATE_OPERATION_PATH,
  UPDATE_OPERATION_FIELDS,
  ADD_PARAMETER,
  UPDATE_PARAMETER,
  DELETE_PARAMETER,
  BATCH_UPDATE_OPERATION,
  SET_SCHEME
} from "./actions"

/**
 * Resolve parameter schema references to actual schema definitions
 * @param {Object} parameter - The parameter object
 * @param {Object} state - The current state
 * @returns {Object} Parameter with resolved schema if applicable
 */
const resolveParameterSchema = (parameter, state) => {
  // Check if parameter has a schema with $ref
  const schemaRef = parameter.schema?.$ref
  if (!schemaRef) {
    return parameter // No $ref to resolve
  }
  
  // Extract schema name from ref (e.g., "#/components/schemas/ModelStatusEnum" -> "ModelStatusEnum")
  const schemaName = schemaRef.split('/').pop()
  
  // Look up the schema definition from components/schemas
  const schemaDefinition = state.getIn(["json", "components", "schemas", schemaName])
  
  if (schemaDefinition) {
    // Return parameter with resolved schema (merged with original to preserve $ref for documentation)
    return {
      ...parameter,
      schema: schemaDefinition.toJS()
    }
  }
  
  return parameter // Couldn't resolve, return as-is
}

export default {

  [UPDATE_SPEC]: (state, action) => {
    return (typeof action.payload === "string")
      ? state.set("spec", action.payload)
      : state
  },

  [UPDATE_URL]: (state, action) => {
    return state.set("url", action.payload+"")
  },

  [UPDATE_JSON]: (state, action) => {
    return state.set("json", fromJSOrdered(action.payload))
  },

  [UPDATE_RESOLVED]: (state, action) => {
    return state.setIn(["resolved"], fromJSOrdered(action.payload))
  },

  [UPDATE_RESOLVED_SUBTREE]: (state, action) => {
    const { value, path } = action.payload
    return state.setIn(["resolvedSubtrees", ...path], fromJSOrdered(value))
  },

  [UPDATE_PARAM]: ( state, {payload} ) => {
    let { path: pathMethod, paramName, paramIn, param, value, isXml } = payload

    let paramKey = param ? paramToIdentifier(param) : `${paramIn}.${paramName}`

    const valueKey = isXml ? "value_xml" : "value"

    return state.setIn(
      ["meta", "paths", ...pathMethod, "parameters", paramKey, valueKey],
      fromJS(value)
    )
  },

  [UPDATE_EMPTY_PARAM_INCLUSION]: ( state, {payload} ) => {
    let { pathMethod, paramName, paramIn, includeEmptyValue } = payload

    if(!paramName || !paramIn) {
      console.warn("Warning: UPDATE_EMPTY_PARAM_INCLUSION could not generate a paramKey.")
      return state
    }

    const paramKey = `${paramIn}.${paramName}`

    return state.setIn(
      ["meta", "paths", ...pathMethod, "parameter_inclusions", paramKey],
      includeEmptyValue
    )
  },

  [VALIDATE_PARAMS]: ( state, { payload: { pathMethod, isOAS3 } } ) => {
    const op = specJsonWithResolvedSubtrees(state).getIn(["paths", ...pathMethod])
    const paramValues = parameterValues(state, pathMethod).toJS()

    return state.updateIn(["meta", "paths", ...pathMethod, "parameters"], fromJS({}), paramMeta => {
      return op.get("parameters", List()).reduce((res, param) => {
        const value = paramToValue(param, paramValues)
        const isEmptyValueIncluded = parameterInclusionSettingFor(state, pathMethod, param.get("name"), param.get("in"))
        const errors = validateParam(param, value, {
          bypassRequiredCheck: isEmptyValueIncluded,
          isOAS3,
        })
        return res.setIn([paramToIdentifier(param), "errors"], fromJS(errors))
      }, paramMeta)
    })
  },
  [CLEAR_VALIDATE_PARAMS]: ( state, { payload:  { pathMethod } } ) => {
    return state.updateIn( [ "meta", "paths", ...pathMethod, "parameters" ], fromJS([]), parameters => {
      return parameters.map(param => param.set("errors", fromJS([])))
    })
  },

  [SET_RESPONSE]: (state, { payload: { res, path, method } } ) =>{
    let result
    if ( res.error ) {
      result = Object.assign({
        error: true,
        name: res.err.name,
        message: res.err.message,
        statusCode: res.err.statusCode
      }, res.err.response)
    } else {
      result = res
    }

    // Ensure headers
    result.headers = result.headers || {}

    let newState = state.setIn( [ "responses", path, method ], fromJSOrdered(result) )

    // ImmutableJS messes up Blob. Needs to reset its value.
    if (win.Blob && result.data instanceof win.Blob) {
      newState = newState.setIn( [ "responses", path, method, "text" ], result.data)
    }
    return newState
  },

  [SET_REQUEST]: (state, { payload: { req, path, method } } ) =>{
    return state.setIn( [ "requests", path, method ], fromJSOrdered(req))
  },

  [SET_MUTATED_REQUEST]: (state, { payload: { req, path, method } } ) =>{
    return state.setIn( [ "mutatedRequests", path, method ], fromJSOrdered(req))
  },

  [UPDATE_OPERATION_META_VALUE]: (state, { payload: { path, value, key } }) => {
    // path is a pathMethod tuple... can't change the name now.
    let operationPath = ["paths", ...path]
    let metaPath = ["meta", "paths", ...path]

    if(
      !state.getIn(["json", ...operationPath])
      && !state.getIn(["resolved", ...operationPath])
      && !state.getIn(["resolvedSubtrees", ...operationPath])
    ) {
      // do nothing if the operation does not exist
      return state
    }

    return state.setIn([...metaPath, key], fromJS(value))
  },

  [CLEAR_RESPONSE]: (state, { payload: { path, method } } ) =>{
    return state.deleteIn( [ "responses", path, method ])
  },

  [CLEAR_REQUEST]: (state, { payload: { path, method } } ) =>{
    return state.deleteIn( [ "requests", path, method ])
  },

  [SET_SCHEME]: (state, { payload: { scheme, path, method } } ) =>{
    if ( path && method ) {
      return state.setIn( [ "scheme", path, method ], scheme)
    }

    if (!path && !method) {
      return state.setIn( [ "scheme", "_defaultScheme" ], scheme)
    }

  },

  [UPDATE_OPERATION_METHOD]: (state, { payload: { path, oldMethod, newMethod } }) => {
    // Get the operation data from the old method location
    const operationData = state.getIn(["json", "paths", path, oldMethod])
    const resolvedData = state.getIn(["resolved", "paths", path, oldMethod])
    
    if (!operationData) {
      return state // Operation doesn't exist, do nothing
    }

    // Ensure the path object exists before setting the operation
    let newState = state
    const existingPath = newState.getIn(["json", "paths", path])
    if (!existingPath) {
      // Create the path object if it doesn't exist
      newState = newState.setIn(["json", "paths", path], fromJSOrdered({}))
    }

    // Remove from old method and add to new method
    newState = newState
      .deleteIn(["json", "paths", path, oldMethod])
      .setIn(["json", "paths", path, newMethod], operationData)
    
    // Also update resolved data if it exists
    if (resolvedData) {
      const existingResolvedPath = newState.getIn(["resolved", "paths", path])
      if (!existingResolvedPath) {
        // Create the resolved path object if it doesn't exist
        newState = newState.setIn(["resolved", "paths", path], fromJSOrdered({}))
      }
      
      newState = newState
        .deleteIn(["resolved", "paths", path, oldMethod])
        .setIn(["resolved", "paths", path, newMethod], resolvedData)
    }

    // Update the spec string to reflect the changes
    const updatedSpec = newState.get("json").toJS()
    const specString = JSON.stringify(updatedSpec, null, 2)
    newState = newState.set("spec", specString)

    // Invalidate the resolved subtree cache for this operation to force re-resolution
    newState = newState.deleteIn(["resolvedSubtrees", "paths", path, oldMethod])
    newState = newState.deleteIn(["resolvedSubtrees", "paths", path, newMethod])

    return newState
  },

  [UPDATE_OPERATION_PATH]: (state, { payload: { oldPath, newPath, method } }) => {
    // Get the operation data from the old path location
    const operationData = state.getIn(["json", "paths", oldPath, method])
    const resolvedData = state.getIn(["resolved", "paths", oldPath, method])
    
    if (!operationData) {
      return state // Operation doesn't exist, do nothing
    }

    // Ensure the new path object exists before setting the operation
    let newState = state
    const existingNewPath = newState.getIn(["json", "paths", newPath])
    if (!existingNewPath) {
      // Create the new path object if it doesn't exist
      newState = newState.setIn(["json", "paths", newPath], fromJSOrdered({}))
    }

    // Remove from old path and add to new path
    newState = newState
      .deleteIn(["json", "paths", oldPath, method])
      .setIn(["json", "paths", newPath, method], operationData)
    
    // Also update resolved data if it exists
    if (resolvedData) {
      const existingResolvedNewPath = newState.getIn(["resolved", "paths", newPath])
      if (!existingResolvedNewPath) {
        // Create the resolved new path object if it doesn't exist
        newState = newState.setIn(["resolved", "paths", newPath], fromJSOrdered({}))
      }
      
      newState = newState
        .deleteIn(["resolved", "paths", oldPath, method])
        .setIn(["resolved", "paths", newPath, method], resolvedData)
    }

    // Update the spec string to reflect the changes
    const updatedSpec = newState.get("json").toJS()
    const specString = JSON.stringify(updatedSpec, null, 2)
    newState = newState.set("spec", specString)

    // Invalidate the resolved subtree cache for this operation to force re-resolution
    newState = newState.deleteIn(["resolvedSubtrees", "paths", oldPath, method])
    newState = newState.deleteIn(["resolvedSubtrees", "paths", newPath, method])

    return newState
  },

  [UPDATE_OPERATION_FIELDS]: (state, { payload: { path, method, updates } }) => {
    // Get the operation data from the current location
    const operationData = state.getIn(["json", "paths", path, method])
    const resolvedData = state.getIn(["resolved", "paths", path, method])
    
    if (!operationData) {
      return state // Operation doesn't exist, do nothing
    }

    let newState = state

    // Update the operation with new field values
    if (updates.summary !== undefined) {
      newState = newState.setIn(["json", "paths", path, method, "summary"], updates.summary)
    }
    if (updates.description !== undefined) {
      newState = newState.setIn(["json", "paths", path, method, "description"], updates.description)
    }
    
    // Also update resolved data if it exists
    if (resolvedData) {
      if (updates.summary !== undefined) {
        newState = newState.setIn(["resolved", "paths", path, method, "summary"], updates.summary)
      }
      if (updates.description !== undefined) {
        newState = newState.setIn(["resolved", "paths", path, method, "description"], updates.description)
      }
    }

    // Update the resolvedSubtrees cache with the updated fields to avoid re-resolution loops
    // This preserves all operation data while updating the specific fields
    if (updates.summary !== undefined) {
      const currentResolvedSubtree = newState.getIn(["resolvedSubtrees", "paths", path, method])
      if (currentResolvedSubtree) {
        newState = newState.setIn(["resolvedSubtrees", "paths", path, method, "summary"], updates.summary)
      }
    }
    if (updates.description !== undefined) {
      const currentResolvedSubtree = newState.getIn(["resolvedSubtrees", "paths", path, method])
      if (currentResolvedSubtree) {
        newState = newState.setIn(["resolvedSubtrees", "paths", path, method, "description"], updates.description)
      }
    }

    // Update the spec string to reflect the changes
    const updatedSpec = newState.get("json").toJS()
    const specString = JSON.stringify(updatedSpec, null, 2)
    newState = newState.set("spec", specString)

    return newState
  },

  [ADD_PARAMETER]: (state, { payload: { path, method, parameter } }) => {
    // Get the operation data from the current location
    const operationData = state.getIn(["json", "paths", path, method])
    
    if (!operationData) {
      return state // Operation doesn't exist, do nothing
    }

    let newState = state

    // Get existing parameters array or create new one
    const existingParameters = operationData.get("parameters", List())
    const newParameters = existingParameters.push(fromJS(parameter))

    // Update the operation with new parameter
    newState = newState.setIn(["json", "paths", path, method, "parameters"], newParameters)
    
    // Also update resolved data if it exists
    const resolvedData = state.getIn(["resolved", "paths", path, method])
    if (resolvedData) {
      const resolvedParameters = resolvedData.get("parameters", List())
      const newResolvedParameters = resolvedParameters.push(fromJS(parameter))
      newState = newState.setIn(["resolved", "paths", path, method, "parameters"], newResolvedParameters)
    }

    // Update the resolvedSubtrees cache
    const currentResolvedSubtree = newState.getIn(["resolvedSubtrees", "paths", path, method])
    if (currentResolvedSubtree) {
      const resolvedParameter = resolveParameterSchema(parameter, state)
      const subtreeParameters = currentResolvedSubtree.get("parameters", List())
      const newSubtreeParameters = subtreeParameters.push(fromJS(resolvedParameter))
      newState = newState.setIn(["resolvedSubtrees", "paths", path, method, "parameters"], newSubtreeParameters)
    }

    // Update the spec string to reflect the changes
    const updatedSpec = newState.get("json").toJS()
    const specString = JSON.stringify(updatedSpec, null, 2)
    newState = newState.set("spec", specString)

    return newState
  },

  [UPDATE_PARAMETER]: (state, { payload: { path, method, oldParameterIdentifier, newParameter } }) => {
    // Get the operation data from the current location
    const operationData = state.getIn(["json", "paths", path, method])
    
    if (!operationData) {
      return state // Operation doesn't exist, do nothing
    }

    let newState = state
    const existingParameters = operationData.get("parameters", List())
    
    // Find the parameter to update by name and in
    const parameterIndex = existingParameters.findIndex(param => 
      param.get("name") === oldParameterIdentifier.name && 
      param.get("in") === oldParameterIdentifier.in
    )

    if (parameterIndex === -1) {
      return state // Parameter not found, do nothing
    }

    // Update the parameter
    const newParameters = existingParameters.set(parameterIndex, fromJS(newParameter))
    newState = newState.setIn(["json", "paths", path, method, "parameters"], newParameters)
    
    // Also update resolved data if it exists
    const resolvedData = state.getIn(["resolved", "paths", path, method])
    if (resolvedData) {
      const resolvedParameters = resolvedData.get("parameters", List())
      const newResolvedParameters = resolvedParameters.set(parameterIndex, fromJS(newParameter))
      newState = newState.setIn(["resolved", "paths", path, method, "parameters"], newResolvedParameters)
    }

    // Update the resolvedSubtrees cache
    const currentResolvedSubtree = newState.getIn(["resolvedSubtrees", "paths", path, method])
    if (currentResolvedSubtree) {
      const resolvedParameter = resolveParameterSchema(newParameter, state)
      const subtreeParameters = currentResolvedSubtree.get("parameters", List())
      const newSubtreeParameters = subtreeParameters.set(parameterIndex, fromJS(resolvedParameter))
      newState = newState.setIn(["resolvedSubtrees", "paths", path, method, "parameters"], newSubtreeParameters)
    }

    // Update the spec string to reflect the changes
    const updatedSpec = newState.get("json").toJS()
    const specString = JSON.stringify(updatedSpec, null, 2)
    newState = newState.set("spec", specString)

    return newState
  },

  [DELETE_PARAMETER]: (state, { payload: { path, method, parameterIdentifier } }) => {
    // Get the operation data from the current location
    const operationData = state.getIn(["json", "paths", path, method])
    
    if (!operationData) {
      return state // Operation doesn't exist, do nothing
    }

    let newState = state
    const existingParameters = operationData.get("parameters", List())
    
    // Find the parameter to delete by name and in
    const parameterIndex = existingParameters.findIndex(param => 
      param.get("name") === parameterIdentifier.name && 
      param.get("in") === parameterIdentifier.in
    )

    if (parameterIndex === -1) {
      return state // Parameter not found, do nothing
    }

    // Remove the parameter
    const newParameters = existingParameters.delete(parameterIndex)
    newState = newState.setIn(["json", "paths", path, method, "parameters"], newParameters)
    
    // Also update resolved data if it exists
    const resolvedData = state.getIn(["resolved", "paths", path, method])
    if (resolvedData) {
      const resolvedParameters = resolvedData.get("parameters", List())
      const newResolvedParameters = resolvedParameters.delete(parameterIndex)
      newState = newState.setIn(["resolved", "paths", path, method, "parameters"], newResolvedParameters)
    }

    // Update the resolvedSubtrees cache
    const currentResolvedSubtree = newState.getIn(["resolvedSubtrees", "paths", path, method])
    if (currentResolvedSubtree) {
      const subtreeParameters = currentResolvedSubtree.get("parameters", List())
      const newSubtreeParameters = subtreeParameters.delete(parameterIndex)
      newState = newState.setIn(["resolvedSubtrees", "paths", path, method, "parameters"], newSubtreeParameters)
    }

    // Update the spec string to reflect the changes
    const updatedSpec = newState.get("json").toJS()
    const specString = JSON.stringify(updatedSpec, null, 2)
    newState = newState.set("spec", specString)

    return newState
  },

  [BATCH_UPDATE_OPERATION]: (state, { payload }) => {
    const { 
      oldPath, 
      oldMethod, 
      newPath, 
      newMethod, 
      fieldUpdates = {}, 
      parameterOperations = [] 
    } = payload

    let newState = state
    const finalPath = newPath || oldPath
    const finalMethod = newMethod || oldMethod

    // Handle path/method changes first
    if (newPath && newPath !== oldPath) {
      // Move operation to new path
      const operationData = newState.getIn(["json", "paths", oldPath, oldMethod])
      if (operationData) {
        // Remove from old location
        newState = newState.deleteIn(["json", "paths", oldPath, oldMethod])
        // Add to new location
        newState = newState.setIn(["json", "paths", newPath, oldMethod], operationData)
        
        // Update resolved data if it exists
        const resolvedData = newState.getIn(["resolved", "paths", oldPath, oldMethod])
        if (resolvedData) {
          newState = newState.deleteIn(["resolved", "paths", oldPath, oldMethod])
          newState = newState.setIn(["resolved", "paths", newPath, oldMethod], resolvedData)
        }
        
        // Update resolvedSubtrees cache
        const resolvedSubtree = newState.getIn(["resolvedSubtrees", "paths", oldPath, oldMethod])
        if (resolvedSubtree) {
          newState = newState.deleteIn(["resolvedSubtrees", "paths", oldPath, oldMethod])
          newState = newState.setIn(["resolvedSubtrees", "paths", newPath, oldMethod], resolvedSubtree)
        }
      }
    }

    if (newMethod && newMethod !== oldMethod) {
      // Change method at current path
      const operationData = newState.getIn(["json", "paths", finalPath, oldMethod])
      if (operationData) {
        // Remove old method
        newState = newState.deleteIn(["json", "paths", finalPath, oldMethod])
        // Add new method
        newState = newState.setIn(["json", "paths", finalPath, newMethod], operationData)
        
        // Update resolved data if it exists
        const resolvedData = newState.getIn(["resolved", "paths", finalPath, oldMethod])
        if (resolvedData) {
          newState = newState.deleteIn(["resolved", "paths", finalPath, oldMethod])
          newState = newState.setIn(["resolved", "paths", finalPath, newMethod], resolvedData)
        }
        
        // Update resolvedSubtrees cache
        const resolvedSubtree = newState.getIn(["resolvedSubtrees", "paths", finalPath, oldMethod])
        if (resolvedSubtree) {
          newState = newState.deleteIn(["resolvedSubtrees", "paths", finalPath, oldMethod])
          newState = newState.setIn(["resolvedSubtrees", "paths", finalPath, newMethod], resolvedSubtree)
        }
      }
    }

    // Apply field updates (summary, description)
    if (Object.keys(fieldUpdates).length > 0) {
      const operationData = newState.getIn(["json", "paths", finalPath, finalMethod])
      if (operationData) {
        let updatedOperation = operationData
        Object.entries(fieldUpdates).forEach(([field, value]) => {
          if (value !== null && value !== undefined) {
            updatedOperation = updatedOperation.set(field, value)
          }
        })
        newState = newState.setIn(["json", "paths", finalPath, finalMethod], updatedOperation)
        
        // Update resolved data if it exists
        const resolvedData = newState.getIn(["resolved", "paths", finalPath, finalMethod])
        if (resolvedData) {
          let updatedResolved = resolvedData
          Object.entries(fieldUpdates).forEach(([field, value]) => {
            if (value !== null && value !== undefined) {
              updatedResolved = updatedResolved.set(field, value)
            }
          })
          newState = newState.setIn(["resolved", "paths", finalPath, finalMethod], updatedResolved)
        }
      }
    }

    // Apply parameter operations
    if (parameterOperations.length > 0) {
      const operationData = newState.getIn(["json", "paths", finalPath, finalMethod])
      if (operationData) {
        let existingParameters = operationData.get("parameters", List())
        
        parameterOperations.forEach(op => {
          switch (op.type) {
            case 'add':
              existingParameters = existingParameters.push(fromJS(op.parameter))
              break
            case 'update':
              const updateIndex = existingParameters.findIndex(param => 
                param.get("name") === op.oldIdentifier.name && 
                param.get("in") === op.oldIdentifier.in
              )
              if (updateIndex !== -1) {
                existingParameters = existingParameters.set(updateIndex, fromJS(op.parameter))
              }
              break
            case 'delete':
              const deleteIndex = existingParameters.findIndex(param => 
                param.get("name") === op.identifier.name && 
                param.get("in") === op.identifier.in
              )
              if (deleteIndex !== -1) {
                existingParameters = existingParameters.delete(deleteIndex)
              }
              break
          }
        })
        
        newState = newState.setIn(["json", "paths", finalPath, finalMethod, "parameters"], existingParameters)
        
        // Update resolved data if it exists
        const resolvedData = newState.getIn(["resolved", "paths", finalPath, finalMethod])
        if (resolvedData) {
          let resolvedParameters = resolvedData.get("parameters", List())
          
          parameterOperations.forEach(op => {
            switch (op.type) {
              case 'add':
                resolvedParameters = resolvedParameters.push(fromJS(op.parameter))
                break
              case 'update':
                const updateIndex = resolvedParameters.findIndex(param => 
                  param.get("name") === op.oldIdentifier.name && 
                  param.get("in") === op.oldIdentifier.in
                )
                if (updateIndex !== -1) {
                  resolvedParameters = resolvedParameters.set(updateIndex, fromJS(op.parameter))
                }
                break
              case 'delete':
                const deleteIndex = resolvedParameters.findIndex(param => 
                  param.get("name") === op.identifier.name && 
                  param.get("in") === op.identifier.in
                )
                if (deleteIndex !== -1) {
                  resolvedParameters = resolvedParameters.delete(deleteIndex)
                }
                break
            }
          })
          
          newState = newState.setIn(["resolved", "paths", finalPath, finalMethod, "parameters"], resolvedParameters)
        }
        
        // Update resolvedSubtrees cache
        const currentResolvedSubtree = newState.getIn(["resolvedSubtrees", "paths", finalPath, finalMethod])
        if (currentResolvedSubtree) {
          let subtreeParameters = currentResolvedSubtree.get("parameters", List())
          
          parameterOperations.forEach(op => {
            switch (op.type) {
              case 'add':
                const resolvedParameter = resolveParameterSchema(op.parameter, newState)
                subtreeParameters = subtreeParameters.push(fromJS(resolvedParameter))
                break
              case 'update':
                const updateIndex = subtreeParameters.findIndex(param => 
                  param.get("name") === op.oldIdentifier.name && 
                  param.get("in") === op.oldIdentifier.in
                )
                if (updateIndex !== -1) {
                  const resolvedParameter = resolveParameterSchema(op.parameter, newState)
                  subtreeParameters = subtreeParameters.set(updateIndex, fromJS(resolvedParameter))
                }
                break
              case 'delete':
                const deleteIndex = subtreeParameters.findIndex(param => 
                  param.get("name") === op.identifier.name && 
                  param.get("in") === op.identifier.in
                )
                if (deleteIndex !== -1) {
                  subtreeParameters = subtreeParameters.delete(deleteIndex)
                }
                break
            }
          })
          
          newState = newState.setIn(["resolvedSubtrees", "paths", finalPath, finalMethod, "parameters"], subtreeParameters)
        }
      }
    }

    // Update the spec string only once at the end
    const updatedSpec = newState.get("json").toJS()
    const specString = JSON.stringify(updatedSpec, null, 2)
    newState = newState.set("spec", specString)

    return newState
  }

}
