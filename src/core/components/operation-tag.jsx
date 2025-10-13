import React from "react"
import PropTypes from "prop-types"
import ImPropTypes from "react-immutable-proptypes"
import Im from "immutable"
import { createDeepLinkPath, escapeDeepLinkPath, isFunc } from "core/utils"
import { safeBuildUrl, sanitizeUrl } from "core/utils/url"

/* eslint-disable  react/jsx-no-bind */

export default class OperationTag extends React.Component {

  static defaultProps = {
    tagObj: Im.fromJS({}),
    tag: "",
  }

  static propTypes = {
    tagObj: ImPropTypes.map.isRequired,
    tag: PropTypes.string.isRequired,

    oas3Selectors: PropTypes.func.isRequired,
    layoutSelectors: PropTypes.object.isRequired,
    layoutActions: PropTypes.object.isRequired,

    getConfigs: PropTypes.func.isRequired,
    getComponent: PropTypes.func.isRequired,

    specSelectors: PropTypes.object.isRequired,
    specActions: PropTypes.object.isRequired,
    specUrl: PropTypes.string.isRequired,

    children: PropTypes.element,
  }

  render() {
    const {
      tagObj,
      tag,
      children,
      oas3Selectors,
      layoutSelectors,
      layoutActions,
      getConfigs,
      getComponent,
      specSelectors,
      specActions,
      specUrl,
    } = this.props

    let {
      docExpansion,
      deepLinking,
    } = getConfigs()

    const Collapse = getComponent("Collapse")
    const Markdown = getComponent("Markdown", true)
    const DeepLink = getComponent("DeepLink")
    const Link = getComponent("Link")
    const ArrowUpIcon = getComponent("ArrowUpIcon")
    const ArrowDownIcon = getComponent("ArrowDownIcon")
    const TrashIcon = getComponent("TrashIcon")

    let tagDescription = tagObj.getIn(["tagDetails", "description"], null)
    let tagExternalDocsDescription = tagObj.getIn(["tagDetails", "externalDocs", "description"])
    let rawTagExternalDocsUrl = tagObj.getIn(["tagDetails", "externalDocs", "url"])
    let tagExternalDocsUrl
    if (isFunc(oas3Selectors) && isFunc(oas3Selectors.selectedServer)) {
      tagExternalDocsUrl = safeBuildUrl(rawTagExternalDocsUrl, specUrl, { selectedServer: oas3Selectors.selectedServer() })
    } else {
      tagExternalDocsUrl = rawTagExternalDocsUrl
    }

    let isShownKey = ["operations-tag", tag]
    let showTag = layoutSelectors.isShown(isShownKey, docExpansion === "full" || docExpansion === "list")

    const operations = tagObj.get("operations")
    const isEmptyTag = !operations || operations.size === 0

    const onDeleteTag = () => {
      try {
        const spec = specSelectors && specSelectors.specJson && specSelectors.specJson()
        const js = spec && typeof spec.toJS === "function" ? spec.toJS() : {}
        const next = { ...js }
        const list = Array.isArray(next.tags) ? next.tags.slice() : []
        const filtered = list.filter(t => !t || t.name !== tag)
        // Only update if something changed
        if (filtered.length !== list.length) {
          next.tags = filtered
          const asString = JSON.stringify(next, null, 2)
          specActions && specActions.updateSpec && specActions.updateSpec(asString)
        }
      } catch (e) {
        // no-op
      }
    }

    return (
      <div className={showTag ? "opblock-tag-section is-open" : "opblock-tag-section"} >

        <h3
          onClick={() => layoutActions.show(isShownKey, !showTag)}
          className={!tagDescription ? "opblock-tag no-desc" : "opblock-tag"}
          id={isShownKey.map(v => escapeDeepLinkPath(v)).join("-")}
          data-tag={tag}
          data-is-open={showTag}
        >
          <DeepLink
            enabled={deepLinking}
            isShown={showTag}
            path={createDeepLinkPath(tag)}
            text={tag} />
          {!tagDescription ? <small></small> :
            <small>
              <Markdown source={tagDescription} />
            </small>
          }

          {!tagExternalDocsUrl ? null :
            <div className="info__externaldocs">
              <small>
                <Link
                    href={sanitizeUrl(tagExternalDocsUrl)}
                    onClick={(e) => e.stopPropagation()}
                    target="_blank"
                  >{tagExternalDocsDescription || tagExternalDocsUrl}</Link>
              </small>
            </div>
          }

          {isEmptyTag ? (
            <button
              aria-label="Delete tag"
              className="expand-operation"
              title="Delete tag"
              onClick={(e) => { e.stopPropagation(); onDeleteTag() }}>
              {TrashIcon ? <TrashIcon className="arrow" /> : <span style={{fontSize: '20px', fontWeight: 'bold'}}>🗑️</span>}
            </button>
          ) : (
            <button
              aria-expanded={showTag}
              className="expand-operation"
              title={showTag ? "Collapse operation" : "Expand operation"}
              onClick={() => layoutActions.show(isShownKey, !showTag)}>
              {showTag ? <ArrowUpIcon className="arrow" /> : <ArrowDownIcon className="arrow" />}
            </button>
          )}
        </h3>

        <Collapse isOpened={showTag}>
          {children}
        </Collapse>
      </div>
    )
  }
}
