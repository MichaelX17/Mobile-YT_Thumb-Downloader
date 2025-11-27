export const qualityToResolutionMap: Record<string, string> = {
    maxresdefault: '1920x1080',
    sddefault: '640x480',
    hqdefault: '480x360',
    mqdefault: '320x180',
    default: '120x90',
};

export const extractFirstYouTubeUrl = (text: string): string | null => {
    const regex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com|youtu\.be)\/[^\s]+/g;
    const matches = text.match(regex);
    return matches?.[0] ?? null;
};

export const extractVideoId = (input: string): string | null => {
    try {
        const url = new URL(input.trim());

        if (url.hostname.includes('youtube.com')) {
            if (url.pathname === '/watch') {
                return url.searchParams.get('v');
            }

            const embedMatch = url.pathname.match(/^\/embed\/([a-zA-Z0-9_-]{11})/);
            if (embedMatch) return embedMatch[1];

            const shortsMatch = url.pathname.match(/^\/shorts\/([a-zA-Z0-9_-]{11})/);
            if (shortsMatch) return shortsMatch[1];
        }

        if (url.hostname === 'youtu.be') {
            const idMatch = url.pathname.match(/^\/([a-zA-Z0-9_-]{11})/);
            if (idMatch) return idMatch[1];
        }
    } catch {
        if (/^[a-zA-Z0-9_-]{11}$/.test(input.trim())) return input.trim();
    }

    return null;
};

export const checkThumbExists = async (url: string): Promise<boolean> => {
    try {
        const response = await fetch(url, { method: 'HEAD' });
        return response.ok && response.headers.get('content-type')?.startsWith('image/') === true;
    } catch {
        return false;
    }
};