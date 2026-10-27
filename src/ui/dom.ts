export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

export function button(className: string, label: string, text: string): HTMLButtonElement {
  const b = el('button', className, text);
  b.type = 'button';
  b.setAttribute('aria-label', label);
  return b;
}

export function numberInput(
  className: string,
  label: string,
  min: number,
  max: number,
): HTMLInputElement {
  const input = el('input', className);
  input.type = 'number';
  input.min = String(min);
  input.max = String(max);
  input.step = '1';
  input.inputMode = 'numeric';
  input.setAttribute('aria-label', label);
  return input;
}
