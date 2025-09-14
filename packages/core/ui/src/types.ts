/**
 * Types for DICOM UI components
 */

import type { ReactNode } from 'react';
import type { DicomImage, Viewport, Tool } from '@opendicom/core';

/**
 * Theme configuration
 */
export interface Theme {
  name: string;
  colors: {
    primary: string;
    secondary: string;
    background: string;
    surface: string;
    text: string;
    textSecondary: string;
    border: string;
    error: string;
    warning: string;
    success: string;
    info: string;
  };
  spacing: {
    xs: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
  };
  typography: {
    fontFamily: string;
    fontSize: {
      xs: string;
      sm: string;
      md: string;
      lg: string;
      xl: string;
    };
  };
  shadows: {
    sm: string;
    md: string;
    lg: string;
  };
}

/**
 * Component size variants
 */
export type ComponentSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

/**
 * Component variant types
 */
export type ComponentVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'link';

/**
 * Button component props
 */
export interface ButtonProps {
  children: ReactNode;
  variant?: ComponentVariant;
  size?: ComponentSize;
  disabled?: boolean;
  loading?: boolean;
  onClick?: () => void;
  className?: string;
}

/**
 * Toolbar component props
 */
export interface ToolbarProps {
  tools: Tool[];
  activeTool?: string;
  onToolSelect?: (toolName: string) => void;
  orientation?: 'horizontal' | 'vertical';
  className?: string;
}

/**
 * Viewport component props
 */
export interface ViewportComponentProps {
  viewport: Viewport;
  image?: DicomImage;
  onViewportChange?: (viewport: Viewport) => void;
  className?: string;
}

/**
 * Modal component props
 */
export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  size?: ComponentSize;
  className?: string;
}

/**
 * Toast notification types
 */
export type ToastType = 'success' | 'error' | 'warning' | 'info';

/**
 * Toast notification props
 */
export interface ToastProps {
  type: ToastType;
  message: string;
  duration?: number;
  onClose?: () => void;
}

/**
 * Loading spinner props
 */
export interface LoadingSpinnerProps {
  size?: ComponentSize;
  color?: string;
  className?: string;
}

/**
 * Progress bar props
 */
export interface ProgressBarProps {
  value: number;
  max?: number;
  size?: ComponentSize;
  variant?: 'determinate' | 'indeterminate';
  className?: string;
}