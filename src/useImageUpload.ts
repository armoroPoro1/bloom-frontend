import {useCallback, useEffect, useRef, useState} from 'react';
import {readImageFile} from './imageUpload';

export function useImageUpload(onReady: (dataUrl: string) => void) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [fileName, setFileName] = useState('');
  const sequence = useRef(0);
  const ready = useRef(onReady);
  ready.current = onReady;
  useEffect(() => () => { sequence.current++; }, []);
  const cancel = useCallback(() => {
    sequence.current++;
    setBusy(false); setError(''); setFileName('');
  }, []);
  const selectFile = useCallback(async (file?: File) => {
    if (!file) return false;
    const current = ++sequence.current;
    setBusy(true); setError(''); setFileName(file.name);
    try {
      const data = await readImageFile(file);
      if (sequence.current !== current) return false;
      ready.current(data);
      setBusy(false);
      return true;
    } catch (cause) {
      if (sequence.current !== current) return false;
      setBusy(false); setError(cause instanceof Error ? cause.message : 'อ่านรูปภาพไม่สำเร็จ กรุณาเลือกใหม่');
      return false;
    }
  }, []);
  return {busy, error, fileName, selectFile, cancel};
}
