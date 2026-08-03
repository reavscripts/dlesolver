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
  let frameRequested = false;

  function setDockedState() {
    frameRequested = false;
    const topbarBottom = topbar.getBoundingClientRect().bottom;
    const cardBottom = solverCard.getBoundingClientRect().bottom;
    const shouldDock = dockableViewport.matches && window.scrollY > 0 && cardBottom <= topbarBottom + 10;

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

  syncFromPrimary();
  syncButtonState();
  setDockedState();
})();
