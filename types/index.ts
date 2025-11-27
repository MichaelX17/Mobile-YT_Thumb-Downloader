export interface ThumbData {
    url: string;
    quality: string;
    videoId: string;
    placeholder?: boolean;
}

export interface AlertState {
    visible: boolean;
    title: string;
    message: string;
    type: 'success' | 'error' | 'info';
}