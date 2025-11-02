import React from "react"
import PropTypes from "prop-types"
import ImPropTypes from "react-immutable-proptypes"
import cx from "classnames"
import { fromJS, Seq, Iterable, List, Map } from "immutable"
import { getExtensions, fromJSOrdered, stringify } from "core/utils"
import { getKnownSyntaxHighlighterLanguage } from "core/utils/jsonParse"
import { deepResolveSchema } from "core/utils/parameter-utils"


const getExampleComponent = ( sampleResponse, HighlightCode ) => {
  if (sampleResponse == null) return null

  const testValueForJson = getKnownSyntaxHighlighterLanguage(sampleResponse)
  const language = testValueForJson ? "json" : null

  return (
    <div>
      <HighlightCode className="example" language={language}>{stringify(sampleResponse)}</HighlightCode>
    </div>
  )
}

export default class Response extends React.Component {
  constructor(props, context) {
    super(props, context)

    this.state = {
      responseContentType: "",
    }
  }

  static propTypes = {
    path: PropTypes.string.isRequired,
    method: PropTypes.string.isRequired,
    code: PropTypes.string.isRequired,
    response: PropTypes.instanceOf(Iterable),
    className: PropTypes.string,
    getComponent: PropTypes.func.isRequired,
    getConfigs: PropTypes.func.isRequired,
    specSelectors: PropTypes.object.isRequired,
    oas3Actions: PropTypes.object.isRequired,
    specPath: ImPropTypes.list.isRequired,
    fn: PropTypes.object.isRequired,
    contentType: PropTypes.string,
    activeExamplesKey: PropTypes.string,
    controlsAcceptHeader: PropTypes.bool,
    onContentTypeChange: PropTypes.func,
    isEditing: PropTypes.bool,
    onEdit: PropTypes.func,
  }

  static defaultProps = {
    response: fromJS({}),
    onContentTypeChange: () => {},
    isEditing: false,
    onEdit: null,
  }

  _onContentTypeChange = (value) => {
    const { onContentTypeChange, controlsAcceptHeader } = this.props
    this.setState({ responseContentType: value })
    onContentTypeChange({
      value: value,
      controlsAcceptHeader
    })
  }

  getTargetExamplesKey = () => {
    const { response, contentType, activeExamplesKey } = this.props

    const activeContentType = this.state.responseContentType || contentType
    const activeMediaType = response.getIn(["content", activeContentType], Map({}))
    const examplesForMediaType = activeMediaType.get("examples", null)

    const firstExamplesKey = examplesForMediaType.keySeq().first()
    return activeExamplesKey || firstExamplesKey
  }

