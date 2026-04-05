<h1 align="center">
  <a href="https://devfros.github.io/yamless-editor/">
    <img src="src/standalone/plugins/top-bar/assets/logo_yamless.svg" alt="YAMLess" width="280" />
  </a>
</h1>

<p align="center">
  <strong>OpenAPI in the browser: edit the spec, not the YAML.</strong>
</p>

<p align="center">
  <a href="https://devfros.github.io/yamless-editor/"><strong>Use it online (free, no signup)</strong></a>
  &nbsp;·&nbsp;
  <a href="./LICENSE"><img src="https://img.shields.io/badge/license-Apache%202.0-3c9fd8?style=flat-square" alt="License" /></a>
</p>

---

**YAMLess** is a Swagger-based UI for **viewing and editing OpenAPI** visually. Skip raw YAML: change paths, operations, and metadata where you already explore your API.

### Highlights

- **In-browser editing:** iterate on your OpenAPI document without hand-editing YAML files in place
- **Familiar Swagger surface:** same mental model as Swagger UI, tuned for editing workflows
- **Open source:** Apache-2.0 (inherits the Swagger UI ecosystem)

### Screenshots

<table>
  <tr>
    <td><img src="screenshots/1.png" alt="YAMLess screenshot 1" width="420" /></td>
    <td><img src="screenshots/2.png" alt="YAMLess screenshot 2" width="420" /></td>
  </tr>
  <tr>
    <td><img src="screenshots/3.png" alt="YAMLess screenshot 3" width="420" /></td>
    <td><img src="screenshots/4.png" alt="YAMLess screenshot 4" width="420" /></td>
  </tr>
  <tr>
    <td><img src="screenshots/5.png" alt="YAMLess screenshot 5" width="420" /></td>
    <td><img src="screenshots/6.png" alt="YAMLess screenshot 6" width="420" /></td>
  </tr>
  <tr>
    <td><img src="screenshots/7.png" alt="YAMLess screenshot 7" width="420" /></td>
    <td><img src="screenshots/8.png" alt="YAMLess screenshot 8" width="420" /></td>
  </tr>
  <tr>
    <td><img src="screenshots/9.png" alt="YAMLess screenshot 9" width="420" /></td>
    <td><img src="screenshots/10.png" alt="YAMLess screenshot 10" width="420" /></td>
  </tr>
</table>

### Run locally

```bash
npm install
npm run dev
```

Dev server: **<http://localhost:3200>**

### Build

```bash
npm run build
```

Static output lands in `dist/`. Use `npm start` to serve `dist/` and open the app in a browser.

---

<p align="center"><sub>YAML optional. APIs first.</sub></p>
