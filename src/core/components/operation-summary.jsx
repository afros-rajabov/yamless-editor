import React, { PureComponent } from "react"
import PropTypes from "prop-types"
import { Iterable, List, Map } from "immutable"
import ImPropTypes from "react-immutable-proptypes"
import toString from "lodash/toString"
import OperationValidationDialog from "./operation-validation-dialog"
import OperationDeleteDialog from "./operation-delete-dialog"


export default class OperationSummary extends PureComponent {

  static propTypes = {
    specPath: ImPropTypes.list.isRequired,
    operationProps: PropTypes.instanceOf(Iterable).isRequired,
    isShown: PropTypes.bool.isRequired,
    toggleShown: PropTypes.func.isRequired,
    getComponent: PropTypes.func.isRequired,
    getConfigs: PropTypes.func.isRequired,
    authActions: PropTypes.object,
    authSelectors: PropTypes.object,
    specActions: PropTypes.object,
    // Editing props
    isEditing: PropTypes.bool,
    selectedSummary: PropTypes.string,
    selectedDescription: PropTypes.string,
    selectedMethod: PropTypes.string,
    selectedPath: PropTypes.string,
    onSummaryChange: PropTypes.func,
    onDescriptionChange: PropTypes.func,
    onMethodChange: PropTypes.func,
    onPathChange: PropTypes.func,
    onEditClick: PropTypes.func,
    onDuplicateClick: PropTypes.func,
    onDeleteClick: PropTypes.func,
    showDeleteDialog: PropTypes.bool,
    onConfirmDelete: PropTypes.func,
    onCancelDelete: PropTypes.func,
    onSaveClick: PropTypes.func,
    onCancelEdit: PropTypes.func,
    showValidationDialog: PropTypes.bool,
    validationError: PropTypes.string,
    onCloseValidationDialog: PropTypes.func,
  }


  static defaultProps = {
    operationProps: null,
    specPath: List(),
    summary: "",
    isEditing: false,
    selectedSummary: null,
    selectedDescription: null,
    selectedMethod: null,
    selectedPath: null,
    onSummaryChange: null,
    onDescriptionChange: null,
    onMethodChange: null,
    onPathChange: null,
    onEditClick: null,
    onDuplicateClick: null,
    onDeleteClick: null,
    showDeleteDialog: false,
    onConfirmDelete: null,
    onCancelDelete: null,
    onSaveClick: null,
    onCancelEdit: null,
    showValidationDialog: false,
    validationError: "",
    onCloseValidationDialog: null
  }

  handleEditClick = () => {
    const { onEditClick } = this.props
    if (onEditClick) {
      onEditClick()
    }
  }

  handleDuplicateClick = () => {
    const { onDuplicateClick } = this.props
    if (onDuplicateClick) {
      onDuplicateClick()
    }
  }

  handleDeleteClick = () => {
    const { onDeleteClick } = this.props
    if (onDeleteClick) {
      onDeleteClick()
    }
  }

  handleCancelClick = () => {
    const { onCancelEdit } = this.props
    if (onCancelEdit) {
      onCancelEdit()
    }
  }


  getResolvedSubtree = () => {
    const { specSelectors, operationProps } = this.props
    const { path, method } = operationProps.toJS()
    return specSelectors.specResolvedSubtree(["paths", path, method])
  }

  handleSaveClick = () => {
    const { onSaveClick } = this.props
    if (onSaveClick) {
      onSaveClick()
    }
  }

  handleMethodChange = (newMethod) => {
    const { onMethodChange } = this.props
    if (onMethodChange) {
      onMethodChange(newMethod)
    }
  }

  handlePathChange = (newPath) => {
    const { onPathChange } = this.props
    if (onPathChange) {
      onPathChange(newPath)
    }
  }

  handleSummaryChange = (newSummary) => {
    const { onSummaryChange } = this.props
    if (onSummaryChange) {
      onSummaryChange(newSummary)
    }
  }

  handleDescriptionChange = (newDescription) => {
    const { onDescriptionChange } = this.props
    if (onDescriptionChange) {
      onDescriptionChange(newDescription)
    }
  }


