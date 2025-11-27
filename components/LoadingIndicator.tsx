import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { styles } from '../styles';

interface LoadingIndicatorProps {
    visible: boolean;
}

export const LoadingIndicator: React.FC<LoadingIndicatorProps> = ({ visible }) => {
    if (!visible) return null;

    return (
        <ActivityIndicator size="large" color="#00ffff" style={styles.loadingIndicator} />
    );
};