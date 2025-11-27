import React from 'react';
import {
    View,
    TextInput,
    TouchableOpacity,
    Text,
    ActivityIndicator,
    Animated,
    Keyboard,
} from 'react-native';
import { styles } from '../styles';

interface SearchFormProps {
    url: string;
    setUrl: (url: string) => void;
    loading: boolean;
    onSearch: () => void;
    formTranslateY: Animated.Value;
}

export const SearchForm: React.FC<SearchFormProps> = ({
    url,
    setUrl,
    loading,
    onSearch,
    formTranslateY,
}) => {
    const handleSubmit = () => {
        Keyboard.dismiss();
        onSearch();
    };

    return (
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
                onSubmitEditing={handleSubmit}
                keyboardType="url"
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="search"
            />
            <TouchableOpacity
                style={[styles.button, loading && styles.buttonDisabled]}
                onPress={handleSubmit}
                disabled={loading}
                activeOpacity={0.7}
            >
                {loading ? <ActivityIndicator color="white" /> : <Text style={styles.buttonText}>Search</Text>}
            </TouchableOpacity>
        </Animated.View>
    );
};