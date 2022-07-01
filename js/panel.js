// TODO: config
// const config = JSON.parse("");

const tabsElem = document.getElementById('tabs');
const pinnedTabsElem = document.getElementById('tabs--pinned');

/** List all tabs to #tabs and #tabs--pinned HTML elements asynchronously */
let listAsync = new Promise(function (resolve) {
  // Get tabs in current window
  browser.tabs.query({ currentWindow: true }).then((tabs) => {
    let currentTabs = document.createDocumentFragment();
    let currentPinnedTabs = document.createDocumentFragment();

    tabsElem.innerText = '';
    pinnedTabsElem.innerText = '';

    for (let tab of tabs) {
      let tabLink = render(tab);
      if (tab.pinned) { currentPinnedTabs.appendChild(tabLink); }
      else { currentTabs.appendChild(tabLink); }
    }

    pinnedTabsElem.appendChild(currentPinnedTabs);
    tabsElem.appendChild(currentTabs);
    resolve('result');
  });
});

let tabs;
browser.windows.getCurrent().then((window) => {
  this.currentWindowId = window.id;
  tabs = new Tabs(this.currentWindowId);
});

// document.addEventListener("DOMContentLoaded", listAsync);

/**
 * Renders a tab with its info into HTML tab element.
 * @param {object} tab - tab to render
 * @returns undefined if tab is hidden, else HTMLAnchorElement
 */
function render(tab) {
  if (tab.hidden) return;
  let tabLink = document.createElement('a');
  let favIconUrl = tab.favIconUrl;
  switch (favIconUrl) {
    case "":
    case undefined:
    case null:
    case []:
    case {}:
      favIconUrl = "chrome://global/skin/icons/defaultFavicon.svg";
      break;
    case "chrome://mozapps/skin/extensions/extension.svg":
      favIconUrl = window.location.origin + "/icons/firefox/proton/extension.svg";
      break;
    default:
      break;
  }
  tabLink.innerHTML =
    '<img class="tab__icon" src="' + favIconUrl + '">' +
    '<span class="tab__title">' + tab.title + '</span>';
  if (tab.active) { tabLink.classList.add('active'); }
  if (tab.audible) { tabLink.classList.add('audible'); }
  if (tab.mutedInfo.muted) { tabLink.classList.add('muted'); }
  if (tab.sharingState.camera) { tabLink.innerHTML += '<div class="tab__camera-sharing" aria-label="Currently using camera"></div>' }
  if (tab.sharingState.microphone) { tabLink.innerHTML += '<div class="tab__microphone-sharing" aria-label="Currently using microphone"></div>' }
  if (tab.sharingState.screen) { tabLink.innerHTML += '<div class="tab__screen-sharing" aria-label="Currently sharing your screen"></div>' }
  if (tab.isInReaderMode) { tabLink.innerHTML += '<div class="tab__reader-mode" aria-label="Opened in Reader mode"></div>' }
  if (tab.discarded) { tabLink.classList.add('discarded') }
  if (tab.attention) { tabLink.classList.add('attention') }
  tabLink.setAttribute('data-id', tab.id);
  tabLink.setAttribute('data-index', tab.index);
  tabLink.setAttribute('data-window-id', tab.windowId);
  tabLink.setAttribute('aria-label', `Tab ${tab.index}${(tab.pinned) ? ", pinned" : ""}:`);
  tabLink.classList.add('tab__elem');

  tabLink.innerHTML += '<span class="tab__close" data-id="' + tab.id + '" aria-label="Close tab" role="button">⨉</span>';
  return tabLink;
}

// On left mouse click:
document.addEventListener("click", (e) => {
  let target = e.target;

  // If we click on .tab__icon or .tab__title, then make .tab-item parent the target. Otherwise, you can't switch to another tab. 
  if (target.classList.contains('tab__icon') || target.classList.contains('tab__title')) {
    target = target.parentNode; // should be .tab-item
  }

  e.preventDefault();

  if (target.classList.contains('tab__close')) {
    browser.tabs.remove(+target.getAttribute('data-id'));
  }

  if (target.id === "tabs-create") {
    browser.tabs.create({});
  }
});

// On middle mouse click:
document.addEventListener('mousedown', (e) => {
  let target = e.target;

  // If we click on .tab__icon or .tab__title, then make .tab-item parent the target. Otherwise, you can't switch to another tab. 
  if (target.classList.contains('tab__icon') || target.classList.contains('tab__title')) {
    target = target.parentNode; // should be .tab-item
  }

  if (e.button === 1) {
    e.preventDefault();
    browser.tabs.remove(+target.getAttribute('data-id'));
    return false;
  }

  console.log(target);
  if (target.classList.contains('tab__elem')) {
    let tabId = +target.getAttribute('data-id');
    document.querySelector(`.tab__elem[data-id="${tabId}"]`).classList.add('active');
    browser.tabs.query({
      currentWindow: true
    }).then((tabs) => {
      for (let tab of tabs) {
        if (tab.id === tabId) {
          browser.tabs.update(tabId, { active: true });
        }
      }
    });
  }
});

