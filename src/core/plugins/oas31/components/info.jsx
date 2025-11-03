/**
 * @prettier
 */
import React, { useState } from "react"
import PropTypes from "prop-types"

import { sanitizeUrl } from "core/utils/url"

const Info = ({ getComponent, specSelectors, getSystem }) => {
  const [isEditing, setIsEditing] = useState(false)
  const [editedTitle, setEditedTitle] = useState("")
  const [editedDescription, setEditedDescription] = useState("")
  const version = specSelectors.version()
  const url = specSelectors.url()
  const basePath = specSelectors.basePath()
  const host = specSelectors.host()
  const summary = specSelectors.selectInfoSummaryField()
  const description = specSelectors.selectInfoDescriptionField()
  const title = specSelectors.selectInfoTitleField()
  const termsOfServiceUrl = specSelectors.selectInfoTermsOfServiceUrl()
  const externalDocsUrl = specSelectors.selectExternalDocsUrl()
  const externalDocsDesc = specSelectors.selectExternalDocsDescriptionField()
  const contact = specSelectors.contact()
  const license = specSelectors.license()

  const Markdown = getComponent("Markdown", true)
  const Link = getComponent("Link")
  const VersionStamp = getComponent("VersionStamp")
  const OpenAPIVersion = getComponent("OpenAPIVersion")
  const InfoUrl = getComponent("InfoUrl")
  const InfoBasePath = getComponent("InfoBasePath")
  const License = getComponent("License", true)
  const Contact = getComponent("Contact", true)
  const JsonSchemaDialect = getComponent("JsonSchemaDialect", true)
  const EditIcon = getComponent("EditIcon")

  const handleEdit = () => {
    setEditedTitle(title || "")
    setEditedDescription(description || "")
    setIsEditing(true)
  }

  const handleSave = () => {
    if (getSystem) {
      const system = getSystem()
      const specActions = system.specActions
      const spec = specSelectors.specJson()

      if (spec) {
        try {
          const specJs = typeof spec.toJS === "function" ? spec.toJS() : spec
          const updatedSpec = { ...specJs }

          if (!updatedSpec.info) {
            updatedSpec.info = {}
          }

          updatedSpec.info.title = editedTitle || ""
          updatedSpec.info.description = editedDescription || ""

          const specString = JSON.stringify(updatedSpec, null, 2)
          specActions.updateSpec(specString)
        } catch (e) {
          console.error("Error updating spec:", e)
        }
      }
    }
    setIsEditing(false)
  }

  const handleCancel = () => {
    setIsEditing(false)
    setEditedTitle("")
    setEditedDescription("")
  }

  return (
    <div className="info">
      {!isEditing ? (
        <button
          className="info-edit-btn"
          onClick={handleEdit}
          title="Edit info"
        >
          <EditIcon />
        </button>
      ) : (
        <>
          <button
            className="info-save-btn"
            onClick={handleSave}
            title="Save changes"
          >
            ✓
          </button>
          <button
            className="info-cancel-btn"
            onClick={handleCancel}
            title="Cancel editing"
          >
            ✕
          </button>
        </>
      )}
      <hgroup className="main">
        {isEditing ? (
          <input
            type="text"
            className="info-title-input"
            value={editedTitle}
            onChange={(e) => setEditedTitle(e.target.value)}
            placeholder="Title"
          />
        ) : (
          <h1 className="title">
            {title}
            <span>
              {version && <VersionStamp version={version} />}
              <OpenAPIVersion oasVersion="3.1" />
            </span>
          </h1>
        )}

        {(host || basePath) && <InfoBasePath host={host} basePath={basePath} />}
        {/* {url && <InfoUrl getComponent={getComponent} url={url} />} */}
      </hgroup>

      {summary && !isEditing && <p className="info__summary">{summary}</p>}

      {isEditing ? (
        <textarea
          className="info-description-textarea"
          value={editedDescription}
          onChange={(e) => setEditedDescription(e.target.value)}
          placeholder="Description"
        />
      ) : (
        <div className="info__description description">
          <Markdown source={description} />
        </div>
      )}

      {termsOfServiceUrl && (
        <div className="info__tos">
          <Link target="_blank" href={sanitizeUrl(termsOfServiceUrl)}>
            Terms of service
          </Link>
        </div>
      )}

      {contact.size > 0 && <Contact />}

      {license.size > 0 && <License />}

      {externalDocsUrl && (
        <Link
          className="info__extdocs"
          target="_blank"
          href={sanitizeUrl(externalDocsUrl)}
        >
          {externalDocsDesc || externalDocsUrl}
        </Link>
      )}

      <JsonSchemaDialect />
    </div>
  )
}

Info.propTypes = {
  getComponent: PropTypes.func.isRequired,
  specSelectors: PropTypes.shape({
    version: PropTypes.func.isRequired,
    url: PropTypes.func.isRequired,
    basePath: PropTypes.func.isRequired,
    host: PropTypes.func.isRequired,
    selectInfoSummaryField: PropTypes.func.isRequired,
    selectInfoDescriptionField: PropTypes.func.isRequired,
    selectInfoTitleField: PropTypes.func.isRequired,
    selectInfoTermsOfServiceUrl: PropTypes.func.isRequired,
    selectExternalDocsUrl: PropTypes.func.isRequired,
    selectExternalDocsDescriptionField: PropTypes.func.isRequired,
    contact: PropTypes.func.isRequired,
    license: PropTypes.func.isRequired,
    specJson: PropTypes.func,
  }).isRequired,
  getSystem: PropTypes.func,
}

export default Info
