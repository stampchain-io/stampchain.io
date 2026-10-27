import ModalOverlay from "$islands/layout/ModalOverlay.tsx";
import {
  closeModal,
  closeStackedModal,
  globalModal,
  stackedModal,
} from "$islands/modal/states.ts";
import { Fragment } from "preact";

export default function ModalProvider() {
  return (
    <Fragment>
      {globalModal.value.isOpen && globalModal.value.content && (
        <ModalOverlay
          handleClose={closeModal}
          animation={globalModal.value.animation}
          layer="base"
        >
          {globalModal.value.content}
        </ModalOverlay>
      )}
      {stackedModal.value.isOpen && stackedModal.value.content && (
        <ModalOverlay
          handleClose={closeStackedModal}
          animation={stackedModal.value.animation}
          layer="stacked"
        >
          {stackedModal.value.content}
        </ModalOverlay>
      )}
    </Fragment>
  );
}
