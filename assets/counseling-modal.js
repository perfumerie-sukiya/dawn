/**
 * Brand-agnostic counseling modal component
 * Uses data attributes for configuration to support multiple brands
 */
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
    this.nextPageButton = this.querySelector('.next-page');
    this.radioButtons = this.querySelectorAll('input[type="radio"]');
    this.useCheckbox = this.getAttribute('data-input-type') === 'checkbox';
    this.checkboxes = this.useCheckbox
      ? [
          this.querySelector('input[type="checkbox"][name^="q1"]'),
          this.querySelector('input[type="checkbox"][name^="q2"]'),
          this.querySelector('input[type="checkbox"][name^="q3"]')
        ].filter(Boolean)
      : [];
    this.counselingResult = this.querySelectorAll('.counseling-result');
    this.nextPageDisableButton = this.querySelector('.next-page-disable');
    this.submitButtons = this.querySelectorAll('button[type="submit"]');
    this.brand = this.getAttribute('data-brand') || 'default';
    this.counselingScope = this.getAttribute('data-counseling-scope') || '';
    this.currentResultIndex = null;
  }

  connectedCallback() {
    if (!this.dialog) return;

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

    this.retryButtons = this.querySelectorAll('.retry-counseling');
    this.retryButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        this.pages.forEach((p, i) => p.classList.toggle('active', i === 0));
        this.activePageIndex = 0;
        this.currentResultIndex = null;
        this.counselingResult.forEach((result) => {
          result.classList.remove('active');
        });
        if (this.useCheckbox && this.checkboxes.length === 3) {
          this.checkboxes.forEach((cb) => { cb.checked = false; });
          this.checkNextButtonActive();
        } else {
          this.radioButtons.forEach((r) => { r.checked = false; });
          this.checkNextButtonActive();
        }
      });
    });

    if (this.nextPageButton) {
      this.nextPageButton.addEventListener('click', () => {
        this.nextPage();
      });
    }

    if (this.pages.length > 0) {
      this.pages[this.activePageIndex].classList.add('active');
    }

    Array.from(this.radioButtons).forEach((radioButton) => {
      radioButton.addEventListener('change', () => {
        this.checkNextButtonActive();
      });
    });

    if (this.useCheckbox && this.checkboxes.length === 3) {
      this.checkboxes.forEach((cb) => {
        cb.addEventListener('change', () => {
          this.checkNextButtonActive();
        });
      });
      this.checkNextButtonActive();
    }
  }

  checkNextButtonActive() {
    if (this.useCheckbox && this.checkboxes.length === 3) {
      const allAnswered = this.checkboxes.every((cb) => cb !== null);
      if (allAnswered) {
        if (this.nextPageDisableButton) this.nextPageDisableButton.style.display = 'none';
        if (this.nextPageButton) this.nextPageButton.style.display = 'block';
      } else {
        if (this.nextPageButton) this.nextPageButton.style.display = 'none';
        if (this.nextPageDisableButton) this.nextPageDisableButton.style.display = 'block';
      }
      return;
    }

    const radioGroup1 = Array.from(this.querySelectorAll('input[name^="q1"]')).some((radio) => radio.checked);
    const radioGroup2 = Array.from(this.querySelectorAll('input[name^="q2"]')).some((radio) => radio.checked);
    const radioGroup3 = Array.from(this.querySelectorAll('input[name^="q3"]')).some((radio) => radio.checked);
    if (radioGroup1 && radioGroup2 && radioGroup3) {
      if (this.nextPageDisableButton) {
        this.nextPageDisableButton.style.display = 'none';
      }
      if (this.nextPageButton) {
        this.nextPageButton.style.display = 'block';
      }
    } else {
      if (this.nextPageButton) {
        this.nextPageButton.style.display = 'none';
      }
      if (this.nextPageDisableButton) {
        this.nextPageDisableButton.style.display = 'block';
      }
    }
  }

  openDialog() {
    if (this.dialog) {
      this.dialog.showModal();
    }
  }

  nextPage() {
    if (this.activePageIndex + 1 < this.pages.length) {
      this.updateSecondPage();
      this.pages[this.activePageIndex].classList.remove('active');
      this.activePageIndex++;
      this.pages[this.activePageIndex].classList.add('active');
    }
  }

  updateSecondPage() {
    let q1Value;
    let q2Value;
    let q3Value;

    if (this.useCheckbox && this.checkboxes.length === 3) {
      q1Value = this.checkboxes[0].checked ? 1 : 0;
      q2Value = this.checkboxes[1].checked ? 1 : 0;
      q3Value = this.checkboxes[2].checked ? 1 : 0;
    } else {
      if (this.radioButtons.length < 6) return;
      q1Value = this.radioButtons[0].checked ? 1 : this.radioButtons[1].checked ? 0 : null;
      q2Value = this.radioButtons[2].checked ? 1 : this.radioButtons[3].checked ? 0 : null;
      q3Value = this.radioButtons[4].checked ? 1 : this.radioButtons[5].checked ? 0 : null;
      if (q1Value === null || q2Value === null || q3Value === null) return;
    }

    this.counselingResult.forEach((result) => {
      result.classList.remove('active');
    });

    const resultIndex = this.getResultIndex(q1Value, q2Value, q3Value);
    this.currentResultIndex = resultIndex;

    if (this.counselingResult[resultIndex]) {
      this.counselingResult[resultIndex].classList.add('active');
    }
  }

  isPurchasableResult(resultIndex) {
    if (resultIndex === null || resultIndex === undefined) {
      return false;
    }

    if (this.brand === 'albion') {
      return resultIndex === 0 || resultIndex === 1;
    }

    return resultIndex === 0 || resultIndex === 1;
  }

  /**
   * Determine which result to show based on brand and answers
   * Override this method or extend the logic for brand-specific behavior
   */
  getResultIndex(q1, q2, q3) {
    if (this.brand === 'albion') {
      if (q1 === 1 && q2 === 1 && q3 === 1) {
        return 0;
      }
      if (q1 === 1 && (q2 === 0 || q3 === 0)) {
        return 1;
      }
      return 2;
    }

    if (q1 === 0 && q2 === 0 && q3 === 0) {
      return 0;
    } else if (q1 === 0 && (q2 === 1 || q3 === 1)) {
      return 1;
    } else {
      return 2;
    }
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
