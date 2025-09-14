/**
 * DICOM-specific functionality
 */

import { DicomImage, DicomMetadata, DicomError } from './types';
import { generateImageId, isValidDicomUID } from './utils';

/**
 * DICOM tag constants
 */
export const DICOM_TAGS = {
  STUDY_INSTANCE_UID: '0020000D',
  SERIES_INSTANCE_UID: '0020000E',
  SOP_INSTANCE_UID: '00080018',
  PATIENT_NAME: '00100010',
  PATIENT_ID: '00100020',
  STUDY_DATE: '00080020',
  MODALITY: '00080060',
  INSTANCE_NUMBER: '00200013',
  SLICE_LOCATION: '00201041',
  IMAGE_POSITION: '00200032',
  IMAGE_ORIENTATION: '00200037',
  PIXEL_SPACING: '00280030',
  SLICE_THICKNESS: '00180050',
  WINDOW_CENTER: '00281050',
  WINDOW_WIDTH: '00281051',
  RESCALE_SLOPE: '00281053',
  RESCALE_INTERCEPT: '00281052',
  PHOTOMETRIC_INTERPRETATION: '00280004',
  SAMPLES_PER_PIXEL: '00280002',
  BITS_ALLOCATED: '00280100',
  BITS_STORED: '00280101',
  HIGH_BIT: '00280102',
  PIXEL_REPRESENTATION: '00280103',
} as const;

/**
 * Extract metadata from DICOM dataset
 * @param dataset DICOM dataset object
 * @returns Extracted metadata
 */
export function extractDicomMetadata(dataset: any): DicomMetadata {
  const getString = (tag: string): string | undefined => {
    const element = dataset.elements[tag];
    return element ? dataset.string(tag) : undefined;
  };

  const getNumber = (tag: string): number | undefined => {
    const element = dataset.elements[tag];
    return element ? dataset.floatString(tag) : undefined;
  };

  const getArray = (tag: string): number[] | undefined => {
    const element = dataset.elements[tag];
    if (!element) return undefined;
    const str = dataset.string(tag);
    return str ? str.split('\\').map(Number) : undefined;
  };

  const studyInstanceUID = getString(DICOM_TAGS.STUDY_INSTANCE_UID);
  const seriesInstanceUID = getString(DICOM_TAGS.SERIES_INSTANCE_UID);
  const sopInstanceUID = getString(DICOM_TAGS.SOP_INSTANCE_UID);

  if (!studyInstanceUID || !seriesInstanceUID || !sopInstanceUID) {
    throw new DicomError(
      'Missing required DICOM UIDs',
      'MISSING_UIDS',
      { studyInstanceUID, seriesInstanceUID, sopInstanceUID }
    );
  }

  return {
    studyInstanceUID,
    seriesInstanceUID,
    sopInstanceUID,
    patientName: getString(DICOM_TAGS.PATIENT_NAME),
    patientID: getString(DICOM_TAGS.PATIENT_ID),
    studyDate: getString(DICOM_TAGS.STUDY_DATE),
    modality: getString(DICOM_TAGS.MODALITY),
    instanceNumber: getNumber(DICOM_TAGS.INSTANCE_NUMBER),
    sliceLocation: getNumber(DICOM_TAGS.SLICE_LOCATION),
    imagePosition: getArray(DICOM_TAGS.IMAGE_POSITION) as [number, number, number],
    imageOrientation: getArray(DICOM_TAGS.IMAGE_ORIENTATION) as [number, number, number, number, number, number],
    pixelSpacing: getArray(DICOM_TAGS.PIXEL_SPACING) as [number, number],
    sliceThickness: getNumber(DICOM_TAGS.SLICE_THICKNESS),
  };
}

/**
 * Create DICOM image object from dataset
 * @param dataset DICOM dataset
 * @param metadata DICOM metadata
 * @returns DICOM image object
 */
export function createDicomImage(
  dataset: any,
  metadata: DicomMetadata
): DicomImage {
  const getNumber = (tag: string, defaultValue?: number): number | undefined => {
    const element = dataset.elements[tag];
    if (!element) return defaultValue;
    return dataset.floatString(tag) || defaultValue;
  };

  const getString = (tag: string): string | undefined => {
    const element = dataset.elements[tag];
    return element ? dataset.string(tag) : undefined;
  };

  // Get pixel data
  const pixelDataElement = dataset.elements['7FE00010'];
  if (!pixelDataElement) {
    throw new DicomError('No pixel data found in DICOM', 'NO_PIXEL_DATA');
  }

  const imageId = generateImageId(
    metadata.studyInstanceUID,
    metadata.seriesInstanceUID,
    metadata.sopInstanceUID
  );

  return {
    imageId,
    width: getNumber(DICOM_TAGS.SAMPLES_PER_PIXEL, 512) || 512,
    height: getNumber(DICOM_TAGS.SAMPLES_PER_PIXEL, 512) || 512,
    pixelData: pixelDataElement.dataOffset ? 
      dataset.byteArray.slice(
        pixelDataElement.dataOffset,
        pixelDataElement.dataOffset + pixelDataElement.length
      ) : new Uint8Array(0),
    windowCenter: getNumber(DICOM_TAGS.WINDOW_CENTER),
    windowWidth: getNumber(DICOM_TAGS.WINDOW_WIDTH),
    rescaleSlope: getNumber(DICOM_TAGS.RESCALE_SLOPE, 1),
    rescaleIntercept: getNumber(DICOM_TAGS.RESCALE_INTERCEPT, 0),
    photometricInterpretation: getString(DICOM_TAGS.PHOTOMETRIC_INTERPRETATION),
    samplesPerPixel: getNumber(DICOM_TAGS.SAMPLES_PER_PIXEL, 1),
    bitsAllocated: getNumber(DICOM_TAGS.BITS_ALLOCATED, 16),
    bitsStored: getNumber(DICOM_TAGS.BITS_STORED, 16),
    highBit: getNumber(DICOM_TAGS.HIGH_BIT, 15),
    pixelRepresentation: getNumber(DICOM_TAGS.PIXEL_REPRESENTATION, 0),
  };
}

/**
 * Validate DICOM metadata
 * @param metadata Metadata to validate
 * @returns True if valid
 */
export function validateDicomMetadata(metadata: DicomMetadata): boolean {
  return (
    isValidDicomUID(metadata.studyInstanceUID) &&
    isValidDicomUID(metadata.seriesInstanceUID) &&
    isValidDicomUID(metadata.sopInstanceUID)
  );
}