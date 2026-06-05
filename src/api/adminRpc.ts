import { invoke } from '@tauri-apps/api/core';

export async function adminRpc(method: string, params?: any) {
  try {
    const payload = await invoke('admin_rpc', { method, params });
    return payload;
  } catch (error) {
    throw new Error(typeof error === 'string' ? error : "RPC call failed");
  }
}
