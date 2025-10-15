import React from "react"
import PropTypes from "prop-types"

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
    this.state = { showDialog: false, newTagName: "", newTagDescription: "" }
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
                    <a key={name + idx} className="tag-badge tag-badge--link" href={anchor} onClick={() => onBadgeClick(name)}>{name}</a>
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
      </>
    )
  }
}


