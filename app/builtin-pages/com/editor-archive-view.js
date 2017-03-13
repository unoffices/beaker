import * as yo from 'yo-yo'
import renderFilesList from './files-list'
import renderFileView from './editor-file-view'
import { writeToClipboard } from '../../lib/fg/event-handlers'
import prettyBytes from 'pretty-bytes'
import { niceDate } from '../../lib/time'
import { shortenHash } from '../../lib/strings'
import { pushUrl } from '../../lib/fg/event-handlers'

// exported api
// =

export function render (archive, opts = {}) {
  if (opts.viewError) return renderError(opts.viewError)
  if (opts.viewIsLoading) return renderLoading()
  if (!archive) return renderEmpty()
  return renderArchive(archive, opts)
}

function renderEmpty () {
  return yo`<div class="archive-view">
    <div class="archive-empty-banner">
      <h2>Editor</h2>
      <p>Build websites and applications. <a class="link" onclick=${onCreate}>Create new site</a>.</p>
    </div>
  </div>`
}

function renderError (error) {
  return yo`
    <div class="archive-view">
      <div class="message error archive-error">
        <div>
          <i class="fa fa-exclamation-triangle"></i>
          <span>Error: ${error.toString()}</span>

          <p>
            The archive failed to load. Sorry for the inconvenience.
          </p>
        </div>
        <div class="archive-error-narclink">
        <a href="https://github.com/beakerbrowser/beaker/issues" target="_blank">Report Issue</a>
        |
        <a href="https://groups.google.com/forum/#!forum/beaker-browser" target="_blank">Request Help</a>
      </div>
    </div>
  </div>`
}

function renderLoading () {
  return yo`<div class="archive-view">
    <div class="archive-loading">
      <div class="archive-loading-banner">
        <div class="spinner"></div>
        <div>Searching the network for this site. Please wait...</div>
      </div>
      <div class="archive-loading-tips">
        <p><strong>Try:</strong></p>
        <ul>
          <li>Checking your connection</li>
          <li>Checking your firewall settings</li>
        </ul>
        <p>
          Having trouble? <a href="https://groups.google.com/forum/#!forum/beaker-browser" target="_blank">Ask for help</a> or <a href="https://github.com/beakerbrowser/beaker/issues" target="_blank">Report a bug</a>.
        </p>
      </div>
    </div>
  </div>`
}

function renderArchive (archive, opts) {
  var view = (opts.selectedPath) ? renderFileView : renderArchiveDetails
  return yo`
    <div class="archive-view">
      ${renderFilesList(archive, opts)}
      ${view(archive, opts)}
    </div>
  `
}

function renderArchiveDetails (archive, opts) {
  return yo`<div>
    <div class="archive-view-header">
      <h2 class="title">
        <a href=${'dat://'+archive.info.key} title=${archive.niceName}>${archive.niceName}</a>
      </h2>
    </div>

    <p class="archive-desc">
      ${rDescription(archive)}
      ${rProvinence(archive)}
    </p>

    ${rReadOnly(archive)}
    ${rMetadata(archive)}
    ${rToolbar(archive)}
  </div>`
}

function rDescription (archive) {
  return (archive.info.description)
    ? yo`<span>${archive.info.description}</span>`
    : yo`<em>no description</em>`
}

function rProvinence (archive) {
  var els = []

  if (archive.forkOf) {
    els.push(yo`
      <p>
        <i class="fa fa-code-fork"></i>
        <span>Fork of</span>
        <a href=${viewUrl(archive.forkOf)} onclick=${pushUrl}>${shortenHash(archive.forkOf)}</a>
      </p>`
    )
  }

  if (archive.createdBy) {
    els.push(yo`
      <p>
        <i class="fa fa-code"></i>
        <a href=${viewUrl(archive.info.createdBy.url)} onclick=${pushUrl}>
          Created by ${archive.info.createdBy.title || shortenHash(archive.info.createdBy.url)}
        </a>
      </p>`
    )
  }

  return els
}

function rMetadata (archive) {
  return yo`
    <div class="archive-metadata">
     <div class="history">
        <i class="fa fa-history"></i>
        Updated ${niceDate(archive.info.mtime)}
      </div>
      <div class="size">
        <i class="fa fa-info-circle"></i>
        <span>
          ${prettyBytes(archive.info.size)}
        </span>
      </div>
    </div>`
}

function rToolbar (archive) {
  var inactiveView = 'History'
  var addFilesBtn = ''

  if (archive.info.isOwner) {
    addFilesBtn = yo`
      <button class="btn" onclick=${() => onClickSelectFiles(archive)}>
        <i class="fa fa-plus"></i>
        <span>Add files</span>
      </button>`
  }

  return yo`
    <div class="archive-toolbar">
      <a class="view-link" onclick=${() => setCurrentView(inactiveView)}>View ${inactiveView}</a>

      <div class="btn-bar">
        ${rSaveBtn(archive)}

        <button class="btn" onclick=${() => onEditDetails(archive)}>
          <i class="fa fa-edit"></i>
          <span>Edit Details</span>
        </button>

        <button class="btn" onclick=${() => onFork(archive)}>
          <i class="fa fa-code-fork"></i>
          <span>Fork</span>
        </button>

        <button class="btn" onclick=${writeToClipboard('dat://' + archive.info.key)}>
          <i class="fa fa-clipboard"></i>
          <span>Copy URL</span>
        </button>

        <a class="btn" href=${'dat://' + archive.info.key} target="_blank">
          <i class="fa fa-external-link"></i>
          <span>Open</span>
        </a>

        ${addFilesBtn}
      </div>
    </div>`
}

function rReadOnly (archive) {
  if (archive.info.isOwner) return ''
  return yo`
    <p class="message archive-readonly">
      <i class="fa fa-eye"></i>
      You${"'"}re viewing a read-only version of this site. <a onclick=${onFork}>Save an editable version to your library</a>.
    </p>`
}

function rSaveBtn (archive) {
  if (archive.isSaved) {
    return yo`
      <button class="btn" onclick=${() => archive.toggleSaved()}>
        <i class="fa fa-trash"></i>
        Remove from library
      </button>`
  }
  return yo`
    <button class="btn" onclick=${() => archive.toggleSaved()}>
      <i class="fa fa-save"></i>
      Save to library
    </button>`
}

// event handlers
// =

async function onCreate () {
  var archive = await DatArchive.create()
  window.history.pushState(null, '', viewUrl(archive.url))
}

async function onFork (archive) {
  var newArchive = await DatArchive.fork(archive.url)
  window.location = 'beaker://editor/' + newArchive.url.slice('dat://'.length)
}

function onEditDetails (archive) {
  archive.updateManifest()  
}

// helpers
// =

function viewUrl (url) {
  if (url.startsWith('dat://')) {
    return 'beaker://editor/' + url.slice('dat://'.length)
  }
}