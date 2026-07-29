import { View, Text, TextInput } from "react-native";
import { typography } from "../../theme/theme";
import { profileStyles } from "../../styles/profileStyles";
type ThemeColors = any;

export type ProfileField = {
  key: string;
  label: string;
  value: string;
  editable?: boolean; // only editable when parent is in edit mode AND this is true
  onChange?: (v: string) => void;
};

type Props = {
  colors: ThemeColors;
  editing: boolean;
  fields: ProfileField[];
};

// Renders each field as a labeled row: read-only text normally,
// or a TextInput when `editing` is true and the field is `editable`.
// Last row gets borderBottomWidth: 0 to match the original design.
export default function ProfileFieldsCard({ colors, editing, fields }: Props) {
  return (
    <View style={profileStyles.fieldsGroup}>
      {fields.map((field, idx) => {
        const isLast = idx === fields.length - 1;
        const showInput = editing && field.editable;

        return (
          <View
            key={field.key}
            style={[
              profileStyles.fieldRow,
              isLast ? { borderBottomWidth: 0 } : { borderBottomColor: colors.base.border },
            ]}
          >
            <Text style={[typography.label, { color: colors.text.secondary }]}>{field.label}</Text>

            {showInput ? (
              <TextInput
                value={field.value}
                onChangeText={field.onChange}
                style={[
                  profileStyles.input,
                  typography.body,
                  { borderColor: colors.base.border, color: colors.text.primary },
                ]}
              />
            ) : (
              <Text style={[typography.body, { color: colors.text.primary, marginTop: 4 }]}>
                {field.value || "—"}
              </Text>
            )}
          </View>
        );
      })}
    </View>
  );
}