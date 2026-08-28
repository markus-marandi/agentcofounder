import { Menu, MenuButton, MenuItem, MenuItems } from "@headlessui/react";
import { EllipsisVerticalIcon } from "@heroicons/react/20/solid";

/**
 * Vendored from Tailwind Plus elements/dropdowns, "Simple", trigger swapped
 * for an icon-only "more actions" button — the common row-menu shape.
 */
export function Dropdown({ label, options }: { label: string; options: Array<{ label: string; onClick: () => void }> }) {
  return (
    <Menu as="div" className="relative">
      <MenuButton className="-m-2 flex items-center rounded-full p-2 text-ink-soft hover:text-ink">
        <span className="sr-only">{label}</span>
        <EllipsisVerticalIcon aria-hidden="true" className="size-5" />
      </MenuButton>
      <MenuItems
        transition
        className="absolute right-0 z-10 mt-2 w-48 origin-top-right rounded-md bg-surface py-1 shadow-lg outline outline-line transition data-closed:scale-95 data-closed:transform data-closed:opacity-0 data-enter:duration-100 data-enter:ease-out data-leave:duration-75 data-leave:ease-in"
      >
        {options.map((option) => (
          <MenuItem key={option.label}>
            <button
              type="button"
              onClick={option.onClick}
              className="block w-full px-4 py-2 text-left text-sm text-ink data-focus:bg-surface-sunk data-focus:outline-hidden"
            >
              {option.label}
            </button>
          </MenuItem>
        ))}
      </MenuItems>
    </Menu>
  );
}