  render() {

    let {
      isShown,
      toggleShown,
      getComponent,
      authActions,
      authSelectors,
      operationProps,
      specPath,
      specSelectors,
      isEditing,
      selectedSummary,
      selectedDescription,
      selectedMethod,
      selectedPath,
      onSummaryChange,
      onDescriptionChange,
      onDeleteClick,
      showDeleteDialog,
      onConfirmDelete,
      onCancelDelete,
      showValidationDialog,
      validationError,
      onCloseValidationDialog,
    } = this.props

    let {
      summary,
      isAuthorized,
      method,
      op,
      showSummary,
      path,
      operationId,
      originalOperationId,
      displayOperationId,
    } = operationProps.toJS()

    let {
      summary: resolvedSummary,
    } = op

    let security = operationProps.get("security")

    // Use selectedPath if available (after save), otherwise use the original path
    const currentPath = selectedPath || path
    
    // Also update the method if it was changed
    const currentMethod = selectedMethod || method

    const AuthorizeOperationBtn = getComponent("authorizeOperationBtn", true)
    const OperationMethod = getComponent("OperationMethod")
    const OperationPath = getComponent("OperationPath")
    const JumpToPath = getComponent("JumpToPath", true)
    const CopyToClipboardBtn = getComponent("CopyToClipboardBtn", true)
    const ArrowUpIcon = getComponent("ArrowUpIcon")
    const ArrowDownIcon = getComponent("ArrowDownIcon")
    const EditIcon = getComponent("EditIcon")
    const TrashIcon = getComponent("TrashIcon")
    const DuplicateIcon = getComponent("DuplicateIcon")

    const hasSecurity = security && !!security.count()
    const securityIsOptional = hasSecurity && security.size === 1 && security.first().isEmpty()
    const allowAnonymous = !hasSecurity || securityIsOptional
    return (
      <div className={`opblock-summary opblock-summary-${currentMethod}`} >
        <button
          aria-expanded={isShown}
          className="opblock-summary-control"
          onClick={isEditing ? undefined : toggleShown}
        >
          <OperationMethod 
            method={isEditing ? (selectedMethod || currentMethod) : currentMethod} 
            isEditing={isEditing}
            onMethodChange={this.handleMethodChange}
          />
          <div className="opblock-summary-path-description-wrapper">
            <OperationPath 
              getComponent={getComponent} 
              operationProps={operationProps} 
              specPath={specPath}
              isEditing={isEditing}
              selectedPath={selectedPath}
              onPathChange={this.handlePathChange}
              currentPath={currentPath}
            />

            {!showSummary ? null :
              isEditing ? (
                <input 
                  className="opblock-summary-description opblock-summary-description-edit"
                  type="text"
                  value={selectedSummary || ''}
                  onChange={(e) => this.handleSummaryChange(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  onMouseDown={(e) => e.stopPropagation()}
                  placeholder="Enter summary"
                />
              ) : (
                <div className="opblock-summary-description">
                  {toString(resolvedSummary || summary)}
                </div>
              )
            }
          </div>

          {displayOperationId && (originalOperationId || operationId) ? <span className="opblock-summary-operation-id">{originalOperationId || operationId}</span> : null}
        </button>
        {!isEditing && !isShown && <CopyToClipboardBtn textToCopy={`${specPath.get(1)}`} />}
        {isShown && (
          !isEditing ? (
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <button 
                className="opblock-summary-edit-btn"
                onClick={this.handleEditClick}
                title="Edit"
              >
                <EditIcon />
              </button>
              <button 
                className="opblock-summary-duplicate-btn"
                title="Create from"
                onClick={this.handleDuplicateClick}
              >
                <DuplicateIcon />
              </button>
              <button 
                className="opblock-summary-delete-btn"
                title="Delete"
                onClick={this.handleDeleteClick}
              >
                <TrashIcon />
              </button>
            </div>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <button 
                className="opblock-summary-save-btn"
                onClick={this.handleSaveClick}
                title="Save changes"
              >
                ✓
              </button>
              <button 
                className="opblock-summary-cancel-btn"
                onClick={this.handleCancelClick}
                title="Cancel editing"
              >
                ✕
              </button>
            </div>
          )
        )}
        {/* {
          allowAnonymous || isEditing ? null :
            <AuthorizeOperationBtn
              isAuthorized={isAuthorized}
              onClick={() => {
                console.log("authorize operation btn clicked")
                const applicableDefinitions = authSelectors.definitionsForRequirements(security)
                console.log("applicableDefinitions", applicableDefinitions)
                authActions.showDefinitions(applicableDefinitions)
              }}
            />
        } */}
        <JumpToPath path={specPath} />{/* TODO: use wrapComponents here, swagger-ui doesn't care about jumpToPath */}
        <button
          aria-label={`${currentMethod} ${currentPath.replace(/\//g, "\u200b/")}`}
          className="opblock-control-arrow"
          aria-expanded={isShown}
          tabIndex="-1"
          onClick={toggleShown}>
          {isShown ? <ArrowUpIcon className="arrow" /> : <ArrowDownIcon className="arrow" />}
        </button>
        <OperationValidationDialog
          isOpen={showValidationDialog}
          errorMessage={validationError}
          onClose={onCloseValidationDialog}
          getComponent={getComponent}
        />
        <OperationDeleteDialog
          isOpen={showDeleteDialog}
          method={currentMethod}
          path={currentPath}
          onConfirm={onConfirmDelete}
          onCancel={onCancelDelete}
          getComponent={getComponent}
        />
      </div>
    )
  }
}
