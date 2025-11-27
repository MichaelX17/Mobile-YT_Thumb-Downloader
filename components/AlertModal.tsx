import React from 'react';
import { Modal, View, Text, TouchableOpacity } from 'react-native';
import { AlertState } from '../types';
import { styles } from '../styles';

interface AlertModalProps {
    alert: AlertState;
    onClose: () => void;
}

export const AlertModal: React.FC<AlertModalProps> = ({ alert, onClose }) => {
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
        <Modal visible={alert.visible} transparent animationType="fade" onRequestClose={onClose}>
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
                    <TouchableOpacity style={styles.modalButton} onPress={onClose}>
                        <Text style={styles.modalButtonText}>OK</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
};