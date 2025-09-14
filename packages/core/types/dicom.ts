/**
 * DICOM data types and interfaces for medical imaging
 */

/**
 * DICOM Value Representation (VR) types
 */
export type VR = 
  | 'AE' // Application Entity
  | 'AS' // Age String
  | 'AT' // Attribute Tag
  | 'CS' // Code String
  | 'DA' // Date
  | 'DS' // Decimal String
  | 'DT' // Date Time
  | 'FL' // Floating Point Single
  | 'FD' // Floating Point Double
  | 'IS' // Integer String
  | 'LO' // Long String
  | 'LT' // Long Text
  | 'OB' // Other Byte
  | 'OD' // Other Double
  | 'OF' // Other Float
  | 'OL' // Other Long
  | 'OV' // Other Very Long
  | 'OW' // Other Word
  | 'PN' // Person Name
  | 'SH' // Short String
  | 'SL' // Signed Long
  | 'SQ' // Sequence of Items
  | 'SS' // Signed Short
  | 'ST' // Short Text
  | 'SV' // Signed Very Long
  | 'TM' // Time
  | 'UC' // Unlimited Characters
  | 'UI' // Unique Identifier
  | 'UL' // Unsigned Long
  | 'UN' // Unknown
  | 'UR' // Universal Resource Identifier
  | 'US' // Unsigned Short
  | 'UT' // Unlimited Text
  | 'UV'; // Unsigned Very Long

/**
 * DICOM data element interface
 */
export interface DicomElement {
  /** DICOM tag in format 'GGGG,EEEE' */
  tag: string;
  /** Value Representation */
  vr: VR;
  /** Element value */
  value: any;
  /** Value length */
  length: number;
  /** Optional sequence items for SQ VR */
  items?: DicomDataset[];
}

/**
 * DICOM dataset - collection of DICOM elements
 */
export interface DicomDataset {
  [tag: string]: DicomElement;
}

/**
 * DICOM file metadata
 */
export interface DicomMetadata {
  /** Transfer Syntax UID */
  transferSyntaxUID: string;
  /** Media Storage SOP Class UID */
  mediaStorageSOPClassUID: string;
  /** Media Storage SOP Instance UID */
  mediaStorageSOPInstanceUID: string;
  /** Implementation Class UID */
  implementationClassUID: string;
  /** Implementation Version Name */
  implementationVersionName?: string;
}

/**
 * DICOM image information
 */
export interface DicomImageInfo {
  /** Number of rows */
  rows: number;
  /** Number of columns */
  columns: number;
  /** Number of frames */
  numberOfFrames?: number;
  /** Bits allocated per pixel */
  bitsAllocated: number;
  /** Bits stored per pixel */
  bitsStored: number;
  /** High bit position */
  highBit: number;
  /** Pixel representation (0=unsigned, 1=signed) */
  pixelRepresentation: number;
  /** Samples per pixel */
  samplesPerPixel: number;
  /** Photometric interpretation */
  photometricInterpretation: string;
  /** Planar configuration */
  planarConfiguration?: number;
  /** Pixel spacing [row, column] */
  pixelSpacing?: [number, number];
  /** Slice thickness */
  sliceThickness?: number;
}

/**
 * DICOM patient information
 */
export interface DicomPatient {
  /** Patient name */
  name: string;
  /** Patient ID */
  id: string;
  /** Patient birth date */
  birthDate?: string;
  /** Patient sex */
  sex?: 'M' | 'F' | 'O' | '';
  /** Patient age */
  age?: string;
  /** Patient weight */
  weight?: number;
  /** Patient size (height) */
  size?: number;
}

/**
 * DICOM study information
 */
export interface DicomStudy {
  /** Study Instance UID */
  instanceUID: string;
  /** Study ID */
  id?: string;
  /** Study date */
  date?: string;
  /** Study time */
  time?: string;
  /** Study description */
  description?: string;
  /** Accession number */
  accessionNumber?: string;
  /** Referring physician name */
  referringPhysicianName?: string;
}

/**
 * DICOM series information
 */
export interface DicomSeries {
  /** Series Instance UID */
  instanceUID: string;
  /** Series number */
  number?: number;
  /** Series date */
  date?: string;
  /** Series time */
  time?: string;
  /** Series description */
  description?: string;
  /** Modality */
  modality: string;
  /** Body part examined */
  bodyPartExamined?: string;
  /** Protocol name */
  protocolName?: string;
}

