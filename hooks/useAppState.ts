import { useEffect } from 'react';
import { Platform } from 'react-native';
import * as NavigationBar from 'expo-navigation-bar';

export const useAppState = () => {
    useEffect(() => {
        if (Platform.OS === 'android') {
            NavigationBar.setBackgroundColorAsync('#121212').catch(console.warn);
            NavigationBar.setButtonStyleAsync('light').catch(console.warn);
        }
    }, []);
};