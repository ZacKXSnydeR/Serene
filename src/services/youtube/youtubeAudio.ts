import { invoke } from '@tauri-apps/api/core';
import { YtDlpMetadata } from './types';

let cachedBrowser: string | null = null;

export async function getSupportedBrowser(): Promise<string> {
  if (cachedBrowser) return cachedBrowser;
  try {
    cachedBrowser = await invoke<string>('youtube_detect_browser');
    return cachedBrowser;
  } catch (error) {
    console.error('Failed to detect browser:', error);
    throw error;
  }
}

export async function extractAudioUrl(videoId: string): Promise<string> {
  try {
    const browser = await getSupportedBrowser();
    const audioUrl = await invoke<string>('youtube_extract_audio', { videoId, browser });
    return audioUrl;
  } catch (error) {
    console.error('Failed to extract YouTube audio:', error);
    throw error;
  }
}

export async function getYouTubeMetadata(videoId: string): Promise<YtDlpMetadata> {
  try {
    const browser = await getSupportedBrowser();
    const metadata = await invoke<YtDlpMetadata>('youtube_get_metadata', { videoId, browser });
    return metadata;
  } catch (error) {
    console.error('Failed to get YouTube metadata:', error);
    throw error;
  }
}
