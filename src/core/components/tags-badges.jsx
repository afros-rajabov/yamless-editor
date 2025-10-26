import React from "react"
import PropTypes from "prop-types"
import TagContextMenu from "./tag-context-menu"
import TagEditDialog from "./tag-edit-dialog"
import TagDeleteDialog from "./tag-delete-dialog"

export default class TagsBadges extends React.Component {

  static propTypes = {
    specSelectors: PropTypes.object.isRequired,
    specActions: PropTypes.object.isRequired,
    getComponent: PropTypes.func.isRequired,
    // optional: provided by parent layout for controlling tag open/close state
    layoutSelectors: PropTypes.object,
    layoutActions: PropTypes.object,
  }

  constructor(props) {
    super(props)
    this.state = { 
      showDialog: false, 
      newTagName: "", 
      newTagDescription: "",
      contextMenu: { isOpen: false, position: { x: 0, y: 0 }, tagName: "" },
      editingTag: null,
      deletingTag: null
    }
  }

  render() {
    const { specSelectors, specActions, getComponent, layoutSelectors, layoutActions } = this.props
    const tags = specSelectors.tags()
    const Button = getComponent && getComponent("Button")
    const CloseIcon = getComponent && getComponent("CloseIcon")
    const Collapse = getComponent && getComponent("Collapse")
    const ArrowUpIcon = getComponent && getComponent("ArrowUpIcon")
    const ArrowDownIcon = getComponent && getComponent("ArrowDownIcon")

    if(!tags || tags.size === 0) {
      return null
    }

    const openDialog = () => this.setState({ showDialog: true, newTagName: "", newTagDescription: "" })
    const closeDialog = () => this.setState({ showDialog: false, newTagName: "", newTagDescription: "" })
    const onNameChange = (e) => this.setState({ newTagName: e.target.value })
    const onDescChange = (e) => this.setState({ newTagDescription: e.target.value })

    // fold/unfold entire tags section
    const sectionShownKey = ["tags-badges", "section"]
    const isSectionOpen = layoutSelectors && layoutSelectors.isShown ? layoutSelectors.isShown(sectionShownKey, true) : true
    const toggleSection = () => {
      if(layoutActions && layoutActions.show) {
        layoutActions.show(sectionShownKey, !isSectionOpen)
      }
    }

    const onAddTag = () => {
      const name = (this.state.newTagName || "").trim()
      const description = (this.state.newTagDescription || "").trim()
      if(!name) return
      const existing = tags && tags.find ? tags.find(t => t && t.get && t.get("name") === name) : null
      if(existing) { closeDialog(); return }
      try {
        const spec = specSelectors.specJson()
        const js = spec && typeof spec.toJS === "function" ? spec.toJS() : {}
        const next = { ...js }
        const list = Array.isArray(next.tags) ? next.tags.slice() : []
        const newTag = description ? { name, description } : { name }
        list.push(newTag)
        next.tags = list
        const asString = JSON.stringify(next, null, 2)
        specActions.updateSpec(asString)
        closeDialog()
      } catch (e) {
        // no-op
      }
    }

    const onBadgeClick = (name) => {
      if(!layoutActions || !layoutSelectors) return
      // open clicked tag and close all others
      if(tags && tags.forEach) {
        tags.forEach(t => {
          const n = t && t.get && t.get("name")
          if(!n) return
          layoutActions.show(["operations-tag", n], n === name)
        })
      }
    }

    // Context menu handlers
    const onContextMenu = (e, tagName) => {
      e.preventDefault()
      e.stopPropagation()
      this.setState({
        contextMenu: {
          isOpen: true,
          position: { x: e.clientX, y: e.clientY },
          tagName
        }
      })
    }

    const closeContextMenu = () => {
      this.setState({
        contextMenu: { isOpen: false, position: { x: 0, y: 0 }, tagName: "" }
      })
    }

    // Edit handlers
    const onEditTag = () => {
      const tagName = this.state.contextMenu.tagName
      const tag = tags.find(t => t.get("name") === tagName)
      if (tag) {
        this.setState({
          editingTag: {
            name: tag.get("name"),
            description: tag.get("description") || ""
          }
        })
      }
    }

    const onSaveEdit = (updatedTag) => {
      try {
        const spec = specSelectors.specJson()
        const js = spec && typeof spec.toJS === "function" ? spec.toJS() : {}
        const next = { ...js }
        
        // Update tag in tags array
        const tagIndex = next.tags.findIndex(t => t.name === this.state.editingTag.name)
        if (tagIndex !== -1) {
          next.tags[tagIndex] = updatedTag
        }

        // If name changed, update all operation references
        if (updatedTag.name !== this.state.editingTag.name) {
          updateOperationTagReferences(next, this.state.editingTag.name, updatedTag.name)
        }

        const asString = JSON.stringify(next, null, 2)
        specActions.updateSpec(asString)
        this.setState({ editingTag: null })
      } catch (e) {
        // no-op
      }
    }

    const onCancelEdit = () => {
      this.setState({ editingTag: null })
    }

    // Delete handlers
    const onDeleteTag = () => {
      const tagName = this.state.contextMenu.tagName
      const operationCount = countOperationsForTag(tagName)
      this.setState({
        deletingTag: { name: tagName, operationCount }
      })
    }

    const onConfirmDelete = () => {
      const { name: tagName } = this.state.deletingTag
      try {
        const spec = specSelectors.specJson()
        const js = spec && typeof spec.toJS === "function" ? spec.toJS() : {}
        const next = { ...js }
        
        // Remove tag from tags array
        next.tags = next.tags.filter(t => t.name !== tagName)
        
        // Remove tag references from all operations
        removeTagFromOperations(next, tagName)

        const asString = JSON.stringify(next, null, 2)
        specActions.updateSpec(asString)
        this.setState({ deletingTag: null })
      } catch (e) {
        // no-op
      }
    }

    const onCancelDelete = () => {
      this.setState({ deletingTag: null })
    }

    // Helper functions
    const countOperationsForTag = (tagName) => {
      try {
        const spec = specSelectors.specJson()
        const js = spec && typeof spec.toJS === "function" ? spec.toJS() : {}
        let count = 0
        
        if (js.paths) {
          Object.values(js.paths).forEach(path => {
            Object.values(path).forEach(operation => {
              if (operation.tags && operation.tags.includes(tagName)) {
                count++
              }
            })
          })
        }
        
        return count
      } catch (e) {
        return 0
      }
    }

    const updateOperationTagReferences = (spec, oldTagName, newTagName) => {
      if (spec.paths) {
        Object.values(spec.paths).forEach(path => {
          Object.values(path).forEach(operation => {
            if (operation.tags && operation.tags.includes(oldTagName)) {
              const index = operation.tags.indexOf(oldTagName)
              operation.tags[index] = newTagName
            }
          })
        })
      }
    }

    const removeTagFromOperations = (spec, tagName) => {
      if (spec.paths) {
        Object.values(spec.paths).forEach(path => {
          Object.values(path).forEach(operation => {
            if (operation.tags && operation.tags.includes(tagName)) {
              operation.tags = operation.tags.filter(tag => tag !== tagName)
            }
          })
        })
      }
    }

    return (
      <>
      <section className={isSectionOpen ? "opblock-tag-section tags-section is-open" : "opblock-tag-section tags-section"}>
        <h3
          onClick={toggleSection}
          className="opblock-tag no-desc"
          data-tag="Tags"
          data-is-open={!!isSectionOpen}
        >
          <span>Tags</span>
          <button
            aria-expanded={!!isSectionOpen}
            className="expand-operation"
            title={isSectionOpen ? "Collapse operation" : "Expand operation"}
            onClick={toggleSection}
          >
            {isSectionOpen && ArrowUpIcon ? <ArrowUpIcon className="arrow" /> : null}
            {!isSectionOpen && ArrowDownIcon ? <ArrowDownIcon className="arrow" /> : null}
          </button>
        </h3>

        <Collapse isOpened={!!isSectionOpen}>
            <div className="tags-badges-container">
              <div className="tags-badges">
                {tags.map((tag, idx) => {
                  const name = tag.get("name")
                  const anchorName = name.replace(/ /g, "_")
                  if(!name) return null
                  const anchor = `#operations-tag-${anchorName}`
                  return (
                    <a 
                      key={name + idx} 
                      className="tag-badge tag-badge--link" 
                      href={anchor} 
                      onClick={() => onBadgeClick(name)}
                      onContextMenu={(e) => onContextMenu(e, name)}
                    >
                      {name}
                    </a>
                  )
                }).toArray()}
              </div>
              <button className="btn tags-badges-add" onClick={openDialog}>Add</button>
            </div>
        </Collapse>

      </section>
      {this.state.showDialog ? (
          <div className="dialog-ux">
            <div className="backdrop-ux" onClick={closeDialog}></div>
            <div className="modal-ux">
              <div className="modal-dialog-ux">
                <div className="modal-ux-inner">
                  <div className="modal-ux-header">
                    <h3>Add tag</h3>
                    <button type="button" className="close-modal" onClick={ closeDialog }>
                      {CloseIcon ? <CloseIcon /> : "✕"}
                    </button>
                  </div>
                  <div className="modal-ux-content">
                    <div className="form-field">
                      <label className="form-label" htmlFor="new-tag-input">Tag name</label>
                      <input className="form-input" autoFocus id="new-tag-input" type="text" value={this.state.newTagName} onChange={onNameChange} />
                    </div>
                    <div className="form-field">
                      <label className="form-label" htmlFor="new-tag-desc">Description (optional)</label>
                      <input className="form-input" id="new-tag-desc" type="text" value={this.state.newTagDescription} onChange={onDescChange} />
                    </div>
                    <div className="modal-actions-row">
                      <Button className="btn modal-btn" onClick={closeDialog}>Cancel</Button>
                      <Button className="btn modal-btn" onClick={onAddTag}>Add</Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : null}
        
        {/* Context Menu */}
        <TagContextMenu
          isOpen={this.state.contextMenu.isOpen}
          position={this.state.contextMenu.position}
          onEdit={onEditTag}
          onDelete={onDeleteTag}
          onClose={closeContextMenu}
        />
        
        {/* Edit Dialog */}
        <TagEditDialog
          isOpen={!!this.state.editingTag}
          tag={this.state.editingTag}
          allTags={tags}
          onSave={onSaveEdit}
          onClose={onCancelEdit}
          getComponent={getComponent}
        />
        
        {/* Delete Dialog */}
        <TagDeleteDialog
          isOpen={!!this.state.deletingTag}
          tagName={this.state.deletingTag?.name || ""}
          operationCount={this.state.deletingTag?.operationCount || 0}
          onConfirm={onConfirmDelete}
          onCancel={onCancelDelete}
          getComponent={getComponent}
        />
      </>
    )
  }
}


