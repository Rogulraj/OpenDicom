import { EventEmitter } from '../events/EventEmitter';
import { ViewportManager } from './ViewportManager';
import { ViewportLayout } from '../types/viewport';

export interface ImageMatchingRule {
  modality?: string;
  bodyPart?: string;
  studyDescription?: string;
  seriesDescription?: string;
  imageType?: string[];
  priority: number;
}

export interface ViewportProtocol {
  position: { row: number; column: number };
  imageMatchingRules: ImageMatchingRule[];
  initialOptions?: {
    windowLevel?: { window: number; level: number };
    orientation?: { x: number; y: number; z: number };
    syncGroup?: string;
  };
}

export interface HangingProtocol {
  id: string;
  name: string;
  description: string;
  layout: {
    rows: number;
    columns: number;
  };
  viewports: ViewportProtocol[];
  createdAt: number;
  modifiedAt: number;
  isDefault?: boolean;
}

interface ImageMetadata {
  instanceId: string;
  modality: string;
  bodyPart?: string;
  studyDescription?: string;
  seriesDescription?: string;
  imageType?: string[];
}

export class HangingProtocolEngine extends EventEmitter {
  private viewportManager: ViewportManager;
  private protocols: Map<string, HangingProtocol> = new Map();
  private activeProtocolId: string | null = null;

  constructor(viewportManager: ViewportManager) {
    super();
    this.viewportManager = viewportManager;
  }

  public registerProtocol(protocol: HangingProtocol): void {
    this.protocols.set(protocol.id, {
      ...protocol,
      createdAt: Date.now(),
      modifiedAt: Date.now()
    });
    this.emit('protocolRegistered', protocol);
  }

  public removeProtocol(protocolId: string): void {
    if (this.activeProtocolId === protocolId) {
      this.deactivateCurrentProtocol();
    }
    this.protocols.delete(protocolId);
    this.emit('protocolRemoved', protocolId);
  }

  public getProtocol(protocolId: string): HangingProtocol | undefined {
    return this.protocols.get(protocolId);
  }

  public getAllProtocols(): HangingProtocol[] {
    return Array.from(this.protocols.values());
  }

  public getDefaultProtocol(): HangingProtocol | undefined {
    return Array.from(this.protocols.values()).find(p => p.isDefault);
  }

  public async applyProtocol(protocolId: string, images: ImageMetadata[]): Promise<void> {
    const protocol = this.protocols.get(protocolId);
    if (!protocol) throw new Error(`Protocol ${protocolId} not found`);

    // Deactivate current protocol if exists
    await this.deactivateCurrentProtocol();

    // Set up new layout
    const layout: ViewportLayout = {
      rows: protocol.layout.rows,
      columns: protocol.layout.columns,
      viewportIds: []
    };

    // Create viewports according to protocol
    for (const viewportProtocol of protocol.viewports) {
      const matchedImage = this.findBestMatchingImage(viewportProtocol.imageMatchingRules, images);
      
      if (matchedImage) {
        const viewport = await this.viewportManager.createViewport({
          type: this.determineViewportType(matchedImage),
          imageId: matchedImage.instanceId,
          options: {
            ...viewportProtocol.initialOptions,
            position: {
              row: viewportProtocol.position.row,
              column: viewportProtocol.position.column
            }
          }
        });

        layout.viewportIds.push(viewport.id);
      }
    }

    // Update layout
    await this.viewportManager.setLayout(layout);

    this.activeProtocolId = protocolId;
    this.emit('protocolApplied', protocolId);
  }

  private async deactivateCurrentProtocol(): Promise<void> {
    if (this.activeProtocolId) {
      await this.viewportManager.clearViewports();
      this.activeProtocolId = null;
      this.emit('protocolDeactivated', this.activeProtocolId);
    }
  }

  private findBestMatchingImage(rules: ImageMatchingRule[], images: ImageMetadata[]): ImageMetadata | undefined {
    const scoredImages = images.map(image => ({
      image,
      score: this.calculateMatchScore(rules, image)
    }));

    scoredImages.sort((a, b) => b.score - a.score);
    return scoredImages[0]?.score > 0 ? scoredImages[0].image : undefined;
  }

  private calculateMatchScore(rules: ImageMatchingRule[], image: ImageMetadata): number {
    return rules.reduce((totalScore, rule) => {
      let ruleScore = 0;

      if (rule.modality && rule.modality === image.modality) ruleScore++;
      if (rule.bodyPart && rule.bodyPart === image.bodyPart) ruleScore++;
      if (rule.studyDescription && rule.studyDescription === image.studyDescription) ruleScore++;
      if (rule.seriesDescription && rule.seriesDescription === image.seriesDescription) ruleScore++;
      if (rule.imageType && image.imageType) {
        const matchingTypes = rule.imageType.filter(type => image.imageType?.includes(type));
        ruleScore += matchingTypes.length;
      }

      return totalScore + (ruleScore * rule.priority);
    }, 0);
  }

  private determineViewportType(image: ImageMetadata): 'stack' | 'volume' {
    // Simple logic - could be more sophisticated based on image metadata
    return image.modality === 'CT' || image.modality === 'MR' ? 'volume' : 'stack';
  }

  public destroy(): void {
    this.deactivateCurrentProtocol();
    this.removeAllListeners();
  }
}