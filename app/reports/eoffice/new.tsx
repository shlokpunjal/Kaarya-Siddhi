import { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, ScrollView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTheme } from '../../../context/ThemeContext';
import { typography } from '../../../theme/theme';
import { createEofficeFile } from '../../../lib/eoffice';
import { Ionicons } from '@expo/vector-icons';
import { getCurrentUser } from '../../../lib/currentUser';

export default function NewEofficeFile() {
    const { colors } = useTheme();
    const router = useRouter();

    const [fileNo, setFileNo] = useState('');
    const [pendingOffice, setPendingOffice] = useState('');
    const [pendingWith, setPendingWith] = useState('');
    const [remark, setRemark] = useState('');
    const [pendingSince, setPendingSince] = useState(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);

    const [submitting, setSubmitting] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    const handleSubmit = async () => {
        setErrorMessage('');

        if (!fileNo.trim() || !pendingOffice.trim() || !pendingSince) {
            setErrorMessage('File no., pending office, and pending since are required.');
            return;
        }

        try {
            setSubmitting(true);

            const user = await getCurrentUser();
            if (!user) {
                setErrorMessage('You must be logged in to create a file.');
                setSubmitting(false);
                return;
            }

            await createEofficeFile({
                file_no: fileNo.trim(),
                pending_office: pendingOffice.trim(),
                pending_with: pendingWith.trim() || null,
                pending_since: pendingSince.toISOString(),
                remark: remark.trim() || null,
                created_by: user.id,
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
            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20 }}>
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
                    Pending With (optional)
                </Text>
                <TextInput
                    placeholder="e.g. Rajesh Kumar"
                    placeholderTextColor={colors.text.secondary}
                    value={pendingWith}
                    onChangeText={setPendingWith}
                    style={[
                        styles.input,
                        typography.body,
                        { borderColor: colors.base.border, color: colors.text.primary, backgroundColor: colors.base.surfaceL1 },
                    ]}
                />

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
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    input: { borderWidth: 1, borderRadius: 10, paddingVertical: 12, paddingHorizontal: 13 },
    submitButton: { borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 28 },
});