  render() {
    let {
      path,
      method,
      code,
      response,
      className,
      specPath,
      fn,
      getComponent,
      getConfigs,
      specSelectors,
      contentType,
      controlsAcceptHeader,
      oas3Actions,
      isEditing,
      onEdit,
    } = this.props

    let { inferSchema, getSampleSchema } = fn
    let isOAS3 = specSelectors.isOAS3()
    const { showExtensions } = getConfigs()

    let extensions = showExtensions ? getExtensions(response) : null
    let headers = response.get("headers")
    let links = response.get("links")
    const ResponseExtension = getComponent("ResponseExtension")
    const Headers = getComponent("headers")
    const HighlightCode = getComponent("HighlightCode", true)
    const ModelExample = getComponent("modelExample")
    const Markdown = getComponent("Markdown", true)
    const OperationLink = getComponent("operationLink")
    const ContentType = getComponent("contentType")
    const ExamplesSelect = getComponent("ExamplesSelect")
    const Example = getComponent("Example")


    var schema, specPathWithPossibleSchema

    const activeContentType = this.state.responseContentType || contentType
    const activeMediaType = response.getIn(["content", activeContentType], Map({}))
    const examplesForMediaType = activeMediaType.get("examples", null)

    // Resolve $ref for edit-mode buffered responses so schema references render correctly
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

    // Declare oas3SchemaForContentType outside the if block so it's available for sampleSchema
    let oas3SchemaForContentType = null

    // Goal: find a schema value for `schema`
    if(isOAS3) {
      oas3SchemaForContentType = activeMediaType.get("schema")
      
      // Resolve schema reference if it's a $ref in edit mode (for staged responses)
      // This ensures staged responses with schema references render correctly with deep resolution
      if (isEditing && oas3SchemaForContentType) {
        // Use deep resolution to resolve all nested $ref references
        const deeplyResolved = deepResolveSchema(oas3SchemaForContentType, resolveRef)
        if (deeplyResolved) {
          oas3SchemaForContentType = fromJS(deeplyResolved)
        }
      }

      schema = oas3SchemaForContentType ? inferSchema(oas3SchemaForContentType.toJS()) : null
      specPathWithPossibleSchema = oas3SchemaForContentType ? List(["content", this.state.responseContentType, "schema"]) : specPath
    } else {
      schema = response.get("schema")
      specPathWithPossibleSchema = response.has("schema") ? specPath.push("schema") : specPath
    }

    let mediaTypeExample
    let shouldOverrideSchemaExample = false
    let sampleSchema
    let sampleGenConfig = {
      includeReadOnly: true
    }

    // Goal: find an example value for `sampleResponse`
    if(isOAS3) {
      // Use the resolved schema if available (for staged responses with $ref)
      // Otherwise fall back to the original schema from activeMediaType
      if (oas3SchemaForContentType) {
        sampleSchema = oas3SchemaForContentType.toJS()
      } else {
        sampleSchema = activeMediaType.get("schema")?.toJS()
      }
      if(Map.isMap(examplesForMediaType) && !examplesForMediaType.isEmpty()) {
        const targetExamplesKey = this.getTargetExamplesKey()
        const targetExample = examplesForMediaType
          .get(targetExamplesKey, Map({}))
        const getMediaTypeExample = (targetExample) =>
          Map.isMap(targetExample) 
          ? targetExample.get("value") 
          : undefined
        mediaTypeExample = getMediaTypeExample(targetExample)
        if(mediaTypeExample === undefined) {
          mediaTypeExample = getMediaTypeExample(examplesForMediaType.values().next().value)
        }
        shouldOverrideSchemaExample = true
      } else if(activeMediaType.get("example") !== undefined) {
        // use the example key's value
        mediaTypeExample = activeMediaType.get("example")
        shouldOverrideSchemaExample = true
      }
    } else {
      sampleSchema = schema
      sampleGenConfig = {...sampleGenConfig, includeWriteOnly: true}
      const oldOASMediaTypeExample = response.getIn(["examples", activeContentType])
      if(oldOASMediaTypeExample) {
        mediaTypeExample = oldOASMediaTypeExample
        shouldOverrideSchemaExample = true
      }
    }

    const sampleResponse = getSampleSchema(
      sampleSchema,
      activeContentType,
      sampleGenConfig,
      shouldOverrideSchemaExample ? mediaTypeExample : undefined
    )

    const example = getExampleComponent( sampleResponse, HighlightCode )

    return (
      <tr className={ "response " + ( className || "") } data-code={code}>
        <td className="response-col_status">
          { code }
        </td>
        <td className="response-col_description">

          <div className="response-col_description__inner">
            {isEditing && onEdit ? (
              <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8 }}>
                <button
                  type="button"
                  className="btn"
                  style={{ backgroundColor: "transparent", borderColor: "#fca130", color: "#fca130" }}
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); onEdit() }}
                >
                  Edit
                </button>
              </div>
            ) : null}
            <Markdown source={ response.get( "description" ) } />
          </div>

          { !showExtensions || !extensions.size ? null : extensions.entrySeq().map(([key, v]) => <ResponseExtension key={`${key}-${v}`} xKey={key} xVal={v} /> )}

          {isOAS3 && response.get("content") ? (
            <section className="response-controls">
              <div
                className={cx("response-control-media-type", {
                  "response-control-media-type--accept-controller": controlsAcceptHeader
                })}
              >
                <small className="response-control-media-type__title">
                  Media type
                </small>
                <ContentType
                  value={this.state.responseContentType}
                  contentTypes={
                    response.get("content")
                      ? response.get("content").keySeq()
                      : Seq()
                  }
                  onChange={this._onContentTypeChange}
                  ariaLabel="Media Type"
                />
                {controlsAcceptHeader ? (
                  <small className="response-control-media-type__accept-message">
                    Controls <code>Accept</code> header.
                  </small>
                ) : null}
              </div>
              {Map.isMap(examplesForMediaType) && !examplesForMediaType.isEmpty() ? (
                <div className="response-control-examples">
                  <small className="response-control-examples__title">
                    Examples
                  </small>
                  <ExamplesSelect
                    examples={examplesForMediaType}
                    currentExampleKey={this.getTargetExamplesKey()}
                    onSelect={key =>
                      oas3Actions.setActiveExamplesMember({
                        name: key,
                        pathMethod: [path, method],
                        contextType: "responses",
                        contextName: code
                      })
                    }
                    showLabels={false}
                  />
                </div>
              ) : null}
            </section>
          ) : null}

          { example || schema ? (
            <ModelExample
              specPath={specPathWithPossibleSchema}
              getComponent={ getComponent }
              getConfigs={ getConfigs }
              specSelectors={ specSelectors }
              schema={ fromJSOrdered(schema) }
              example={ example }
              includeReadOnly={ true }/>
          ) : null }

          { isOAS3 && examplesForMediaType ? (
              <Example
                example={examplesForMediaType.get(this.getTargetExamplesKey(), Map({}))}
                getComponent={getComponent}
                getConfigs={getConfigs}
                omitValue={true}
              />
          ) : null}

          { headers ? (
            <Headers
              headers={ headers }
              getComponent={ getComponent }
            />
          ) : null}

        </td>
        {isOAS3 ? <td className="response-col_links">
          { links ?
            links.toSeq().entrySeq().map(([key, link]) => {
              return <OperationLink key={key} name={key} link={ link } getComponent={getComponent}/>
            })
          : <i>No links</i>}
        </td> : null}
      </tr>
    )
  }
}
