(() => {
  const topbar = document.querySelector(".topbar");
  const solverCard = document.querySelector(".solver-card");
  const primaryForm = document.querySelector("#solverForm");
  const primaryInput = document.querySelector("#urlInput");
  const primaryButton = document.querySelector("#submitButton");
  const dockedForm = document.querySelector("#dockedSolverForm");
  const dockedInput = document.querySelector("#dockedUrlInput");
  const dockedButton = document.querySelector("#dockedSubmitButton");

  if (!topbar || !solverCard || !primaryForm || !primaryInput || !primaryButton || !dockedForm || !dockedInput || !dockedButton) {
    return;
  }

  const dockableViewport = window.matchMedia("(min-width: 561px)");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const idleButtonLabel = dockedButton.dataset.idleLabel || dockedButton.textContent;
  const rootStyle = document.documentElement.style;
  let frameRequested = false;
  let lastVisualProgress = -1;

  const clamp = value => Math.min(1, Math.max(0, value));

  function getDocumentTop(element) {
    let top = 0;
    let current = element;

    while (current) {
      top += current.offsetTop;
      current = current.offsetParent;
    }

    return top;
  }

  function setMergeVisuals(progress) {
    if (Math.abs(progress - lastVisualProgress) < .001) return;
    lastVisualProgress = progress;

    const eased = progress * progress * (3 - (2 * progress));
    const wave = Math.sin(Math.PI * progress);
    const formOpacity = clamp((eased - .04) * 1.22);
    const contentOpacity = clamp(1 - (eased * 1.68));

    rootStyle.setProperty("--solver-merge-width", `${(540 * eased).toFixed(2)}px`);
    rootStyle.setProperty("--solver-merge-margin", `${(10 * eased).toFixed(2)}px`);
    rootStyle.setProperty("--solver-form-opacity", formOpacity.toFixed(4));
    rootStyle.setProperty("--solver-form-offset", `${(-6 * (1 - eased)).toFixed(2)}px`);
    rootStyle.setProperty("--solver-card-scale-x", (1 - (.86 * eased)).toFixed(4));
    rootStyle.setProperty("--solver-card-scale-y", (1 - (.08 * eased)).toFixed(4));
    rootStyle.setProperty("--solver-card-offset", `${(-5 * eased).toFixed(2)}px`);
    rootStyle.setProperty("--solver-card-radius", `${(26 + (58 * eased)).toFixed(2)}px`);
    rootStyle.setProperty("--solver-card-opacity", (1 - (.82 * eased)).toFixed(4));
    rootStyle.setProperty("--solver-card-content-opacity", contentOpacity.toFixed(4));
    rootStyle.setProperty("--solver-card-content-offset", `${(-8 * eased).toFixed(2)}px`);
    rootStyle.setProperty("--solver-bridge-width", `${(96 + (310 * wave)).toFixed(2)}px`);
    rootStyle.setProperty("--solver-bridge-height", `${(4 + (22 * wave)).toFixed(2)}px`);
    rootStyle.setProperty("--solver-bridge-radius", `${(18 + (42 * wave)).toFixed(2)}px`);
    rootStyle.setProperty("--solver-bridge-opacity", (.78 * wave).toFixed(4));
    rootStyle.setProperty("--solver-top-scrim-opacity", clamp(progress * 8).toFixed(4));
  }

  function setDockedState() {
    frameRequested = false;
    const topbarBottom = topbar.getBoundingClientRect().bottom;
    const cardHeight = solverCard.offsetHeight;
    const cardTop = getDocumentTop(solverCard) - window.scrollY;
    const mergeStart = topbarBottom + 14;
    const mergeDistance = cardHeight + 4;
    const rawProgress = dockableViewport.matches && window.scrollY > 0
      ? clamp((mergeStart - cardTop) / mergeDistance)
      : 0;
    const shouldDock = rawProgress >= .999;
    const visualProgress = reducedMotion.matches ? (shouldDock ? 1 : 0) : rawProgress;
    const isMerging = !reducedMotion.matches && rawProgress > 0 && !shouldDock;

    setMergeVisuals(visualProgress);
    document.body.classList.toggle("solver-merging", isMerging);
    document.body.classList.toggle("solver-docked", shouldDock);
    dockedForm.setAttribute("aria-hidden", String(!shouldDock));
    dockedForm.inert = !shouldDock;
    dockedInput.tabIndex = shouldDock ? 0 : -1;
    dockedButton.tabIndex = shouldDock ? 0 : -1;

    if (!shouldDock && document.activeElement === dockedInput) {
      primaryInput.focus({ preventScroll: true });
    }
  }

  function requestDockedStateUpdate() {
    if (frameRequested) return;
    frameRequested = true;
    window.requestAnimationFrame(setDockedState);
  }

  function syncFromPrimary() {
    if (dockedInput.value !== primaryInput.value) {
      dockedInput.value = primaryInput.value;
    }
  }

  function syncToPrimary() {
    if (primaryInput.value === dockedInput.value) return;
    primaryInput.value = dockedInput.value;
    primaryInput.dispatchEvent(new Event("input", { bubbles: true }));
  }

  function syncButtonState() {
    dockedButton.disabled = primaryButton.disabled;
    dockedButton.textContent = primaryButton.disabled ? "…" : idleButtonLabel;
  }

  primaryInput.addEventListener("input", syncFromPrimary);
  dockedInput.addEventListener("input", syncToPrimary);

  dockedForm.addEventListener("submit", event => {
    event.preventDefault();
    syncToPrimary();

    if (typeof primaryForm.requestSubmit === "function") {
      primaryForm.requestSubmit();
    } else {
      primaryButton.click();
    }

    solverCard.scrollIntoView({
      behavior: reducedMotion.matches ? "auto" : "smooth",
      block: "start"
    });
  });

  document.querySelectorAll("[data-url]").forEach(link => {
    link.addEventListener("click", () => queueMicrotask(syncFromPrimary));
  });

  new MutationObserver(syncButtonState).observe(primaryButton, {
    attributes: true,
    attributeFilter: ["disabled"],
    childList: true,
    characterData: true,
    subtree: true
  });

  window.addEventListener("scroll", requestDockedStateUpdate, { passive: true });
  window.addEventListener("resize", requestDockedStateUpdate, { passive: true });
  dockableViewport.addEventListener("change", requestDockedStateUpdate);
  reducedMotion.addEventListener("change", requestDockedStateUpdate);

  syncFromPrimary();
  syncButtonState();
  setDockedState();
})();
