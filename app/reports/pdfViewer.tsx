import { useState } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import Pdf from 'react-native-pdf';
import * as Sharing from 'expo-sharing';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { typography } from '../../theme/theme';
import { useToast } from '../../context/ToastContext';
import * as FileSystem from 'expo-file-system/legacy';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function PdfViewer() {
  const { colors } = useTheme();
  const { showToast } = useToast();
  // Passed in as router params from genPdf.tsx — see handleOpen there.
  const { uri, title } = useLocalSearchParams<{ uri: string; title?: string }>();

  const [loading, setLoading] = useState(true);
  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [errorMessage, setErrorMessage] = useState('');
  const DOWNLOAD_DIR_KEY = 'kaarya_siddhi_download_dir_uri';


  const handleShare = async () => {
    if (!uri) return;
    try {
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: title || 'Task Report',
        });
      } else {
        showToast(`Report saved to: ${uri}`, 'success');
      }
    } catch (error) {
      // console.log(error);
      showToast('Could not share the report.', 'error');
    }
  };

  const handleDownload = async () => {
    if (!uri) return;

    if (Platform.OS === 'android') {
      try {
        let directoryUri = await AsyncStorage.getItem(DOWNLOAD_DIR_KEY);

        if (!directoryUri) {
          const downloadsUri = FileSystem.StorageAccessFramework.getUriForDirectoryInRoot('Download');
          const permissions = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync(downloadsUri);

          if (!permissions.granted) {
            showToast('Permission needed to save the file.', 'error');
            return;
          }

          directoryUri = permissions.directoryUri;
          await AsyncStorage.setItem(DOWNLOAD_DIR_KEY, directoryUri);
        }

        const base64Data = await FileSystem.readAsStringAsync(uri, {
          encoding: FileSystem.EncodingType.Base64,
        });

        const fileName = (title || 'Task Report').replace(/[^a-zA-Z0-9-_ ]/g, '') + '.pdf';

        const destUri = await FileSystem.StorageAccessFramework.createFileAsync(
          directoryUri,
          fileName,
          'application/pdf'
        );

        await FileSystem.writeAsStringAsync(destUri, base64Data, {
          encoding: FileSystem.EncodingType.Base64,
        });

        showToast('Report downloaded successfully.', 'success');
      } catch (error) {
        // console.log(error);
        // Saved permission may have been revoked — clear it and let the
        // next tap re-prompt instead of failing silently forever.
        await AsyncStorage.removeItem(DOWNLOAD_DIR_KEY);
        showToast('Could not download the report. Please try again.', 'error');
      }
    } else {
      await handleShare();
    }
  };

  const handleChangeDownloadFolder = async () => {
    if (Platform.OS !== 'android') return;

    try {
      const downloadsUri = FileSystem.StorageAccessFramework.getUriForDirectoryInRoot('Download');
      const permissions = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync(downloadsUri);

      if (!permissions.granted) {
        showToast('Folder selection cancelled.', 'info');
        return;
      }

      await AsyncStorage.setItem(DOWNLOAD_DIR_KEY, permissions.directoryUri);
      showToast('Download folder updated.', 'success');
    } catch (error) {
      // console.log(error);
      showToast('Could not update the download folder.', 'error');
    }
  };

  if (!uri) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.base.background }]}>
        <View style={styles.centered}>
          <Text style={[typography.body, { color: colors.text.secondary }]}>
            No report to display.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.base.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.base.border }]}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="chevron-back" size={26} color={colors.text.primary} />
        </Pressable>

        <View style={styles.headerTitleWrap}>
          <Text
            style={[typography.heading3, { color: colors.text.primary }]}
            numberOfLines={1}
          >
            {title || 'Task Report'}
          </Text>
          {numPages > 0 && (
            <Text style={[typography.label, { color: colors.text.secondary }]}>
              Page {currentPage} of {numPages}
            </Text>
          )}
        </View>

        <View style={{ flexDirection: 'row', gap: 16, alignItems: 'center' }}>
          <Pressable
            onPress={handleDownload}
            onLongPress={handleChangeDownloadFolder}
            hitSlop={10}
          >
            <Ionicons name="download-outline" size={24} color={colors.brand.accent} />
          </Pressable>
          <Pressable onPress={handleShare} hitSlop={10}>
            <Ionicons name="share-outline" size={24} color={colors.brand.accent} />
          </Pressable>
        </View>
      </View>

      {/* PDF body */}
      <View style={{ flex: 1 }}>
        {loading && (
          <View style={[styles.centered, StyleSheet.absoluteFillObject, { zIndex: 1 }]}>
            <ActivityIndicator size="large" color={colors.brand.accent} />
          </View>
        )}

        {errorMessage ? (
          <View style={styles.centered}>
            <Text style={[typography.body, { color: '#D32F2F', textAlign: 'center', paddingHorizontal: 24 }]}>
              {errorMessage}
            </Text>
            <Pressable
              style={[styles.retryButton, { backgroundColor: colors.brand.primary }]}
              onPress={handleShare}
            >
              <Text style={[typography.heading3, { color: '#FFFFFF' }]}>Open with another app</Text>
            </Pressable>
          </View>
        ) : (
          <Pdf
            source={{ uri, cache: false }}
            style={styles.pdf}
            trustAllCerts={false}
            onLoadComplete={(pages) => {
              setNumPages(pages);
              setLoading(false);
            }}
            onPageChanged={(page) => setCurrentPage(page)}
            onError={(error) => {
              // console.log(error);
              setLoading(false);
              setErrorMessage("Couldn't display this PDF here. You can still open it in another app.");
            }}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitleWrap: { flex: 1, alignItems: 'center', paddingHorizontal: 8 },
  pdf: { flex: 1, width: '100%', height: '100%' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  retryButton: {
    marginTop: 16,
    borderRadius: 12,
    paddingVertical: 13,
    paddingHorizontal: 20,
  },
});