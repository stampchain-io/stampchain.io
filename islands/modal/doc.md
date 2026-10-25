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
* 1. ConnectWalletModal.tsx
*    - Base: ModalBase
*    - Purpose: Manages wallet connections
*    - Note: Rendered with a list of WalletProvider connectors (one per supported wallet)
*
* 2. DetailSRC101Modal.tsx
*    - Base: ModalBase
*    - Purpose: Displays SRC101 token details
*
* 3. DonateStampModal.tsx
*    - Base: ModalBase
*    - Purpose: Handles stamp donation transactions
*
* 4. EditCreatorNameModal.tsx
*    - Base: ModalBase
*    - Purpose: Allows a stamp creator to edit/update their display name
*
* 5. FilterSRC20Modal.tsx
*    - Base: ModalBase
*    - Purpose: Provides filtering options for SRC20 tokens
*
* 6. PreviewCodeModal.tsx
*    - Base: ModalBase
*    - Purpose: Displays code previews
*
* 7. PreviewImageModal.tsx
*    - Base: ModalBase
*    - Purpose: Shows image previews
*
* 8. RecieveAddyModal.tsx
*    - Base: ModalBase
*    - Purpose: Displays receiving address with QR code
*
* 9. SearchSRC20Modal.tsx
*    - Base: ModalSearchBase
*    - Purpose: Search functionality for SRC20 tokens
*
* 10. SearchStampModal.tsx
*    - Base: ModalSearchBase
*    - Purpose: Search functionality for stamps
*
* 11. SendBTCModal.tsx
*    - Base: ModalBase
*    - Purpose: Handles BTC sending transactions
*
* 12. info/ModalInfo.tsx
*    - Base: ModalBase
*    - Purpose: Info / how-to guides (`<ModalInfo title="HOW-TO" subtitle="...">`)
*    - Note: subtitle is optional; sizing constants live in the file; the content scrolls
*      with scrollbar-background-layer1 and adds horizontal spacing only while overflowing
*
* 13. info/StampCreateClassicInfo.tsx
*    - Base: ModalInfo
*    - Purpose: How-to for creating a classic stamp
*
* 14. info/StampCreatePoshInfo.tsx
*    - Base: ModalInfo
*    - Purpose: How-to for creating a posh stamp
*
* 15. info/StampCreateRecursiveInfo.tsx
*    - Base: ModalInfo
*    - Purpose: How-to for creating a recursive stamp
*
* 16. info/StampCreateRecursiveShortcuts.tsx
*    - Base: ModalInfo
*    - Purpose: Keyboard shortcuts for the recursive stamp composer
*
* 17. info/SRC20DeployInfo.tsx
*    - Base: ModalInfo
*    - Purpose: How-to for deploying an SRC-20 token
*
* 18. info/SRC20TransferInfo.tsx
*    - Base: ModalInfo
*    - Purpose: How-to for transferring an SRC-20 token
*
* 19. tool/ModalTool.tsx
*    - Base: ModalBase
*    - Purpose: Shell for tool modals (`title`, `subtitle`, optional `info`, `children`)
*    - Note: when `info` is passed, the info button (`headerAction`, plain InfoButton
*      with `stack`) sits at the top-left and opens it on the foreground layer while
*      the tool stays mounted. When `info` is omitted, the button is not rendered.
*
* 20. tool/SRC20DeployTool.tsx
*    - Base: ModalTool
*    - Purpose: SRC-20 deploy form, opened from the header Tools menu
*    - Note: `openSRC20DeployTool()` calls `openModalTool()`. The old page at
*      /tool/src20/deploy is unchanged and is not linked from the Tools menu.
*
* 21. tool/SRC20TransferTool.tsx
*    - Base: ModalTool
*    - Purpose: SRC-20 transfer form, opened from the header Tools menu
*    - Note: `openSRC20TransferTool()` calls `openModalTool()` (`slideUpDown`). The Tools menu
*      loads it with a dynamic import. The old page at /tool/src20/transfer is
*      unchanged and is not linked from the Tools menu.
*
* 22. info/SRC20MintInfo.tsx
*    - Base: ModalInfo
*    - Purpose: How-to for minting an SRC-20 token
*
* 23. tool/SRC20MintTool.tsx
*    - Base: ModalTool
*    - Purpose: SRC-20 mint form, opened from the Tools menu and Mint buttons
*    - Note: `openSRC20MintTool(tick?)` calls `openModalTool()` (`slideUpDown`).
*      The old page at /tool/src20/mint is unchanged and is not linked from
*      the Tools menu.
*
* 24. info/StampSendInfo.tsx
*    - Base: ModalInfo
*    - Purpose: How-to for sending a stamp
*
* 25. tool/StampSendTool.tsx
*    - Base: ModalTool
*    - Purpose: Stamp send form, opened from the header Tools menu
*    - Note: `openStampSendTool()` calls `openModalTool()` (`slideUpDown`).
*      The old page at /tool/stamp/send is unchanged and is not linked from
*      the Tools menu.
*
* 26. info/SRC101RegisterInfo.tsx
*    - Base: ModalInfo
*    - Purpose: How-to for registering a bitname
*
* 27. tool/SRC101RegisterTool.tsx
*    - Base: ModalTool
*    - Purpose: Bitname register form, opened from the header Tools menu
*    - Note: `openSRC101RegisterTool()` calls `openModalTool()` (`slideUpDown`).
*      The old page at /tool/src101/mint is unchanged and is not linked from
*      the Tools menu.
*
* 28. tool/StampBuyTool.tsx
*    - Base: ModalTool
*    - Purpose: Stamp purchase form, opened from listing and stamp detail BUY buttons
*    - Note: `openStampBuyTool()` calls `openModalTool()` (`slideUpDown`). There is
*      no how-to modal yet, so the header info button is omitted. Not linked from
*      the Tools menu; buy always targets a specific stamp and dispenser.
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
