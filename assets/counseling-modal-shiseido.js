const COUNSELING_APPROVAL_WINDOW_MS = 24 * 60 * 60 * 1000;

function getCounselingStorageKey(scope) {
  return scope ? `counseling:${scope}` : null;
}

function readCounselingApproval(scope) {
  const storageKey = getCounselingStorageKey(scope);
  if (!storageKey) return null;

  const safeRemove = () => {
    try {
      window.localStorage.removeItem(storageKey);
    } catch (_) {
      // ignore storage access errors
    }
  };

  try {
    const rawValue = window.localStorage.getItem(storageKey);
    if (!rawValue) return null;

    const parsedValue = JSON.parse(rawValue);
    if (!parsedValue || typeof parsedValue !== 'object') {
      safeRemove();
      return null;
    }

    if (typeof parsedValue.approvedAt !== 'number' || typeof parsedValue.expiresAt !== 'number') {
      safeRemove();
      return null;
    }

    if (parsedValue.expiresAt <= Date.now()) {
      safeRemove();
      return null;
    }

    return parsedValue;
  } catch (error) {
    return null;
  }
}

function persistCounselingApproval(scope) {
  const storageKey = getCounselingStorageKey(scope);
  if (!storageKey) return;

  const approvedAt = Date.now();
  const expiresAt = approvedAt + COUNSELING_APPROVAL_WINDOW_MS;

  try {
    window.localStorage.setItem(
      storageKey,
      JSON.stringify({
        approvedAt,
        expiresAt,
      })
    );
  } catch (error) {
    console.error('Failed to persist counseling approval state.', error);
  }
}

function hasValidCounselingApproval(scope) {
  return Boolean(readCounselingApproval(scope));
}

function submitAssociatedProductForm(triggerButton) {
  const productForm = triggerButton.closest('product-form');
  const form = productForm ? productForm.querySelector('form') : null;
  if (!form) return;

  const originalType = triggerButton.getAttribute('type') || 'submit';
  triggerButton.dataset.skipCounselingIntercept = '1';
  triggerButton.setAttribute('type', 'submit');

  if (typeof form.requestSubmit === 'function') {
    form.requestSubmit(triggerButton);
  } else {
    triggerButton.click();
  }

  window.setTimeout(() => {
    delete triggerButton.dataset.skipCounselingIntercept;
    triggerButton.setAttribute('type', originalType);
  }, 0);
}

class MyDialog extends HTMLElement {
  constructor() {
    super();
    this.activePageIndex = 0;
    this.dialog = this.querySelector('dialog');
    if (this.dialog && typeof dialogPolyfill !== 'undefined') {
      dialogPolyfill.registerDialog(this.dialog);
    }
    this.pages = this.querySelectorAll('.page');
    this.closeButtons = this.querySelectorAll('.close-button');
    this.nextPageButtons = this.querySelectorAll('.next-page');
    this.radioButtons = this.querySelectorAll('input[type="radio"]');
    this.counselingResult = this.querySelectorAll('.counseling-result');
    this.nextPageDisableButtons = this.querySelectorAll('.next-page-disable');
    this.submitButtons = this.querySelectorAll('button[type="submit"]');
    this.q1_1 = this.querySelector('.q1_1');
    this.retryCounselingButton = this.querySelector('.retry-counseling');
    this.counselingScope = this.getAttribute('data-counseling-scope') || '';
    this.currentResultIndex = null;
  }

  connectedCallback() {
    this.dialog.addEventListener('click', (event) => {
      if (event.target === this.dialog) {
        this.dialog.close();
      }
    });

    this.submitButtons.forEach((submitButton) => {
      submitButton.addEventListener('click', () => {
        if (this.isPurchasableResult(this.currentResultIndex)) {
          persistCounselingApproval(this.counselingScope);
        }
        this.dialog.close();
      });
    });

    this.closeButtons.forEach((closeButton) => {
      closeButton.addEventListener('click', () => {
        this.dialog.close();
      });
    });

    this.nextPageButtons.forEach((nextPageButton) => {
      nextPageButton.addEventListener('click', () => {
        this.nextPage();
      });
    });

    this.pages[this.activePageIndex].classList.add('active');

    Array.from(this.radioButtons).forEach((radioButton) => {
      radioButton.addEventListener('change', () => {
        this.checkNextButtonActive();
      });
    });

    this.retryCounselingButton.addEventListener('click', () => {
      this.retryCounseling();
    });
  }

