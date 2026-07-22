import { useState } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTheme } from '../../context/ThemeContext';
import { typography } from '../../theme/theme';
import { TaskPriority, TaskStatus } from '../../types/task';
import { router, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useToast } from '../../context/ToastContext';
import { authFetch } from '../../utils/authFetch';

type FilterMode = 'status' | 'priority';
type PickerTarget = 'start' | 'end' | null;
type RangePreset = 'last_week' | 'last_fortnight' | 'last_month' | 'custom';

const STATUSES: TaskStatus[] = ['overdue', 'pending', 'inReview', 'completed'];
const PRIORITIES: TaskPriority[] = ['low', 'medium', 'high'];

const RANGE_PRESETS: { key: RangePreset; label: string }[] = [
  { key: 'last_week', label: 'Last Week' },
  { key: 'last_fortnight', label: 'Last Fortnight' },
  { key: 'last_month', label: 'Last Month' },
  { key: 'custom', label: 'Custom' },
];

// Local YYYY-MM-DD formatting — avoids UTC-shift bugs from toISOString()
const toLocalDateString = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const toDisplayDateString = (date: Date) =>
  date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

const daysAgo = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
};

const rangeForPreset = (preset: RangePreset): { start: Date; end: Date } | null => {
  const end = new Date();
  switch (preset) {
    case 'last_week':
      return { start: daysAgo(7), end };
    case 'last_fortnight':
      return { start: daysAgo(14), end };
    case 'last_month':
      return { start: daysAgo(30), end };
    default:
      return null;
  }
};

