import { useState } from 'react';
import { ThumbData, AlertState } from '../types';
import { extractFirstYouTubeUrl, extractVideoId, checkThumbExists } from '../utils/youtube';

export const useYouTubeThumbnails = () => {
    const [thumbs, setThumbs] = useState<ThumbData[]>([]);
    const [loading, setLoading] = useState(false);
    const [alert, setAlert] = useState<AlertState>({
        visible: false,
        title: '',
        message: '',
        type: 'info',
    });

    const showAlert = (
        title: string,
        message: string,
        type: 'success' | 'error' | 'info' = 'info'
    ) => {
        setAlert({ visible: true, title, message, type });
    };

    const hideAlert = () => {
        setAlert((prev) => ({ ...prev, visible: false }));
    };

    const searchThumbnails = async (url: string) => {
        if (!url.trim()) {
            showAlert('Empty URL', 'Please enter a YouTube URL', 'error');
            return false;
        }

        const rawInput = url.trim();
        const cleanedUrl = extractFirstYouTubeUrl(rawInput) || rawInput;
        const id = extractVideoId(cleanedUrl);

        if (!id) {
            showAlert('Invalid URL', 'Please enter a valid YouTube URL', 'error');
            return false;
        }

        setLoading(true);

        try {
            const base = `https://img.youtube.com/vi/${id}`;
            const qualities = ['maxresdefault', 'sddefault', 'hqdefault', 'mqdefault', 'default'];
            const availableThumbs: ThumbData[] = [];

            for (const q of qualities) {
                const thumbUrl = `${base}/${q}.jpg`;
                const exists = await checkThumbExists(thumbUrl);
                if (exists) availableThumbs.push({ url: thumbUrl, quality: q, videoId: id });
            }

            if (availableThumbs.length === 0) {
                showAlert('No Results', 'No thumbnails found', 'error');
                return false;
            }

            setThumbs(availableThumbs);
            return true;
        } catch (error) {
            console.error('Search error:', error);
            showAlert('Error', 'Failed to load thumbnails', 'error');
            return false;
        } finally {
            setLoading(false);
        }
    };

    const resetThumbnails = () => {
        setThumbs([]);
    };

    return {
        thumbs,
        loading,
        alert,
        showAlert,
        hideAlert,
        searchThumbnails,
        resetThumbnails,
    };
};