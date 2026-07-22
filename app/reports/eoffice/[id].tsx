import { useState, useEffect, useCallback } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, ScrollView, Alert, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTheme } from '../../../context/ThemeContext';
import { typography } from '../../../theme/theme';
import { fetchEofficeFileById, updateEofficeFile } from '../../../lib/eoffice';
import { getCurrentUser, type CurrentUser } from '../../../lib/currentUser';
import type { EofficeFile } from '../../../types/eoffice';
import { Ionicons } from '@expo/vector-icons';
import EofficeDetailSkeleton from '../../../components/EofficeDetailSkeleton';

export default function EofficeDetail() {
    const { colors } = useTheme();
    const router = useRouter();
    const { id } = useLocalSearchParams<{ id: string }>();

    const [file, setFile] = useState<EofficeFile | null>(null);
    const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
    const [loading, setLoading] = useState(true);

    const [pendingOffice, setPendingOffice] = useState('');
    const [pendingWith, setPendingWith] = useState('');
    const [remark, setRemark] = useState('');

    const [saving, setSaving] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    const loadData = useCallback(async () => {
        if (!id) return;
        try {
            const user = await getCurrentUser();
            if (!user) throw new Error('Not logged in');

            const fileData = await fetchEofficeFileById(id);
            setFile(fileData);
            setCurrentUser(user);
            setPendingOffice(fileData.pending_office);
            setPendingWith(fileData.pending_with ?? '');
            setRemark(fileData.remark ?? '');
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

    // Only the person who created the file, or an admin, may edit or complete it.
    // Who the file is currently "pending with" has no bearing on edit rights.
    const canEdit =
        !!currentUser && !!file && (currentUser.role === 'admin' || currentUser.id === file.created_by);

    const daysPending = (pendingSince: string) => {
        const diff = Date.now() - new Date(pendingSince).getTime();
        return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
    };

    const handleSave = async () => {
        if (!file) return;
        setErrorMessage('');

        if (!pendingOffice.trim()) {
            setErrorMessage('Pending office is required.');
            return;
        }

        try {
            setSaving(true);
            const updated = await updateEofficeFile(file.id, {
                pending_office: pendingOffice.trim(),
                pending_with: pendingWith.trim() || null,
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
            <EofficeDetailSkeleton />
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
            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <Pressable onPress={() => router.back()} style={{ marginBottom: 18 }}>
                        <Ionicons name="chevron-back" size={26} color={colors.text.primary} />
                    </Pressable>
                    <Text style={[typography.heading, { color: colors.text.primary, marginBottom: 20 }]}>
                        File #{file.file_no}
                    </Text>
                </View>
                <Text style={[typography.label, { color: colors.text.secondary, marginBottom: 20 }]}>
                    Sr. No. {file.sr_no} · {file.completed ? 'Completed' : `Pending ${daysPending(file.pending_since)} days`}
                </Text>

                {!canEdit && (
                    <View style={[styles.noticeBox, { backgroundColor: colors.base.surfaceL2 }]}>
                        <Text style={[typography.label, { color: colors.text.secondary }]}>
                            Only the file's creator or an admin can edit it.
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
                    Pending With (optional)
                </Text>
                <TextInput
                    value={pendingWith}
                    onChangeText={setPendingWith}
                    editable={canEdit}
                    placeholder="Unassigned"
                    placeholderTextColor={colors.text.secondary}
                    style={[
                        styles.input,
                        typography.body,
                        { borderColor: colors.base.border, color: colors.text.primary, backgroundColor: colors.base.surfaceL1, opacity: canEdit ? 1 : 0.6 },
                    ]}
                />

                <Text style={[typography.heading3, { color: colors.text.secondary, marginTop: 18, marginBottom: 8 }]}>
                    Remark (optional)
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

                {file.completed && (
                    <View style={[styles.noticeBox, { backgroundColor: colors.status.completed + '22', marginTop: 16 }]}>
                        <Text style={[typography.label, { color: colors.status.overdue }]}>
                            This file is marked completed and will be automatically deleted after 15 days.
                        </Text>
                    </View>
                )}
            </ScrollView>
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
});