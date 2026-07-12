# EasyCopy Float: Floating Clipboard & Message Template Chrome Extension

A minimal, black-and-white styled **floating clipboard assistant** and **copy-paste helper** Chrome Extension. It displays a draggable, transparent panel on any website to manage, fill out, and copy text templates or formatted messages instantly.

---

## 🔍 Why EasyCopy Float? (Search Keywords & Use Cases)

If you are looking for:
- A **floating clipboard manager** that stays visible on top of your webpage.
- A **fill-in-the-blank text template tool** to quickly compose formatted messages.
- A way to insert custom parameters (like client names, product IDs) into standard template cards.
- An alternative to copy-pasting repetitive texts across different tabs.

**EasyCopy Float** is designed specifically for online sellers (e.g., Meesho, Amazon, Shopify suppliers), customer support agents, and outreach managers who need a fast, headless widget to paste templated text with fillable blanks.

---

## 🎨 Features

- **Inline Variable Replacements (`[fill1]`, `[fill2]`)**: Write sentences with bracket placeholder tags. The extension extracts these parameters and displays them as clean horizontal text inputs at the top of each item card. Fill in the value once, and it propagates across all items on the page in real-time.
- **Two-Line Text Clamping**: Keeps your interface neat by clamping long paragraphs to exactly two lines. Easily expand them with the **`more`** link and minimize them back with **`less`**.
- **Tabbed Popup Menu**: Separate layout for **List** management and **Settings** adjustments:
  - **Float Opacity & Width**: Adjust transparency and size of the floating container in real-time.
  - **Website Whitelist**: Restrict the extension to run only on specific sites (e.g. `supplier.website.com/*`).
  - **Backup & Restore**: Easily **Export** and **Import** your templates list as `.json` files.
- **Card-Wide Draggable Action**: Drag the panel by clicking anywhere on the background of any list item card or variable input header.
- **Zero Page UI Clutter**: Floating cards are clean and display only the template text and a circular Copy (`⧉`) button. Edits, deletions, and clear controls are all kept in the extension popup menu.

---

## 🛠️ Installation

1. Clone or download this repository:
   ```bash
   git clone https://github.com/kumarsunil0/EasyCopy-Float-Chrome-Extension.git
   ```
2. Open Google Chrome and go to **`chrome://extensions/`**.
3. Enable **Developer mode** (toggle in the top-right corner).
4. Click **Load unpacked** (top-left button) and select the `easy copy float` folder.

---

## 📜 License

MIT License. Feel free to modify and share!
