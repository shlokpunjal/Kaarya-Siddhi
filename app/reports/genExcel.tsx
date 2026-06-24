import { useState } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView, Linking, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/useTheme';
import { typography } from '../../theme/theme';
import { TaskPriority, TaskStatus } from '../../types/task';

const API_BASE = 'http://10.203.77.50:8000';

type FilterMode = 'employee' | 'status' | 'priority' | 'label';

const EMPLOYEES = [
  { id: 'emp1', name: 'Ravi Kumar' },
  { id: 'emp2', name: 'Sita Devi' },
];

const STATUSES: TaskStatus[] = ['overdue', 'pending', 'inReview', 'completed'];
const PRIORITIES: TaskPriority[] = ['low', 'medium', 'high'];

export default function GenExcel() {
  const { colors } = useTheme();

  const [filterMode, setFilterMode] = useState<FilterMode>('employee');
  const [selectedValue, setSelectedValue] = useState<string>('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const buildQuery = () => {
    const params = new URLSearchParams();
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    if (selectedValue) {
      if (filterMode === 'employee') params.append('employee_id', selectedValue);
      if (filterMode === 'status') params.append('status', selectedValue);
      if (filterMode === 'priority') params.append('priority', selectedValue);
      if (filterMode === 'label') params.append('label', selectedValue);
    }
    return params.toString();
  };

  const handleGenerate = () => {
    setLoading(true);
    const url = `${API_BASE}/reports/tasks/excel?${buildQuery()}`;
    setGeneratedUrl(url);
    setLoading(false);
  };

  const handleOpen = () => {
    if (generatedUrl) Linking.openURL(generatedUrl);
  };

  const optionsForMode = (): string[] => {
    if (filterMode === 'employee') return EMPLOYEES.map((e) => e.id);
    if (filterMode === 'status') return STATUSES;
    if (filterMode === 'priority') return PRIORITIES;
    return [];
  };

  const labelFor = (value: string): string => {
    if (filterMode === 'employee') {
      return EMPLOYEES.find((e) => e.id === value)?.name ?? value;
    }
    return value;
  };

  const handleModeChange = (mode: FilterMode) => {
    setFilterMode(mode);
    setSelectedValue('');
  };

  const FILTER_TABS: { key: FilterMode; label: string }[] = [
    { key: 'employee', label: 'Employee' },
    { key: 'status', label: 'Status' },
    { key: 'priority', label: 'Priority' },
    { key: 'label', label: 'Label' },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.base.background }]}>
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <Text style={[typography.heading, { color: colors.text.primary, marginBottom: 4 }]}>
          Generate Excel Report
        </Text>
        <Text style={[typography.body, { color: colors.text.secondary, marginBottom: 22 }]}>
          Choose how you'd like to filter the task list
        </Text>

        <Text style={[typography.heading3, { color: colors.text.secondary, marginBottom: 10 }]}>
          Filter by
        </Text>
        <View style={styles.row}>
          {FILTER_TABS.map(({ key, label }) => (
            <Pressable
              key={key}
              onPress={() => handleModeChange(key)}
              style={[
                styles.chip,
                { backgroundColor: filterMode === key ? colors.brand.accent : colors.base.surfaceL2 },
              ]}
            >
              <Text
                style={[
                  typography.label,
                  { color: filterMode === key ? '#FFFFFF' : colors.text.primary },
                ]}
              >
                {label}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={[typography.heading3, { color: colors.text.secondary, marginTop: 20, marginBottom: 10 }]}>
          Select value
        </Text>

        {filterMode === 'label' ? (
          <TextInput
            placeholder="Search by label..."
            placeholderTextColor={colors.text.secondary}
            value={selectedValue}
            onChangeText={setSelectedValue}
            style={[
              styles.textInput,
              typography.body,
              { borderColor: colors.base.border, color: colors.text.primary, backgroundColor: colors.base.surfaceL1 },
            ]}
          />
        ) : (
          <View style={styles.row}>
            {optionsForMode().map((value) => (
              <Pressable
                key={value}
                onPress={() => setSelectedValue(value)}
                style={[
                  styles.chip,
                  { backgroundColor: selectedValue === value ? colors.brand.primary : colors.base.surfaceL2 },
                ]}
              >
                <Text
                  style={[
                    typography.label,
                    { color: selectedValue === value ? '#FFFFFF' : colors.text.primary },
                  ]}
                >
                  {labelFor(value)}
                </Text>
              </Pressable>
            ))}
          </View>
        )}

        <Text style={[typography.heading3, { color: colors.text.secondary, marginTop: 20, marginBottom: 10 }]}>
          Date range
        </Text>
        <View style={styles.dateRow}>
          <TextInput
            placeholder="Start (YYYY-MM-DD)"
            placeholderTextColor={colors.text.secondary}
            value={startDate}
            onChangeText={setStartDate}
            style={[
              styles.textInput,
              typography.body,
              { flex: 1, borderColor: colors.base.border, color: colors.text.primary, backgroundColor: colors.base.surfaceL1 },
            ]}
          />
          <TextInput
            placeholder="End (YYYY-MM-DD)"
            placeholderTextColor={colors.text.secondary}
            value={endDate}
            onChangeText={setEndDate}
            style={[
              styles.textInput,
              typography.body,
              { flex: 1, borderColor: colors.base.border, color: colors.text.primary, backgroundColor: colors.base.surfaceL1 },
            ]}
          />
        </View>

        <Pressable
          style={[styles.generateButton, { backgroundColor: colors.brand.accent }]}
          onPress={handleGenerate}
        >
          <Text style={[typography.subheading, { color: '#FFFFFF' }]}>
            {loading ? 'Generating...' : 'Generate Report'}
          </Text>
        </Pressable>

        {generatedUrl && (
          <View
            style={[
              styles.resultBox,
              { backgroundColor: colors.base.surfaceL1, borderColor: colors.base.border },
            ]}
          >
            <Text style={[typography.body, { color: colors.text.primary, marginBottom: 12 }]}>
              Report ready.
            </Text>
            <Pressable
              style={[styles.actionButton, { backgroundColor: colors.brand.primary }]}
              onPress={handleOpen}
            >
              <Text style={[typography.heading3, { color: '#FFFFFF' }]}>View / Download</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  dateRow: { flexDirection: 'row', gap: 10 },
  chip: { paddingVertical: 9, paddingHorizontal: 16, borderRadius: 20 },
  textInput: { borderWidth: 1, borderRadius: 10, paddingVertical: 12, paddingHorizontal: 14 },
  generateButton: { borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 26 },
  resultBox: { marginTop: 20, borderRadius: 14, borderWidth: 1, padding: 16 },
  actionButton: { borderRadius: 12, paddingVertical: 13, alignItems: 'center' },
});