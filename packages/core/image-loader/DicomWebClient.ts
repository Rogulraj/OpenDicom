interface DicomWebConfig {
  baseUrl: string;
  headers?: Record<string, string>;
  requestTimeout?: number;
}

interface StudyQuery {
  studyInstanceUID?: string;
  patientName?: string;
  patientID?: string;
  studyDate?: string;
  modality?: string;
}

interface SeriesQuery {
  studyInstanceUID: string;
  seriesInstanceUID?: string;
  modality?: string;
}

interface InstanceQuery {
  studyInstanceUID: string;
  seriesInstanceUID: string;
  sopInstanceUID?: string;
}

export class DicomWebClient {
  private config: DicomWebConfig;
  private controller: AbortController;

  constructor(config: DicomWebConfig) {
    this.config = {
      requestTimeout: 30000,
      ...config
    };
    this.controller = new AbortController();
  }

  // WADO-RS Methods

  async retrieveStudy(studyInstanceUID: string): Promise<ArrayBuffer> {
    return this.wadoRequest(
      `/studies/${studyInstanceUID}`,
      'application/dicom'
    );
  }

  async retrieveSeries(
    studyInstanceUID: string,
    seriesInstanceUID: string
  ): Promise<ArrayBuffer> {
    return this.wadoRequest(
      `/studies/${studyInstanceUID}/series/${seriesInstanceUID}`,
      'application/dicom'
    );
  }

  async retrieveInstance(
    studyInstanceUID: string,
    seriesInstanceUID: string,
    sopInstanceUID: string
  ): Promise<ArrayBuffer> {
    return this.wadoRequest(
      `/studies/${studyInstanceUID}/series/${seriesInstanceUID}/instances/${sopInstanceUID}`,
      'application/dicom'
    );
  }

  async retrieveFrame(
    studyInstanceUID: string,
    seriesInstanceUID: string,
    sopInstanceUID: string,
    frameNumber: number
  ): Promise<ArrayBuffer> {
    return this.wadoRequest(
      `/studies/${studyInstanceUID}/series/${seriesInstanceUID}/instances/${sopInstanceUID}/frames/${frameNumber}`,
      'application/octet-stream'
    );
  }

  // QIDO-RS Methods

  async searchForStudies(query: StudyQuery = {}): Promise<any[]> {
    const params = this.buildQueryParams(query);
    return this.qidoRequest('/studies' + params);
  }

  async searchForSeries(query: SeriesQuery): Promise<any[]> {
    const { studyInstanceUID, ...params } = query;
    const queryParams = this.buildQueryParams(params);
    return this.qidoRequest(
      `/studies/${studyInstanceUID}/series${queryParams}`
    );
  }

  async searchForInstances(query: InstanceQuery): Promise<any[]> {
    const { studyInstanceUID, seriesInstanceUID, ...params } = query;
    const queryParams = this.buildQueryParams(params);
    return this.qidoRequest(
      `/studies/${studyInstanceUID}/series/${seriesInstanceUID}/instances${queryParams}`
    );
  }

  // STOW-RS Methods

  async storeInstances(
    instances: ArrayBuffer[],
    studyInstanceUID?: string
  ): Promise<Response> {
    const url = studyInstanceUID
      ? `/studies/${studyInstanceUID}`
      : '/studies';
    
    const boundary = `----${Date.now().toString(16)}`;
    const parts: Blob[] = [];

    instances.forEach(instance => {
      parts.push(new Blob([
        `--${boundary}\r\n`,
        'Content-Type: application/dicom\r\n\r\n'
      ], { type: 'text/plain' }));
      
      parts.push(new Blob([instance]));
      parts.push(new Blob(['\r\n'], { type: 'text/plain' }));
    });

    parts.push(new Blob([
      `--${boundary}--\r\n`
    ], { type: 'text/plain' }));

    return this.request(url, {
      method: 'POST',
      headers: {
        'Content-Type': `multipart/related; type="application/dicom"; boundary=${boundary}`
      },
      body: new Blob(parts)
    });
  }

  // Helper Methods

  private async wadoRequest(
    path: string,
    acceptHeader: string
  ): Promise<ArrayBuffer> {
    const response = await this.request(path, {
      headers: {
        Accept: acceptHeader
      }
    });

    return response.arrayBuffer();
  }

  private async qidoRequest(path: string): Promise<any[]> {
    const response = await this.request(path, {
      headers: {
        Accept: 'application/dicom+json'
      }
    });

    return response.json();
  }

  private async request(
    path: string,
    options: RequestInit = {}
  ): Promise<Response> {
    const url = new URL(path, this.config.baseUrl);
    const timeout = this.config.requestTimeout!;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url.toString(), {
        ...options,
        headers: {
          ...this.config.headers,
          ...options.headers
        },
        signal: controller.signal
      });

      if (!response.ok) {
        throw new Error(
          `DICOMweb request failed: ${response.status} ${response.statusText}`
        );
      }

      return response;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private buildQueryParams(params: Record<string, any>): string {
    const queryParams = new URLSearchParams();
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        queryParams.append(key, value.toString());
      }
    });

    const queryString = queryParams.toString();
    return queryString ? `?${queryString}` : '';
  }

  abort(): void {
    this.controller.abort();
    this.controller = new AbortController();
  }
}