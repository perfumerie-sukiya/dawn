class MyAccordion extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `<style>
      .my-accordion {
        transition: 0.4s;
      }

      .my-accordion svg {
        width: 14px !important;
        height: 14px !important;
        display: block;
      }

      .my-accordion .icon-minus {
        height: 3px !important;
      }

      .panel {
        transition: max-height 0.2s ease-out;
        overflow: hidden;
        max-height: 0;
      }

      .panel.show {
        max-height: 9999px; /* Fallback max-height (JavaScript dynamically calculates actual height) */
      }

      .accordion-icon {
        display: inline-flex;
        align-items: center;
      }
    </style>` + this.innerHTML;

    let acc = this.querySelectorAll(".my-accordion");
    acc.forEach((el) => {
      const icon = el.querySelector('[data-accordion-icon]');
      const iconClosed = icon ? icon.querySelector('[data-accordion-icon-closed]') : null;
      const iconOpen = icon ? icon.querySelector('[data-accordion-icon-open]') : null;

      const setIconState = (isOpen) => {
        if (!iconClosed || !iconOpen) return;
        iconClosed.hidden = isOpen;
        iconOpen.hidden = !isOpen;
      };

      setIconState(false);

      el.addEventListener("click", function() {
        this.classList.toggle("active");
        let panel = this.nextElementSibling;

        if (panel.style.maxHeight) {
          setIconState(false);
          panel.style.maxHeight = null;
          panel.classList.remove('show');
        } else {
          setIconState(true);
          // Temporarily expand the panel to calculate the maximum height
          panel.style.maxHeight = 'none';
          let expandedHeight = panel.scrollHeight;

          // If the parent Node is also a panel, increase its max height to accommodate this panel
          if (panel.parentNode.classList.contains('panel')) {
            panel.parentNode.style.maxHeight = `${panel.parentNode.scrollHeight + expandedHeight}px`;
          }

          // Reset and then set the max-height
          panel.style.maxHeight = null;
          window.getComputedStyle(panel).maxHeight; // Force a reflow
          panel.style.maxHeight = `${expandedHeight}px`;
          panel.classList.add('show');
        }
      });
    });
  }
}

class SimpleAccordion extends HTMLElement {
  constructor() {
    super();

    this.innerHTML = `<style>
    .accordion-header {
      cursor: pointer;
    }

    .accordion-content {
      display: none;
    }

    .accordion-content.expanded {
      display: block;
    }
  </style>` + this.innerHTML;

    // 要素を取得
    this.header = this.querySelector('.accordion-header');
    this.content = this.querySelector('.accordion-content');
  }

  connectedCallback() {
    this.header.addEventListener('click', this.toggleContent.bind(this));
  }

  disconnectedCallback() {
    this.header.removeEventListener('click', this.toggleContent.bind(this));
  }

  toggleContent() {
    // Tailwind CSSを使用して表示/非表示を切り替える
    this.content.classList.toggle('expanded');
  }
}

customElements.define('my-accordion', MyAccordion);
customElements.define('simple-accordion', SimpleAccordion);