  checkNextButtonActive() {
    const radioGroup1 = Array.from(this.querySelectorAll('input[name="q1"]')).some((radio) => radio.checked);
    const radioGroup2 = Array.from(this.querySelectorAll('input[name="q2"]')).some((radio) => radio.checked);
    const radioGroup3 = Array.from(this.querySelectorAll('input[name="q3"]')).some((radio) => radio.checked);
    if (this.radioButtons[0].checked) {
      this.q1_1.classList.remove('tw-hidden');
      if (radioGroup1 && radioGroup2) {
        this.nextPageDisableButtons[0].style.display = 'none';
        this.nextPageButtons[0].style.display = 'block';
      } else {
        this.nextPageButtons[0].style.display = 'none';
        this.nextPageDisableButtons[0].style.display = 'block';
      }

      if (radioGroup1 && radioGroup2 && radioGroup3) {
        this.nextPageDisableButtons[1].style.display = 'none';
        this.nextPageButtons[1].style.display = 'block';
      } else {
        this.nextPageButtons[1].style.display = 'none';
        this.nextPageDisableButtons[1].style.display = 'block';
      }
    } else {
      this.q1_1.classList.add('tw-hidden');
      if (radioGroup1) {
        this.nextPageDisableButtons[0].style.display = 'none';
        this.nextPageButtons[0].style.display = 'block';
      } else {
        this.nextPageButtons[0].style.display = 'none';
        this.nextPageDisableButtons[0].style.display = 'block';
      }
      if (radioGroup1 && radioGroup3) {
        this.nextPageDisableButtons[1].style.display = 'none';
        this.nextPageButtons[1].style.display = 'block';
      } else {
        this.nextPageButtons[1].style.display = 'none';
        this.nextPageDisableButtons[1].style.display = 'block';
      }
    }
  }

  retryCounseling() {
    this.pages[this.activePageIndex].classList.remove('active');
    this.activePageIndex = 0;
    this.currentResultIndex = null;
    this.pages[this.activePageIndex].classList.add('active');
    this.radioButtons.forEach((radioButton) => {
      radioButton.checked = false;
    });
    this.counselingResult.forEach((counselingResult) => {
      counselingResult.classList.remove('active');
    });
    this.checkNextButtonActive();
  }

  isPurchasableResult(resultIndex) {
    return resultIndex === 0 || resultIndex === 2;
  }

  openDialog() {
    this.dialog.showModal();
  }

  nextPage() {
    if (this.activePageIndex + 1 < this.pages.length) {
      this.pages[this.activePageIndex].classList.remove('active');
      this.activePageIndex++;
      this.pages[this.activePageIndex].classList.add('active');
    }
    if (this.activePageIndex === 2) {
      this.updateLastPage();
    }
  }

  updateLastPage() {
    this.counselingResult.forEach((counselingResult) => {
      counselingResult.classList.remove('active');
    });

    if (this.radioButtons[1].checked && this.radioButtons[5].checked) {
      this.currentResultIndex = 0;
    } else if (this.radioButtons[0].checked && this.radioButtons[3].checked) {
      this.currentResultIndex = 1;
    } else {
      this.currentResultIndex = 2;
    }

    this.counselingResult[this.currentResultIndex].classList.add('active');
  }
}

customElements.define('my-dialog', MyDialog);

(function () {
  function initCounselingTriggers() {
    const triggerButtons = document.querySelectorAll('[data-counseling-trigger]');

    triggerButtons.forEach((button) => {
      // PreOrder Globo clones the original button (copying data-counseling-trigger-bound)
      // but the clone has no actual event listeners. Detect and re-bind Globo clones.
      const isGloboClone = button.classList.contains('gPreorderBtn');
      if (isGloboClone) {
        if (button.dataset.counselingGloboBound === '1') return;
        button.dataset.counselingGloboBound = '1';
      } else {
        if (button.dataset.counselingTriggerBound === '1') return;
        button.dataset.counselingTriggerBound = '1';
      }

      button.addEventListener('click', (event) => {
        if (button.dataset.skipCounselingIntercept === '1') return;
        event.preventDefault();

        const productForm = button.closest('product-form');
        const dialog = productForm ? productForm.querySelector('my-dialog') : null;
        const counselingScope = productForm ? productForm.dataset.counselingScope : '';

        if (counselingScope && hasValidCounselingApproval(counselingScope)) {
          submitAssociatedProductForm(button);
          return;
        }

        if (dialog) {
          dialog.openDialog();
        }
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCounselingTriggers);
  } else {
    initCounselingTriggers();
  }

  window.setTimeout(initCounselingTriggers, 500);

  // Watch for PreOrder Globo dynamically inserting cloned buttons
  var observer = new MutationObserver(function () {
    initCounselingTriggers();
  });
  var formContainer = document.querySelector('product-form');
  if (formContainer) {
    observer.observe(formContainer, { childList: true, subtree: true });
  }
})();
