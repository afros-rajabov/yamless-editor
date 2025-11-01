import React from "react"
import { fromJS, Iterable } from "immutable"
import PropTypes from "prop-types"
import ImPropTypes from "react-immutable-proptypes"
import { defaultStatusCode, getAcceptControllingResponse, isExtension } from "core/utils"
import createHtmlReadyId from "core/utils/create-html-ready-id"

export default class Responses extends React.Component {
  static propTypes = {
    tryItOutResponse: PropTypes.instanceOf(Iterable),
    responses: PropTypes.instanceOf(Iterable).isRequired,
    produces: PropTypes.instanceOf(Iterable),
    producesValue: PropTypes.any,
    displayRequestDuration: PropTypes.bool.isRequired,
    path: PropTypes.string.isRequired,
    method: PropTypes.string.isRequired,
    getComponent: PropTypes.func.isRequired,
    getConfigs: PropTypes.func.isRequired,
    specSelectors: PropTypes.object.isRequired,
    specActions: PropTypes.object.isRequired,
    oas3Actions: PropTypes.object.isRequired,
    oas3Selectors: PropTypes.object.isRequired,
    specPath: ImPropTypes.list.isRequired,
    fn: PropTypes.object.isRequired,
    isEditing: PropTypes.bool,
    pendingResponses: PropTypes.instanceOf(Iterable),
    onResponseAdd: PropTypes.func,
    onResponseUpdate: PropTypes.func,
    onResponseDelete: PropTypes.func,
  }

  static defaultProps = {
    tryItOutResponse: null,
    produces: fromJS(["application/json"]),
    displayRequestDuration: false,
    isEditing: false,
    pendingResponses: null,
    onResponseAdd: () => {},
    onResponseUpdate: () => {},
    onResponseDelete: () => {},
  }

  constructor(props) {
    super(props)

    this.state = {
      isDialogOpen: false,
      selectedCode: null,
    }
  }

  // These performance-enhancing checks were disabled as part of Multiple Examples
  // because they were causing data-consistency issues
  //
  // shouldComponentUpdate(nextProps) {
  //   // BUG: props.tryItOutResponse is always coming back as a new Immutable instance
  //   let render = this.props.tryItOutResponse !== nextProps.tryItOutResponse
  //   || this.props.responses !== nextProps.responses
  //   || this.props.produces !== nextProps.produces
  //   || this.props.producesValue !== nextProps.producesValue
  //   || this.props.displayRequestDuration !== nextProps.displayRequestDuration
  //   || this.props.path !== nextProps.path
  //   || this.props.method !== nextProps.method
  //   return render
  // }

	onChangeProducesWrapper = ( val ) => this.props.specActions.changeProducesValue([this.props.path, this.props.method], val)

  onResponseContentTypeChange = ({ controlsAcceptHeader, value }) => {
    const { oas3Actions, path, method } = this.props
    if(controlsAcceptHeader) {
      oas3Actions.setResponseContentType({
        value,
        path,
        method
      })
    }
  }

  openNewResponseDialog = () => {
    this.setState({ isDialogOpen: true, selectedCode: null })
  }

  openEditResponseDialog = (code) => {
    this.setState({ isDialogOpen: true, selectedCode: code })
  }

  closeResponseDialog = () => {
    this.setState({ isDialogOpen: false, selectedCode: null })
  }

  handleDialogSave = (payload, previousCode) => {
    const { onResponseAdd, onResponseUpdate } = this.props
    if (previousCode !== undefined && previousCode !== null) {
      onResponseUpdate(payload, previousCode)
    } else {
      onResponseAdd(payload)
    }
  }

  handleDialogDelete = (code) => {
    if (!code) {
      return
    }
    this.props.onResponseDelete(code)
  }

