/**
 * @prettier
 */

import React, { Component } from "react"
import PropTypes from "prop-types"
import ImPropTypes from "react-immutable-proptypes"
import { Map, List, fromJS } from "immutable"
import { stringify } from "core/utils"
import { getKnownSyntaxHighlighterLanguage } from "core/utils/jsonParse"
import createHtmlReadyId from "core/utils/create-html-ready-id"
import { deepResolveSchema } from "core/utils/parameter-utils"

export default class RequestBodySection extends Component {
  static propTypes = {
    requestBody: ImPropTypes.map,
    specPath: ImPropTypes.list.isRequired,
    pathMethod: PropTypes.array.isRequired,
    specSelectors: PropTypes.object.isRequired,
    specActions: PropTypes.object.isRequired,
    oas3Actions: PropTypes.object.isRequired,
    oas3Selectors: PropTypes.object.isRequired,
    getComponent: PropTypes.func.isRequired,
    getConfigs: PropTypes.func.isRequired,
    fn: PropTypes.object.isRequired,
    isExecute: PropTypes.bool,
    isEditing: PropTypes.bool,
    pendingRequestBody: ImPropTypes.map,
    onRequestBodyAdd: PropTypes.func,
    onRequestBodyUpdate: PropTypes.func,
    onRequestBodyDelete: PropTypes.func,
  }

  static defaultProps = {
    requestBody: null,
    isExecute: false,
    isEditing: false,
    pendingRequestBody: null,
    onRequestBodyAdd: Function.prototype,
    onRequestBodyUpdate: Function.prototype,
    onRequestBodyDelete: Function.prototype,
  }

  constructor(props) {
    super(props)
    this.state = {
      showRequestBodyDialog: false,
    }
  }

  componentDidUpdate(prevProps) {
    // Clear dialog when edit mode is turned off
    if (prevProps.isEditing && !this.props.isEditing) {
      this.setState({ showRequestBodyDialog: false })
    }
  }

  handleRequestBodySave = (requestBodyPayload) => {
    const { isEditing, pendingRequestBody, onRequestBodyAdd, onRequestBodyUpdate, specActions, pathMethod } = this.props
    
    if (isEditing) {
      // Edit mode: buffer changes
      if (pendingRequestBody) {
        onRequestBodyUpdate(requestBodyPayload)
      } else {
        onRequestBodyAdd(requestBodyPayload)
      }
    } else {
      // Non-edit mode: immediate save (existing behavior)
      const [path, method] = pathMethod
      specActions.updateRequestBody(path, method, requestBodyPayload)
    }
    
    this.setState({ showRequestBodyDialog: false })
  }

  handleRequestBodyDelete = () => {
    const { isEditing, onRequestBodyDelete, specActions, pathMethod } = this.props
    
    if (isEditing) {
      // Edit mode: buffer changes
      onRequestBodyDelete()
    } else {
      // Non-edit mode: immediate save (existing behavior)
      const [path, method] = pathMethod
      specActions.deleteRequestBody(path, method)
    }
    
    this.setState({ showRequestBodyDialog: false })
  }

  onChangeMediaType = ({ value, pathMethod }) => {
    const { specActions, oas3Selectors, oas3Actions } = this.props
    const userHasEditedBody = oas3Selectors.hasUserEditedBody(...pathMethod)
    const shouldRetainRequestBodyValue = oas3Selectors.shouldRetainRequestBodyValue(...pathMethod)
    oas3Actions.setRequestContentType({ value, pathMethod })
    oas3Actions.initRequestBodyValidateError({ pathMethod })
    if (!userHasEditedBody) {
      if(!shouldRetainRequestBodyValue) {
        oas3Actions.setRequestBodyValue({ value: undefined, pathMethod })
      }
      specActions.clearResponse(...pathMethod)
      specActions.clearRequest(...pathMethod)
      specActions.clearValidateParams(pathMethod)
    }
  }

