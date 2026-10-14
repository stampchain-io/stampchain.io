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
* - ModalStack.tsx (islands/layout/): Manages modal stacking and transformations
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
* The system supports stacking of multiple modals:
*
*
* 2. Stacking Approach:
*    - Modals stack on top of each other
*    - Managed through ModalStack.tsx
*    - Useful for temporary overlays or confirmations
*    - Each modal in the stack can have its own animation
*      - looks cleanest with the same animation on background and foreground stacked modal
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
* 4. Transform between modals:
*    ```tsx
*    // Example: Opening wallet connect from buy modal
*    const handleBuyClick = async () => {
*      if (!wallet?.address) {
*        const { modalContent } = stackConnectWalletModal(() => {
*          // Transform back to buy modal after connection
*          openModal(<BuyStampModal {...props} />, "slideUpDown");
*        });
*        openModal(modalContent, "slideUpDown");
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
* - ModalStack.tsx (islands/layout/): Manages modal transformations and stacking
*
* Active Modals
* ------------
* 1. BuyStampModal.tsx
*    - Base: ModalBase
*    - Purpose: Handles stamp purchase transactions
*
* 2. ConnectWalletModal.tsx
*    - Base: ModalBase
*    - Purpose: Manages wallet connections
*    - Note: Rendered with a list of WalletProvider connectors (one per supported wallet)
*
* 3. DetailSRC101Modal.tsx
*    - Base: ModalBase
*    - Purpose: Displays SRC101 token details
*
* 4. DonateStampModal.tsx
*    - Base: ModalBase
*    - Purpose: Handles stamp donation transactions
*
* 5. EditCreatorNameModal.tsx
*    - Base: ModalBase
*    - Purpose: Allows a stamp creator to edit/update their display name
*
* 6. FilterSRC20Modal.tsx
*    - Base: ModalBase
*    - Purpose: Provides filtering options for SRC20 tokens
*
* 7. PreviewCodeModal.tsx
*    - Base: ModalBase
*    - Purpose: Displays code previews
*
* 8. PreviewImageModal.tsx
*    - Base: ModalBase
*    - Purpose: Shows image previews
*
* 9. RecieveAddyModal.tsx
*    - Base: ModalBase
*    - Purpose: Displays receiving address with QR code
*
* 10. SearchSRC20Modal.tsx
*    - Base: ModalSearchBase
*    - Purpose: Search functionality for SRC20 tokens
*
* 11. SearchStampModal.tsx
*    - Base: ModalSearchBase
*    - Purpose: Search functionality for stamps
*
* 12. SendBTCModal.tsx
*    - Base: ModalBase
*    - Purpose: Handles BTC sending transactions
*
* 13. InfoModal.tsx
*    - Base: ModalBase
*    - Purpose: Info / how-to guides (`<InfoModal title="HOW-TO" subtitle="...">`)
*    - Note: subtitle is optional; sizing constants live in the file; the content scrolls
*      with scrollbar-background-layer1 and adds horizontal spacing only while overflowing
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
