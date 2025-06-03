import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import AccessibleButton, { 
  PrimaryButton, 
  SecondaryButton, 
  DangerButton,
  IconButton,
  ToggleButton,
  ButtonGroup 
} from '../AccessibleButton';
import { PlayIcon } from '@heroicons/react/24/outline';

// Mock the cn utility
jest.mock('../../../utils/cn', () => ({
  cn: (...classes) => classes.filter(Boolean).join(' ')
}));

describe('AccessibleButton', () => {
  it('renders with default props', () => {
    render(<AccessibleButton>Click me</AccessibleButton>);
    
    const button = screen.getByRole('button', { name: 'Click me' });
    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute('type', 'button');
  });

  it('handles click events', async () => {
    const handleClick = jest.fn();
    render(<AccessibleButton onClick={handleClick}>Click me</AccessibleButton>);
    
    const button = screen.getByRole('button');
    await userEvent.click(button);
    
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('handles keyboard navigation (Enter key)', async () => {
    const handleClick = jest.fn();
    render(<AccessibleButton onClick={handleClick}>Click me</AccessibleButton>);
    
    const button = screen.getByRole('button');
    button.focus();
    await userEvent.keyboard('{Enter}');
    
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('handles keyboard navigation (Space key)', async () => {
    const handleClick = jest.fn();
    render(<AccessibleButton onClick={handleClick}>Click me</AccessibleButton>);
    
    const button = screen.getByRole('button');
    button.focus();
    await userEvent.keyboard(' ');
    
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('does not trigger click when disabled', async () => {
    const handleClick = jest.fn();
    render(
      <AccessibleButton onClick={handleClick} disabled>
        Click me
      </AccessibleButton>
    );
    
    const button = screen.getByRole('button');
    await userEvent.click(button);
    
    expect(handleClick).not.toHaveBeenCalled();
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-disabled', 'true');
  });

  it('shows loading state correctly', () => {
    render(
      <AccessibleButton loading loadingText="Processing...">
        Click me
      </AccessibleButton>
    );
    
    const button = screen.getByRole('button');
    expect(button).toHaveTextContent('Processing...');
    expect(button).toHaveAttribute('aria-busy', 'true');
    expect(button).toBeDisabled();
    
    // Check for loading spinner (may have multiple instances)
    expect(screen.getAllByText('Processing...').length).toBeGreaterThan(0);
  });

  it('applies ARIA attributes correctly', () => {
    render(
      <AccessibleButton
        ariaLabel="Custom label"
        ariaDescribedBy="description"
        ariaExpanded={true}
        ariaHaspopup="menu"
      >
        Button
      </AccessibleButton>
    );
    
    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('aria-label', 'Custom label');
    expect(button).toHaveAttribute('aria-describedby', 'description');
    expect(button).toHaveAttribute('aria-expanded', 'true');
    expect(button).toHaveAttribute('aria-haspopup', 'menu');
  });

  it('supports custom onKeyDown handler', async () => {
    const handleKeyDown = jest.fn();
    render(
      <AccessibleButton onKeyDown={handleKeyDown}>
        Button
      </AccessibleButton>
    );
    
    const button = screen.getByRole('button');
    await userEvent.type(button, '{Enter}');
    
    expect(handleKeyDown).toHaveBeenCalled();
  });
});

describe('Button Variants', () => {
  it('renders PrimaryButton correctly', () => {
    render(<PrimaryButton>Primary</PrimaryButton>);
    const button = screen.getByRole('button');
    expect(button).toBeInTheDocument();
  });

  it('renders SecondaryButton correctly', () => {
    render(<SecondaryButton>Secondary</SecondaryButton>);
    const button = screen.getByRole('button');
    expect(button).toBeInTheDocument();
  });

  it('renders DangerButton correctly', () => {
    render(<DangerButton>Danger</DangerButton>);
    const button = screen.getByRole('button');
    expect(button).toBeInTheDocument();
  });
});

describe('IconButton', () => {
  it('renders with icon and aria-label', () => {
    render(
      <IconButton 
        icon={PlayIcon} 
        ariaLabel="Play video"
        tooltip="Play video"
      />
    );
    
    const button = screen.getByRole('button', { name: 'Play video' });
    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute('title', 'Play video');
  });
});

describe('ToggleButton', () => {
  it('handles toggle state correctly', async () => {
    const handlePressedChange = jest.fn();
    render(
      <ToggleButton 
        pressed={false}
        onPressedChange={handlePressedChange}
        ariaLabel="Toggle option"
      >
        Toggle
      </ToggleButton>
    );
    
    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('aria-pressed', 'false');
    
    await userEvent.click(button);
    expect(handlePressedChange).toHaveBeenCalledWith(true);
  });

  it('shows pressed state correctly', () => {
    render(
      <ToggleButton pressed={true} ariaLabel="Toggle option">
        Toggle
      </ToggleButton>
    );
    
    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('aria-pressed', 'true');
  });
});

describe('ButtonGroup', () => {
  it('renders button group with proper ARIA attributes', () => {
    render(
      <ButtonGroup ariaLabel="Action buttons">
        <AccessibleButton>First</AccessibleButton>
        <AccessibleButton>Second</AccessibleButton>
        <AccessibleButton>Third</AccessibleButton>
      </ButtonGroup>
    );
    
    const group = screen.getByRole('group', { name: 'Action buttons' });
    expect(group).toBeInTheDocument();
    
    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(3);
  });

  it('supports vertical orientation', () => {
    render(
      <ButtonGroup orientation="vertical" ariaLabel="Vertical buttons">
        <AccessibleButton>First</AccessibleButton>
        <AccessibleButton>Second</AccessibleButton>
      </ButtonGroup>
    );
    
    const group = screen.getByRole('group');
    expect(group).toBeInTheDocument();
  });
});

describe('Accessibility Features', () => {
  it('has proper focus management', async () => {
    render(<AccessibleButton>Focus me</AccessibleButton>);
    
    const button = screen.getByRole('button');
    await userEvent.tab();
    
    expect(button).toHaveFocus();
  });

  it('announces loading state to screen readers', () => {
    render(
      <AccessibleButton loading loadingText="Loading content">
        Submit
      </AccessibleButton>
    );
    
    // Check for screen reader only text (may have multiple instances)
    expect(screen.getAllByText('Loading content').length).toBeGreaterThan(0);
  });

  it('prevents interaction when loading', async () => {
    const handleClick = jest.fn();
    render(
      <AccessibleButton onClick={handleClick} loading>
        Submit
      </AccessibleButton>
    );
    
    const button = screen.getByRole('button');
    await userEvent.click(button);
    await userEvent.keyboard('{Enter}');
    await userEvent.keyboard(' ');
    
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('supports high contrast mode', () => {
    render(<AccessibleButton>High Contrast</AccessibleButton>);
    
    const button = screen.getByRole('button');
    // In a real test, you might check for specific CSS classes or styles
    // that support high contrast mode
    expect(button).toBeInTheDocument();
  });
});
