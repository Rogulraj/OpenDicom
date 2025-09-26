import * as React from 'react';
import { MeasurementTool } from '../measurement-tool';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../tooltip';
import { Ruler, Move } from 'lucide-react';

export function MeasurementExample() {
  const [imageSize, setImageSize] = React.useState({ width: 0, height: 0 });
  const imageRef = React.useRef<HTMLImageElement>(null);

  React.useEffect(() => {
    if (imageRef.current) {
      setImageSize({
        width: imageRef.current.width,
        height: imageRef.current.height,
      });
    }
  }, []);

  const handleImageClick = (e: React.MouseEvent<HTMLImageElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    // Add point handling would go here
  };

  return (
    <div className="p-4">
      <TooltipProvider>
        <MeasurementTool defaultUnit="mm" defaultScale={0.2645833333}>
          <div className="flex items-center gap-2 mb-4">
            <Tooltip>
              <TooltipTrigger asChild>
                <MeasurementTool.Toggle>
                  <Ruler className="h-5 w-5" aria-hidden="true" />
                  <span className="sr-only">Toggle measurement tool</span>
                </MeasurementTool.Toggle>
              </TooltipTrigger>
              <TooltipContent>
                <p>Toggle measurement tool</p>
              </TooltipContent>
            </Tooltip>

            <MeasurementTool.UnitSelector className="w-20" />
            
            <MeasurementTool.Result>
              {(distance) => (
                <div className="flex items-center gap-2">
                  <Move className="h-4 w-4" aria-hidden="true" />
                  <span>{distance}</span>
                </div>
              )}
            </MeasurementTool.Result>
          </div>

          <div className="relative inline-block">
            <img
              ref={imageRef}
              src="/example-medical-image.jpg"
              alt="Medical scan"
              className="max-w-full h-auto"
              onClick={handleImageClick}
            />
            <MeasurementTool.Line
              className="pointer-events-none"
              strokeWidth={2}
              color="#0066CC"
            />
          </div>
        </MeasurementTool>
      </TooltipProvider>
    </div>
  );
}