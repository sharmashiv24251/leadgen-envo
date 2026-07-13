export async function copyToClipboard(value: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }
  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  document.body.removeChild(textarea);
}

/** Copies the current text selection if one exists, otherwise the given fallback. */
export function copySelectionOr(fallback: string) {
  const selected = window.getSelection()?.toString();
  return copyToClipboard(selected && selected.length > 0 ? selected : fallback);
}
