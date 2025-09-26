import * as React from 'react';
import { createContext, cn } from '../../lib/utils';
import { Slot } from '@radix-ui/react-slot';
import * as Dialog from '@radix-ui/react-dialog';

// Types
interface Point {
  x: number;
  y: number;
}

interface Annotation {
  id: string;
  point: Point;
  text: string;
  type: 'finding' | 'measurement' | 'note';
}

interface AnnotationState {
  annotations: Annotation[];
  isActive: boolean;
  selectedAnnotation: string | null;
}

interface AnnotationContextValue extends AnnotationState {
  addAnnotation: (annotation: Omit<Annotation, 'id'>) => void;
  removeAnnotation: (id: string) => void;
  updateAnnotation: (id: string, updates: Partial<Omit<Annotation, 'id'>>) => void;
  setIsActive: (active: boolean) => void;
  setSelectedAnnotation: (id: string | null) => void;
}

// Context
const [AnnotationProvider, useAnnotationContext] = createContext<AnnotationContextValue>('Annotation');

// Root component
interface AnnotationProps {
  children: React.ReactNode;
  className?: string;
}

export function Annotation({ children, className }: AnnotationProps) {
  const [state, setState] = React.useState<AnnotationState>({
    annotations: [],
    isActive: false,
    selectedAnnotation: null,
  });

  const addAnnotation = React.useCallback((annotation: Omit<Annotation, 'id'>) => {
    setState(prev => ({
      ...prev,
      annotations: [...prev.annotations, { ...annotation, id: crypto.randomUUID() }],
    }));
  }, []);

  const removeAnnotation = React.useCallback((id: string) => {
    setState(prev => ({
      ...prev,
      annotations: prev.annotations.filter(a => a.id !== id),
      selectedAnnotation: prev.selectedAnnotation === id ? null : prev.selectedAnnotation,
    }));
  }, []);

  const updateAnnotation = React.useCallback((id: string, updates: Partial<Omit<Annotation, 'id'>>) => {
    setState(prev => ({
      ...prev,
      annotations: prev.annotations.map(a =>
        a.id === id ? { ...a, ...updates } : a
      ),
    }));
  }, []);

  const setIsActive = React.useCallback((active: boolean) => {
    setState(prev => ({
      ...prev,
      isActive: active,
    }));
  }, []);

  const setSelectedAnnotation = React.useCallback((id: string | null) => {
    setState(prev => ({
      ...prev,
      selectedAnnotation: id,
    }));
  }, []);

  return (
    <AnnotationProvider
      {...state}
      addAnnotation={addAnnotation}
      removeAnnotation={removeAnnotation}
      updateAnnotation={updateAnnotation}
      setIsActive={setIsActive}
      setSelectedAnnotation={setSelectedAnnotation}
    >
      <div
        className={cn(
          'relative inline-flex items-center gap-2',
          className
        )}
        role="toolbar"
        aria-label="Annotation tools"
      >
        {children}
      </div>
    </AnnotationProvider>
  );
}

// Sub-components
interface ToggleProps {
  children?: React.ReactNode;
  className?: string;
}

function Toggle({ children, className }: ToggleProps) {
  const { isActive, setIsActive } = useAnnotationContext('Annotation.Toggle');

  return (
    <button
      type="button"
      className={cn(
        'inline-flex items-center justify-center rounded-md p-2',
        'bg-white text-neutral-900 hover:bg-neutral-100',
        'dark:bg-neutral-800 dark:text-neutral-100 dark:hover:bg-neutral-700',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500',
        isActive && 'bg-primary-100 dark:bg-primary-900',
        className
      )}
      onClick={() => setIsActive(!isActive)}
      aria-pressed={isActive}
    >
      {children}
    </button>
  );
}

interface MarkerProps {
  className?: string;
  size?: number;
  color?: string;
}

function Markers({ className, size = 24, color = 'currentColor' }: MarkerProps) {
  const { annotations, selectedAnnotation, setSelectedAnnotation } = useAnnotationContext('Annotation.Markers');

  return (
    <svg
      className={cn('absolute left-0 top-0 h-full w-full pointer-events-none', className)}
      style={{ overflow: 'visible' }}
    >
      {annotations.map((annotation) => (
        <g
          key={annotation.id}
          transform={`translate(${annotation.point.x}, ${annotation.point.y})`}
          className="cursor-pointer"
          onClick={() => setSelectedAnnotation(annotation.id)}
          role="button"
          aria-label={`Annotation: ${annotation.text}`}
          tabIndex={0}
        >
          <circle
            r={size / 2}
            fill={selectedAnnotation === annotation.id ? 'rgba(0, 102, 204, 0.2)' : 'transparent'}
            stroke={color}
            strokeWidth={2}
          />
          <text
            x={size / 2 + 4}
            y={4}
            fontSize={12}
            fill={color}
            className="pointer-events-none"
          >
            {annotation.text}
          </text>
        </g>
      ))}
    </svg>
  );
}

interface EditorProps {
  children?: React.ReactNode;
  className?: string;
}

function Editor({ children, className }: EditorProps) {
  const {
    selectedAnnotation,
    annotations,
    updateAnnotation,
    removeAnnotation,
    setSelectedAnnotation,
  } = useAnnotationContext('Annotation.Editor');

  const selectedAnnotationData = annotations.find(a => a.id === selectedAnnotation);

  if (!selectedAnnotation || !selectedAnnotationData) return null;

  return (
    <Dialog.Root open={!!selectedAnnotation} onOpenChange={() => setSelectedAnnotation(null)}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50" />
        <Dialog.Content
          className={cn(
            'fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2',
            'w-full max-w-md rounded-lg bg-white p-6 shadow-lg',
            'dark:bg-neutral-800',
            'focus:outline-none',
            className
          )}
        >
          <Dialog.Title className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
            Edit Annotation
          </Dialog.Title>
          <div className="mt-4">
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
              Type
              <select
                value={selectedAnnotationData.type}
                onChange={(e) => updateAnnotation(selectedAnnotation, {
                  type: e.target.value as 'finding' | 'measurement' | 'note'
                })}
                className="mt-1 block w-full rounded-md border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
              >
                <option value="finding">Finding</option>
                <option value="measurement">Measurement</option>
                <option value="note">Note</option>
              </select>
            </label>
            <label className="mt-4 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
              Text
              <textarea
                value={selectedAnnotationData.text}
                onChange={(e) => updateAnnotation(selectedAnnotation, { text: e.target.value })}
                className="mt-1 block w-full rounded-md border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                rows={3}
              />
            </label>
          </div>
          <div className="mt-6 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => removeAnnotation(selectedAnnotation)}
              className="rounded-md bg-red-500 px-4 py-2 text-white hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
            >
              Delete
            </button>
            <Dialog.Close className="rounded-md bg-neutral-100 px-4 py-2 text-neutral-700 hover:bg-neutral-200 focus:outline-none focus:ring-2 focus:ring-neutral-500 focus:ring-offset-2">
              Close
            </Dialog.Close>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

// Compound components
Annotation.Toggle = Toggle;
Annotation.Markers = Markers;
Annotation.Editor = Editor;

// Export
export { Annotation };