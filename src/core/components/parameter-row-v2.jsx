import React, { Component } from "react"
import { Map, List, fromJS } from "immutable"
import PropTypes from "prop-types"
import ImPropTypes from "react-immutable-proptypes"
import win from "core/window"
import { getExtensions, getCommonExtensions, numberToString, stringify, isEmptyValue } from "core/utils"
import getParameterSchema from "core/utils/get-parameter-schema.js"
import { deepResolveSchema } from "core/utils/parameter-utils"

export default class ParameterRowV2 extends Component {
  static propTypes = {
    onChange: PropTypes.func.isRequired,
    param: PropTypes.object,
    rawParam: PropTypes.object.isRequired,
    getComponent: PropTypes.func.isRequired,
    fn: PropTypes.object.isRequired,
    isExecute: PropTypes.bool,
    onChangeConsumes: PropTypes.func.isRequired,
    specSelectors: PropTypes.object.isRequired,
    specActions: PropTypes.object.isRequired,
    pathMethod: PropTypes.array.isRequired,
    getConfigs: PropTypes.func.isRequired,
    specPath: ImPropTypes.list.isRequired,
    oas3Actions: PropTypes.object.isRequired,
    oas3Selectors: PropTypes.object.isRequired,
    isEditing: PropTypes.bool,
    onParameterClick: PropTypes.func,
    isSelected: PropTypes.bool,
    onParameterEditClick: PropTypes.func,
  }

  constructor(props, context) {
    super(props, context)
    
    // Track value in component state for new parameters in edit mode
    this.state = {
      localValue: undefined,
      valueGenerated: false // Flag to track if we've attempted to generate value
    }
  }

  componentDidMount() {
    // Set default value after mount so schema resolution is available
    this.setDefaultValue()
  }
  
  componentDidUpdate(prevProps) {
    // If rawParam changed or edit mode was toggled, regenerate value
    if (prevProps.rawParam !== this.props.rawParam || 
        prevProps.isEditing !== this.props.isEditing) {
      // Reset valueGenerated flag when these change
      this.setState({ valueGenerated: false, localValue: undefined })
      this.setDefaultValue()
    }
  }

  UNSAFE_componentWillReceiveProps(nextProps) {
    // Only update if rawParam changed
    if (nextProps.rawParam !== this.props.rawParam) {
      this.setState({ valueGenerated: false, localValue: undefined })
      this.setDefaultValue()
    }
  }

  onChangeWrapper = (value, isXml = false) => {
    let { onChange, rawParam, isEditing, specSelectors, pathMethod } = this.props
    let valueForUpstream

    // Coerce empty strings and empty Immutable objects to null
    if(value === "" || (value && value.size === 0)) {
      valueForUpstream = null
    } else {
      valueForUpstream = value
    }

    // Always call onChange to persist the value to meta state
    // This ensures the value is saved even when exiting edit mode
    onChange(rawParam, valueForUpstream, isXml)
    
    // For new parameters in edit mode, also store value in component state
    // This ensures we can display it immediately even when parameterWithMetaByIdentity returns empty
    const paramWithMeta = specSelectors.parameterWithMetaByIdentity(pathMethod, rawParam) || Map()
    if (isEditing && (!paramWithMeta || paramWithMeta.isEmpty())) {
      // Store value in component state for new parameters (including empty string and null)
      // Empty string and null are valid values that should be displayed
      this.setState({ localValue: valueForUpstream })
    }
    
    return valueForUpstream
  }

  _onExampleSelect = (key) => {
    this.props.oas3Actions.setActiveExamplesMember({
      name: key,
      pathMethod: this.props.pathMethod,
      contextType: "parameters",
      contextName: this.getParamKey()
    })
  }

  onChangeIncludeEmpty = (newValue) => {
    let { specActions, rawParam, pathMethod } = this.props
    const paramName = rawParam.get("name")
    const paramIn = rawParam.get("in")
    return specActions.updateEmptyParamInclusion(pathMethod, paramName, paramIn, newValue)
  }

