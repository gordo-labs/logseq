import RNFS from 'react-native-fs';
import { dirname } from './path';

export async function ensureDirExists(dir: string): Promise<void> {
  if (!dir) return;
  const exists = await RNFS.exists(dir);
  if (!exists) {
    await RNFS.mkdir(dir);
  }
}

export async function writeFile(path: string, content: string): Promise<void> {
  await ensureDirExists(dirname(path));
  await RNFS.writeFile(path, content, 'utf8');
}

export async function fileExists(path: string): Promise<boolean> {
  return RNFS.exists(path);
}