  render() {
    let {
      responses,
      tryItOutResponse,
      getComponent,
      getConfigs,
      specSelectors,
      fn,
      producesValue,
      displayRequestDuration,
      specPath,
      path,
      method,
      oas3Selectors,
      oas3Actions,
      isEditing,
      pendingResponses,
    } = this.props

    const baseResponses = (isEditing && pendingResponses) ? pendingResponses : responses
    const normalizedResponses = Iterable.isIterable(baseResponses)
      ? baseResponses
      : fromJS(baseResponses || {})

    let defaultCode = defaultStatusCode( normalizedResponses )

    const ContentType = getComponent( "contentType" )
    const LiveResponse = getComponent( "liveResponse" )
    const Response = getComponent( "response" )
    const ResponseEditDialog = getComponent("responseEditDialog", false, { failSilently: true })

    let produces = this.props.produces && this.props.produces.size ? this.props.produces : Responses.defaultProps.produces

    const isSpecOAS3 = specSelectors.isOAS3()

    const acceptControllingResponse = isSpecOAS3 ?
      getAcceptControllingResponse(normalizedResponses) : null

    const nonExtensionResponses = normalizedResponses.filter((_, key) => !isExtension(key))
    const regionId = createHtmlReadyId(`${method}${path}_responses`)
    const controlId = `${regionId}_select`

    const selectedCode = this.state.selectedCode
    const selectedResponse = selectedCode && normalizedResponses ? normalizedResponses.get(selectedCode) : null
    const hasResponses = nonExtensionResponses && nonExtensionResponses.size

    const existingCodes = normalizedResponses ? normalizedResponses.keySeq().toArray() : []

    if (!hasResponses && !isEditing) {
      return null
    }

    return (
      <div className="responses-wrapper">
        <div className="opblock-section-header">
          <h4>Responses</h4>
          {isEditing ? (
            <button
              type="button"
              className="btn authorize"
              onClick={this.openNewResponseDialog}
            >
              Add response
            </button>
          ) : null}
            { specSelectors.isOAS3() ? null : <label htmlFor={controlId}>
              <span>Response content type</span>
              <ContentType value={producesValue}
                         ariaControls={regionId}
                         ariaLabel="Response content type"
                         className="execute-content-type"
                         contentTypes={produces}
                         controlId={controlId}
                         onChange={this.onChangeProducesWrapper} />
                     </label> }
        </div>
        <div className="responses-inner">
          {
            !tryItOutResponse ? null
                              : <div>
                                  <LiveResponse response={ tryItOutResponse }
                                                getComponent={ getComponent }
                                                getConfigs={ getConfigs }
                                                specSelectors={ specSelectors }
                                                path={ this.props.path }
                                                method={ this.props.method }
                                                displayRequestDuration={ displayRequestDuration } />
                                  <h4>Responses</h4>
                                </div>

          }

          {hasResponses ? (
            <table aria-live="polite" className="responses-table" id={regionId} role="region">
              <thead>
                <tr className="responses-header">
                  <td className="col_header response-col_status">Code</td>
                  <td className="col_header response-col_description">Description</td>
                  { specSelectors.isOAS3() ? <td className="col col_header response-col_links">Links</td> : null }
                </tr>
              </thead>
              <tbody>
                {
                  nonExtensionResponses.entrySeq().map( ([code, response]) => {

                    let className = tryItOutResponse && tryItOutResponse.get("status") == code ? "response_current" : ""
                    return (
                      <Response key={ code }
                                path={path}
                                method={method}
                                specPath={specPath.push(code)}
                                isDefault={defaultCode === code}
                                fn={fn}
                                className={ className }
                                code={ code }
                                response={ response }
                                specSelectors={ specSelectors }
                                controlsAcceptHeader={response === acceptControllingResponse}
                                onContentTypeChange={this.onResponseContentTypeChange}
                                contentType={ producesValue }
                                getConfigs={ getConfigs }
                                activeExamplesKey={oas3Selectors.activeExamplesMember(
                                  path,
                                  method,
                                  "responses",
                                  code
                                )}
                                oas3Actions={oas3Actions}
                                getComponent={ getComponent }
                                isEditing={isEditing}
                                onEdit={isEditing ? () => this.openEditResponseDialog(code) : null}
                        />
                      )
                  }).toArray()
                }
              </tbody>
            </table>
          ) : (
            <div className="opblock-description-wrapper"><p>No responses</p></div>
          )}
        </div>

        {isEditing && ResponseEditDialog ? (
          <ResponseEditDialog
            isOpen={this.state.isDialogOpen}
            code={selectedCode}
            response={selectedResponse}
            existingCodes={existingCodes}
            onSave={this.handleDialogSave}
            onDelete={code => this.handleDialogDelete(code)}
            onClose={this.closeResponseDialog}
            isOperationEditMode={isEditing}
            getComponent={getComponent}
            specSelectors={specSelectors}
            path={path}
            method={method}
          />
        ) : null}
      </div>
    )
  }
}
