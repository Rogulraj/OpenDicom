/**
 * Mock DICOM data and utilities for testing medical imaging scenarios
 * This file contains synthetic data only - no real patient information
 */

import { DicomDataset, DicomElement, VR } from '../../types/dicom';

/**
 * Mock DICOM tags commonly used in medical imaging
 */
export const MOCK_DICOM_TAGS = {
  // Patient Information (anonymized)
  PATIENT_NAME: '0010,0010',
  PATIENT_ID: '0010,0020',
  PATIENT_BIRTH_DATE: '0010,0030',
  PATIENT_SEX: '0010,0040',
  
  // Study Information
  STUDY_INSTANCE_UID: '0020,000D',
  STUDY_DATE: '0008,0020',
  STUDY_TIME: '0008,0030',
  STUDY_DESCRIPTION: '0008,1030',
  
  // Series Information
  SERIES_INSTANCE_UID: '0020,000E',
  SERIES_NUMBER: '0020,0011',
  MODALITY: '0008,0060',
  
  // Image Information
  SOP_INSTANCE_UID: '0008,0018',
  INSTANCE_NUMBER: '0020,0013',
  ROWS: '0028,0010',
  COLUMNS: '0028,0011',
  BITS_ALLOCATED: '0028,0100',
  BITS_STORED: '0028,0101',
  PIXEL_DATA: '7FE0,0010'
};

/**
 * Creates a mock DICOM element
 */
export function createMockDicomElement(
  tag: string,
  vr: VR,
  value: any
): DicomElement {
  return {
    tag,
    vr,
    value,
    length: Array.isArray(value) ? value.length : String(value).length
  };
}

/**
 * Creates a mock DICOM dataset for testing
 */
export function createMockDicomDataset(overrides: Partial<DicomDataset> = {}): DicomDataset {
  const baseDataset: DicomDataset = {
    [MOCK_DICOM_TAGS.PATIENT_NAME]: createMockDicomElement(
      MOCK_DICOM_TAGS.PATIENT_NAME,
      'PN',
      'TEST^PATIENT^MOCK'
    ),
    [MOCK_DICOM_TAGS.PATIENT_ID]: createMockDicomElement(
      MOCK_DICOM_TAGS.PATIENT_ID,
      'LO',
      'TEST001'
    ),
    [MOCK_DICOM_TAGS.PATIENT_BIRTH_DATE]: createMockDicomElement(
      MOCK_DICOM_TAGS.PATIENT_BIRTH_DATE,
      'DA',
      '19900101'
    ),
    [MOCK_DICOM_TAGS.PATIENT_SEX]: createMockDicomElement(
      MOCK_DICOM_TAGS.PATIENT_SEX,
      'CS',
      'M'
    ),
    [MOCK_DICOM_TAGS.STUDY_INSTANCE_UID]: createMockDicomElement(
      MOCK_DICOM_TAGS.STUDY_INSTANCE_UID,
      'UI',
      '1.2.3.4.5.6.7.8.9.0.1.2.3.4.5'
    ),
    [MOCK_DICOM_TAGS.STUDY_DATE]: createMockDicomElement(
      MOCK_DICOM_TAGS.STUDY_DATE,
      'DA',
      '20240101'
    ),
    [MOCK_DICOM_TAGS.MODALITY]: createMockDicomElement(
      MOCK_DICOM_TAGS.MODALITY,
      'CS',
      'CT'
    ),
    [MOCK_DICOM_TAGS.ROWS]: createMockDicomElement(
      MOCK_DICOM_TAGS.ROWS,
      'US',
      512
    ),
    [MOCK_DICOM_TAGS.COLUMNS]: createMockDicomElement(
      MOCK_DICOM_TAGS.COLUMNS,
      'US',
      512
    ),
    [MOCK_DICOM_TAGS.BITS_ALLOCATED]: createMockDicomElement(
      MOCK_DICOM_TAGS.BITS_ALLOCATED,
      'US',
      16
    )
  };

  return { ...baseDataset, ...overrides };
}

/**
 * Creates mock pixel data for testing
 */
export function createMockPixelData(rows: number = 512, columns: number = 512): Uint16Array {
  const pixelData = new Uint16Array(rows * columns);
  
  // Create a simple gradient pattern for testing
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < columns; j++) {
      const index = i * columns + j;
      pixelData[index] = Math.floor((i + j) / 2) % 65536;
    }
  }
  
  return pixelData;
}

