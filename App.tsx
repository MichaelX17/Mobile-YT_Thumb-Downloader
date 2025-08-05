import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  StyleSheet,
  ActivityIndicator,
  Animated,
  Keyboard,
  FlatList,
  StatusBar,
  Platform,
  SafeAreaView,
  useWindowDimensions,
  KeyboardAvoidingView,
  AppState,
  Modal,
} from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import * as NavigationBar from 'expo-navigation-bar';
import NetInfo from '@react-native-community/netinfo';


interface ThumbData {
  url: string;
  quality: string;
  videoId: string;
  placeholder?: boolean;
}

interface AlertState {
  visible: boolean;
  title: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

export default function App() {
  const [url, setUrl] = useState('');
  const [thumbs, setThumbs] = useState<ThumbData[]>([]);
  const [selected, setSelected] = useState<ThumbData[]>([]);
  const [loading, setLoading] = useState(false);
  const [permissionStatus, requestPermission] = MediaLibrary.usePermissions();
  const [alert, setAlert] = useState<AlertState>({
    visible: false,
    title: '',
    message: '',
    type: 'info',
  });

  const { height: windowHeight } = useWindowDimensions();
  const initialTranslateY = useRef(windowHeight * 0.3).current;
  const formTranslateY = useRef(new Animated.Value(initialTranslateY)).current;
  const [hasSearched, setHasSearched] = useState(false);


  useEffect(() => {
    if (Platform.OS === 'android') {
      NavigationBar.setBackgroundColorAsync('#121212').catch(console.warn);
      NavigationBar.setButtonStyleAsync('light').catch(console.warn);
    }
  }, []);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        Animated.timing(formTranslateY, {
          toValue: thumbs.length > 0 ? 20 : initialTranslateY,
          duration: 0,
          useNativeDriver: true,
        }).start();
      }
    });
    return () => sub.remove();
  }, []);


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

  const resetAppState = (animate = true) => {
    setThumbs([]);
    setSelected([]);
    setHasSearched(false);
    if (animate) {
      Animated.timing(formTranslateY, {
        toValue: initialTranslateY,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  };


  const qualityToResolutionMap: Record<string, string> = {
    maxresdefault: '1920x1080',
    sddefault: '640x480',
    hqdefault: '480x360',
    mqdefault: '320x180',
    default: '120x90',
  };

  const handleSearch = async () => {
    const netState = await NetInfo.fetch();

    if (!netState.isConnected || !netState.isInternetReachable) {
      showAlert(
        'No Connection',
        'You are not connected to the internet. Please check your connection and try again.',
        'info'
      );
      return;
    }

    if (!url.trim()) {
      showAlert('Empty URL', 'Please enter a YouTube URL', 'error');
      resetAppState();
      return;
    }

    resetAppState(false);
    setHasSearched(true);


    const rawInput = url.trim();
    const cleanedUrl = extractFirstYouTubeUrl(rawInput) || rawInput;
    const id = extractVideoId(cleanedUrl);

    if (!id) {
      showAlert('Invalid URL', 'Please enter a valid YouTube URL', 'error');
      resetAppState();
      return;
    }

    Keyboard.dismiss();
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
        resetAppState();
        return;
      }

      setThumbs(availableThumbs);

      Animated.timing(formTranslateY, {
        toValue: 20,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } catch (error) {
      console.error('Search error:', error);
      showAlert('Error', 'Failed to load thumbnails', 'error');
      resetAppState();
    } finally {
      setLoading(false);
    }
  };


  const checkThumbExists = async (url: string): Promise<boolean> => {
    try {
      const response = await fetch(url, { method: 'HEAD' });
      return response.ok && response.headers.get('content-type')?.startsWith('image/') === true;
    } catch {
      return false;
    }
  };

  const extractFirstYouTubeUrl = (text: string): string | null => {
    const regex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com|youtu\.be)\/[^\s]+/g;
    const matches = text.match(regex);
    return matches?.[0] ?? null;
  };



  const extractVideoId = (input: string): string | null => {
    try {
      const url = new URL(input.trim());

      // https://www.youtube.com/watch?v=VIDEOID
      if (url.hostname.includes('youtube.com')) {
        if (url.pathname === '/watch') {
          return url.searchParams.get('v');
        }

        // https://www.youtube.com/embed/VIDEOID
        const embedMatch = url.pathname.match(/^\/embed\/([a-zA-Z0-9_-]{11})/);
        if (embedMatch) return embedMatch[1];

        // https://www.youtube.com/shorts/VIDEOID
        const shortsMatch = url.pathname.match(/^\/shorts\/([a-zA-Z0-9_-]{11})/);
        if (shortsMatch) return shortsMatch[1];
      }

      // https://youtu.be/VIDEOID
      if (url.hostname === 'youtu.be') {
        const idMatch = url.pathname.match(/^\/([a-zA-Z0-9_-]{11})/);
        if (idMatch) return idMatch[1];
      }
    } catch {
      // No es una URL completa, verificar si es un ID directo
      if (/^[a-zA-Z0-9_-]{11}$/.test(input.trim())) return input.trim();
    }

    return null;
  };



  const toggleSelect = (thumb: ThumbData) => {
    setSelected((prev) =>
      prev.some((t) => t.url === thumb.url)
        ? prev.filter((t) => t.url !== thumb.url)
        : [...prev, thumb]
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

    try {
      let status = permissionStatus?.status;

      if (!status || status !== 'granted') {
        const result = await requestPermission();
        status = result.status;
      }

      if (status !== 'granted') {
        showAlert('Permission denied', 'Gallery access is required to save images', 'error');
        return;
      }

      setLoading(true);

      const savePromises = selected.map(async (thumb) => {
        const resolution = qualityToResolutionMap[thumb.quality] || thumb.quality;
        const filename = `YT_Thumb-[${thumb.videoId}]-[${resolution}].jpg`;
        const fileUri = `${FileSystem.cacheDirectory}${filename}`;

        try {
          const { uri } = await FileSystem.downloadAsync(thumb.url, fileUri);

          // CAMBIO CLAVE: Usar createAssetAsync en lugar de saveToLibraryAsync
          return MediaLibrary.createAssetAsync(uri);
        } catch (error) {
          console.error(`Download error [${thumb.quality}]:`, error);
          return null;
        }
      });

      const assets = (await Promise.all(savePromises)).filter(Boolean) as MediaLibrary.Asset[];

      if (assets.length > 0) {
        const album = await MediaLibrary.getAlbumAsync('YouTube Thumbs');
        if (album) {
          await MediaLibrary.addAssetsToAlbumAsync(assets, album, false);
        } else {
          await MediaLibrary.createAlbumAsync('YouTube Thumbs', assets[0], true);

          if (assets.length > 1) {
            const newAlbum = await MediaLibrary.getAlbumAsync('YouTube Thumbs');
            if (newAlbum) {
              await MediaLibrary.addAssetsToAlbumAsync(assets.slice(1), newAlbum, false);
            }
          }
        }
        showAlert('Success', `${assets.length} images saved successfully`, 'success');
      } else {
        showAlert('Error', 'Failed to save images', 'error');
      }
    } catch (error) {
      console.error('Download error:', error);
      showAlert('Error', 'An error occurred while saving images', 'error');
    } finally {
      setLoading(false);
      setSelected([]);
    }
  };

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

  const getAlertIcon = () => {
    switch (alert.type) {
      case 'success':
        return '✅';
      case 'error':
        return '❌';
      default:
        return 'ℹ️';
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#121212" />
      <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
        <View style={styles.container}>
          <Animated.View
            style={[
              styles.form,
              {
                transform: [{ translateY: formTranslateY }],
                zIndex: 999,
                elevation: 20,
              },
            ]}
          >
            <TextInput
              style={styles.input}
              placeholder="Enter YouTube URL"
              placeholderTextColor="#ccc"
              value={url}
              onChangeText={setUrl}
              onSubmitEditing={handleSearch}
              keyboardType="url"
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="search"
            />
            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleSearch}
              disabled={loading}
              activeOpacity={0.7}
            >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={styles.buttonText}>Search</Text>
              )}
            </TouchableOpacity>
          </Animated.View>

          {loading && thumbs.length === 0 && (
            <ActivityIndicator size="large" color="#00ffff" style={styles.loadingIndicator} />
          )}

          <FlatList
            data={getAdjustedThumbs()}
            keyExtractor={(item) => item.url || `placeholder-${Math.random()}`}
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
                  onPress={downloadSelected}
                  activeOpacity={0.8}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <Text style={styles.downloadText}>Download ({selected.length})</Text>
                  )}
                </TouchableOpacity>
              ) : null
            }
            removeClippedSubviews={false}
          />
        </View>
      </KeyboardAvoidingView>

      <Modal visible={alert.visible} transparent animationType="fade" onRequestClose={hideAlert}>
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalContainer,
              alert.type === 'success' && styles.modalSuccess,
              alert.type === 'error' && styles.modalError,
              alert.type === 'info' && styles.modalInfo,
            ]}
          >
            <Text style={styles.modalIcon}>{getAlertIcon()}</Text>
            <Text style={styles.modalTitle}>{alert.title}</Text>
            <Text style={styles.modalMessage}>{alert.message}</Text>
            <TouchableOpacity style={styles.modalButton} onPress={hideAlert}>
              <Text style={styles.modalButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#121212' },
  container: { flex: 1, backgroundColor: '#121212', position: 'relative' },
  form: {
    width: '90%',
    alignSelf: 'center',
    padding: 20,
    backgroundColor: '#1a1a1a',
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 20,
    position: 'absolute',
  },
  input: {
    backgroundColor: '#222',
    color: 'white',
    width: '100%',
    padding: 16,
    borderRadius: 10,
    fontSize: 16,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#333',
  },
  button: {
    backgroundColor: '#1e90ff',
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
  },
  buttonDisabled: { backgroundColor: '#1e90ff80' },
  buttonText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  flatList: { flex: 1, backgroundColor: '#121212' },
  thumbContainer: {
    flex: 1,
    margin: 8,
    backgroundColor: '#222',
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#333',
    maxWidth: '48%',
  },
  thumbSelected: { borderColor: '#1e90ff', backgroundColor: '#1e1e3c' },
  thumbPlaceholder: {
    flex: 1,
    margin: 8,
    maxWidth: '48%',
    backgroundColor: 'transparent',
  },
  thumbnail: { width: '100%', aspectRatio: 16 / 9 },
  qualityLabel: {
    color: 'white',
    textAlign: 'center',
    padding: 8,
    fontSize: 14,
    backgroundColor: '#00000080',
  },
  downloadButton: {
    backgroundColor: '#1e90ff',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
    marginHorizontal: 10,
  },
  downloadText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  loadingIndicator: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginLeft: -20,
    marginTop: -20,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 100,
  },
  emptyText: { color: '#888', textAlign: 'center', fontSize: 16 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#1f1f1f',
    borderRadius: 20,
    padding: 25,
    alignItems: 'center',
    borderWidth: 1,
  },
  modalSuccess: {
    borderColor: '#2ecc71',
    backgroundColor: '#1a1f24',
  },
  modalError: {
    borderColor: '#e74c3c',
    backgroundColor: '#1a1a1f',
  },
  modalInfo: {
    borderColor: '#3498db',
    backgroundColor: '#1a1f2a',
  },
  modalIcon: {
    fontSize: 42,
    marginBottom: 15,
  },
  modalTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  modalMessage: {
    color: '#ddd',
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
  },
  modalButton: {
    backgroundColor: '#1e90ff',
    paddingVertical: 12,
    paddingHorizontal: 35,
    borderRadius: 10,
    marginTop: 10,
  },
  modalButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
});