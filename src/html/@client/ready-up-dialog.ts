import { onLoadWithAttr } from './on-load-with-attr.js'

const dialogSelector = '#ready-up-dialog'
const triggerAttr = 'data-ready-up-dialog-trigger'
const disableOnSubmitAttr = 'data-disable-on-submit'

function findReadyUpDialog() {
  const dialog = document.querySelector(dialogSelector)
  return dialog instanceof HTMLDialogElement ? dialog : null
}

function setButtonsDisabled(dialog: HTMLDialogElement, disabled: boolean) {
  dialog.querySelectorAll('button').forEach(button => {
    button.disabled = disabled
  })
}

function showReadyUpDialog() {
  const dialog = findReadyUpDialog()
  if (!dialog) return

  if (!dialog.open) {
    dialog.showModal()
    window.umami?.track('ready-up-shown')
  }

  setButtonsDisabled(dialog, false)
}

function closeReadyUpDialog() {
  const dialog = findReadyUpDialog()
  if (!dialog?.open) return

  dialog.close()
}

function initDisableOnSubmit(form: HTMLFormElement) {
  if (form.dataset['disableOnSubmitInitialized'] === 'true') return

  form.dataset['disableOnSubmitInitialized'] = 'true'
  form.addEventListener('submit', () => {
    const dialog = findReadyUpDialog()
    if (dialog) {
      setButtonsDisabled(dialog, true)
    }
  })
}

function handleTrigger(element: HTMLElement) {
  const trigger = element.getAttribute(triggerAttr)

  if (trigger === 'show') {
    showReadyUpDialog()
  }

  if (trigger === 'close') {
    closeReadyUpDialog()
  }

  element.remove()
}

onLoadWithAttr(triggerAttr, handleTrigger)
onLoadWithAttr(disableOnSubmitAttr, el => {
  if (el instanceof HTMLFormElement) initDisableOnSubmit(el)
})
