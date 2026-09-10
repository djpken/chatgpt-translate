// ==UserScript==
// @name         ChatGPT Translate 版面與語言預設
// @namespace    https://chatgpt.com/
// @version      1.4.0
// @description  移除翻譯頁標題區、讓寬螢幕使用兩個 600x700px 欄位，並預設來源與目標語言。
// @match        https://chatgpt.com/zh-Hant/translate/*
// @run-at       document-idle
// @grant        none
// ==/UserScript==

(function () {
  'use strict';

  const INTRO_SELECTOR = 'div > div > div:nth-of-type(1) > header > section';
  const SOURCE_BUTTON_SELECTOR =
    'button[aria-label^="來源語言："], button[aria-label^="來源語言:"]';
  const TARGET_BUTTON_SELECTOR =
    'button[aria-label^="目標語言："], button[aria-label^="目標語言:"]';
  const SOURCE_TEXTAREA_SELECTOR =
    'textarea[aria-label="要翻譯的來源內容"]';
  const RESULT_TEXTAREA_SELECTOR =
    'div > div:nth-of-type(2) > div:nth-of-type(2) > div > textarea';
  const TRANSLATION_TEXTAREA_SELECTOR = [
    SOURCE_TEXTAREA_SELECTOR,
    RESULT_TEXTAREA_SELECTOR,
  ].join(',');

  // 兩個 textarea 都會套用這組尺寸。
  const TEXTAREA_WIDTH = '600px';
  const TEXTAREA_HEIGHT = '700px';
  const TRANSLATION_LAYOUT_WIDTH = 'calc(600px + 600px + 2rem)';
  const WIDE_LAYOUT_BREAKPOINT = 1280;

  const HEADER_SPACING_ATTRIBUTE = 'data-cgt-header-spacing-reset';
  const TRANSLATION_LAYOUT_ATTRIBUTE = 'data-cgt-translation-layout';
  const TEXTAREA_EXPANDED_ATTRIBUTE = 'data-cgt-textarea-expanded';
  const TEXTAREA_WRAPPER_ATTRIBUTE = 'data-cgt-textarea-wrapper';
  const STYLE_ID = 'cgt-custom-style';

  let applyScheduled = false;
  let languageUpdateInProgress = false;
  let defaultsApplied = false;

  function normalizeText(value) {
    return (value || '').replace(/\s+/g, ' ').trim();
  }

  function isVisible(element) {
    if (!element || !(element instanceof Element)) {
      return false;
    }

    const style = window.getComputedStyle(element);
    const rect = element.getBoundingClientRect();

    return (
      style.display !== 'none' &&
      style.visibility !== 'hidden' &&
      style.opacity !== '0' &&
      rect.width > 0 &&
      rect.height > 0
    );
  }

  function ensureStyle() {
    if (document.getElementById(STYLE_ID)) {
      return;
    }

    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      [${TEXTAREA_WRAPPER_ATTRIBUTE}="true"] {
        box-sizing: border-box !important;
        display: flex !important;
        flex: 0 0 ${TEXTAREA_HEIGHT} !important;
        flex-direction: column !important;
        height: ${TEXTAREA_HEIGHT} !important;
        min-height: ${TEXTAREA_HEIGHT} !important;
        min-width: 0 !important;
        max-width: 100% !important;
        flex-shrink: 0 !important;
        width: 100% !important;
      }

      [${TEXTAREA_EXPANDED_ATTRIBUTE}="true"] {
        box-sizing: border-box !important;
        display: block !important;
        flex: 0 0 ${TEXTAREA_HEIGHT} !important;
        flex-shrink: 0 !important;
        height: ${TEXTAREA_HEIGHT} !important;
        max-height: none !important;
        max-width: 100% !important;
        min-height: ${TEXTAREA_HEIGHT} !important;
        min-width: 0 !important;
        overflow-y: auto !important;
        resize: vertical !important;
        width: 100% !important;
      }

      [${TRANSLATION_LAYOUT_ATTRIBUTE}="true"] {
        box-sizing: border-box !important;
        flex-wrap: wrap !important;
        max-width: 100% !important;
        min-width: 0 !important;
        overflow: visible !important;
        width: 100% !important;
      }

      @media (min-width: ${WIDE_LAYOUT_BREAKPOINT}px) {
        [${TEXTAREA_WRAPPER_ATTRIBUTE}="true"] {
          max-width: none !important;
          min-width: ${TEXTAREA_WIDTH} !important;
          width: ${TEXTAREA_WIDTH} !important;
        }

        [${TEXTAREA_EXPANDED_ATTRIBUTE}="true"] {
          max-width: none !important;
          min-width: ${TEXTAREA_WIDTH} !important;
          width: ${TEXTAREA_WIDTH} !important;
        }

        [${TRANSLATION_LAYOUT_ATTRIBUTE}="true"] {
          flex-wrap: nowrap !important;
          max-width: none !important;
          min-width: ${TRANSLATION_LAYOUT_WIDTH} !important;
          width: ${TRANSLATION_LAYOUT_WIDTH} !important;
        }
      }

      header[${HEADER_SPACING_ATTRIBUTE}="true"] {
        block-size: auto !important;
        column-gap: 0 !important;
        gap: 0 !important;
        margin: 0 !important;
        min-height: 0 !important;
        padding: 0 !important;
        row-gap: 0 !important;
      }
    `;

    (document.head || document.documentElement).appendChild(style);
  }

  function removeIntroSection() {
    document.querySelectorAll(INTRO_SELECTOR).forEach((section) => {
      const text = normalizeText(section.textContent);

      if (!text.includes('使用 ChatGPT 翻譯')) {
        return;
      }

      const header = section.parentElement;
      section.remove();

      if (!header || header.tagName !== 'HEADER') {
        return;
      }

      if (header.children.length === 0) {
        header.remove();
      } else {
        header.setAttribute(HEADER_SPACING_ATTRIBUTE, 'true');
      }
    });
  }

  function expandTranslationTextareas() {
    const textareas = Array.from(
      document.querySelectorAll(TRANSLATION_TEXTAREA_SELECTOR),
    );
    const useWideLayout = isWideLayout();
    const textareaWidth = useWideLayout ? TEXTAREA_WIDTH : '100%';
    const maxWidth = useWideLayout ? 'none' : '100%';
    const minWidth = useWideLayout ? TEXTAREA_WIDTH : '0';

    textareas.forEach((textarea) => {
      textarea.setAttribute(TEXTAREA_EXPANDED_ATTRIBUTE, 'true');
      setImportantStyle(textarea, 'max-width', maxWidth);
      setImportantStyle(textarea, 'min-width', minWidth);
      setImportantStyle(textarea, 'width', textareaWidth);
      setImportantStyle(textarea, 'height', TEXTAREA_HEIGHT);
      setImportantStyle(textarea, 'min-height', TEXTAREA_HEIGHT);

      if (textarea.parentElement) {
        textarea.parentElement.setAttribute(
          TEXTAREA_WRAPPER_ATTRIBUTE,
          'true',
        );
        setImportantStyle(textarea.parentElement, 'max-width', maxWidth);
        setImportantStyle(textarea.parentElement, 'min-width', minWidth);
        setImportantStyle(textarea.parentElement, 'width', textareaWidth);
      }
    });

    if (textareas.length < 2) {
      return;
    }

    const commonAncestor = findCommonAncestor(textareas.slice(0, 2));

    if (commonAncestor) {
      commonAncestor.setAttribute(TRANSLATION_LAYOUT_ATTRIBUTE, 'true');
      setImportantStyle(
        commonAncestor,
        'max-width',
        maxWidth,
      );
      setImportantStyle(
        commonAncestor,
        'min-width',
        useWideLayout ? TRANSLATION_LAYOUT_WIDTH : '0',
      );
      setImportantStyle(
        commonAncestor,
        'width',
        useWideLayout ? TRANSLATION_LAYOUT_WIDTH : '100%',
      );
    }
  }

  function isWideLayout() {
    return window.innerWidth >= WIDE_LAYOUT_BREAKPOINT;
  }

  function setImportantStyle(element, property, value) {
    element.style.setProperty(property, value, 'important');
  }

  function findCommonAncestor(elements) {
    if (elements.length === 0) {
      return null;
    }

    const ancestors = new Set();

    for (let node = elements[0]; node; node = node.parentElement) {
      ancestors.add(node);
    }

    for (let node = elements[1]; node; node = node.parentElement) {
      if (ancestors.has(node)) {
        return node;
      }
    }

    return null;
  }

  function getLanguageFromButton(button) {
    const ariaLabel = button.getAttribute('aria-label') || '';
    const separatorIndex = Math.max(
      ariaLabel.indexOf('：'),
      ariaLabel.indexOf(':'),
    );

    if (separatorIndex >= 0) {
      return normalizeText(ariaLabel.slice(separatorIndex + 1));
    }

    return normalizeText(button.textContent);
  }

  function findLanguageButton(selector) {
    return Array.from(document.querySelectorAll(selector)).find(isVisible);
  }

  function getOptionLabels(element) {
    return [
      element.getAttribute('aria-label'),
      element.getAttribute('data-value'),
      element.textContent,
    ]
      .map(normalizeText)
      .filter(Boolean);
  }

  function findLanguageOption(labels) {
    const wantedLabels = labels.map(normalizeText);
    const candidates = document.querySelectorAll(
      [
        '[role="option"]',
        '[role="menuitem"]',
        '[role="menuitemradio"]',
        '[data-radix-collection-item]',
        'button',
      ].join(','),
    );

    return Array.from(candidates).find((element) => {
      if (!isVisible(element)) {
        return false;
      }

      const labelsOnElement = getOptionLabels(element);

      return wantedLabels.some((wanted) =>
        labelsOnElement.some(
          (label) =>
            label === wanted ||
            label.startsWith(`${wanted} `) ||
            label.startsWith(`${wanted}（`) ||
            label.startsWith(`${wanted}(`),
        ),
      );
    });
  }

  function waitFor(getValue, timeout = 2500) {
    return new Promise((resolve) => {
      const start = Date.now();

      function check() {
        const value = getValue();

        if (value) {
          resolve(value);
          return;
        }

        if (Date.now() - start >= timeout) {
          resolve(null);
          return;
        }

        window.setTimeout(check, 50);
      }

      check();
    });
  }

  async function selectLanguage(buttonSelector, labels) {
    let button = findLanguageButton(buttonSelector);

    if (!button) {
      return false;
    }

    if (labels.includes(getLanguageFromButton(button))) {
      return true;
    }

    button.click();

    const option = await waitFor(() => findLanguageOption(labels));

    if (!option) {
      return false;
    }

    option.click();

    // React 重新繪製按鈕後，再確認目標語言確實已套用。
    button = await waitFor(() => {
      const currentButton = findLanguageButton(buttonSelector);
      return currentButton && labels.includes(getLanguageFromButton(currentButton))
        ? currentButton
        : null;
    });

    return Boolean(button);
  }

  async function applyDefaultLanguages() {
    if (defaultsApplied || languageUpdateInProgress) {
      return;
    }

    const sourceButton = findLanguageButton(SOURCE_BUTTON_SELECTOR);
    const targetButton = findLanguageButton(TARGET_BUTTON_SELECTOR);

    if (!sourceButton || !targetButton) {
      return;
    }

    languageUpdateInProgress = true;

    try {
      const sourceUpdated = await selectLanguage(SOURCE_BUTTON_SELECTOR, [
        '英文',
      ]);
      const targetUpdated = await selectLanguage(TARGET_BUTTON_SELECTOR, [
        '中文',
        '繁體中文',
        '正體中文',
      ]);

      defaultsApplied = sourceUpdated && targetUpdated;
    } finally {
      languageUpdateInProgress = false;

      if (!defaultsApplied) {
        window.setTimeout(scheduleApply, 500);
      }
    }
  }

  function applyCustomizations() {
    ensureStyle();
    removeIntroSection();
    expandTranslationTextareas();
    void applyDefaultLanguages();
  }

  function scheduleApply() {
    if (applyScheduled) {
      return;
    }

    applyScheduled = true;
    window.queueMicrotask(() => {
      applyScheduled = false;
      applyCustomizations();
    });
  }

  applyCustomizations();

  const observer = new MutationObserver(scheduleApply);
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['aria-label', 'data-state', 'role'],
  });

  window.addEventListener('resize', scheduleApply, { passive: true });
})();
