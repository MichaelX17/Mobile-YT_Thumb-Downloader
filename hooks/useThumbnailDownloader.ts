import { useState } from 'react';
import * as FileSystem from 'expo-file-system/legacy';
import NetInfo from '@react-native-community/netinfo';
import { ThumbData } from '../types';
import { qualityToResolutionMap } from '../utils/youtube';

export const useThumbnailDownloader = (showAlert: (title: string, message: string, type?: 'success' | 'error' | 'info') => void) => {
    const [selected, setSelected] = useState<ThumbData[]>([]);
    const [downloading, setDownloading] = useState(false);

    const toggleSelect = (thumb: ThumbData) => {
        setSelected((prev) =>
            prev.some((t) => t.url === thumb.url) ? prev.filter((t) => t.url !== thumb.url) : [...prev, thumb]
        );
    };

    const downloadSelected = async () => {
        const netState = await NetInfo.fetch();
        if (!netState.isConnected || !netState.isInternetReachable) {
            showAlert(
                'No Connection',
                'You are not connected to the internet. Please check your connection and try again.',
                'info'
            );
            return;
        }

        if (selected.length === 0) return;

        setDownloading(true);

        try {
            const thumbnailsDir = `${FileSystem.documentDirectory}thumbnails/`;

            // Crear carpeta si no existe
            const dirInfo = await FileSystem.getInfoAsync(thumbnailsDir);
            if (!dirInfo.exists) {
                await FileSystem.makeDirectoryAsync(thumbnailsDir, { intermediates: true });
            }

            const savedPaths: string[] = [];

            for (const thumb of selected) {
                const resolution = qualityToResolutionMap[thumb.quality] || thumb.quality;
                const safeVideoId = thumb.videoId || 'unknown';
                const filename = `YT_Thumb-[${safeVideoId}]-[${resolution}].jpg`;
                const fileUri = `${thumbnailsDir}${filename}`;

                try {
                    const res = await FileSystem.downloadAsync(thumb.url, fileUri);
                    savedPaths.push(res.uri);
                } catch (error) {
                    console.error(`Download error [${thumb.quality}]:`, error);
                }
            }

            if (savedPaths.length > 0) {
                showAlert(
                    'Success',
                    `${savedPaths.length} images saved.\nPath: ${thumbnailsDir}`,
                    'success'
                );
            } else {
                showAlert('Error', 'Failed to save images', 'error');
            }
        } catch (error) {
            console.error('Download error:', error);
            showAlert('Error', 'An error occurred while saving images', 'error');
        } finally {
            setDownloading(false);
            setSelected([]);
        }
    };

    const resetSelection = () => {
        setSelected([]);
    };

    return {
        selected,
        downloading,
        toggleSelect,
        downloadSelected,
        resetSelection,
    };
};
