import { useState } from "react";

// Generic draft/applied filter pattern: the modal edits a "draft" filter,
// and only commits it to "applied" (which actually affects the visible list)
// when the user taps Apply. Generic over T so admin can pass its wider
// FilterType (with "employee") while employee uses its narrower one.
export function useTaskFilters<T extends string>(defaultType: T) {
  const [modalVisible, setModalVisible] = useState(false);

  const [draftType, setDraftType] = useState<T>(defaultType);
  const [draftValue, setDraftValue] = useState<string | null>(null);

  const [appliedType, setAppliedType] = useState<T>(defaultType);
  const [appliedValue, setAppliedValue] = useState<string | null>(null);

  const openModal = () => {
    setDraftType(appliedType);
    setDraftValue(appliedValue);
    setModalVisible(true);
  };

  const selectDraft = (type: T, value: string | null) => {
    setDraftType(type);
    setDraftValue(value);
  };

  const applyFilter = () => {
    setAppliedType(draftType);
    setAppliedValue(draftValue);
    setModalVisible(false);
  };

  const isSelected = (type: T, value: string | null) =>
    draftType === type && draftValue === value;

  return {
    modalVisible,
    setModalVisible,
    draftType,
    draftValue,
    appliedType,
    appliedValue,
    openModal,
    selectDraft,
    applyFilter,
    isSelected,
  };
}