// Prevent context menu showing
document.addEventListener("contextmenu", e => e.preventDefault())

// Prevent zooming
document.addEventListener('wheel', (e) => {
  if (e.ctrlKey) {
    e.preventDefault();
  }
}, { passive: false });

/**
 * Scrolls document to given HTML element.
 * @param {HTMLElement} el - element to scroll to
 */
function scrollToEl(el) {
  window.scrollTo({ left: 0, top: el.getBoundingClientRect().top, behavior: "smooth" });
}

/**
 * Checks if element is in view.
 * @param {HTMLElement} el - element to check
 * @returns true if element is in viewport, else returns false
 */
function isElementInViewport(el) {
  let rect = el.getBoundingClientRect();

  console.log('el is in viewport: ' +
    rect.top >= 0 &&
    rect.left >= 0 &&
    rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
    rect.right <= (window.innerWidth || document.documentElement.clientWidth));

  return (
    rect.top >= 0 &&
    rect.left >= 0 &&
    rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
    rect.right <= (window.innerWidth || document.documentElement.clientWidth)
  );
}

browser.tabs.onRemoved.addListener((tabId) => {
  console.log(`removing tab: ${tabId}`);
  let tabElem = document.querySelector(`.tab__elem[data-id="${tabId}"]`);
  if (tabElem) {
    tabElem.remove();
    console.log(`removed a tab: ${tabId}`);
    resetIndexes();
  }
});

browser.tabs.onCreated.addListener((tab) => {
  place(tab);
  resetIndexes();
});

browser.tabs.onUpdated.addListener((tabId) => {
  console.log(`updating tab: ${tabId}`);
  browser.tabs.get(tabId).then((tab) => {
    let tabElem = document.querySelector(`.tab__elem[data-id="${tabId}"]`);
    tabElem.replaceWith(render(tab));
    if (tabElem.getAttribute('data-index') == tab.index) return;

  });
});

browser.tabs.onActivated.addListener((tab) => {
  // callIfTabIsOnCurrentWindow(tab, () => {
  let tabElem = document.querySelector(`.tab__elem[data-id="${tab.tabId}"]`);
  let prevTabElem = document.querySelector(`.tab__elem[data-id="${tab.previousTabId}"]`);
  if (tabElem)
    tabElem.classList.add('active');
  if (prevTabElem)
    prevTabElem.classList.remove('active');
  // });
});

/**
 * Places a tab in a tab list.
 * @param {object} tab - tab to place in tab list
 */
function place(tab) {
  callIfTabIsOnCurrentWindow(tab, () => {
    console.log((new Date()) + ': Trying to place a tab, tab info:');
    console.log(tab);
    if (tab.index === 0) {
      document.querySelector(`.tab__elem[data-index="${tab.index + 1}"]`).before(render(tab));
      return;
    }
    document.querySelector(`.tab__elem[data-index="${tab.index - 1}"]`).after(render(tab));
  });
}

/**
 * Call a function only if tab belongs to current window.
 * @param {object} tab - tab to check
 * @param {Function} callback - function to call
 */
function callIfTabIsOnCurrentWindow(tab, callback) {
  if (tab.windowId === this.currentWindowId)
    callback(tab);
  // TODO: REMOVE, FOR DEBUGGING PURPOSES
  else console.log(`${(new Date())}: Tried to place tab of window ID: ${tab.windowId} in a window of ID: ${this.currentWindowId}. Aborted.`);
}

/** Blindly reset indexes and a11y labels */
function resetIndexes() {
  let pinnedTabsCount = pinnedTabsElem.childElementCount;
  let tabsCount = tabsElem.childElementCount;
  let allTabsCount = pinnedTabsCount + tabsCount;
  for (let i = 0; i < pinnedTabsCount; i++) {
    currentEl.setAttribute('data-index', i);
    currentEl.setAttribute('aria-label', `Tab ${i}, pinned:`);
  }
  for (let i = pinnedTabsCount, j = 0; i < allTabsCount, j < tabsCount; i++, j++) {
    tabsElem.childNodes[j].setAttribute('data-index', i);
    tabsElem.childNodes[j].setAttribute('aria-label', `Tab ${i}:`);
  }
}
/**
 * Moves tab1 to place of tab2.
 * If trying to swap pinned and unpinned tab, does nothing.
 * @param {object} tab1 - tab to swap
 * @param {object} tab2 - tab it will be swapped with
 */
function move(tab1, tab2) {
  // Make sure to not swap pinned and unpinned tab
  if ((tab1.pinned && !tab2.pinned) || (!tab1.pinned && tab2.pinned)) return;
}

/**
 * Moves tab1 to place of tab2.
 * If trying to swap pinned and unpinned tab, does nothing.
 * @param {object} tab1 - tab to swap
 * @param {object} tab2 - tab it will be swapped with
 */
function swapEl(tabEl1, tabEl2) {
  // Make sure to not swap pinned and unpinned tab
  if ((tab1.pinned && !tab2.pinned) || (!tab1.pinned && tab2.pinned)) return;
}

