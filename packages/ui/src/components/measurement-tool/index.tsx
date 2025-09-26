import * as React from 'react';
import { createContext, cn } from '../../lib/utils';
import { Slot } from '@radix-ui/react-slot';
import { Tooltip } from '../tooltip';

// Types
interface Point {
  x: number;
  y: number;
}

interface MeasurementState {
  points: Point[];
  isActive: boolean;
  unit: 'mm' | 'cm' | 'px';
  scale: number;
}

interface MeasurementToolContextValue extends MeasurementState {
  addPoint: (point: Point) => void;
  clearPoints: () => void;
  setIsActive: (active: boolean) => void;
  setUnit: (unit: 'mm' | 'cm' | 'px') => void;
  setScale: (scale: number) => void;
}

// Context
const [MeasurementToolProvider, useMeasurementToolContext] = createContext<MeasurementToolContextValue>('MeasurementTool');

// Root component
interface MeasurementToolProps {
  children: React.ReactNode;
  defaultUnit?: 'mm' | 'cm' | 'px';
  defaultScale?: number;
  className?: string;
}

export function MeasurementTool({
  children,
  defaultUnit = 'mm',
  defaultScale = 1,
  className,
}: MeasurementToolProps) {
  const [state, setState] = React.useState<MeasurementState>({
    points: [],
    isActive: false,
    unit: defaultUnit,
    scale: defaultScale,
  });

  const addPoint = React.useCallback((point: Point) => {
    setState(prev => ({
      ...prev,
      points: [...prev.points, point],
    }));
  }, []);

  const clearPoints = React.useCallback(() => {
    setState(prev => ({
      ...prev,
      points: [],
    }));
  }, []);

  const setIsActive = React.useCallback((active: boolean) => {
    setState(prev => ({
      ...prev,
      isActive: active,
    }));
  }, []);

  const setUnit = React.useCallback((unit: 'mm' | 'cm' | 'px') => {
    setState(prev => ({
      ...prev,
      unit,
    }));
  }, []);

  const setScale = React.useCallback((scale: number) => {
    setState(prev => ({
      ...prev,
      scale,
    }));
  }, []);

  return (
    <MeasurementToolProvider
      {...state}
      addPoint={addPoint}
      clearPoints={clearPoints}
      setIsActive={setIsActive}
      setUnit={setUnit}
      setScale={setScale}
    >
      <div
        className={cn(
          'relative inline-flex items-center gap-2',
          className
        )}
        role="toolbar"
        aria-label="Measurement tools"
      >
        {children}
      </div>
    </MeasurementToolProvider>
  );
}

// Sub-components
interface ToggleProps {
  children?: React.ReactNode;
  className?: string;
}

function Toggle({ children, className }: ToggleProps) {
  const { isActive, setIsActive } = useMeasurementToolContext('MeasurementTool.Toggle');

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

interface UnitSelectorProps {
  className?: string;
}

function UnitSelector({ className }: UnitSelectorProps) {
  const { unit, setUnit } = useMeasurementToolContext('MeasurementTool.UnitSelector');

  return (
    <select
      value={unit}
      onChange={(e) => setUnit(e.target.value as 'mm' | 'cm' | 'px')}
      className={cn(
        'rounded-md border border-neutral-200 bg-white px-2 py-1',
        'dark:border-neutral-700 dark:bg-neutral-800',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500',
        className
      )}
      aria-label="Measurement unit"
    >
      <option value="mm">mm</option>
      <option value="cm">cm</option>
      <option value="px">px</option>
    </select>
  );
}

interface ResultProps {
  children?: React.ReactNode;
  className?: string;
}

function Result({ children, className }: ResultProps) {
  const { points, scale, unit } = useMeasurementToolContext('MeasurementTool.Result');

  const calculateDistance = React.useCallback(() => {
    if (points.length !== 2) return null;
    const [p1, p2] = points;
    const pixelDistance = Math.sqrt(
      Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2)
    );
    const scaledDistance = pixelDistance * scale;
    
    switch (unit) {
      case 'mm':
        return `${scaledDistance.toFixed(1)} mm`;
      case 'cm':
        return `${(scaledDistance / 10).toFixed(2)} cm`;
      case 'px':
        return `${pixelDistance.toFixed(0)} px`;
    }
  }, [points, scale, unit]);

  const distance = calculateDistance();

  if (!distance) return null;

  return (
    <div
      className={cn(
        'rounded-md bg-white px-3 py-1.5',
        'dark:bg-neutral-800',
        'text-sm font-medium',
        className
      )}
      role="status"
      aria-label="Measurement result"
    >
      {children ? children(distance) : distance}
    </div>
  );
}

interface LineProps {
  className?: string;
  strokeWidth?: number;
  color?: string;
}

function Line({ className, strokeWidth = 2, color = 'currentColor' }: LineProps) {
  const { points } = useMeasurementToolContext('MeasurementTool.Line');

  if (points.length !== 2) return null;

  const [p1, p2] = points;

  return (
    <svg
      className={cn('absolute left-0 top-0 h-full w-full pointer-events-none', className)}
      style={{ overflow: 'visible' }}
    >
      <line
        x1={p1.x}
        y1={p1.y}
        x2={p2.x}
        y2={p2.y}
        stroke={color}
        strokeWidth={strokeWidth}
        role="graphics-symbol"
        aria-label="Measurement line"
      />
    </svg>
  );
}

// Compound components
MeasurementTool.Toggle = Toggle;
MeasurementTool.UnitSelector = UnitSelector;
MeasurementTool.Result = Result;
MeasurementTool.Line = Line;

// Export
export { MeasurementTool };