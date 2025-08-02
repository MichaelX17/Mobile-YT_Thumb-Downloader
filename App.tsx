import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  StyleSheet,
  ActivityIndicator,
  Animated,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  ScrollView,
  FlatList,
  useWindowDimensions,
  Modal
} from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import Constants from 'expo-constants';

const ACCENT = '#33ccff';
const DARK_BG = '#1e1e1e';
const TEXT_COLOR = '#ffffff';
const SELECT_COLOR = '#3c84f4';
const MODAL_BG = '#2a2a2a';

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
  const [downloading, setDownloading] = useState<boolean>(false);
  const [thumbs, setThumbs] = useState<Thumbnail[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [status, requestPermission] = MediaLibrary.usePermissions();
  const [modalVisible, setModalVisible] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalMessage, setModalMessage] = useState('');

  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const isSmallScreen = screenHeight < 700;
  const isLandscape = screenWidth > screenHeight;

  const thumbsScale = useRef(new Animated.Value(0)).current;
  const formTranslateY = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    (async () => {
      if (!status?.granted) await requestPermission();
    })();
  }, []);

  // Iniciar animación de pulso para el botón de descarga
  useEffect(() => {
    let animation: Animated.CompositeAnimation | null = null;

    if (selected.length > 0 && !downloading) {
      animation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true
          }),
          Animated.timing(pulseAnim, {
            toValue: 0,
            duration: 800,
            useNativeDriver: true
          })
        ])
      );
      animation.start();
    } else {
      pulseAnim.setValue(0);
    }

    return () => {
      animation?.stop();
    };
  }, [selected.length, downloading, pulseAnim]);

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

  const animateForm = (toValue: number, callback?: () => void) => {
    Animated.timing(formTranslateY, {
      toValue,
      duration: 400,
      useNativeDriver: true
    }).start(callback);
  };

  const showCustomAlert = (title: string, message: string) => {
    setModalTitle(title);
    setModalMessage(message);
    setModalVisible(true);
  };

  const searchThumbs = () => {
    Keyboard.dismiss();
    const id = extractVideoId(url.trim());

    if (!id) {
      animateForm(0);
      triggerReset();
      showCustomAlert('Error', 'Invalid YouTube URL.');
      return;
    }

    const formMoveValue = isSmallScreen ? -screenHeight * 0.15 : -screenHeight * 0.12;
    animateForm(formMoveValue);

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
      animateForm(0);
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
  // Verificar permisos
  if (status?.status !== MediaLibrary.PermissionStatus.GRANTED) {
    const { granted } = await requestPermission();
    if (!granted) {
      showCustomAlert('Permiso requerido', 'Se necesita acceso a la galería.');
      return;
    }
  }

  const toDownload = selected.length
    ? thumbs.filter(t => selected.includes(t.quality))
    : thumbs;

  setDownloading(true);

  try {
    const albumName = 'YT_Thumbs';
    
    // 1. Verificar si el álbum existe
    let album = await MediaLibrary.getAlbumAsync(albumName);
    
    // 2. Si no existe, crearlo
    if (!album) {
      // Crear un álbum vacío (solución universal)
      await MediaLibrary.createAlbumAsync(albumName);
      album = await MediaLibrary.getAlbumAsync(albumName);
    }

    // 3. Descargar y guardar todas las miniaturas
    for (const t of toDownload) {
      try {
        const filename = `thumbnail_${videoId}_${t.resolution}.jpg`;
        const tmpPath = FileSystem.cacheDirectory + filename;
        
        // Descargar la imagen
        const { uri } = await FileSystem.downloadAsync(t.url, tmpPath);
        const asset = await MediaLibrary.createAssetAsync(uri);
        
        // Agregar al álbum
        await MediaLibrary.addAssetsToAlbumAsync([asset], album || albumName, false);
      } catch (error) {
        console.error(`Error procesando ${t.quality}:`, error);
      }
    }
    
    showCustomAlert('Éxito', `${toDownload.length} miniaturas guardadas en la carpeta YT_Thumbs`);
  } catch (e) {
    let errorMessage = 'Error desconocido';
    if (e instanceof Error) errorMessage = e.message;
    else if (typeof e === 'string') errorMessage = e;
    
    showCustomAlert('Error', `Error al guardar: ${errorMessage}`);
  } finally {
    setDownloading(false);
  }
};

  // Cálculo responsivo de dimensiones
  const imageWidth = isLandscape ?
    (screenWidth - 60) / 3 :
    isSmallScreen ?
      (screenWidth - 40) / 2 - 16 :
      (screenWidth - 56) / 2;

  const imageHeight = imageWidth * 0.5625;

  const renderItem = ({ item }: { item: Thumbnail }) => (
    <Animated.View
      style={{
        transform: [{ scale: thumbsScale }],
        width: imageWidth,
        margin: isSmallScreen ? 6 : 8
      }}
    >
      <TouchableOpacity
        onPress={() => !downloading && toggleSelect(item.quality)}
        style={[
          styles.thumbContainer,
          {
            borderColor: selected.includes(item.quality) ? SELECT_COLOR : DARK_BG,
            shadowColor: selected.includes(item.quality) ? SELECT_COLOR : 'transparent',
            width: '100%',
          }
        ]}
      >
        <Image
          source={{ uri: item.url }}
          style={{
            width: '100%',
            height: imageHeight,
            borderRadius: 10
          }}
        />

        {/* Overlay de carga para miniaturas seleccionadas */}
        {downloading && selected.includes(item.quality) && (
          <View style={styles.downloadingOverlay}>
            <ActivityIndicator size="large" color={ACCENT} />
            <Text style={{ color: TEXT_COLOR, marginTop: 5 }}>Guardando...</Text>
          </View>
        )}

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
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: isSmallScreen ? screenHeight * 0.1 : screenHeight * 0.15,
            paddingBottom: 100
          }
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <Animated.View
          style={[styles.formContainer, { transform: [{ translateY: formTranslateY }] }]}
        >
          <Text style={[
            styles.title,
            isSmallScreen && { fontSize: 20, marginBottom: 12 }
          ]}>
            Download YouTube Thumbnails
          </Text>

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
        </Animated.View>

        {thumbs.length > 0 && (
          <Animated.View style={{
            opacity: thumbsScale,
            marginTop: isSmallScreen ? -60 : -70,
            width: '100%',
          }}>
            <Text style={styles.sub}>Tap to select thumbnails</Text>
            <FlatList
              data={thumbs}
              renderItem={renderItem}
              keyExtractor={item => item.quality}
              numColumns={isLandscape ? 3 : 2}
              scrollEnabled={false}
              contentContainerStyle={styles.thumbGrid}
              columnWrapperStyle={isLandscape ? undefined : styles.columnWrapper}
            />
          </Animated.View>
        )}
      </ScrollView>

      {selected.length > 0 && (
        <Animated.View
          style={[
            styles.downloadBtnWrapper,
            isLandscape && { bottom: 10 },
            isSmallScreen && { bottom: 5 },
            {
              shadowOpacity: pulseAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0.3, 1]
              }),
              shadowRadius: pulseAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [8, 15]
              })
            }
          ]}
        >
          <TouchableOpacity
            style={styles.downloadBtn}
            onPress={downloadThumbs}
            disabled={downloading}
          >
            <Text style={styles.searchText}>
              {downloading ? 'Downloading...' : 'Download Selected'}
            </Text>
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* Modal personalizado para alertas */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>{modalTitle}</Text>
            <Text style={styles.modalMessage}>{modalMessage}</Text>
            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.modalButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: DARK_BG,
    paddingTop: Constants.statusBarHeight,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
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
    paddingBottom: 20
  },
  columnWrapper: {
    justifyContent: 'center',
  },
  thumbContainer: {
    borderWidth: 2,
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
    fontSize: 12,
    paddingBottom: 5
  },
  downloadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(30, 30, 30, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8
  },
  downloadBtnWrapper: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    alignItems: 'center',
    shadowColor: SELECT_COLOR,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 15,
    elevation: 15,
  },
  downloadBtn: {
    backgroundColor: SELECT_COLOR,
    padding: 14,
    borderRadius: 30,
    alignItems: 'center',
    width: '100%',
    marginTop: -90
  },
  // Estilos para el modal personalizado
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: MODAL_BG,
    borderRadius: 15,
    padding: 25,
    width: '90%',
    maxWidth: 400,
    borderWidth: 1,
    borderColor: ACCENT,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: ACCENT,
    marginBottom: 15,
    textAlign: 'center',
  },
  modalMessage: {
    fontSize: 16,
    color: TEXT_COLOR,
    marginBottom: 20,
    textAlign: 'center',
    lineHeight: 22,
  },
  modalButton: {
    backgroundColor: ACCENT,
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    marginTop: 10,
  },
  modalButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});