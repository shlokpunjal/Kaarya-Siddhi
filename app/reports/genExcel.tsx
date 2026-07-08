import { useState } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../../context/ThemeContext';
import { typography } from '../../theme/theme';
import { TaskPriority, TaskStatus } from '../../types/task';
import { API_BASE_URL } from '../../constants/api';
import BackButton from "../../components/backButton";


type FilterMode = 'status' | 'priority';

const STATUSES: TaskStatus[] = ['overdue', 'pending', 'inReview', 'completed'];
const PRIORITIES: TaskPriority[] = ['low', 'medium', 'high'];

const sanitizeDate = (value: string) => value.replace(/[–—−]/g, '-').trim();

export default function GenExcel() {
  const { colors } = useTheme();

  const [filterMode, setFilterMode] = useState<FilterMode>('status');
  const [selectedValue, setSelectedValue] = useState<string>('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [reportFileUri, setReportFileUri] = useState<string | null>(null);

  const buildQuery = () => {
    const params = new URLSearchParams();
    params.append('start_date', sanitizeDate(startDate));
    params.append('end_date', sanitizeDate(endDate));
    if (selectedValue) {
      if (filterMode === 'status') params.append('status', selectedValue);
      if (filterMode === 'priority') params.append('priority', selectedValue);
    }
    return params.toString();
  };

  const handleGenerate = async () => {
    setErrorMessage('');
    setReportFileUri(null);

    if (!startDate.trim() || !endDate.trim()) {
      setErrorMessage('Please enter both a start and end date.');
      return;
    }

    try {
      setLoading(true);

      const token = await AsyncStorage.getItem('token');

      if (!token) {
        setErrorMessage('Your session has expired. Please log in again.');
        return;
      }

      const url = `${API_BASE_URL}/reports/tasks/excel?${buildQuery()}`;

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
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

      const fileName = `task_report_${startDate}_to_${endDate}.xlsx`;
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
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        dialogTitle: 'Task Report',
      });
    } else {
      Alert.alert('Report saved', `Saved to: ${reportFileUri}`);
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
        <BackButton />
        <Text style={[typography.heading, { color: colors.text.primary, marginBottom: 4 , alignSelf:"center"}]}>
          Generate Excel Report
        </Text>
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
                { backgroundColor: selectedValue === value ? colors.brand.primary : colors.base.surfaceL2 },
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
          Date range (required)
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
  dateRow: { flexDirection: 'row', gap: 10 },
  chip: { paddingVertical: 9, paddingHorizontal: 16, borderRadius: 20 },
  textInput: { borderWidth: 1, borderRadius: 10, paddingVertical: 12, paddingHorizontal: 13 },
  generateButton: { borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 26 },
  resultBox: { marginTop: 20, borderRadius: 14, borderWidth: 1, padding: 16 },
  actionButton: { borderRadius: 12, paddingVertical: 13, alignItems: 'center' },
});