/**
 * DICOM instance information
 */
export interface DicomInstance {
  /** SOP Instance UID */
  sopInstanceUID: string;
  /** SOP Class UID */
  sopClassUID: string;
  /** Instance number */
  instanceNumber?: number;
  /** Content date */
  contentDate?: string;
  /** Content time */
  contentTime?: string;
  /** Acquisition date */
  acquisitionDate?: string;
  /** Acquisition time */
  acquisitionTime?: string;
}

/**
 * Complete DICOM file structure
 */
export interface DicomFile {
  /** File metadata */
  metadata: DicomMetadata;
  /** DICOM dataset */
  dataset: DicomDataset;
  /** Patient information */
  patient: DicomPatient;
  /** Study information */
  study: DicomStudy;
  /** Series information */
  series: DicomSeries;
  /** Instance information */
  instance: DicomInstance;
  /** Image information (if applicable) */
  image?: DicomImageInfo;
  /** Pixel data */
  pixelData?: ArrayBuffer;
}

/**
 * DICOM parsing options
 */
export interface DicomParseOptions {
  /** Whether to parse pixel data */
  includePixelData?: boolean;
  /** Whether to stop at first error */
  stopAtFirstError?: boolean;
  /** Maximum file size to parse (in bytes) */
  maxFileSize?: number;
  /** Whether to validate DICOM format strictly */
  strictValidation?: boolean;
  /** Custom transfer syntax handlers */
  transferSyntaxHandlers?: Map<string, (data: ArrayBuffer) => ArrayBuffer>;
}

/**
 * DICOM parsing result
 */
export interface DicomParseResult {
  /** Parsed DICOM file */
  dicomFile: DicomFile;
  /** Parsing warnings */
  warnings: string[];
  /** Parsing errors */
  errors: string[];
  /** Parse time in milliseconds */
  parseTime: number;
  /** File size in bytes */
  fileSize: number;
}

/**
 * DICOM modality types
 */
export type DicomModality = 
  | 'CR'  // Computed Radiography
  | 'CT'  // Computed Tomography
  | 'MR'  // Magnetic Resonance
  | 'NM'  // Nuclear Medicine
  | 'US'  // Ultrasound
  | 'XA'  // X-Ray Angiography
  | 'RF'  // Radiofluoroscopy
  | 'DX'  // Digital Radiography
  | 'MG'  // Mammography
  | 'PT'  // Positron Emission Tomography
  | 'SC'  // Secondary Capture
  | 'OT'  // Other
  | string; // Allow custom modalities

/**
 * DICOM transfer syntax UIDs
 */
export const TRANSFER_SYNTAX_UIDS = {
  IMPLICIT_VR_LITTLE_ENDIAN: '1.2.840.10008.1.2',
  EXPLICIT_VR_LITTLE_ENDIAN: '1.2.840.10008.1.2.1',
  EXPLICIT_VR_BIG_ENDIAN: '1.2.840.10008.1.2.2',
  JPEG_BASELINE: '1.2.840.10008.1.2.4.50',
  JPEG_LOSSLESS: '1.2.840.10008.1.2.4.57',
  JPEG_2000_LOSSLESS: '1.2.840.10008.1.2.4.90',
  JPEG_2000_LOSSY: '1.2.840.10008.1.2.4.91',
  RLE_LOSSLESS: '1.2.840.10008.1.2.5'
} as const;

/**
 * Common DICOM SOP Class UIDs
 */
export const SOP_CLASS_UIDS = {
  CT_IMAGE_STORAGE: '1.2.840.10008.5.1.4.1.1.2',
  MR_IMAGE_STORAGE: '1.2.840.10008.5.1.4.1.1.4',
  US_IMAGE_STORAGE: '1.2.840.10008.5.1.4.1.1.6.1',
  SECONDARY_CAPTURE_IMAGE_STORAGE: '1.2.840.10008.5.1.4.1.1.7',
  CR_IMAGE_STORAGE: '1.2.840.10008.5.1.4.1.1.1',
  DX_IMAGE_STORAGE: '1.2.840.10008.5.1.4.1.1.1.1'
} as const;