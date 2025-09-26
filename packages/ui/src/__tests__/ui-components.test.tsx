import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { MeasurementTool } from '../components/measurement-tool';
import { Annotation } from '../components/annotation';
import { Tooltip } from '../components/tooltip';
import userEvent from '@testing-library/user-event';

expect.extend(toHaveNoViolations);

describe('UI Component Tests', () => {
  describe('MeasurementTool Component', () => {
    it('should render without accessibility violations', async () => {
      const { container } = render(
        <MeasurementTool.Provider>
          <MeasurementTool.Toggle />
          <MeasurementTool.UnitSelector />
          <MeasurementTool.Result />
          <MeasurementTool.Line />
        </MeasurementTool.Provider>
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should handle measurements correctly', async () => {
      render(
        <MeasurementTool.Provider>
          <MeasurementTool.Toggle />
          <MeasurementTool.UnitSelector />
          <MeasurementTool.Result />
          <MeasurementTool.Line />
        </MeasurementTool.Provider>
      );

      const toggle = screen.getByRole('button', { name: /toggle measurement/i });
      fireEvent.click(toggle);

      const unitSelector = screen.getByRole('combobox');
      fireEvent.change(unitSelector, { target: { value: 'mm' } });

      // Simulate measurement
      const line = screen.getByRole('presentation');
      fireEvent.mouseDown(line, { clientX: 0, clientY: 0 });
      fireEvent.mouseMove(line, { clientX: 100, clientY: 100 });
      fireEvent.mouseUp(line);

      const result = screen.getByRole('status');
      expect(result).toHaveTextContent(/measurement/i);
    });
  });

  describe('Annotation Component', () => {
    it('should render without accessibility violations', async () => {
      const { container } = render(
        <Annotation.Provider>
          <Annotation.Toggle />
          <Annotation.Markers />
          <Annotation.Editor />
        </Annotation.Provider>
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should handle annotation creation and editing', async () => {
      render(
        <Annotation.Provider>
          <Annotation.Toggle />
          <Annotation.Markers />
          <Annotation.Editor />
        </Annotation.Provider>
      );

      const toggle = screen.getByRole('button', { name: /toggle annotation/i });
      fireEvent.click(toggle);

      // Add annotation
      const markers = screen.getByRole('presentation');
      fireEvent.click(markers, { clientX: 100, clientY: 100 });

      // Open editor
      const editor = await screen.findByRole('dialog');
      expect(editor).toBeInTheDocument();

      // Edit annotation
      const textInput = screen.getByRole('textbox');
      await userEvent.type(textInput, 'Test annotation');
      
      const saveButton = screen.getByRole('button', { name: /save/i });
      fireEvent.click(saveButton);

      // Verify annotation is saved
      expect(screen.getByText('Test annotation')).toBeInTheDocument();
    });
  });

  describe('Tooltip Component', () => {
    it('should render without accessibility violations', async () => {
      const { container } = render(
        <Tooltip.Provider>
          <Tooltip>
            <Tooltip.Trigger>Hover me</Tooltip.Trigger>
            <Tooltip.Content>Tooltip content</Tooltip.Content>
          </Tooltip>
        </Tooltip.Provider>
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should show and hide tooltip on hover', async () => {
      render(
        <Tooltip.Provider>
          <Tooltip>
            <Tooltip.Trigger>Hover me</Tooltip.Trigger>
            <Tooltip.Content>Tooltip content</Tooltip.Content>
          </Tooltip>
        </Tooltip.Provider>
      );

      const trigger = screen.getByText('Hover me');
      
      // Show tooltip
      fireEvent.mouseEnter(trigger);
      const tooltip = await screen.findByText('Tooltip content');
      expect(tooltip).toBeInTheDocument();

      // Hide tooltip
      fireEvent.mouseLeave(trigger);
      await waitFor(() => {
        expect(screen.queryByText('Tooltip content')).not.toBeInTheDocument();
      });
    });
  });

  describe('Component Integration', () => {
    it('should work together without conflicts', async () => {
      const { container } = render(
        <div>
          <Tooltip.Provider>
            <MeasurementTool.Provider>
              <Annotation.Provider>
                <div style={{ position: 'relative', width: 500, height: 500 }}>
                  <Tooltip>
                    <Tooltip.Trigger>
                      <MeasurementTool.Toggle />
                    </Tooltip.Trigger>
                    <Tooltip.Content>Toggle measurement tool</Tooltip.Content>
                  </Tooltip>

                  <MeasurementTool.UnitSelector />
                  <MeasurementTool.Result />
                  <MeasurementTool.Line />

                  <Annotation.Toggle />
                  <Annotation.Markers />
                  <Annotation.Editor />
                </div>
              </Annotation.Provider>
            </MeasurementTool.Provider>
          </Tooltip.Provider>
        </div>
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();

      // Test measurement tool with tooltip
      const measurementToggle = screen.getByRole('button', { name: /toggle measurement/i });
      fireEvent.mouseEnter(measurementToggle);
      expect(await screen.findByText('Toggle measurement tool')).toBeInTheDocument();

      // Test annotation functionality
      const annotationToggle = screen.getByRole('button', { name: /toggle annotation/i });
      fireEvent.click(annotationToggle);

      // Verify both tools can be active
      expect(measurementToggle).toBeEnabled();
      expect(annotationToggle).toBeEnabled();
    });
  });
});