  setDefaultValue = () => {
    let { specSelectors, pathMethod, rawParam, oas3Selectors, fn, isEditing } = this.props

    // Use rawParam directly - like responses use response directly
    // Don't rely on parameterWithMetaByIdentity which returns empty for new parameters
    const workingParam = rawParam
    
    let { schema } = getParameterSchema(workingParam, { isOAS3: specSelectors.isOAS3() })
    
    // For new parameters with schema references, resolve the schema first (like responses do)
    if (isEditing && schema) {
      const resolveRef = (ref) => {
        if (!ref || !specSelectors) return null
        const pathParts = String(ref).replace(/^#\//, "").split("/")
        if (specSelectors.specResolvedSubtree) {
          const resolved = specSelectors.specResolvedSubtree(pathParts)
          if (resolved) return resolved
        }
        if (specSelectors.specJson) {
          const raw = specSelectors.specJson().getIn(pathParts)
          if (raw) return raw
        }
        return null
      }
      
      // Resolve schema reference with deep resolution for new parameters
      const deeplyResolved = deepResolveSchema(schema, resolveRef)
      if (deeplyResolved) {
        schema = fromJS(deeplyResolved)
      }
    }
    
    // Compose schema for OAS3 (oneOf/anyOf handling)
    if (specSelectors.isOAS3() && schema) {
      schema = this.composeJsonSchema(schema)
    }
    
    const parameterMediaType = workingParam
      .get("content", Map())
      .keySeq()
      .first()

    // Generate sample value from schema (use resolved schema if available)
    const generatedSampleValue = schema ? fn.getSampleSchema(schema.toJS(), parameterMediaType, {
      includeWriteOnly: true
    }) : null

    // Check if value already exists in component state (for new parameters) or meta (for existing)
    const paramWithMeta = specSelectors.parameterWithMetaByIdentity(pathMethod, rawParam) || Map()
    const existingValue = paramWithMeta && paramWithMeta.get("value") !== undefined
      ? paramWithMeta.get("value")
      : (isEditing && (!paramWithMeta || paramWithMeta.isEmpty()) && this.state.localValue !== undefined)
        ? this.state.localValue
        : undefined
    
    if (existingValue !== undefined) {
      return
    }
    
    // Skip if not in edit mode and parameter doesn't exist in spec
    if (!isEditing && !paramWithMeta) {
      return
    }

    if( workingParam.get("in") !== "body" ) {
      let initialValue

      // Find an initial value from parameter schema/example/default
      if (specSelectors.isSwagger2()) {
        initialValue =
          workingParam.get("x-example") !== undefined
          ? workingParam.get("x-example")
          : workingParam.getIn(["schema", "example"]) !== undefined
          ? workingParam.getIn(["schema", "example"])
          : (schema && schema.getIn(["default"]))
      } else if (specSelectors.isOAS3()) {
        // Schema already composed above
        const currentExampleKey = oas3Selectors.activeExamplesMember(...pathMethod, "parameters", this.getParamKey())
        initialValue =
          workingParam.getIn(["examples", currentExampleKey, "value"]) !== undefined
          ? workingParam.getIn(["examples", currentExampleKey, "value"])
          : workingParam.getIn(["content", parameterMediaType, "example"]) !== undefined
          ? workingParam.getIn(["content", parameterMediaType, "example"])
          : workingParam.get("example") !== undefined
          ? workingParam.get("example")
          : (schema && schema.get("example")) !== undefined
          ? (schema && schema.get("example"))
          : (schema && schema.get("default")) !== undefined
          ? (schema && schema.get("default"))
          : workingParam.get("default")
      }

      // Process the initial value
      if(initialValue !== undefined && !List.isList(initialValue)) {
        initialValue = stringify(initialValue)
      }

      // Dispatch the initial value
      const schemaObjectType = fn.getSchemaObjectType(schema)
      const schemaItemsType = fn.getSchemaObjectType(schema?.get("items"))

      if(initialValue !== undefined) {
        this.onChangeWrapper(initialValue)
      } else if(
        schemaObjectType === "object"
        && generatedSampleValue
        && !workingParam.get("examples")
      ) {
        // Object parameters get special treatment - provide initial values generated from schema
        const valueToSet = List.isList(generatedSampleValue) ? (
          generatedSampleValue
        ) : (
          stringify(generatedSampleValue)
        )
        this.onChangeWrapper(valueToSet)
      }
      else if (
        schemaObjectType === "array"
        && schemaItemsType === "object"
        && generatedSampleValue
        && !workingParam.get("examples")
      ) {
        const valueToSet = List.isList(generatedSampleValue) ? (
          generatedSampleValue
        ) : (
          List(JSON.parse(generatedSampleValue))
        )
        this.onChangeWrapper(valueToSet)
      }
      
      // Mark that we've attempted to generate the value
      if (isEditing && (!paramWithMeta || paramWithMeta.isEmpty())) {
        this.setState({ valueGenerated: true })
      }
    }
  }

  getParamKey() {
    const { rawParam } = this.props

    if(!rawParam) return null

    return `${rawParam.get("name")}-${rawParam.get("in")}`
  }

  composeJsonSchema(schema) {
    const { fn } = this.props
    const oneOf = schema.get("oneOf")?.get(0)?.toJS()
    const anyOf = schema.get("anyOf")?.get(0)?.toJS()
    return fromJS(fn.mergeJsonSchema(schema.toJS(), oneOf ?? anyOf ?? {}))
  }

  render() {
    let {
      rawParam,
      getComponent,
      getConfigs,
      isExecute,
      fn,
      onChangeConsumes,
      specSelectors,
      pathMethod,
      specPath,
      oas3Selectors,
      isEditing,
      onParameterClick,
      isSelected,
      onParameterEditClick,
    } = this.props

    let isOAS3 = specSelectors.isOAS3()
    const { showExtensions, showCommonExtensions } = getConfigs()

    if(!rawParam) return null

    // Use rawParam directly - like responses use response directly
    // This is the key difference from the old component
    const displayParam = rawParam

    const JsonSchemaForm = getComponent("JsonSchemaForm")
    const ParamBody = getComponent("ParamBody")
    const ModelExample = getComponent("modelExample")
    const Markdown = getComponent("Markdown", true)
    const ParameterExt = getComponent("ParameterExt")
    const ParameterIncludeEmpty = getComponent("ParameterIncludeEmpty")
    const ExamplesSelectValueRetainer = getComponent("ExamplesSelectValueRetainer")
    const Example = getComponent("Example")

    // Extract schema directly from rawParam - like responses extract from response
    let { schema } = getParameterSchema(displayParam, { isOAS3 })

    if (isOAS3) {
      schema = this.composeJsonSchema(schema)
    }

    // Resolve $ref for edit-mode buffered parameters
    const resolveRef = (ref) => {
      if (!ref || !specSelectors) return null
      const pathParts = String(ref).replace(/^#\//, "").split("/")
      if (specSelectors.specResolvedSubtree) {
        const resolved = specSelectors.specResolvedSubtree(pathParts)
        if (resolved) return resolved
      }
      if (specSelectors.specJson) {
        const raw = specSelectors.specJson().getIn(pathParts)
        if (raw) return raw
      }
      return null
    }

    // Resolve schema reference with deep resolution
    let displaySchema = schema
    if (isEditing && schema) {
      const deeplyResolved = deepResolveSchema(schema, resolveRef)
      if (deeplyResolved) {
        displaySchema = fromJS(deeplyResolved)
      }
    } else {
      // Simple resolution for backwards compatibility
      const schemaRef = schema && schema.get && schema.get("$ref")
      if (schemaRef) {
        const resolved = resolveRef(schemaRef)
        if (resolved) {
          displaySchema = resolved
        }
      } else if (schema && schema.get && schema.get("items") && schema.getIn(["items", "$ref"])) {
        const itemsRef = schema.getIn(["items", "$ref"]) 
        const resolvedItems = resolveRef(itemsRef)
        if (resolvedItems) {
          displaySchema = schema.set("items", resolvedItems)
        }
      }
    }

    let inType = displayParam.get("in")
    let bodyParam = inType !== "body" ? null
      : <ParamBody getComponent={getComponent}
                   getConfigs={getConfigs}
                   fn={fn}
                   param={displayParam}
                   consumes={specSelectors.consumesOptionsFor(pathMethod)}
                   consumesValue={specSelectors.contentTypeValues(pathMethod).get("requestContentType")}
                   onChange={this.onChangeWrapper}
                   onChangeConsumes={onChangeConsumes}
                   isExecute={isExecute}
                   specSelectors={specSelectors}
                   pathMethod={pathMethod}
      />

    let format = displaySchema ? displaySchema.get("format") : null
    let isFormData = inType === "formData"
    let isFormDataSupported = "FormData" in win
    let required = displayParam.get("required")

    const schemaObjectType = fn.getSchemaObjectType(displaySchema)
    const schemaItemsType = fn.getSchemaObjectType(displaySchema?.get("items"))
    const schemaObjectTypeLabel = fn.getSchemaObjectTypeLabel(displaySchema)
    const hasSchemaRef = displaySchema && displaySchema.get && !!displaySchema.get("$ref")
    const itemsHasRef = displaySchema && displaySchema.getIn && !!displaySchema.getIn(["items", "$ref"]) 
    const isObject = !bodyParam && (schemaObjectType === "object" || hasSchemaRef)
    const isArrayOfObjects = !bodyParam && (schemaItemsType === "object" || itemsHasRef)

    // Get value: use meta if available, otherwise use component state for new parameters
    const paramWithMeta = specSelectors.parameterWithMetaByIdentity(pathMethod, rawParam) || Map()
    let value = ""
    
    // First, try to get value from paramWithMeta (for saved parameters)
    if (paramWithMeta && !paramWithMeta.isEmpty() && paramWithMeta.get("value") !== undefined) {
      value = paramWithMeta.get("value")
    } else {
      // For parameters that might not be in spec yet (new or just saved), check meta state directly
      // The value might be stored in meta even if parameter isn't fully in spec yet
      const paramName = rawParam.get("name")
      const paramIn = rawParam.get("in")
      if (paramName && paramIn) {
        // Try using getParameter selector if available (returns meta param object)
        const getParameter = specSelectors.getParameter
        if (getParameter && typeof getParameter === "function") {
          try {
            const metaParam = getParameter(pathMethod, paramName, paramIn)
            if (metaParam && metaParam instanceof Map && metaParam.get("value") !== undefined) {
              value = metaParam.get("value")
            }
          } catch (e) {
            // Silently fail if getParameter doesn't work as expected
          }
        }
        
        // If still no value and in edit mode, use component state
        if (value === "" && isEditing && (!paramWithMeta || paramWithMeta.isEmpty())) {
          if (this.state.localValue !== undefined) {
            value = this.state.localValue
          }
        }
      }
    }

    let commonExt = showCommonExtensions ? getCommonExtensions(displaySchema) : null
    let extensions = showExtensions ? getExtensions(displayParam) : null

    let paramItems
    let paramEnum
    let paramDefaultValue
    let paramExample
    let isDisplayParamEnum = false

    if (displayParam !== undefined && displaySchema) {
      paramItems = displaySchema.get("items")
    }

    if (paramItems !== undefined) {
      paramEnum = paramItems.get("enum")
      paramDefaultValue = paramItems.get("default")
    } else if (displaySchema) {
      paramEnum = displaySchema.get("enum")
    }

    if (paramEnum && paramEnum.size && paramEnum.size > 0) {
      isDisplayParamEnum = true
    }

    // Default and Example Value for readonly doc
    if (displayParam !== undefined) {
      if (displaySchema) {
        paramDefaultValue = displaySchema.get("default")
      }
      if (paramDefaultValue === undefined) {
        paramDefaultValue = displayParam.get("default")
      }
      paramExample = displayParam.get("example")
      if (paramExample === undefined) {
        paramExample = displayParam.get("x-example")
      }
    }

    const jsonSchemaForm = bodyParam ? null
      : <JsonSchemaForm fn={fn}
        getComponent={getComponent}
        value={value}
        required={required}
        disabled={!isExecute}
        description={displayParam.get("name")}
        onChange={this.onChangeWrapper}
        errors={paramWithMeta.get("errors")}
        schema={displaySchema}
      />

    const handleRowClick = () => {}

    return (
      <tr 
        data-param-name={displayParam.get("name")} 
        data-param-in={displayParam.get("in")}
        className=""
        onClick={handleRowClick}
      >
        <td className="parameters-col_name">
          <div className={required ? "parameter__name required" : "parameter__name"}>
            {displayParam.get("name")}
            {!required ? null : <span>&nbsp;*</span>}
          </div>
          <div className="parameter__type">
            {schemaObjectTypeLabel}
            {format && <span className="prop-format">(${format})</span>}
          </div>
          <div className="parameter__deprecated">
            {isOAS3 && displayParam.get("deprecated") ? "deprecated" : null}
          </div>
          <div className="parameter__in">({displayParam.get("in")})</div>
        </td>

        <td className="parameters-col_description">
          {displayParam.get("description") ? <Markdown source={displayParam.get("description")}/> : null}

          {(bodyParam || !isExecute) && isDisplayParamEnum ?
            <Markdown className="parameter__enum" source={
                "<i>Available values</i> : " + paramEnum.map(function(item) {
                    return item
                  }).toArray().map(String).join(", ")}/>
            : null
          }

          {(bodyParam || !isExecute) && paramDefaultValue !== undefined ?
            <Markdown className="parameter__default" source={"<i>Default value</i> : " + paramDefaultValue}/>
            : null
          }

          {(bodyParam || !isExecute) && paramExample !== undefined ?
            <Markdown source={"<i>Example</i> : " + paramExample}/>
            : null
          }

          {(isFormData && !isFormDataSupported) && <div>Error: your browser does not support FormData</div>}

          {
            isOAS3 && displayParam.get("examples") ? (
              <section className="parameter-controls">
                <ExamplesSelectValueRetainer
                  examples={displayParam.get("examples")}
                  onSelect={this._onExampleSelect}
                  updateValue={this.onChangeWrapper}
                  getComponent={getComponent}
                  defaultToFirstExample={true}
                  currentKey={oas3Selectors.activeExamplesMember(...pathMethod, "parameters", this.getParamKey())}
                  currentUserInputValue={value}
                />
              </section>
            ) : null
          }

          {(isObject || isArrayOfObjects) ? (
            <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
              <div style={{ flex: 1 }}>
                <ModelExample
                  getComponent={getComponent}
                  specPath={specPath.push("schema")}
                  getConfigs={getConfigs}
                  isExecute={isExecute}
                  specSelectors={specSelectors}
                  schema={displaySchema}
                  example={jsonSchemaForm}
                />
              </div>
              {isEditing && onParameterEditClick ? (
                <button
                  type="button"
                  className="btn"
                  style={{ backgroundColor: "transparent", borderColor: "#fca130", color: "#fca130" }}
                  onClick={(e) => { e.stopPropagation(); onParameterEditClick() }}
                >
                  Edit
                </button>
              ) : null}
            </div>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ flex: 1 }}>
                {jsonSchemaForm}
              </div>
              {isEditing && onParameterEditClick ? (
                <button
                  type="button"
                  className="btn"
                  style={{ backgroundColor: "transparent", borderColor: "#fca130", color: "#fca130" }}
                  onClick={(e) => { e.stopPropagation(); onParameterEditClick() }}
                >
                  Edit
                </button>
              ) : null}
            </div>
          )}

          {
            bodyParam && displaySchema ? <ModelExample getComponent={getComponent}
                                                specPath={specPath.push("schema")}
                                                getConfigs={getConfigs}
                                                isExecute={isExecute}
                                                specSelectors={specSelectors}
                                                schema={displaySchema}
                                                example={bodyParam}
                                                includeWriteOnly={true}/>
              : null
          }

          {
            !bodyParam && isExecute && displayParam.get("allowEmptyValue") ?
            <ParameterIncludeEmpty
              onChange={this.onChangeIncludeEmpty}
              isIncluded={specSelectors.parameterInclusionSettingFor(pathMethod, displayParam.get("name"), displayParam.get("in"))}
              isDisabled={!isEmptyValue(value)} />
            : null
          }

          {
            isOAS3 && displayParam.get("examples") ? (
              <Example
                example={displayParam.getIn([
                  "examples",
                  oas3Selectors.activeExamplesMember(...pathMethod, "parameters", this.getParamKey())
                ])}
                getComponent={getComponent}
                getConfigs={getConfigs}
              />
            ) : null
          }

          {!showCommonExtensions || !commonExt.size ? null : commonExt.entrySeq().map(([key, v]) => <ParameterExt key={`${key}-${v}`} xKey={key} xVal={v} />)}
          {!showExtensions || !extensions.size ? null : extensions.entrySeq().map(([key, v]) => <ParameterExt key={`${key}-${v}`} xKey={key} xVal={v} />)}
        </td>
      </tr>
    )
  }
}