/**
 * Mock DICOM datasets for different modalities
 */
export const MOCK_DATASETS = {
  CT: createMockDicomDataset({
    [MOCK_DICOM_TAGS.MODALITY]: createMockDicomElement(
      MOCK_DICOM_TAGS.MODALITY,
      'CS',
      'CT'
    ),
    [MOCK_DICOM_TAGS.STUDY_DESCRIPTION]: createMockDicomElement(
      MOCK_DICOM_TAGS.STUDY_DESCRIPTION,
      'LO',
      'CT CHEST W/O CONTRAST'
    )
  }),
  
  MR: createMockDicomDataset({
    [MOCK_DICOM_TAGS.MODALITY]: createMockDicomElement(
      MOCK_DICOM_TAGS.MODALITY,
      'CS',
      'MR'
    ),
    [MOCK_DICOM_TAGS.STUDY_DESCRIPTION]: createMockDicomElement(
      MOCK_DICOM_TAGS.STUDY_DESCRIPTION,
      'LO',
      'MR BRAIN W/O CONTRAST'
    )
  }),
  
  US: createMockDicomDataset({
    [MOCK_DICOM_TAGS.MODALITY]: createMockDicomElement(
      MOCK_DICOM_TAGS.MODALITY,
      'CS',
      'US'
    ),
    [MOCK_DICOM_TAGS.STUDY_DESCRIPTION]: createMockDicomElement(
      MOCK_DICOM_TAGS.STUDY_DESCRIPTION,
      'LO',
      'ULTRASOUND ABDOMEN'
    )
  })
};

/**
 * Utility to create mock DICOM file buffer
 */
export function createMockDicomBuffer(dataset: DicomDataset = MOCK_DATASETS.CT): ArrayBuffer {
  // This is a simplified mock - in real implementation, this would create proper DICOM P10 format
  const mockHeader = new Uint8Array([
    0x44, 0x49, 0x43, 0x4D, // "DICM" prefix
    0x02, 0x00, 0x00, 0x00  // Transfer syntax
  ]);
  
  // Convert dataset to mock binary format
  const datasetBuffer = new TextEncoder().encode(JSON.stringify(dataset));
  
  const result = new ArrayBuffer(mockHeader.length + datasetBuffer.length);
  const view = new Uint8Array(result);
  
  view.set(mockHeader, 0);
  view.set(datasetBuffer, mockHeader.length);
  
  return result;
}

/**
 * Test utilities for medical imaging scenarios
 */
export const testUtils = {
  /**
   * Validates that no real patient data is present in test data
   */
  validateNoRealPatientData(dataset: DicomDataset): boolean {
    const patientName = dataset[MOCK_DICOM_TAGS.PATIENT_NAME]?.value;
    const patientId = dataset[MOCK_DICOM_TAGS.PATIENT_ID]?.value;
    
    // Check for common test patterns
    const isTestData = 
      String(patientName).includes('TEST') ||
      String(patientName).includes('MOCK') ||
      String(patientId).startsWith('TEST');
    
    return isTestData;
  },
  
  /**
   * Creates a mock DICOM series with multiple instances
   */
  createMockSeries(instanceCount: number = 10): DicomDataset[] {
    return Array.from({ length: instanceCount }, (_, index) => 
      createMockDicomDataset({
        [MOCK_DICOM_TAGS.INSTANCE_NUMBER]: createMockDicomElement(
          MOCK_DICOM_TAGS.INSTANCE_NUMBER,
          'IS',
          index + 1
        ),
        [MOCK_DICOM_TAGS.SOP_INSTANCE_UID]: createMockDicomElement(
          MOCK_DICOM_TAGS.SOP_INSTANCE_UID,
          'UI',
          `1.2.3.4.5.6.7.8.9.0.1.2.3.4.${index + 1}`
        )
      })
    );
  },
  
  /**
   * Simulates DICOM parsing performance for large files
   */
  async simulateParsingDelay(sizeInMB: number = 100): Promise<void> {
    // Simulate parsing time based on file size
    const delay = Math.min(sizeInMB * 10, 1000); // Max 1 second delay
    await new Promise(resolve => setTimeout(resolve, delay));
  }
};