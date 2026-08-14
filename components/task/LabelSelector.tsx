import { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, Modal, TextInput, ScrollView, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { typography } from "../../theme/theme";
import { moderateScale, wp } from "../../utils/responsive";
import { authFetch } from "../../utils/authFetch";

// Shown to every admin on first use, before they've created any custom
// labels of their own. Custom labels fetched from the API are prepended
// ahead of these (deduped, case-insensitive) so recently-created labels
// surface first.
const PRESET_LABELS = [
  "Documentation",
  "Sheets Update",
  "Design",
  "Testing",
  "Bug Fix",
  "Meeting",
  "Research",
];

type CustomLabel = { id: string; name: string };

type LabelSelectorProps = {
  colors: any;
  value: string | null;
  onChange: (label: string) => void;
  inputStyle: any;
};

export function LabelSelector({ colors, value, onChange, inputStyle }: LabelSelectorProps) {
  const [modalVisible, setModalVisible] = useState(false);

  // Custom labels are tracked separately from presets (rather than merged
  // into one string[]) because deletion needs the label's id, and ordering
  // needs "custom first" to survive re-renders without re-sorting a flat list.
  const [customLabels, setCustomLabels] = useState<CustomLabel[]>([]);
  const [loadingLabels, setLoadingLabels] = useState(true);
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customText, setCustomText] = useState("");
  const [savingCustom, setSavingCustom] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Load this admin's previously-created custom labels so they show up as
  // normal pickable options. Assumes the API returns them oldest-first;
  // reversed here so the most recently created label ends up on top.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await authFetch("/task-labels");
        if (!res.ok) return;
        const { labels: custom } = await res.json(); // [{ id, name }]
        if (cancelled) return;
        setCustomLabels((prev) => {
          const existingKeys = new Set(prev.map((l) => l.name.toLowerCase()));
          const incoming = (custom as CustomLabel[])
            .slice()
            .reverse()
            .filter((l) => !existingKeys.has(l.name.toLowerCase()));
          return [...incoming, ...prev];
        });
      } catch (err) {
        console.error("Could not load custom labels:", err);
      } finally {
        if (!cancelled) setLoadingLabels(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Presets minus any that a custom label already shadows (case-insensitive),
  // so the same label doesn't show up twice under two different tap targets.
  const presetLabels = PRESET_LABELS.filter(
    (name) => !customLabels.some((c) => c.name.toLowerCase() === name.toLowerCase()),
  );

  const openModal = () => {
    setShowCustomInput(false);
    setCustomText("");
    setModalVisible(true);
  };

  const handlePick = (label: string) => {
    onChange(label);
    setModalVisible(false);
  };

  const handleSaveCustom = async () => {
    const name = customText.trim();
    if (!name) return;

    const alreadyExists =
      customLabels.some((l) => l.name.toLowerCase() === name.toLowerCase()) ||
      presetLabels.some((l) => l.toLowerCase() === name.toLowerCase());

    // Optimistic: select immediately, close the modal, then persist in
    // the background so a slow network doesn't block the admin. Prepended
    // (not appended) so it shows up first, same as a freshly-loaded one.
    const tempId = `temp_${Date.now().toString(36)}`;
    if (!alreadyExists) {
      setCustomLabels((prev) => [{ id: tempId, name }, ...prev]);
    }
    onChange(name);
    setModalVisible(false);
    setShowCustomInput(false);
    setCustomText("");

    if (alreadyExists) return;

    try {
      setSavingCustom(true);
      const res = await authFetch("/task-labels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) {
        const bodyText = await res.text().catch(() => "");
        throw new Error(`Failed to save label: ${res.status} ${bodyText}`);
      }
      // Swap the temp id for the real one so deletion works afterwards.
      const saved = await res.json().catch(() => null); // { id, name }
      if (saved?.id) {
        setCustomLabels((prev) =>
          prev.map((l) => (l.id === tempId ? { id: saved.id, name: saved.name ?? l.name } : l)),
        );
      }
    } catch (err) {
      // Non-fatal: the label still applies to this task, it just won't
      // be remembered for next time. Silent fail is fine here — surfacing
      // a toast for a background save would be more disruptive than useful.
      console.error("Could not persist custom label:", err);
    } finally {
      setSavingCustom(false);
    }
  };

  const handleDeleteCustom = async (label: CustomLabel) => {
    // Optimistic removal, same pattern as save.
    setCustomLabels((prev) => prev.filter((l) => l.id !== label.id));
    setDeletingId(label.id);

    try {
      const res = await authFetch(`/task-labels/${label.id}`, { method: "DELETE" });
      if (!res.ok) {
        const bodyText = await res.text().catch(() => "");
        throw new Error(`Failed to delete label: ${res.status} ${bodyText}`);
      }
    } catch (err) {
      console.error("Could not delete custom label:", err);
      // Revert on failure so the list stays accurate.
      setCustomLabels((prev) => [label, ...prev]);
    } finally {
      setDeletingId(null);
    }
  };

  const renderRow = (name: string, id: string, isCustom: boolean) => {
    const selected = value?.toLowerCase() === name.toLowerCase();
    return (
      <View key={id} style={{ position: "relative" }}>
        <TouchableOpacity
          onPress={() => handlePick(name)}
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingVertical: 12,
            paddingHorizontal: 4,
            paddingRight: isCustom ? 32 : 4,
            borderBottomWidth: 1,
            borderBottomColor: colors.base.border,
          }}
        >
          <Text style={{ ...typography.body, color: colors.text.primary }}>{name}</Text>
          {selected && <Ionicons name="checkmark" size={18} color={colors.brand.accent} />}
        </TouchableOpacity>

        {isCustom && (
          <TouchableOpacity
            onPress={() => handleDeleteCustom({ id, name })}
            disabled={deletingId === id}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={{
              position: "absolute",
              top: 8,
              right: 4,
            }}
          >
            {deletingId === id ? (
              <ActivityIndicator size="small" color={colors.text.secondary} />
            ) : (
              <Ionicons name="close-circle" size={18} color={colors.text.secondary} />
            )}
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <View style={{ marginTop: 14 }}>
      <Text style={{ ...typography.body, color: colors.text.secondary, marginBottom: 8, paddingLeft: 4 }}>
        Label
      </Text>

      <TouchableOpacity
        onPress={openModal}
        style={[
          inputStyle,
          {
            marginTop: 0,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingRight: 15,
          },
        ]}
      >
        <Text
          style={{
            ...typography.body,
            color: value ? colors.text.primary : colors.text.secondary,
          }}
        >
          {value || "Select a label"}
        </Text>
        <Ionicons name="chevron-down" size={18} color={colors.text.secondary} />
      </TouchableOpacity>

      <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={() => setModalVisible(false)}>
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.5)",
            justifyContent: "center",
            padding: wp(6.4),
          }}
        >
          <View
            style={{
              backgroundColor: colors.base.surfaceL1,
              borderRadius: 16,
              padding: 20,
              borderWidth: 1,
              borderColor: colors.base.border,
              maxHeight: "70%",
            }}
          >
            <Text style={{ ...typography.heading3, color: colors.text.primary, marginBottom: 12 }}>
              Select Label
            </Text>

            {loadingLabels ? (
              <ActivityIndicator color={colors.brand.accent} style={{ marginVertical: 20 }} />
            ) : (
              <ScrollView style={{ maxHeight: moderateScale(280) }} showsVerticalScrollIndicator={false}>
                {customLabels.map((l) => renderRow(l.name, l.id, true))}
                {presetLabels.map((name) => renderRow(name, name, false))}

                {/* Custom option */}
                {!showCustomInput ? (
                  <TouchableOpacity
                    onPress={() => setShowCustomInput(true)}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      paddingVertical: 12,
                      paddingHorizontal: 4,
                      gap: 6,
                    }}
                  >
                    <Ionicons name="add-circle-outline" size={18} color={colors.brand.accent} />
                    <Text style={{ ...typography.body, color: colors.brand.accent }}>Custom label</Text>
                  </TouchableOpacity>
                ) : (
                  <View style={{ paddingTop: 12 }}>
                    <TextInput
                      value={customText}
                      onChangeText={setCustomText}
                      placeholder="Type a new label..."
                      placeholderTextColor={colors.text.secondary}
                      autoFocus
                      style={{
                        ...typography.body,
                        color: colors.text.primary,
                        backgroundColor: colors.base.surfaceL2,
                        borderRadius: 10,
                        borderWidth: 1,
                        borderColor: colors.base.border,
                        height: moderateScale(46),
                        paddingLeft: 12,
                        marginBottom: 12,
                      }}
                    />
                    <View style={{ flexDirection: "row", gap: 12 }}>
                      <TouchableOpacity
                        onPress={() => {
                          setShowCustomInput(false);
                          setCustomText("");
                        }}
                        style={{
                          flex: 1,
                          height: moderateScale(44),
                          borderRadius: 10,
                          borderWidth: 1,
                          borderColor: colors.base.border,
                          justifyContent: "center",
                          alignItems: "center",
                        }}
                      >
                        <Text style={{ ...typography.body, color: colors.text.primary }}>Cancel</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={handleSaveCustom}
                        disabled={!customText.trim() || savingCustom}
                        style={{
                          flex: 1,
                          height: moderateScale(44),
                          borderRadius: 10,
                          backgroundColor: colors.brand.accent,
                          justifyContent: "center",
                          alignItems: "center",
                          opacity: !customText.trim() || savingCustom ? 0.6 : 1,
                        }}
                      >
                        <Text style={{ ...typography.body, color: colors.brand.onPrimary }}>Save</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </ScrollView>
            )}

            <TouchableOpacity
              onPress={() => setModalVisible(false)}
              style={{ marginTop: 16, alignItems: "center" }}
            >
              <Text style={{ ...typography.body, color: colors.text.secondary }}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}