  render() {
    const {
      requestBody,
      specPath,
      pathMethod,
      specSelectors,
      oas3Actions,
      oas3Selectors,
      getComponent,
      getConfigs,
      fn,
      isExecute,
      isEditing,
      pendingRequestBody,
    } = this.props

    // Use pending request body when in edit mode, otherwise use operation request body
    const displayRequestBody = isEditing && pendingRequestBody !== null ? pendingRequestBody : requestBody
    
    if (!displayRequestBody && !isEditing) {
      return null
    }

    // Check if method supports request body (POST, PUT, PATCH)
    const [path, method] = pathMethod
    const supportsRequestBody = ["post", "put", "patch"].includes(method.toLowerCase())

    if (!supportsRequestBody && !displayRequestBody) {
      return null
    }

    const RequestBody = getComponent("RequestBody", true)
    const RequestBodyEditDialog = getComponent("requestBodyEditDialog", false, { failSilently: true })
    const ContentType = getComponent("contentType")
    const HighlightCode = getComponent("HighlightCode", true)
    const ModelExample = getComponent("modelExample")
    const Markdown = getComponent("Markdown", true)

    const regionId = createHtmlReadyId(`${pathMethod[1]}${pathMethod[0]}_requests`)
    const controlId = `${regionId}_select`
    const retainRequestBodyValueFlagForOperation = (f) => oas3Actions.setRetainRequestBodyValueFlag({ value: f, pathMethod })

    // Render "Add Request Body" section when no request body exists in edit mode
    if (!displayRequestBody && isEditing && supportsRequestBody) {
      return (
        <div className="opblock-section opblock-section-request-body">
          <div className="opblock-section-header">
            <h4 className="opblock-title">Request body</h4>
            <button
              className="btn authorize"
              onClick={() => this.setState({ showRequestBodyDialog: true })}
            >
              Add Request Body
            </button>
          </div>
          {RequestBodyEditDialog && (
            <RequestBodyEditDialog
              isOpen={this.state.showRequestBodyDialog}
              requestBody={null}
              onSave={this.handleRequestBodySave}
              onDelete={this.handleRequestBodyDelete}
              onClose={() => this.setState({ showRequestBodyDialog: false })}
              getComponent={getComponent}
              specSelectors={specSelectors}
              pathMethod={pathMethod}
              isOperationEditMode={isEditing}
              path={path}
              method={method}
            />
          )}
        </div>
      )
    }

    if (!displayRequestBody) {
      return null
    }

    return (
      <div className="opblock-section opblock-section-request-body">
        <div className="opblock-section-header">
          <h4 className={`opblock-title parameter__name ${displayRequestBody.get("required") && "required"}`}>
            Request body
          </h4>
          {isEditing && supportsRequestBody ? (
            <button
              className="btn authorize"
              onClick={() => this.setState({ showRequestBodyDialog: true })}
            >
              Edit Request Body
            </button>
          ) : null}
          {!isEditing ? (
            <label id={controlId}>
              <ContentType
                value={oas3Selectors.requestContentType(...pathMethod)}
                contentTypes={displayRequestBody.get("content", List()).keySeq()}
                onChange={(value) => {
                  this.onChangeMediaType({ value, pathMethod })
                }}
                className="body-param-content-type"
                ariaLabel="Request content type" 
                controlId={controlId}
              />
            </label>
          ) : null}
        </div>
        <div className="opblock-description-wrapper">
          {!isEditing ? (
            <RequestBody
              setRetainRequestBodyValueFlag={retainRequestBodyValueFlagForOperation}
              userHasEditedBody={oas3Selectors.hasUserEditedBody(...pathMethod)}
              specPath={specPath.slice(0, -1).push("requestBody")}
              requestBody={displayRequestBody}
              requestBodyValue={oas3Selectors.requestBodyValue(...pathMethod)}
              requestBodyInclusionSetting={oas3Selectors.requestBodyInclusionSetting(...pathMethod)}
              requestBodyErrors={oas3Selectors.requestBodyErrors(...pathMethod)}
              isExecute={isExecute}
              getConfigs={getConfigs}
              specSelectors={specSelectors}
              fn={fn}
              oas3Actions={oas3Actions}
              activeExamplesKey={oas3Selectors.activeExamplesMember(
                ...pathMethod,
                "requestBody",
                "requestBody",
              )}
              updateActiveExamplesKey={key => {
                oas3Actions.setActiveExamplesMember({
                  name: key,
                  pathMethod: pathMethod,
                  contextType: "requestBody",
                  contextName: "requestBody",
                })
              }}
              onChange={(value, path) => {
                if (path) {
                  const lastValue = oas3Selectors.requestBodyValue(...pathMethod)
                  const usableValue = Map.isMap(lastValue) ? lastValue : Map()
                  return oas3Actions.setRequestBodyValue({
                    pathMethod,
                    value: usableValue.setIn(path, value),
                  })
                }
                oas3Actions.setRequestBodyValue({ value, pathMethod })
              }}
              onChangeIncludeEmpty={(name, value) => {
                oas3Actions.setRequestBodyInclusion({
                  pathMethod,
                  value,
                  name,
                })
              }}
              contentType={oas3Selectors.requestContentType(...pathMethod)} />
          ) : (
            <div className="request-body-preview">
              {(() => {
                const contentType = displayRequestBody.get("content", List()).keySeq().first() || ""
                const mediaTypeValue = displayRequestBody.getIn(["content", contentType]) || Map()
                let schema = mediaTypeValue.get("schema", Map())
                const requestBodyDescription = displayRequestBody.get("description")
                
                // Resolve $ref for edit-mode buffered request body so schema references render correctly
                const resolveRef = (ref) => {
                  if (!ref || !specSelectors) return null
                  const pathParts = String(ref).replace(/^#\//, "").split("/")
                  // Try resolved subtree first
                  if (specSelectors.specResolvedSubtree) {
                    const resolved = specSelectors.specResolvedSubtree(pathParts)
                    if (resolved) return resolved
                  }
                  // Fallback to raw spec JSON
                  if (specSelectors.specJson) {
                    const raw = specSelectors.specJson().getIn(pathParts)
                    if (raw) return raw
                  }
                  return null
                }
                
                // Resolve schema reference with deep resolution (recursively resolves all nested $ref references)
                let displaySchema = schema
                const deeplyResolved = deepResolveSchema(schema, resolveRef)
                if (deeplyResolved) {
                  displaySchema = fromJS(deeplyResolved)
                }
                
                // Get sample value using resolved schema
                const sampleRequestBody = fn.getSampleSchema && displaySchema.size > 0
                  ? fn.getSampleSchema(displaySchema.toJS(), contentType, { includeWriteOnly: true })
                  : null
                
                let language = null
                if (sampleRequestBody) {
                  const testValueForJson = getKnownSyntaxHighlighterLanguage(stringify(sampleRequestBody))
                  if (testValueForJson) {
                    language = "json"
                  }
                }
                
                const example = sampleRequestBody ? (
                  <HighlightCode className="body-param__example" language={language}>
                    {stringify(sampleRequestBody)}
                  </HighlightCode>
                ) : null
                
                return (
                  <div>
                    {requestBodyDescription && (
                      <div className="opblock-description-wrapper">
                        <Markdown source={requestBodyDescription} />
                      </div>
                    )}
                    {displaySchema.size > 0 ? (
                      <ModelExample
                        getComponent={getComponent}
                        getConfigs={getConfigs}
                        specSelectors={specSelectors}
                        expandDepth={1}
                        isExecute={false}
                        schema={displaySchema}
                        specPath={specPath.slice(0, -1).push("requestBody", "content", contentType, "schema")}
                        example={example}
                        includeWriteOnly={true}
                      />
                    ) : (
                      <div>
                        <p><strong>Content Type:</strong> {contentType || "Not set"}</p>
                        <p><strong>Required:</strong> {displayRequestBody.get("required") ? "Yes" : "No"}</p>
                        {example}
                      </div>
                    )}
                  </div>
                )
              })()}
            </div>
          )}
        </div>
        {/* Request Body Edit Dialog */}
        {isEditing && RequestBodyEditDialog && supportsRequestBody ? (
          <RequestBodyEditDialog
            isOpen={this.state.showRequestBodyDialog}
            requestBody={displayRequestBody}
            onSave={this.handleRequestBodySave}
            onDelete={this.handleRequestBodyDelete}
            onClose={() => this.setState({ showRequestBodyDialog: false })}
            getComponent={getComponent}
            specSelectors={specSelectors}
            pathMethod={pathMethod}
            isOperationEditMode={isEditing}
            path={path}
            method={method}
          />
        ) : null}
      </div>
    )
  }
}

