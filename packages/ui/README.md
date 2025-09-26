# OpenDICOM UI Components

A medical-specific React component library built with accessibility and flexibility in mind. This library provides a set of components specifically designed for medical imaging applications, following WCAG 2.1 AA accessibility guidelines.

## Features

- 🏥 Medical-specific components
- ♿ WCAG 2.1 AA compliant
- 🎨 Customizable medical theme
- 🧩 Compound component patterns
- 🌗 Dark mode support
- 📏 Measurement tools
- ✍️ Annotation system

## Installation

```bash
npm install @open-dicom/ui
```

## Usage

### MeasurementTool

The MeasurementTool component provides a flexible way to add measurement capabilities to medical images:

```tsx
import { MeasurementTool } from '@open-dicom/ui';
import { Ruler } from 'lucide-react';

function ImageViewer() {
  return (
    <MeasurementTool defaultUnit="mm" defaultScale={0.2645833333}>
      <MeasurementTool.Toggle>
        <Ruler className="h-5 w-5" />
      </MeasurementTool.Toggle>

      <MeasurementTool.UnitSelector />
      
      <MeasurementTool.Result>
        {(distance) => <span>{distance}</span>}
      </MeasurementTool.Result>

      <div className="relative">
        <img src="medical-image.jpg" alt="Medical scan" />
        <MeasurementTool.Line strokeWidth={2} color="#0066CC" />
      </div>
    </MeasurementTool>
  );
}
```

### Annotation

The Annotation component allows for adding and managing annotations on medical images:

```tsx
import { Annotation } from '@open-dicom/ui';
import { MessageSquare } from 'lucide-react';

function ImageViewer() {
  return (
    <Annotation>
      <Annotation.Toggle>
        <MessageSquare className="h-5 w-5" />
      </Annotation.Toggle>

      <div className="relative">
        <img src="medical-image.jpg" alt="Medical scan" />
        <Annotation.Markers size={24} color="#0066CC" />
      </div>

      <Annotation.Editor />
    </Annotation>
  );
}
```

## Accessibility

All components are built with accessibility in mind, following WCAG 2.1 AA guidelines:

- Proper ARIA attributes
- Keyboard navigation support
- Screen reader friendly
- Sufficient color contrast
- Focus management
- Semantic HTML

## Theming

The library uses a medical-specific theme built on top of Tailwind CSS:

```js
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#0066CC',
          // ... other shades
        },
        critical: {
          DEFAULT: '#DC2626',
          // ... other shades
        },
        // ... other medical-specific colors
      }
    }
  }
}
```

## Contributing

We welcome contributions! Please see our contributing guidelines for more details.

## License

MIT