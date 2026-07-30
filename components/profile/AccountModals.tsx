import { ReactNode } from "react";
import ConfirmModal from "../common/confirmModal";

type Props = {
  logoutVisible: boolean;
  onCancelLogout: () => void;
  onConfirmLogout: () => void;

  deleteVisible: boolean;
  deleting: boolean;
  onCancelDelete: () => void;
  onConfirmDelete: () => void;

  // Employee screen passes its <ConfirmModal> for "Change Admin" here;
  // admin screen omits this prop entirely.
  extraModal?: ReactNode;
};

export default function AccountModals({
  logoutVisible,
  onCancelLogout,
  onConfirmLogout,
  deleteVisible,
  deleting,
  onCancelDelete,
  onConfirmDelete,
  extraModal,
}: Props) {
  return (
    <>
      <ConfirmModal
        visible={logoutVisible}
        title="Logout"
        message="Are you sure you want to log out?"
        confirmText="Logout"
        cancelText="Cancel"
        confirmColor="#E8870A"
        destructive
        onCancel={onCancelLogout}
        onConfirm={onConfirmLogout}
      />
      <ConfirmModal
        visible={deleteVisible}
        title="Delete Account"
        message="This will permanently delete your account and all associated data. This action cannot be undone."
        confirmText={deleting ? "Deleting..." : "Delete"}
        cancelText="Cancel"
        confirmColor="#D64545"
        destructive
        confirmDisabled={deleting}
        onCancel={onCancelDelete}
        onConfirm={onConfirmDelete}
      />
      {extraModal}
    </>
  );
}