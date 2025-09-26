import * as React from 'react';
import { Annotation } from '../annotation';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../tooltip';
import { MessageSquare } from 'lucide-react';

export function AnnotationExample() {
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
    // Add annotation handling would go here
  };

  return (
    <div className="p-4">
      <TooltipProvider>
        <Annotation>
          <div className="flex items-center gap-2 mb-4">
            <Tooltip>
              <TooltipTrigger asChild>
                <Annotation.Toggle>
                  <MessageSquare className="h-5 w-5" aria-hidden="true" />
                  <span className="sr-only">Toggle annotation tool</span>
                </Annotation.Toggle>
              </TooltipTrigger>
              <TooltipContent>
                <p>Toggle annotation tool</p>
              </TooltipContent>
            </Tooltip>
          </div>

          <div className="relative inline-block">
            <img
              ref={imageRef}
              src="/example-medical-image.jpg"
              alt="Medical scan"
              className="max-w-full h-auto"
              onClick={handleImageClick}
            />
            <Annotation.Markers
              className="pointer-events-none"
              size={24}
              color="#0066CC"
            />
          </div>

          <Annotation.Editor />
        </Annotation>
      </TooltipProvider>
    </div>
  );
}