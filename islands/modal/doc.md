/**
*
*
* OVERVIEW
* ========
*
* MODAL INFRASTRUCTURE
* ===================
*
* Core Components
* --------------
* - ModalOverlay.tsx (islands/layout/): Handles modal animations and backdrop
* - ModalProvider.tsx (islands/layout/): Root-level provider that manages modal state
* - states.ts (islands/modal/): Centralized state management for modals
* - ModalStack.tsx (islands/layout/): Opens the connect-wallet modal on the stacked layer
*
* Integration
* ----------
* The modal system is integrated at the root level in _app.tsx, ensuring consistent behavior across the application.
* Example implementation from SearchStampModal.tsx (opened via SearchButton.tsx):
*
* ```tsx
* export function openStampSearch() {
*   const handleClose = () => {
*     searchState.value = { term: "", error: "", results: [] };
*     closeModal();
*   };
*   const modalContent = (
*     <ModalSearchBase onClose={handleClose}>
*       {/* search input + results content */}
*     </ModalSearchBase>
*   );
*   openModal(modalContent, "slideDownUp");
* }
* ```
*
* Modal Stacking
* -------------
* One foreground layer (`stackedModal`) renders above the base modal. The base
* modal stays mounted, so its state is kept. A second `stackModal` call replaces
* the foreground content. There is no deeper stack.
*
* - `stackModal(content, animation)` in states.ts. If no base modal is open it
*   falls back to `openModal`, so page-level callers behave as before.
* - `closeStackedModal()` closes only the foreground layer.
* - `openModal` / `closeModal` also close a leftover foreground layer.
* - `useModalLayer()` (inside a modal) returns `{ layer, containerId, close }`
*   bound to the layer the component is rendered in. `ModalBase` uses it, so a
*   stacked modal's close button and Escape do not dismiss the base modal.
* - `getTopModalContainer()` is for code that is not a component (the exported
*   `handleModalClose`). It returns the foreground overlay if mounted.
* - Escape closes only the top-most open layer. Holding Escape does not also
*   close the base modal (key repeat is ignored). A second press closes the base.
* - `ModalSearchBase` and `SearchStampPickerModal.closePicker` are base-only.
*   They always open with `openModal` and look up `#animation-modal-container`.
* - Same animation on both layers looks cleanest.
* - ModalStack.tsx only builds the connect-wallet modal and calls `stackModal`.
*
* Animation Types
* -------------
* The system supports three animation types (defined in modal.css):
* 1. slideUpDown: Slides up from bottom on open and down on close
* 2. slideDownUp: Slides down from top and up on close
* 3. zoomInOut: Zooms in/out from center
*
* Each animation includes:
* - Entry animation
* - Exit animation
* - Background fade transitions
*
* Overlay System
* -------------
* ModalOverlay provides:
* - Backdrop with blur effect
* - Click-outside-to-close functionality
* - Animation handling
* - Focus trap for accessibility
* - Keyboard support (ESC to close)
*
* Usage:
* 1. Import required components:
*    ```tsx
*    import { openModal, closeModal } from "$islands/modal/states.ts";
*    import { stackConnectWalletModal } from "$islands/layout/ModalStack.tsx";
*    ```
*
* 2. Create modal content:
*    ```tsx
*    const modalContent = (
*      <ModalBase onClose={handleClose}>
*        {/* Your modal content */}
*      </ModalBase>
*    );
*    ```
*
* 3. Open modal with animation:
*    ```tsx
*    openModal(modalContent, "slideUpDown");
*    ```
*
* 4. Stack the connect-wallet modal on top (the modal underneath stays open):
*    ```tsx
*    const handleBuyClick = async () => {
*      if (!wallet?.address) {
*        stackConnectWalletModal();
*        return;
*      }
*      // ... rest of buy logic
*    };
*    ```
*
* MODAL COMPONENTS
* ===============
*
* Base Components
* --------------
* - ModalBase.tsx (components/layout/): Primary base component for most modals
* - ModalSearchBase.tsx (components/layout/): Specialized base for search-related modals
* - WalletProvider.tsx (islands/layout/): Base component for wallet connection functionality
* - ModalStack.tsx (islands/layout/): `stackConnectWalletModal()` opens connect-wallet on top
*
* Active Modals
* ------------
* Page modals use ModalBase or ModalSearchBase directly. How-tos use
* ModalInfo. Transaction and detail tools use ModalTool.
*
* 1. ConnectWalletModal.tsx
*    - Base: ModalBase
*    - Purpose: Manages wallet connections
*    - Note: Rendered with a list of WalletProvider connectors (one per supported wallet)
*
* 2. EditCreatorNameModal.tsx
*    - Base: ModalBase
*    - Purpose: Allows a stamp creator to edit/update their display name
*
* 3. PreviewCodeModal.tsx
*    - Base: ModalBase
*    - Purpose: Displays code previews
*
* 4. PreviewImageModal.tsx
*    - Base: ModalBase
*    - Purpose: Shows image previews
*
* 5. SearchSRC20Modal.tsx
*    - Base: ModalSearchBase
*    - Purpose: Search functionality for SRC20 tokens
*    - Note: `openSRC20Search()` from SearchButton, `slideDownUp`
*
* 6. SearchStampModal.tsx
*    - Base: ModalSearchBase
*    - Purpose: Search functionality for stamps
*    - Note: `openStampSearch()` from SearchButton, `slideDownUp`
*
* 7. SearchStampPickerModal.tsx
*    - Base: ModalSearchBase
*    - Purpose: Pick a stamp inside the recursive stamp composer
*    - Note: `openSearchStampPicker({ onPick })` uses `openModal` (`slideDownUp`).
*      `closePicker` always targets the base layer (`#animation-modal-container`).
*
* 8. info/ModalInfo.tsx
*    - Base: ModalBase (`variant="neutral"`)
*    - Purpose: Info / how-to guides (`<ModalInfo title="HOW-TO" subtitle="...">`)
*    - Note: subtitle is optional. Width classes live on ModalBase in this file.
*      Content scrolls with scrollbar-background-layer1 and adds right spacing
*      only while overflowing.
*
* 9. info/StampCreateClassicInfo.tsx
*    - Base: ModalInfo
*    - Purpose: How-to for creating a classic stamp
*
* 10. info/StampCreatePoshInfo.tsx
*    - Base: ModalInfo
*    - Purpose: How-to for creating a posh stamp
*
* 11. info/StampCreateRecursiveInfo.tsx
*    - Base: ModalInfo
*    - Purpose: How-to for creating a recursive stamp
*
* 12. info/StampCreateRecursiveShortcuts.tsx
*    - Base: ModalInfo
*    - Purpose: Keyboard shortcuts for the recursive stamp composer
*
* 13. info/SRC20DeployInfo.tsx
*    - Base: ModalInfo
*    - Purpose: How-to for deploying an SRC-20 token
*
* 14. info/SRC20MintInfo.tsx
*    - Base: ModalInfo
*    - Purpose: How-to for minting an SRC-20 token
*
* 15. info/SRC20TransferInfo.tsx
*    - Base: ModalInfo
*    - Purpose: How-to for transferring an SRC-20 token
*
* 16. info/StampSendInfo.tsx
*    - Base: ModalInfo
*    - Purpose: How-to for sending a stamp
*
* 17. info/SRC101RegisterInfo.tsx
*    - Base: ModalInfo
*    - Purpose: How-to for registering a bitname
*
* Tool shell
* ----------
* `openModalTool()` always opens with `slideUpDown`. The header Tools menu
* (ToolsButton) dynamic-imports five of these: stamp Send, SRC-20 Deploy,
* Mint, Transfer, and bitname Register. Buy, donate, send BTC, receive, and
* bitname detail are opened from their own buttons and are not in that menu.
* A tool with an `info` prop shows a plain InfoButton at the top-left. That
* button calls `stackModal` with `zoomInOut`, so the how-to sits on the
* foreground layer and the tool stays mounted. Tools without `info` render
* no header button.
*
* 18. tool/ModalTool.tsx
*    - Base: ModalBase (`variant="primary"`)
*    - Purpose: Shell (`title`, optional `subtitle`, optional `info`, `children`)
*    - Note: content scrolls like ModalInfo (scrollbar-background-layer1, extra
*      right space only while overflowing, max-h 80vh).
*
* 19. tool/StampSendTool.tsx
*    - Base: ModalTool (`info`: StampSendInfo)
*    - Purpose: Stamp send form
*    - Note: `openStampSendTool()` from the Tools menu (STAMPS → Send).
*      /tool/stamp/send is gone.
*
* 20. tool/SRC20DeployTool.tsx
*    - Base: ModalTool (`info`: SRC20DeployInfo)
*    - Purpose: SRC-20 deploy form
*    - Note: `openSRC20DeployTool()` from the Tools menu (TOKENS → Deploy).
*      /tool/src20/deploy is gone.
*
* 21. tool/SRC20MintTool.tsx
*    - Base: ModalTool (`info`: SRC20MintInfo)
*    - Purpose: SRC-20 mint form
*    - Note: `openSRC20MintTool(tick?)` from the Tools menu (TOKENS → Mint)
*      and from Mint buttons on SRC-20 tables and the token detail header.
*      /tool/src20/mint is gone.
*
* 22. tool/SRC20TransferTool.tsx
*    - Base: ModalTool (`info`: SRC20TransferInfo)
*    - Purpose: SRC-20 transfer form
*    - Note: `openSRC20TransferTool()` from the Tools menu (TOKENS → Transfer).
*      /tool/src20/transfer is gone.
*
* 23. tool/SRC101RegisterTool.tsx
*    - Base: ModalTool (`info`: SRC101RegisterInfo)
*    - Purpose: Bitname register form
*    - Note: `openSRC101RegisterTool()` from the Tools menu (BITNAME → Register).
*      If the name is already taken, it calls `openSRC101DetailTool()`, which
*      uses `openModal` and replaces this tool. /tool/src101/mint is gone.
*
* 24. tool/SRC101DetailTool.tsx
*    - Base: ModalTool (no `info`)
*    - Purpose: Bitname image, name, and owner
*    - Note: `openSRC101DetailTool({ img, name, root, owner })` from the
*      register modal when a name is taken.
*      Not in the Tools menu.
*
* 25. tool/StampBuyTool.tsx
*    - Base: ModalTool (no `info`)
*    - Purpose: Stamp purchase form for one stamp and dispenser
*    - Note: `openStampBuyTool(props)` from stamp cards, marketplace listing
*      rows, the stamp detail BUY action, and wallet dispenser stats.
*      Not in the Tools menu.
*
* 26. tool/BTCDonateTool.tsx
*    - Base: ModalTool (no `info`)
*    - Purpose: Donate to the dev fund by buying the donate stamp
*    - Note: `openBTCDonateTool(props)` from DonateCta. Not in the Tools menu.
*
* 27. tool/BTCSendTool.tsx
*    - Base: ModalTool (no `info`)
*    - Purpose: Send bitcoin from the connected wallet
*    - Note: `openBTCSendTool(props)` from the wallet dashboard SEND button.
*      Not in the Tools menu.
*
* 28. tool/BTCAddressTool.tsx
*    - Base: ModalTool (no `info`)
*    - Purpose: Receiving address and QR code
*    - Note: `openBTCAddressTool({ address? })` from the wallet dashboard
*      RECEIVE button and from DonateCta. When `address` is omitted it shows
*      the connected wallet. Not in the Tools menu.
*
* State Management
* ---------------
* - states.ts provides centralized modal state management and operations
*
*
* IMPORTS
* =======
* The modals need to be imported directly and cannot use barrel imports, since this creates a weird bug
*  - the database content gets stuck in perpetual loading and buttons become inactive and do not work
*
*
*/
