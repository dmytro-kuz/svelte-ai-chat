import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/svelte';
import Composer from './Composer.svelte';

afterEach(cleanup);

describe('Composer', () => {
  it('sends on Enter and clears the input', async () => {
    const onsend = vi.fn();
    render(Composer, { onsend, onstop: vi.fn() });
    const box = screen.getByLabelText('Message') as HTMLTextAreaElement;
    await fireEvent.input(box, { target: { value: 'Hello' } });
    await fireEvent.keyDown(box, { key: 'Enter' });
    expect(onsend).toHaveBeenCalledWith('Hello');
    expect(box.value).toBe('');
  });

  it('keeps a new line on Shift+Enter', async () => {
    const onsend = vi.fn();
    render(Composer, { onsend, onstop: vi.fn() });
    const box = screen.getByLabelText('Message');
    await fireEvent.input(box, { target: { value: 'Hello' } });
    await fireEvent.keyDown(box, { key: 'Enter', shiftKey: true });
    expect(onsend).not.toHaveBeenCalled();
  });

  it('disables send for blank input', () => {
    render(Composer, { onsend: vi.fn(), onstop: vi.fn() });
    expect((screen.getByLabelText('Send message') as HTMLButtonElement).disabled).toBe(true);
  });

  it('shows a stop button while streaming', async () => {
    const onstop = vi.fn();
    render(Composer, { onsend: vi.fn(), onstop, streaming: true });
    await fireEvent.click(screen.getByLabelText('Stop generating'));
    expect(onstop).toHaveBeenCalledOnce();
  });
});
