export type TabName = 'metronome' | 'drums';

function isTabName(value: string | undefined): value is TabName {
  return value === 'metronome' || value === 'drums';
}

export function initTabs(onSwitch: (tab: TabName) => void): void {
  const buttons = document.querySelectorAll<HTMLButtonElement>('[data-tab]');

  let current: TabName | null = null;

  function select(tab: TabName): void {
    if (tab === current) return;
    current = tab;
    for (const button of buttons) {
      const name = button.dataset['tab'];
      if (!isTabName(name)) continue;
      button.setAttribute('aria-selected', String(name === tab));
      const panel = document.getElementById(`${name}-panel`);
      if (panel) panel.hidden = name !== tab;
    }
    onSwitch(tab);
  }

  for (const button of buttons) {
    button.addEventListener('click', () => {
      const name = button.dataset['tab'];
      if (isTabName(name)) select(name);
    });
  }
  select('metronome');
}
