import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  StatusBar,
  Platform,
  SafeAreaView,
  useWindowDimensions,
  KeyboardAvoidingView,
  Animated,
  AppState,
} from 'react-native';
import NetInfo from '@react-native-community/netinfo';

import { useYouTubeThumbnails } from './hooks/useYouTubeThumbnails';
import { useThumbnailDownloader } from './hooks/useThumbnailDownloader';
import { useAppState } from './hooks/useAppState';
import { SearchForm } from './components/SearchForm';
import { ThumbnailGrid } from './components/ThumbnailGrid';
import { AlertModal } from './components/AlertModal';
import { LoadingIndicator } from './components/LoadingIndicator';
import { styles } from './styles';

export default function App() {
  const [url, setUrl] = useState('');
  const [hasSearched, setHasSearched] = useState(false);

  const {
    thumbs,
    loading,
    alert,
    showAlert,
    hideAlert,
    searchThumbnails,
    resetThumbnails,
  } = useYouTubeThumbnails();

  const {
    selected,
    downloading,
    toggleSelect,
    downloadSelected,
    resetSelection,
  } = useThumbnailDownloader(showAlert);

  const { height: windowHeight } = useWindowDimensions();
  const initialTranslateY = useRef(windowHeight * 0.3).current;
  const formTranslateY = useRef(new Animated.Value(initialTranslateY)).current;

  useAppState();

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
  }, [thumbs.length]);

  const resetAppState = (animate = true) => {
    resetThumbnails();
    resetSelection();
    setHasSearched(false);
    if (animate) {
      Animated.timing(formTranslateY, {
        toValue: initialTranslateY,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
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

    resetAppState(false);
    setHasSearched(true);

    const success = await searchThumbnails(url);
    
    if (success) {
      Animated.timing(formTranslateY, {
        toValue: 20,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      resetAppState();
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#121212" />
      <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
        <View style={styles.container}>
          <SearchForm
            url={url}
            setUrl={setUrl}
            loading={loading}
            onSearch={handleSearch}
            formTranslateY={formTranslateY}
          />

          <LoadingIndicator visible={loading && thumbs.length === 0} />

          <ThumbnailGrid
            thumbs={thumbs}
            selected={selected}
            toggleSelect={toggleSelect}
            loading={loading}
            hasSearched={hasSearched}
            onDownload={downloadSelected}
            downloading={downloading}
          />
        </View>
      </KeyboardAvoidingView>

      <AlertModal alert={alert} onClose={hideAlert} />
    </SafeAreaView>
  );
}