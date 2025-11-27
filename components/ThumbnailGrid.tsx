import React from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    Image,
    FlatList,
    ActivityIndicator,
} from 'react-native';
import { ThumbData } from '../types';
import { qualityToResolutionMap } from '../utils/youtube';
import { styles } from '../styles';

interface ThumbnailGridProps {
    thumbs: ThumbData[];
    selected: ThumbData[];
    toggleSelect: (thumb: ThumbData) => void;
    loading: boolean;
    hasSearched: boolean;
    onDownload: () => void;
    downloading: boolean;
}

export const ThumbnailGrid: React.FC<ThumbnailGridProps> = ({
    thumbs,
    selected,
    toggleSelect,
    loading,
    hasSearched,
    onDownload,
    downloading,
}) => {
    const getAdjustedThumbs = (): ThumbData[] => {
        if (thumbs.length % 2 === 0) return thumbs;
        return [...thumbs, { url: '', quality: '', videoId: '', placeholder: true }];
    };

    const renderThumb = ({ item }: { item: ThumbData }) => {
        if (item.placeholder) {
            return <View style={styles.thumbPlaceholder} />;
        }

        return (
            <TouchableOpacity
                style={[
                    styles.thumbContainer,
                    selected.some((t) => t.url === item.url) && styles.thumbSelected,
                ]}
                onPress={() => toggleSelect(item)}
                activeOpacity={0.7}
            >
                <Image source={{ uri: item.url }} style={styles.thumbnail} resizeMode="cover" />
                <Text style={styles.qualityLabel}>
                    {qualityToResolutionMap[item.quality] || item.quality}
                </Text>
            </TouchableOpacity>
        );
    };

    return (
        <>
            <FlatList
                data={getAdjustedThumbs()}
                keyExtractor={(item, index) => (item.url || 'placeholder') + index}
                renderItem={renderThumb}
                numColumns={2}
                contentContainerStyle={{
                    paddingTop: thumbs.length > 0 ? 220 : 0,
                    paddingBottom: 20,
                    paddingHorizontal: 8,
                }}
                style={styles.flatList}
                ListEmptyComponent={
                    !loading ? (
                        <View style={styles.emptyContainer}>
                            <Text style={styles.emptyText}>
                                {!hasSearched ? 'Enter a YouTube URL' : 'No thumbnails found'}
                            </Text>
                        </View>
                    ) : null
                }
                ListFooterComponent={
                    selected.length > 0 ? (
                        <TouchableOpacity
                            style={styles.downloadButton}
                            onPress={onDownload}
                            activeOpacity={0.8}
                            disabled={downloading}
                        >
                            {downloading ? <ActivityIndicator color="white" /> : <Text style={styles.downloadText}>Download ({selected.length})</Text>}
                        </TouchableOpacity>
                    ) : null
                }
                removeClippedSubviews={false}
            />
        </>
    );
};