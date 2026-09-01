import { Menu, MenuButton, MenuItem, MenuItems } from "@headlessui/react";
import { EllipsisVerticalIcon } from "@heroicons/react/20/solid";

/**
 * Row menu: an icon-only trigger that opens the actions applying to one
 * record. Headless UI provides focus management, dismissal, and keyboard
 * support; the panel look is this app's own.
 */
export function Dropdown({ label, options }: { label: string; options: Array<{ label: string; onClick: () => void }> }) {
  return (
    <Menu as="div" className="relative inline-block text-left">
      <MenuButton className="flex size-8 items-center justify-center rounded-full text-ink-soft hover:bg-surface-sunk hover:text-ink">
        <span className="sr-only">{label}</span>
        <EllipsisVerticalIcon aria-hidden="true" className="size-5" />
      </MenuButton>
      <MenuItems className="absolute right-0 z-10 mt-1.5 w-44 rounded-md border border-line bg-surface py-1 text-sm shadow-md focus:outline-none">
        {options.map((option) => (
          <MenuItem key={option.label}>
            <button
              type="button"
              onClick={option.onClick}
              className="block w-full px-3 py-1.5 text-left text-ink data-focus:bg-surface-sunk"
            >
              {option.label}
            </button>
          </MenuItem>
        ))}
      </MenuItems>
    </Menu>
  );
}
