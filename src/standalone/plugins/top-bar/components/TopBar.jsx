import React, { cloneElement } from "react"
import PropTypes from "prop-types"
import { Map as ImmutableMap } from "immutable"
import YAML, { JSON_SCHEMA } from "js-yaml"

import {parseSearch, serializeSearch} from "core/utils"
import { isOAS31 } from "core/plugins/oas31/fn"

const GITHUB_API = "https://api.github.com"
const LOCALSTORAGE_TOKEN_KEY = "yamless_github_token"

function titleToGistFilename(title) {
  if (!title || typeof title !== "string") return "openapi.json"
  const snake = title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
  return snake ? `${snake}.openapi.json` : "openapi.json"
}

class TopBar extends React.Component {

  static propTypes = {
    layoutActions: PropTypes.object.isRequired,
    authActions: PropTypes.object.isRequired
  }

  constructor(props, context) {
    super(props, context)
    const savedToken = localStorage.getItem(LOCALSTORAGE_TOKEN_KEY) || null
    this.state = {
      url: props.specSelectors.url(),
      selectedIndex: 0,
      githubToken: savedToken,
      githubUser: null,
      currentGistId: null,
      currentGistFilename: null,
      showGistPicker: false,
      gistList: [],
      gistListLoading: false,
      authLoading: false,
      gistSaving: false,
      gistOpening: false,
      lastSavedSpec: null,
    }
    this.fileInputRef = React.createRef()
  }

  componentDidMount() {
    const configs = this.props.getConfigs()
    const urls = configs.urls || []

    if(urls && urls.length) {
      var targetIndex = this.state.selectedIndex
      let search = parseSearch()
      let primaryName = search["urls.primaryName"] || configs.urls.primaryName
      if(primaryName)
      {
        urls.forEach((spec, i) => {
          if(spec.name === primaryName)
            {
              this.setState({selectedIndex: i})
              targetIndex = i
            }
        })
      }

      this.loadSpec(urls[targetIndex].url)
    }

    this.handleOAuthCallback()

    if (this.state.githubToken) {
      this.fetchGitHubUser(this.state.githubToken)
    }
  }

  UNSAFE_componentWillReceiveProps(nextProps) {
    this.setState({ url: nextProps.specSelectors.url() })
  }

  // ── Existing spec helpers ──

  onUrlChange =(e)=> {
    let {target: {value}} = e
    this.setState({url: value})
  }

  flushAuthData() {
    const { persistAuthorization } = this.props.getConfigs()
    if (persistAuthorization)
    {
      return
    }
    this.props.authActions.restoreAuthorization({
      authorized: {}
    })
  }

  loadSpec = (url) => {
    this.flushAuthData()
    this.props.specActions.updateUrl(url)
    this.props.specActions.download(url)
  }

  downloadCurrentSpec = () => {
    const { specSelectors } = this.props
    try {
      let specText = specSelectors.specStr()
      if(!specText) {
        const specJson = specSelectors.specJson()
        if(specJson && typeof specJson.toJS === "function") {
          specText = JSON.stringify(specJson.toJS(), null, 2)
        }
      }
      if(!specText) {
        return
      }
      const url = this.props.specSelectors.url()
      const fallbackName = "openapi.json"
      let filename = fallbackName
      try {
        if(url) {
          const parsed = new window.URL(url, window.location.href)
          const pathname = parsed.pathname || ""
          const last = pathname.split("/").filter(Boolean).pop()
          if(last && /\.ya?ml$/i.test(last)) {
            filename = last.replace(/\.ya?ml$/i, ".json")
          } else if(last && /\.json$/i.test(last)) {
            filename = last
          }
        }
      } catch(e) {
        // ignore filename parsing errors and use fallback
      }

      const blob = new Blob([specText], { type: "application/json;charset=utf-8" })
      const blobUrl = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = blobUrl
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(blobUrl)
    } catch (e) {
      // no-op on failure
    }
  }

  handleUploadClick = () => {
    if (this.fileInputRef.current) {
      this.fileInputRef.current.click()
    }
  }

  handleFileChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) {
      return
    }

    const fileName = file.name.toLowerCase()
    const isJson = fileName.endsWith('.json')
    const isYaml = fileName.endsWith('.yaml') || fileName.endsWith('.yml')

    if (!isJson && !isYaml) {
      const { errActions } = this.props
      if (errActions) {
        errActions.newSpecErr({
          source: "upload",
          level: "error",
          message: "Invalid file type. Please upload a JSON or YAML file."
        })
      }
      e.target.value = ''
      return
    }

    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const fileContent = event.target.result

        let parsedJson = null
        try {
          parsedJson = YAML.load(fileContent, { schema: JSON_SCHEMA })
        } catch (parseError) {
          const { errActions } = this.props
          if (errActions) {
            errActions.newSpecErr({
              source: "upload",
              level: "error",
              message: `Failed to parse file: ${parseError.message || "Invalid JSON or YAML format"}`
            })
          }
          e.target.value = ''
          return
        }

        if (!parsedJson || typeof parsedJson !== "object") {
          const { errActions } = this.props
          if (errActions) {
            errActions.newSpecErr({
              source: "upload",
              level: "error",
              message: "Invalid specification format. The file must contain a valid OpenAPI specification object."
            })
          }
          e.target.value = ''
          return
        }

        const jsSpec = ImmutableMap(parsedJson)

        if (!isOAS31(jsSpec)) {
          const { errActions } = this.props
          if (errActions) {
            errActions.newSpecErr({
              source: "upload",
              level: "error",
              message: "Invalid OpenAPI version. Only OpenAPI 3.1 specifications are supported. Please ensure your spec has 'openapi: 3.1.x'."
            })
          }
          e.target.value = ''
          return
        }

        this.flushAuthData()
        this.props.specActions.updateUrl("")
        this.props.specActions.updateSpec(fileContent)
        this.props.specActions.updateLoadingStatus("success")
        this.setState({ currentGistId: null, currentGistFilename: null, lastSavedSpec: null })
      } catch (error) {
        const { errActions } = this.props
        if (errActions) {
          errActions.newSpecErr({
            source: "upload",
            level: "error",
            message: `Failed to process file: ${error.message}`
          })
        }
        e.target.value = ''
      }
    }

    reader.onerror = () => {
      const { errActions } = this.props
      if (errActions) {
        errActions.newSpecErr({
          source: "upload",
          level: "error",
          message: "Failed to read file. Please try again."
        })
      }
      e.target.value = ''
    }

    reader.readAsText(file)
  }


  onUrlSelect =(e)=> {
    let url = e.target.value || e.target.href
    this.loadSpec(url)
    this.setSelectedUrl(url)
    e.preventDefault()
  }

  downloadUrl = (e) => {
    this.loadSpec(this.state.url)
    e.preventDefault()
  }

  setSearch = (spec) => {
    let search = parseSearch()
    search["urls.primaryName"] = spec.name
    const newUrl = `${window.location.protocol}//${window.location.host}${window.location.pathname}`
    if(window && window.history && window.history.pushState) {
      window.history.replaceState(null, "", `${newUrl}?${serializeSearch(search)}`)
    }
  }

  setSelectedUrl = (selectedUrl) => {
    const configs = this.props.getConfigs()
    const urls = configs.urls || []

    if(urls && urls.length) {
      if(selectedUrl)
      {
        urls.forEach((spec, i) => {
          if(spec.url === selectedUrl)
            {
              this.setState({selectedIndex: i})
              this.setSearch(spec)
            }
        })
      }
    }
  }

  onFilterChange =(e) => {
    let {target: {value}} = e
    this.props.layoutActions.updateFilter(value)
  }

  // ── GitHub OAuth Web Flow ──

  getProxyUrl = () => {
    const { githubProxyUrl } = this.props.getConfigs()
    return githubProxyUrl || ""
  }

  getClientId = () => {
    const { githubClientId } = this.props.getConfigs()
    return githubClientId || ""
  }

  fetchGitHubUser = async (token) => {
    this.setState({ authLoading: true })
    try {
      const res = await fetch(`${GITHUB_API}/user`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const user = await res.json()
        this.setState({ githubUser: user.login })
      } else if (res.status === 401) {
        this.signOut()
      }
    } catch {
      // transient network error -- keep token, don't sign out
    } finally {
      this.setState({ authLoading: false })
    }
  }

  signInWithGitHub = () => {
    const clientId = this.getClientId()
    if (!clientId) {
      console.error("githubClientId must be configured")
      return
    }
    const redirectUri = window.location.origin + window.location.pathname
    const authUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&scope=gist&redirect_uri=${encodeURIComponent(redirectUri)}`
    window.location.href = authUrl
  }

  handleOAuthCallback = async () => {
    const params = new URLSearchParams(window.location.search)
    const code = params.get("code")
    if (!code) return

    const cleanUrl = window.location.origin + window.location.pathname
    window.history.replaceState(null, "", cleanUrl)

    const proxyUrl = this.getProxyUrl()
    const clientId = this.getClientId()
    if (!proxyUrl || !clientId) return

    this.setState({ authLoading: true })
    try {
      const res = await fetch(`${proxyUrl}/api/token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, client_id: clientId }),
      })
      const data = await res.json()

      if (data.access_token) {
        localStorage.setItem(LOCALSTORAGE_TOKEN_KEY, data.access_token)
        this.setState({ githubToken: data.access_token })
        this.fetchGitHubUser(data.access_token)
      }
    } catch (err) {
      console.error("OAuth token exchange failed:", err)
    } finally {
      this.setState({ authLoading: false })
    }
  }

  signOut = () => {
    localStorage.removeItem(LOCALSTORAGE_TOKEN_KEY)
    this.setState({
      githubToken: null,
      githubUser: null,
      currentGistId: null,
      currentGistFilename: null,
      showGistPicker: false,
      gistList: [],
      lastSavedSpec: null,
    })
  }

  // ── Gist Operations ──

  loadGistList = async () => {
    const { githubToken } = this.state
    if (!githubToken) return

    this.setState({ gistListLoading: true, showGistPicker: true, gistList: [] })

    try {
      const res = await fetch(`${GITHUB_API}/gists?per_page=50`, {
        headers: { Authorization: `Bearer ${githubToken}` },
      })

      if (!res.ok) {
        if (res.status === 401) this.signOut()
        this.setState({ gistListLoading: false })
        return
      }

      const gists = await res.json()
      const specGists = gists.filter((g) => {
        const filenames = Object.keys(g.files || {})
        return filenames.some(
          (f) => f.endsWith(".json") || f.endsWith(".yaml") || f.endsWith(".yml")
        )
      })

      this.setState({ gistList: specGists, gistListLoading: false })
    } catch {
      this.setState({ gistListLoading: false })
    }
  }

  openGist = async (gistId) => {
    const { githubToken } = this.state
    if (!githubToken) return

    this.setState({ showGistPicker: false, gistOpening: true })

    try {
      const res = await fetch(`${GITHUB_API}/gists/${gistId}`, {
        headers: { Authorization: `Bearer ${githubToken}` },
      })
      if (!res.ok) {
        if (res.status === 401) this.signOut()
        return
      }

      const gist = await res.json()
      const files = gist.files || {}
      const specFilename = Object.keys(files).find(
        (f) => f.endsWith(".json") || f.endsWith(".yaml") || f.endsWith(".yml")
      )

      if (!specFilename) return

      const fileContent = files[specFilename].content

      this.flushAuthData()
      this.props.specActions.updateUrl("")
      this.props.specActions.updateSpec(fileContent)
      this.props.specActions.updateLoadingStatus("success")
      this.setState({
        currentGistId: gistId,
        currentGistFilename: specFilename,
        lastSavedSpec: fileContent,
      })
    } catch (err) {
      console.error("Failed to open gist:", err)
    } finally {
      this.setState({ gistOpening: false })
    }
  }

  saveToGist = async () => {
    const { githubToken, currentGistId, currentGistFilename } = this.state
    if (!githubToken) return

    const { specSelectors } = this.props
    let specText = specSelectors.specStr()
    if (!specText) {
      const specJson = specSelectors.specJson()
      if (specJson && typeof specJson.toJS === "function") {
        specText = JSON.stringify(specJson.toJS(), null, 2)
      }
    }
    if (!specText) return

    let filename = currentGistFilename
    if (!filename) {
      const specJson = specSelectors.specJson()
      const title = specJson && specJson.getIn(["info", "title"])
      filename = titleToGistFilename(title)
    }

    this.setState({ gistSaving: true })
    try {
      if (currentGistId) {
        const res = await fetch(`${GITHUB_API}/gists/${currentGistId}`, {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${githubToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            files: { [filename]: { content: specText } },
          }),
        })
        if (res.ok) {
          this.setState({ lastSavedSpec: specText })
        } else if (res.status === 401) {
          this.signOut()
        }
      } else {
        const res = await fetch(`${GITHUB_API}/gists`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${githubToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            description: "YAMLess OpenAPI Spec",
            public: false,
            files: { [filename]: { content: specText } },
          }),
        })

        if (res.ok) {
          const gist = await res.json()
          this.setState({
            currentGistId: gist.id,
            currentGistFilename: filename,
            lastSavedSpec: specText,
          })
        } else if (res.status === 401) {
          this.signOut()
        }
      }
    } catch (err) {
      console.error("Failed to save gist:", err)
    } finally {
      this.setState({ gistSaving: false })
    }
  }

  closeGistPicker = () => {
    this.setState({ showGistPicker: false })
  }

  // ── Render ──

  render() {
    let { getComponent, specSelectors, getConfigs } = this.props
    const Button = getComponent("Button")
    const Link = getComponent("Link")
    const Logo = getComponent("Logo")

    let isLoading = specSelectors.loadingStatus() === "loading"
    let isFailed = specSelectors.loadingStatus() === "failed"

    const classNames = ["download-url-input"]
    if (isFailed) classNames.push("failed")
    if (isLoading) classNames.push("loading")

    const { urls } = getConfigs()
    let control = []
    let formOnSubmit = null

    const {
      githubToken,
      githubUser,
      showGistPicker,
      gistList,
      gistListLoading,
      currentGistId,
      authLoading,
      gistSaving,
      gistOpening,
      lastSavedSpec,
    } = this.state

    let saveButtonClass = "topbar-btn"
    if (currentGistId) {
      const currentSpec = specSelectors.specStr() || ""
      if (lastSavedSpec !== null && currentSpec !== lastSavedSpec) {
        saveButtonClass = "topbar-btn topbar-btn--dirty"
      } else {
        saveButtonClass = "topbar-btn topbar-btn--clean"
      }
    }

    const spinner = <span className="topbar-spinner" />

    return (
      <div className="topbar">
        <div className="wrapper">
          <div className="topbar-wrapper">
            <Link>
              <Logo/>
            </Link>
            <form className="download-url-wrapper" onSubmit={formOnSubmit}>
              {control.map((el, i) => cloneElement(el, { key: i }))}
            </form>
            <input
              type="file"
              ref={this.fileInputRef}
              onChange={this.handleFileChange}
              accept="application/json,.json,.yaml,.yml"
              style={{ display: "none" }}
            />
            <Button className="topbar-btn" onClick={this.handleUploadClick}>Upload</Button>
            <Button className="topbar-btn" onClick={this.downloadCurrentSpec}>Download</Button>

            <div className="topbar-separator" />

            <div className="github-section">
              {!githubToken && (
                <Button className="topbar-btn" onClick={this.signInWithGitHub} disabled={authLoading}>
                  Sign in with GitHub{authLoading && spinner}
                </Button>
              )}

              {githubToken && !githubUser && authLoading && (
                <span className="topbar-spinner" />
              )}

              {githubToken && githubUser && (
                <div className="github-user-section">
                  <span className="github-username">{githubUser}</span>
                  <Button className="topbar-btn" onClick={this.loadGistList} disabled={gistListLoading || gistOpening}>
                    Load from Gist{(gistListLoading || gistOpening) && spinner}
                  </Button>
                  <Button className={saveButtonClass} onClick={this.saveToGist} disabled={gistSaving}>
                    {currentGistId ? "Save to Gist" : "Save as Gist"}{gistSaving && spinner}
                  </Button>
                  <button className="github-signout" onClick={this.signOut}>Sign out</button>
                </div>
              )}

              {showGistPicker && (
                <div className="gist-picker-overlay" onClick={this.closeGistPicker}>
                  <div className="gist-picker" onClick={(e) => e.stopPropagation()}>
                    <div className="gist-picker-header">
                      <span>Select a Gist</span>
                      <button className="gist-picker-close" onClick={this.closeGistPicker}>&times;</button>
                    </div>
                    <div className="gist-picker-list">
                      {gistListLoading && <div className="gist-picker-loading">Loading...</div>}
                      {!gistListLoading && gistList.length === 0 && (
                        <div className="gist-picker-empty">No spec gists found</div>
                      )}
                      {gistList.map((gist) => {
                        const files = Object.keys(gist.files || {})
                        const specFile = files.find(
                          (f) => f.endsWith(".json") || f.endsWith(".yaml") || f.endsWith(".yml")
                        )
                        return (
                          <button
                            key={gist.id}
                            className="gist-picker-item"
                            onClick={() => this.openGist(gist.id)}
                          >
                            <span className="gist-picker-filename">{specFile}</span>
                            <span className="gist-picker-desc">
                              {gist.description || "No description"}
                            </span>
                            <span className="gist-picker-date">
                              {new Date(gist.updated_at).toLocaleDateString()}
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }
}

TopBar.propTypes = {
  specSelectors: PropTypes.object.isRequired,
  specActions: PropTypes.object.isRequired,
  errActions: PropTypes.object,
  getComponent: PropTypes.func.isRequired,
  getConfigs: PropTypes.func.isRequired
}

export default TopBar
