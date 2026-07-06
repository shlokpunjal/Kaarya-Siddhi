import { useState, useEffect, useCallback } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, ScrollView, Modal, FlatList, Alert, ActivityIndicator, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTheme } from '../../../context/ThemeContext';
import { typography } from '../../../theme/theme';
import { fetchEofficeFileById, updateEofficeFile, fetchEmployees, type Employee } from '../../../lib/eoffice';
import { getCurrentUser, type CurrentUser } from '../../../lib/currentUser';
import type { EofficeFile } from '../../../types/eoffice';

export default function EofficeDetail() {
    const { colors } = useTheme();
    const router = useRouter();
    const { id } = useLocalSearchParams<{ id: string }>();

    const [file, setFile] = useState<EofficeFile | null>(null);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
    const [loading, setLoading] = useState(true);

    const [pendingOffice, setPendingOffice] = useState('');
    const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
    const [remark, setRemark] = useState('');
    const [pickerVisible, setPickerVisible] = useState(false);

    const [saving, setSaving] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    const loadData = useCallback(async () => {
        if (!id) return;
        try {
            const user = await getCurrentUser();
            if (!user) throw new Error('Not logged in');

            const [fileData, employeesData] = await Promise.all([
                fetchEofficeFileById(id),
                fetchEmployees(user.workspace_id),
            ]);
            setFile(fileData);
            setEmployees(employeesData);
            setCurrentUser(user);
            setPendingOffice(fileData.pending_office);
            setRemark(fileData.remark ?? '');
            setSelectedEmployee(employeesData.find((e) => e.id === fileData.pending_with) ?? null);
        } catch (err) {
            console.error('Failed to load file', err);
            setErrorMessage('Could not load this file.');
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const canEdit =
        !!currentUser && !!file && (currentUser.role === 'admin' || currentUser.id === file.pending_with);

    const daysPending = (pendingSince: string) => {
        const diff = Date.now() - new Date(pendingSince).getTime();
        return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
    };

    const handleSave = async () => {
        if (!file) return;
        setErrorMessage('');

        if (!pendingOffice.trim() || !selectedEmployee) {
            setErrorMessage('Pending office and pending with are required.');
            return;
        }

        try {
            setSaving(true);
            const updated = await updateEofficeFile(file.id, {
                pending_office: pendingOffice.trim(),
                pending_with: selectedEmployee.id,
                remark: remark.trim() || null,
            });
            setFile(updated);
            Alert.alert('Saved', 'File details updated.');
        } catch (err) {
            console.error('Failed to update file', err);
            setErrorMessage('Could not save changes.');
        } finally {
            setSaving(false);
        }
    };

    const handleToggleCompleted = (value: boolean) => {
        if (!file) return;

        Alert.alert(
            value ? 'Mark as completed?' : 'Reopen this file?',
            value
                ? 'This will mark the file as completed. It will be automatically deleted from the system after 15 days.'
                : 'This will mark the file as pending again.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: value ? 'Mark Completed' : 'Reopen',
                    style: value ? 'default' : 'destructive',
                    onPress: async () => {
                        try {
                            setSaving(true);
                            const updated = await updateEofficeFile(file.id, { completed: value });
                            setFile(updated);
                        } catch (err) {
                            console.error('Failed to update status', err);
                            Alert.alert('Error', 'Could not update status.');
                        } finally {
                            setSaving(false);
                        }
                    },
                },
            ]
        );
    };

    if (loading) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: colors.base.background, alignItems: 'center', justifyContent: 'center' }]}>
                <ActivityIndicator size="large" color={colors.brand.accent} />
            </SafeAreaView>
        );
    }

    if (!file) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: colors.base.background, alignItems: 'center', justifyContent: 'center' }]}>
                <Text style={[typography.body, { color: colors.text.secondary }]}>File not found.</Text>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.base.background }]}>
            <ScrollView contentContainerStyle={{ padding: 20 }}>
                <Text style={[typography.heading, { color: colors.text.primary, marginBottom: 4 }]}>
                    File #{file.file_no}
                </Text>
                <Text style={[typography.label, { color: colors.text.secondary, marginBottom: 20 }]}>
                    Sr. No. {file.sr_no} · {file.completed ? 'Completed' : `Pending ${daysPending(file.pending_since)} days`}
                </Text>

                {!canEdit && (
                    <View style={[styles.noticeBox, { backgroundColor: colors.base.surfaceL2 }]}>
                        <Text style={[typography.label, { color: colors.text.secondary }]}>
                            Only the admin or the employee this file is assigned to can edit it.
                        </Text>
                    </View>
                )}

                <Text style={[typography.heading3, { color: colors.text.secondary, marginTop: 18, marginBottom: 8 }]}>
                    Pending Office
                </Text>
                <TextInput
                    value={pendingOffice}
                    onChangeText={setPendingOffice}
                    editable={canEdit}
                    style={[
                        styles.input,
                        typography.body,
                        { borderColor: colors.base.border, color: colors.text.primary, backgroundColor: colors.base.surfaceL1, opacity: canEdit ? 1 : 0.6 },
                    ]}
                />

                <Text style={[typography.heading3, { color: colors.text.secondary, marginTop: 18, marginBottom: 8 }]}>
                    Pending With
                </Text>
                <Pressable
                    disabled={!canEdit}
                    onPress={() => setPickerVisible(true)}
                    style={[
                        styles.input,
                        { borderColor: colors.base.border, backgroundColor: colors.base.surfaceL1, justifyContent: 'center', opacity: canEdit ? 1 : 0.6 },
                    ]}
                >
                    <Text style={[typography.body, { color: colors.text.primary }]}>
                        {selectedEmployee ? selectedEmployee.name : 'Unassigned'}
                    </Text>
                </Pressable>
                {canEdit && selectedEmployee?.id !== file.pending_with && (
                    <Text style={[typography.label, { color: colors.status.pending, marginTop: 6 }]}>
                        Reassigning will transfer edit rights to the selected employee.
                    </Text>
                )}

                <Text style={[typography.heading3, { color: colors.text.secondary, marginTop: 18, marginBottom: 8 }]}>
                    Remark
                </Text>
                <TextInput
                    value={remark}
                    onChangeText={setRemark}
                    editable={canEdit}
                    multiline
                    numberOfLines={3}
                    style={[
                        styles.input,
                        typography.body,
                        { borderColor: colors.base.border, color: colors.text.primary, backgroundColor: colors.base.surfaceL1, height: 90, textAlignVertical: 'top', opacity: canEdit ? 1 : 0.6 },
                    ]}
                />

                <View style={[styles.statusRow, { borderColor: colors.base.border, backgroundColor: colors.base.surfaceL1 }]}>
                    <Text style={[typography.subheading, { color: colors.text.primary }]}>Completed</Text>
                    <Switch
                        value={file.completed}
                        onValueChange={handleToggleCompleted}
                        disabled={!canEdit || saving}
                    />
                </View>

                {errorMessage ? (
                    <Text style={{ ...typography.body, color: '#D32F2F', marginTop: 14 }}>{errorMessage}</Text>
                ) : null}

                {canEdit && (
                    <Pressable
                        style={[styles.submitButton, { backgroundColor: colors.brand.accent, opacity: saving ? 0.7 : 1 }]}
                        onPress={handleSave}
                        disabled={saving}
                    >
                        <Text style={[typography.subheading, { color: '#FFFFFF' }]}>
                            {saving ? 'Saving...' : 'Save Changes'}
                        </Text>
                    </Pressable>
                )}
            </ScrollView>

            <Modal visible={pickerVisible} animationType="slide" transparent onRequestClose={() => setPickerVisible(false)}>
                <Pressable style={styles.modalBackdrop} onPress={() => setPickerVisible(false)}>
                    <View style={[styles.modalSheet, { backgroundColor: colors.base.surfaceL1 }]}>
                        <Text style={[typography.subheading, { color: colors.text.primary, padding: 16 }]}>
                            Reassign To
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
                        />
                    </View>
                </Pressable>
            </Modal>
            {file.completed && (
                <View style={[styles.noticeBox, { backgroundColor: colors.status.completed + '22', marginTop: 16 }]}>
                    <Text style={[typography.label, { color: colors.status.overdue }]}>
                        This file is marked completed and will be automatically deleted after 15 days.
                    </Text>
                </View>
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    input: { borderWidth: 1, borderRadius: 10, paddingVertical: 12, paddingHorizontal: 13 },
    submitButton: { borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 28 },
    noticeBox: { borderRadius: 10, padding: 12, marginBottom: 8 },
    statusRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderWidth: 1,
        borderRadius: 12,
        padding: 14,
        marginTop: 24,
    },
    modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
    modalSheet: { maxHeight: '60%', borderTopLeftRadius: 20, borderTopRightRadius: 20 },
    employeeRow: { paddingVertical: 14, paddingHorizontal: 16, borderBottomWidth: 1 },
});