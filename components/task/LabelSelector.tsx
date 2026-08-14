import { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, Modal, TextInput, ScrollView, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { typography } from "../../theme/theme";
import { moderateScale, wp } from "../../utils/responsive";
import { authFetch } from "../../utils/authFetch";

// Shown to every admin on first use, before they've created any custom
// labels of their own. Custom labels fetched from the API are appended
// to this list (deduped, case-insensitive).
const PRESET_LABELS = [
  "Documentation",
  "Sheets Update",
  "Design",
  "Testing",
  "Bug Fix",
  "Meeting",
  "Research",
];

type LabelSelectorProps = {
  colors: any;
  value: string | null;
  onChange: (label: string) => void;
  inputStyle: any;
};

export function LabelSelector({ colors, value, onChange, inputStyle }: LabelSelectorProps) {
  const [modalVisible, setModalVisible] = useState(false);
  const [labels, setLabels] = useState<string[]>(PRESET_LABELS);
  const [loadingLabels, setLoadingLabels] = useState(true);
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customText, setCustomText] = useState("");
  const [savingCustom, setSavingCustom] = useState(false);

  // Merge in labels this admin has created before, so a custom label
  // typed last time shows up as a normal pickable option this time.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await authFetch("/task-labels");
        if (!res.ok) return;
        const { labels: custom } = await res.json(); // [{ id, name }]
        if (cancelled) return;
        setLabels((prev) => {
          const names = custom.map((l: { name: string }) => l.name);
          const merged = [...prev, ...names];
          const seen = new Set<string>();
          return merged.filter((l) => {
            const key = l.toLowerCase();
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          });
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

    const alreadyExists = labels.some((l) => l.toLowerCase() === name.toLowerCase());

    // Optimistic: select immediately, close the modal, then persist in
    // the background so a slow network doesn't block the admin.
    setLabels((prev) => (alreadyExists ? prev : [...prev, name]));
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
      if (!res.ok) throw new Error("Failed to save label");
    } catch (err) {
      // Non-fatal: the label still applies to this task, it just won't
      // be remembered for next time. Silent fail is fine here — surfacing
      // a toast for a background save would be more disruptive than useful.
      console.error("Could not persist custom label:", err);
    } finally {
      setSavingCustom(false);
    }
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
                {labels.map((label) => {
                  const selected = value?.toLowerCase() === label.toLowerCase();
                  return (
                    <TouchableOpacity
                      key={label}
                      onPress={() => handlePick(label)}
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "space-between",
                        paddingVertical: 12,
                        paddingHorizontal: 4,
                        borderBottomWidth: 1,
                        borderBottomColor: colors.base.border,
                      }}
                    >
                      <Text style={{ ...typography.body, color: colors.text.primary }}>{label}</Text>
                      {selected && <Ionicons name="checkmark" size={18} color={colors.brand.accent} />}
                    </TouchableOpacity>
                  );
                })}

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