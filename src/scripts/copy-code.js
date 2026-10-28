// 复制状态只属于对应按钮，所有兼容控件均保证清理。
document.querySelectorAll('.copy-code').forEach(button => {
  const frame = button.closest('.code-frame');
  const code = frame?.querySelector('code');
  if (!code) return;
  const status = frame.querySelector('[role="status"]');
  const originalText = button.textContent;
  const originalLabel = button.getAttribute('aria-label');
  let timer = 0;
  let pending = false;
  button.addEventListener('click', async () => {
    if (pending) return;
    pending = true;
    clearTimeout(timer);
    let field;
    let previousFocus;
    let savedRanges = [];
    try {
      let copied = false;
      if (navigator.clipboard?.writeText) {
        try { await navigator.clipboard.writeText(code.textContent ?? ''); copied = true; } catch {}
      }
      if (!copied) {
        previousFocus = document.activeElement;
        const selection = getSelection();
        if (selection) savedRanges = Array.from({ length: selection.rangeCount }, (_, i) => selection.getRangeAt(i).cloneRange());
        field = document.createElement('textarea');
        field.value = code.textContent ?? '';
        field.tabIndex = -1;
        field.style.cssText = 'position:fixed;opacity:0;left:0;top:0';
        document.body.append(field);
        field.select();
        if (!document.execCommand('copy')) throw new Error('Copy unavailable');
      }
      button.textContent = 'Copied';
      button.setAttribute('aria-label', 'Code copied');
      if (status) status.textContent = 'Code copied.';
    } catch {
      button.textContent = 'Copy failed';
      button.setAttribute('aria-label', 'Copy failed. Select the code to copy it manually.');
      if (status) status.textContent = 'Copy failed. Select the code to copy it manually.';
    } finally {
      if (field) {
        const restore = document.activeElement === field;
        field.remove();
        if (restore) {
          previousFocus?.focus?.({ preventScroll: true });
          const selection = getSelection();
          selection?.removeAllRanges();
          savedRanges.forEach(range => selection?.addRange(range));
        }
      }
      pending = false;
      timer = setTimeout(() => {
        button.textContent = originalText;
        if (originalLabel !== null) button.setAttribute('aria-label', originalLabel);
        else button.removeAttribute('aria-label');
        if (status) status.textContent = '';
      }, 2000);
    }
  });
  button.hidden = false;
});