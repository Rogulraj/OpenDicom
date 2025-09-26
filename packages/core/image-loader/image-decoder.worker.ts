import jpeg from 'jpeg-js';
import { decode as decodeJpegLS } from 'charls';
import { decode as decodeJpeg2000 } from 'openjpeg.js';

interface DecoderMessage {
  taskId: string;
  type: 'jpeg' | 'jpeg-ls' | 'jpeg2000' | 'raw';
  buffer: ArrayBuffer;
}

self.onmessage = async (event: MessageEvent<DecoderMessage>) => {
  const { taskId, type, buffer } = event.data;

  try {
    let decodedData: Uint8ClampedArray;

    switch (type) {
      case 'jpeg':
        decodedData = decodeJPEG(buffer);
        break;
      case 'jpeg-ls':
        decodedData = await decodeJPEGLS(buffer);
        break;
      case 'jpeg2000':
        decodedData = await decodeJPEG2000(buffer);
        break;
      case 'raw':
        decodedData = decodeRaw(buffer);
        break;
      default:
        throw new Error(`Unsupported decoder type: ${type}`);
    }

    self.postMessage({
      taskId,
      result: decodedData.buffer
    }, [decodedData.buffer]);
  } catch (error) {
    self.postMessage({
      taskId,
      error: error.message
    });
  }
};

function decodeJPEG(buffer: ArrayBuffer): Uint8ClampedArray {
  const jpegData = new Uint8Array(buffer);
  const decoded = jpeg.decode(jpegData, { useTArray: true });
  return new Uint8ClampedArray(decoded.data);
}

function decodeRaw(buffer: ArrayBuffer): Uint8ClampedArray {
  // Implement raw DICOM pixel data decoding
  // This is a placeholder implementation
  return new Uint8ClampedArray(buffer);
}

// Clean up when worker is terminated
self.addEventListener('unload', () => {
  // Perform any necessary cleanup
});