import { useState, useEffect } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, ScrollView, Modal, FlatList, Alert, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTheme } from '../../../context/ThemeContext';
import { typography } from '../../../theme/theme';
import { createEofficeFile, fetchEmployees, type Employee } from '../../../lib/eoffice';
import { getCurrentUser } from '../../../lib/currentUser';
import { Ionicons } from '@expo/vector-icons';
import SkeletonBox from '../../../components/SkeletonBox';

export default function NewEofficeFile() {
    const { colors } = useTheme();
    const router = useRouter();

    const [fileNo, setFileNo] = useState('');
    const [pendingOffice, setPendingOffice] = useState('');
    const [remark, setRemark] = useState('');
    const [pendingSince, setPendingSince] = useState(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);

    const [employees, setEmployees] = useState<Employee[]>([]);
    const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
    const [pickerVisible, setPickerVisible] = useState(false);

    const [submitting, setSubmitting] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    const [loadingEmployees, setLoadingEmployees] = useState(true);

    useEffect(() => {
        getCurrentUser()
            .then((user) => {
                if (user) return fetchEmployees(user.workspace_id);
                return [];
            })
            .then(setEmployees)
            .catch((err) => console.error('Failed to load employees', err))
            .finally(() => setLoadingEmployees(false));
    }, []);

    useEffect(() => {
        getCurrentUser()
            .then((user) => {
                if (user) return fetchEmployees(user.workspace_id);
                return [];
            })
            .then(setEmployees)
            .catch((err) => console.error('Failed to load employees', err));
    }, []);

    const handleSubmit = async () => {
        setErrorMessage('');

        if (!fileNo.trim() || !pendingOffice.trim() || !selectedEmployee) {
            setErrorMessage('File no., pending office, and pending with are required.');
            return;
        }

        try {
            setSubmitting(true);
            await createEofficeFile({
                file_no: fileNo.trim(),
                pending_office: pendingOffice.trim(),
                pending_with: selectedEmployee.id,
                pending_since: pendingSince.toISOString(),
                remark: remark.trim(),
            });
            router.back();
        } catch (err) {
            console.error('Failed to create eOffice file', err);
            setErrorMessage('Could not save the file. Try again.');
        } finally {
            setSubmitting(false);
        }
    };

    const formattedDate = pendingSince.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    })

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.base.background }]}>
            <ScrollView contentContainerStyle={{ padding: 20 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20, gap: 12 }}>
                    <Pressable onPress={() => router.back()} style={{ marginBottom: 18 }}>
                        <Ionicons name="chevron-back" size={26} color={colors.text.primary} />
                    </Pressable>
                    <Text style={[typography.heading, { color: colors.text.primary, marginBottom: 20 }]}>
                        New eOffice File
                    </Text>
                </View>

                <Text style={[typography.heading3, { color: colors.text.secondary, marginBottom: 8 }]}>
                    File No.
                </Text>
                <TextInput
                    placeholder="e.g. CE/2026/0451"
                    placeholderTextColor={colors.text.secondary}
                    value={fileNo}
                    onChangeText={setFileNo}
                    style={[
                        styles.input,
                        typography.body,
                        { borderColor: colors.base.border, color: colors.text.primary, backgroundColor: colors.base.surfaceL1 },
                    ]}
                />

                <Text style={[typography.heading3, { color: colors.text.secondary, marginTop: 18, marginBottom: 8 }]}>
                    Pending Office
                </Text>
                <TextInput
                    placeholder="e.g. Construction"
                    placeholderTextColor={colors.text.secondary}
                    value={pendingOffice}
                    onChangeText={setPendingOffice}
                    style={[
                        styles.input,
                        typography.body,
                        { borderColor: colors.base.border, color: colors.text.primary, backgroundColor: colors.base.surfaceL1 },
                    ]}
                />

                <Text style={[typography.heading3, { color: colors.text.secondary, marginTop: 18, marginBottom: 8 }]}>
                    Pending With
                </Text>
                <Pressable
                    onPress={() => setPickerVisible(true)}
                    style={[
                        styles.input,
                        { borderColor: colors.base.border, backgroundColor: colors.base.surfaceL1, justifyContent: 'center' },
                    ]}
                >
                    <Text style={[typography.body, { color: selectedEmployee ? colors.text.primary : colors.text.secondary }]}>
                        {selectedEmployee ? selectedEmployee.name : 'Select employee'}
                    </Text>
                </Pressable>

                <Text style={[typography.heading3, { color: colors.text.secondary, marginTop: 18, marginBottom: 8 }]}>
                    Pending Since
                </Text>
                <Pressable
                    onPress={() => setShowDatePicker(true)}
                    style={[
                        styles.input,
                        { borderColor: colors.base.border, backgroundColor: colors.base.surfaceL1, justifyContent: 'center' },
                    ]}
                >
                    <Text style={[typography.body, { color: colors.text.primary }]}>
                        {formattedDate}
                    </Text>
                </Pressable>
                {showDatePicker && (
                    <DateTimePicker
                        value={pendingSince}
                        mode='date'
                        display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                        maximumDate={new Date()}
                        onChange={(event, selectedDate) => {
                            setShowDatePicker(Platform.OS === 'ios')
                            if (selectedDate) setPendingSince(selectedDate)
                        }}
                    />
                )}

                <Text style={[typography.heading3, { color: colors.text.secondary, marginTop: 18, marginBottom: 8 }]}>
                    Remark (optional)
                </Text>
                <TextInput
                    placeholder="Any notes about this file"
                    placeholderTextColor={colors.text.secondary}
                    value={remark}
                    onChangeText={setRemark}
                    multiline
                    numberOfLines={3}
                    style={[
                        styles.input,
                        typography.body,
                        { borderColor: colors.base.border, color: colors.text.primary, backgroundColor: colors.base.surfaceL1, height: 90, textAlignVertical: 'top' },
                    ]}
                />

                {errorMessage ? (
                    <Text style={{ ...typography.body, color: '#D32F2F', marginTop: 14 }}>{errorMessage}</Text>
                ) : null}

                <Pressable
                    style={[styles.submitButton, { backgroundColor: colors.brand.accent, opacity: submitting ? 0.7 : 1 }]}
                    onPress={handleSubmit}
                    disabled={submitting}
                >
                    <Text style={[typography.subheading, { color: '#FFFFFF' }]}>
                        {submitting ? 'Saving...' : 'Save File'}
                    </Text>
                </Pressable>
            </ScrollView>

            <Modal visible={pickerVisible} animationType="slide" transparent onRequestClose={() => setPickerVisible(false)}>
                <Pressable style={styles.modalBackdrop} onPress={() => setPickerVisible(false)}>
                    <View style={[styles.modalSheet, { backgroundColor: colors.base.surfaceL1 }]}>
                        <Text style={[typography.subheading, { color: colors.text.primary, padding: 16 }]}>
                            Select Employee
                        </Text>
                        <FlatList
                            data={employees}
                            keyExtractor={(item) => item.id}
                            renderItem={({ item }) => (
                                <Pressable
                                    style={[styles.employeeRow, { borderBottomColor: colors.base.border }]}
                                    onPress={() => {
                                        setSelectedEmployee(item);
                                        setPickerVisible(false);
                                    }}
                                >
                                    <Text style={[typography.body, { color: colors.text.primary }]}>{item.name}</Text>
                                </Pressable>
                            )}
                            ListEmptyComponent={
                                loadingEmployees ? (
                                    <View style={{ padding: 16, gap: 12 }}>
                                        {[0, 1, 2].map((i) => (
                                            <SkeletonBox key={i} width="70%" height={16} borderRadius={4} />
                                        ))}
                                    </View>
                                ) : (
                                    <Text style={[typography.body, { color: colors.text.secondary, padding: 16 }]}>
                                        No employees found
                                    </Text>
                                )
                            }
                        />
                    </View>
                </Pressable>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    input: { borderWidth: 1, borderRadius: 10, paddingVertical: 12, paddingHorizontal: 13 },
    submitButton: { borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 28 },
    modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
    modalSheet: { maxHeight: '60%', borderTopLeftRadius: 20, borderTopRightRadius: 20 },
    employeeRow: { paddingVertical: 14, paddingHorizontal: 16, borderBottomWidth: 1 },
});