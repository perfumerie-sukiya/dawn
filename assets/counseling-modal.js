/**
 * Brand-agnostic counseling modal component
 * Uses data attributes for configuration to support multiple brands
 */
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
    // Assuming all questions have 2 choices, each question must have at least 1 selected
    // Support both old format (q1, q2, q3) and new format (q1-{section_id}, q2-{section_id}, q3-{section_id})
    let radioGroup1 = Array.from(this.querySelectorAll('input[name^="q1"]')).some((radio) => radio.checked);
    let radioGroup2 = Array.from(this.querySelectorAll('input[name^="q2"]')).some((radio) => radio.checked);
    let radioGroup3 = Array.from(this.querySelectorAll('input[name^="q3"]')).some((radio) => radio.checked);
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
    let q1Value, q2Value, q3Value;

    if (this.useCheckbox && this.checkboxes.length === 3) {
      q1Value = this.checkboxes[0].checked ? 1 : 0;
      q2Value = this.checkboxes[1].checked ? 1 : 0;
      q3Value = this.checkboxes[2].checked ? 1 : 0;
    } else {
      if (this.radioButtons.length < 6) return;
      // Get radio button values: q1, q2, q3 (YES=1, NO=0)
      // Radio buttons are ordered: q1_YES, q1_NO, q2_YES, q2_NO, q3_YES, q3_NO
      q1Value = this.radioButtons[0].checked ? 1 : this.radioButtons[1].checked ? 0 : null;
      q2Value = this.radioButtons[2].checked ? 1 : this.radioButtons[3].checked ? 0 : null;
      q3Value = this.radioButtons[4].checked ? 1 : this.radioButtons[5].checked ? 0 : null;
      if (q1Value === null || q2Value === null || q3Value === null) return;
    }

    // Reset all results first
    this.counselingResult.forEach((result) => result.classList.remove('active'));

    // Brand-specific result logic
    let resultIndex = this.getResultIndex(q1Value, q2Value, q3Value);

    if (this.counselingResult[resultIndex]) {
      this.counselingResult[resultIndex].classList.add('active');
    }
  }

  /**
   * Determine which result to show based on brand and answers
   * Override this method or extend the logic for brand-specific behavior
   */
  getResultIndex(q1, q2, q3) {
    // Default logic (Decorte style)
    // Result 0: All NO (q1=0, q2=0, q3=0) - 購入前カウンセリングが完了しました
    // Result 1: q1=NO and (q2=YES or q3=YES) - ご購入にあたっては商品情報をご確認ください
    // Result 2: q1=YES - 販売できません

    if (this.brand === 'albion') {
      // Albion: 否定文でチェック=YES（当てはまる）. ガイドライン判定ロジック
      // Q1=YES,Q2=YES,Q3=YES -> 購入可 | Q1=YESかつ(Q2=NO or Q3=NO) -> 注意喚起 | それ以外 -> 購入不可
      if (q1 === 1 && q2 === 1 && q3 === 1) {
        return 0; // アルゴリズム① 購入可
      }
      if (q1 === 1 && (q2 === 0 || q3 === 0)) {
        return 1; // アルゴリズム② 注意喚起
      }
      return 2; // アルゴリズム③ 購入不可
    } else {
      // Decorte/default logic
      if (q1 === 0 && q2 === 0 && q3 === 0) {
        return 0; // All NO
      } else if (q1 === 0 && (q2 === 1 || q3 === 1)) {
        return 1; // q1=NO and (q2=YES or q3=YES)
      } else {
        return 2; // q1=YES (cannot sell)
      }
    }
  }
}

customElements.define('my-dialog', MyDialog);

/**
 * Initialize counseling modal triggers
 * Looks for buttons with data-counseling-trigger attribute
 */
(function () {
  function initCounselingTriggers() {
    const triggerButtons = document.querySelectorAll('[data-counseling-trigger]');
    const dialog = document.querySelector('my-dialog');

    if (!dialog) return;

    triggerButtons.forEach((button) => {
      // Remove existing listeners by cloning
      const newButton = button.cloneNode(true);
      button.parentNode.replaceChild(newButton, button);

      newButton.addEventListener('click', (e) => {
        e.preventDefault();
        dialog.openDialog();
      });
    });
  }

  // Initialize on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCounselingTriggers);
  } else {
    initCounselingTriggers();
  }

  // Also try after a short delay for dynamically loaded content
  setTimeout(initCounselingTriggers, 500);
})();