export default function GenPdf() {
  const { colors } = useTheme();
  const { showToast } = useToast();

  const [filterMode, setFilterMode] = useState<FilterMode>('status');
  const [selectedValue, setSelectedValue] = useState<string>('');
  const [rangePreset, setRangePreset] = useState<RangePreset>('last_week');
  const [startDate, setStartDate] = useState<Date | null>(rangeForPreset('last_week')!.start);
  const [endDate, setEndDate] = useState<Date | null>(rangeForPreset('last_week')!.end);
  const [activePicker, setActivePicker] = useState<PickerTarget>(null);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [reportFileUri, setReportFileUri] = useState<string | null>(null);

  const buildQuery = () => {
    const params = new URLSearchParams();
    params.append('start_date', toLocalDateString(startDate as Date));
    params.append('end_date', toLocalDateString(endDate as Date));
    if (selectedValue) {
      if (filterMode === 'status') params.append('status', selectedValue);
      if (filterMode === 'priority') params.append('priority', selectedValue);
    }
    return params.toString();
  };

  const handleRangePresetChange = (preset: RangePreset) => {
    setRangePreset(preset);
    setActivePicker(null);

    const computed = rangeForPreset(preset);
    if (computed) {
      setStartDate(computed.start);
      setEndDate(computed.end);
    } else {
      // Custom — clear so the person has to explicitly pick both
      setStartDate(null);
      setEndDate(null);
    }
  };

  const onChangeDate = (event: any, selected?: Date) => {
    const target = activePicker;
    setActivePicker(Platform.OS === 'ios' ? activePicker : null);
    if (!selected) return;

    if (target === 'start') setStartDate(selected);
    if (target === 'end') setEndDate(selected);
  };

  const handleGenerate = async () => {
    setErrorMessage('');
    setReportFileUri(null);

    if (!startDate || !endDate) {
      setErrorMessage('Please choose both a start and end date.');
      return;
    }

    try {
      setLoading(true);

      const response = await authFetch(`/reports/tasks/pdf?${buildQuery()}`, {
        method: 'GET',
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setErrorMessage(data.detail || 'Could not generate report.');
        return;
      }

      const blob = await response.blob();
      const base64Data: string = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const result = reader.result as string;
          resolve(result.split(',')[1]);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });

      const fileName = `task_report_${toLocalDateString(startDate)}_to_${toLocalDateString(endDate)}.pdf`;
      const file = new File(Paths.cache, fileName);

      await file.write(base64Data, { encoding: 'base64' });

      setReportFileUri(file.uri);
    } catch (error) {
      console.log(error);
      setErrorMessage('Something went wrong while generating the report.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpen = async () => {
    if (!reportFileUri) return;

    const canShare = await Sharing.isAvailableAsync();
    if (canShare) {
      await Sharing.shareAsync(reportFileUri, {
        mimeType: 'application/pdf',
        dialogTitle: 'Task Report',
      });
    } else {
      showToast(`Report saved to: ${reportFileUri}`, 'success');
    }
  };

  const optionsForMode = (): string[] => {
    if (filterMode === 'status') return STATUSES;
    if (filterMode === 'priority') return PRIORITIES;
    return [];
  };

  const handleModeChange = (mode: FilterMode) => {
    setFilterMode(mode);
    setSelectedValue('');
  };

  const FILTER_TABS: { key: FilterMode; label: string }[] = [
    { key: 'status', label: 'Status' },
    { key: 'priority', label: 'Priority' },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.base.background }]}>
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4, gap: 12 }}>
          <Pressable onPress={() => router.back()} style={{ marginBottom: 4 }}>
            <Ionicons name="chevron-back" size={26} color={colors.text.primary} />
          </Pressable>
          <Text style={[typography.heading, { color: colors.text.primary, marginBottom: 4, alignSelf: "center" }]}>
            Generate PDF Report
          </Text>
        </View>
        <Text style={[typography.body, { color: colors.text.secondary, marginBottom: 22 }]}>
          Choose how you'd like to filter the task list
        </Text>

        <Text style={[typography.heading3, { color: colors.text.secondary, marginBottom: 10 }]}>
          Filter by (optional)
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
        <View style={styles.row}>
          {optionsForMode().map((value) => (
            <Pressable
              key={value}
              onPress={() => setSelectedValue(value === selectedValue ? '' : value)}
              style={[
                styles.chip,
                { backgroundColor: selectedValue === value ? colors.brand.accent : colors.base.surfaceL2 },
              ]}
            >
              <Text
                style={[
                  typography.label,
                  { color: selectedValue === value ? '#FFFFFF' : colors.text.primary },
                ]}
              >
                {value}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={[typography.heading3, { color: colors.text.secondary, marginTop: 20, marginBottom: 10 }]}>
          Date Range
        </Text>
        <View style={styles.row}>
          {RANGE_PRESETS.map(({ key, label }) => (
            <Pressable
              key={key}
              onPress={() => handleRangePresetChange(key)}
              style={[
                styles.chip,
                { backgroundColor: rangePreset === key ? colors.brand.accent : colors.base.surfaceL2 },
              ]}
            >
              <Text
                style={[
                  typography.label,
                  { color: rangePreset === key ? '#FFFFFF' : colors.text.primary },
                ]}
              >
                {label}
              </Text>
            </Pressable>
          ))}
        </View>

        {rangePreset === 'custom' && (
          <>
            {/* Start Date */}
            <View style={{ marginTop: 20 }}>
              <Text style={[typography.heading3, { color: colors.text.secondary }]}>
                Start Date
              </Text>
              <Pressable
                onPress={() => setActivePicker(activePicker === 'start' ? null : 'start')}
                style={[
                  styles.dateField,
                  { borderColor: colors.base.border, backgroundColor: colors.base.surfaceL1 },
                ]}
              >
                <Text
                  style={[
                    typography.body,
                    { color: startDate ? colors.text.primary : colors.text.secondary },
                  ]}
                >
                  {startDate ? toDisplayDateString(startDate) : 'Select a date'}
                </Text>
                <Ionicons name="calendar-outline" size={20} color={colors.brand.accent} />
              </Pressable>
              {activePicker === 'start' && (
                <DateTimePicker
                  value={startDate ?? new Date()}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'inline' : 'default'}
                  onChange={onChangeDate}
                />
              )}
            </View>

            {/* End Date */}
            <View style={{ marginTop: 25 }}>
              <Text style={[typography.heading3, { color: colors.text.secondary }]}>
                End Date
              </Text>
              <Pressable
                onPress={() => setActivePicker(activePicker === 'end' ? null : 'end')}
                style={[
                  styles.dateField,
                  { borderColor: colors.base.border, backgroundColor: colors.base.surfaceL1 },
                ]}
              >
                <Text
                  style={[
                    typography.body,
                    { color: endDate ? colors.text.primary : colors.text.secondary },
                  ]}
                >
                  {endDate ? toDisplayDateString(endDate) : 'Select a date'}
                </Text>
                <Ionicons name="calendar-outline" size={20} color={colors.brand.accent} />
              </Pressable>
              {activePicker === 'end' && (
                <DateTimePicker
                  value={endDate ?? new Date()}
                  mode="date"
                  minimumDate={startDate ?? undefined}
                  display={Platform.OS === 'ios' ? 'inline' : 'default'}
                  onChange={onChangeDate}
                />
              )}
            </View>
          </>
        )}

        {rangePreset !== 'custom' && startDate && endDate && (
          <Text style={[typography.body, { color: colors.text.secondary, marginTop: 10 }]}>
            {toDisplayDateString(startDate)} – {toDisplayDateString(endDate)}
          </Text>
        )}

        {errorMessage ? (
          <Text style={{ ...typography.body, color: '#D32F2F', marginTop: 14 }}>
            {errorMessage}
          </Text>
        ) : null}

        <Pressable
          style={[styles.generateButton, { backgroundColor: colors.brand.accent, opacity: loading ? 0.7 : 1 }]}
          onPress={handleGenerate}
          disabled={loading}
        >
          <Text style={[typography.subheading, { color: '#FFFFFF' }]}>
            {loading ? 'Generating...' : 'Generate Report'}
          </Text>
        </Pressable>

        {reportFileUri && (
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
  chip: { paddingVertical: 9, paddingHorizontal: 16, borderRadius: 20 },
  dateField: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  generateButton: { borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 26 },
  resultBox: { marginTop: 20, borderRadius: 14, borderWidth: 1, padding: 16 },
  actionButton: { borderRadius: 12, paddingVertical: 13, alignItems: 'center' },
});