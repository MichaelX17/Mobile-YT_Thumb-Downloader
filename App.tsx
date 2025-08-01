import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Dimensions,
  Animated,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  ScrollView,
  FlatList
} from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import Constants from 'expo-constants';

const ACCENT = '#33ccff';
const DARK_BG = '#1e1e1e';
const TEXT_COLOR = '#ffffff';
const SELECT_COLOR = '#3c84f4';

type Thumbnail = {
  quality: string;
  resolution: string;
  url: string;
};

const THUMB_RES: Omit<Thumbnail, 'url'>[] = [
  { quality: 'maxresdefault', resolution: '1280x720' },
  { quality: 'sddefault', resolution: '640x480' },
  { quality: 'hqdefault', resolution: '480x360' },
  { quality: 'mqdefault', resolution: '320x180' },
  { quality: 'default', resolution: '120x90' }
];

export default function App() {
  const [url, setUrl] = useState<string>('');
  const [videoId, setVideoId] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [thumbs, setThumbs] = useState<Thumbnail[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [status, requestPermission] = MediaLibrary.usePermissions();

  const thumbsScale = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    (async () => {
      if (!status?.granted) await requestPermission();
    })();
  }, []);

  const extractVideoId = (url: string): string | null => {
    const match = url.match(/(?:v=|youtu\.be\/|shorts\/)([A-Za-z0-9_-]{11})/);
    return match ? match[1] : null;
  };

  const animateThumbs = (toValue: number, callback?: () => void) => {
    Animated.timing(thumbsScale, {
      toValue,
      duration: 400,
      useNativeDriver: true
    }).start(callback);
  };

  const searchThumbs = () => {
    Keyboard.dismiss();
    const id = extractVideoId(url.trim());

    if (!id) {
      triggerReset();
      Alert.alert('Error', 'Invalid YouTube URL.');
      return;
    }

    const list = THUMB_RES.map(({ quality, resolution }) => ({
      quality,
      resolution,
      url: `https://img.youtube.com/vi/${id}/${quality}.jpg`
    }));

    setVideoId(id);
    setThumbs(list);
    setSelected([]);
    animateThumbs(1);
  };

  const triggerReset = () => {
    animateThumbs(0, () => {
      setThumbs([]);
      setSelected([]);
    });
  };

  const toggleSelect = (quality: string) => {
    setSelected(prev =>
      prev.includes(quality)
        ? prev.filter(q => q !== quality)
        : [...prev, quality]
    );
  };

  const downloadThumbs = async () => {
    if (!status?.granted) {
      const { granted } = await requestPermission();
      if (!granted) {
        Alert.alert('Permiso requerido', 'Se necesita acceso a la galería para guardar las imágenes.');
        return;
      }
    }

    const toDownload = selected.length
      ? thumbs.filter(t => selected.includes(t.quality))
      : thumbs;

    setLoading(true);

    try {
      for (const t of toDownload) {
        const filename = `thumbnail_[${videoId}]_${t.resolution}.jpg`;
        const tmpPath = FileSystem.cacheDirectory + filename;
        const { uri } = await FileSystem.downloadAsync(t.url, tmpPath);
        const asset = await MediaLibrary.createAssetAsync(uri);

        try {
          await MediaLibrary.createAlbumAsync('YT_Thumbs', asset, false);
        } catch {
          await MediaLibrary.addAssetsToAlbumAsync([asset], 'YT_Thumbs', false);
        }
      }
      Alert.alert('Éxito', 'Miniaturas guardadas en el álbum YT_Thumbs (Galería)');
    } catch (e) {
      Alert.alert('Error', `Fallo al guardar: ${(e as Error).message}`);
    } finally {
      setLoading(false);
    }
  };

  const screenWidth = Dimensions.get('window').width;
  const imageWidth = screenWidth / 2.3;

  const renderItem = ({ item }: { item: Thumbnail }) => (
    <Animated.View style={{ transform: [{ scale: thumbsScale }] }}>
      <TouchableOpacity
        onPress={() => toggleSelect(item.quality)}
        style={[
          styles.thumbContainer,
          {
            borderColor: selected.includes(item.quality) ? SELECT_COLOR : DARK_BG,
            shadowColor: selected.includes(item.quality) ? SELECT_COLOR : 'transparent'
          }
        ]}
      >
        <Image
          source={{ uri: item.url }}
          style={{ width: imageWidth, height: imageWidth * 0.5625, borderRadius: 10 }}
        />
        <Text style={styles.thumbLabel}>{item.resolution}</Text>
      </TouchableOpacity>
    </Animated.View>
  );

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.wrapper}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.formContainer}>
          <Text style={styles.title}>Download YouTube Thumbnails</Text>

          <TextInput
            style={styles.input}
            placeholder="Enter YouTube URL"
            placeholderTextColor="#aaa"
            value={url}
            onChangeText={setUrl}
            onSubmitEditing={searchThumbs}
            returnKeyType="search"
          />

          <TouchableOpacity style={styles.searchBtn} onPress={searchThumbs}>
            <Text style={styles.searchText}>Search</Text>
          </TouchableOpacity>
        </View>

        {thumbs.length > 0 && (
          <Animated.View style={{ opacity: thumbsScale }}>
            <Text style={styles.sub}>Tap to select thumbnails</Text>
            <FlatList
              data={thumbs}
              renderItem={renderItem}
              keyExtractor={item => item.quality}
              numColumns={2}
              scrollEnabled={false}
              contentContainerStyle={styles.thumbGrid}
            />
          </Animated.View>
        )}

        {selected.length > 0 && (
          <Animated.View style={styles.downloadBtnWrapper}>
            <TouchableOpacity style={styles.downloadBtn} onPress={downloadThumbs}>
              <Text style={styles.searchText}>Download Selected</Text>
            </TouchableOpacity>
          </Animated.View>
        )}

        {loading && <ActivityIndicator size="large" color={ACCENT} style={{ marginTop: 20 }} />}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: DARK_BG,
    paddingTop: Constants.statusBarHeight
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingBottom: 100
  },
  formContainer: {
    width: '100%',
    alignItems: 'center'
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: TEXT_COLOR,
    textAlign: 'center',
    marginBottom: 20
  },
  input: {
    backgroundColor: '#2a2a2a',
    color: TEXT_COLOR,
    padding: 10,
    borderRadius: 8,
    fontSize: 16,
    width: '100%'
  },
  searchBtn: {
    backgroundColor: ACCENT,
    marginTop: 15,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    width: '100%'
  },
  searchText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold'
  },
  sub: {
    color: '#aaa',
    fontSize: 14,
    marginVertical: 10,
    textAlign: 'center'
  },
  thumbGrid: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 80
  },
  thumbContainer: {
    borderWidth: 2,
    margin: 8,
    borderRadius: 10,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 10,
    backgroundColor: DARK_BG
  },
  thumbLabel: {
    color: TEXT_COLOR,
    textAlign: 'center',
    marginTop: 5,
    fontSize: 12
  },
  downloadBtnWrapper: {
    marginTop: 20,
    alignItems: 'center'
  },
  downloadBtn: {
    backgroundColor: SELECT_COLOR,
    padding: 14,
    borderRadius: 30,
    alignItems: 'center',
    width: '100%'
  }
});
