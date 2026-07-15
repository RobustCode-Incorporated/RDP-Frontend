import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { DetailDrawer } from './DetailDrawer';

describe('DetailDrawer accessibility', () => {
  it('closes on Escape from keyboard interactions', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    render(
      <div>
        <button type="button">Open drawer</button>
        <DetailDrawer
          isOpen
          title="Commande #100"
          subtitle="Detail commande"
          sections={[]}
          onClose={onClose}
        />
      </div>
    );

    const dialog = screen.getByRole('dialog');
    await user.keyboard('{Escape}');

    expect(onClose).toHaveBeenCalledTimes(1);

    const closeButton = screen.getByRole('button', { name: 'Fermer' });
    closeButton.focus();
    fireEvent.keyDown(dialog, { key: 'Escape' });

    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('keeps keyboard focus trapped in the drawer while open', () => {
    const onClose = vi.fn();

    render(
      <DetailDrawer
        isOpen
        title="Commande #101"
        subtitle="Detail commande"
        sections={[]}
        footer={<button type="button">Action secondaire</button>}
        onClose={onClose}
      />
    );

    const dialog = screen.getByRole('dialog');
    const closeButton = screen.getByRole('button', { name: 'Fermer' });
    const secondaryAction = screen.getByRole('button', { name: 'Action secondaire' });

    closeButton.focus();
    fireEvent.keyDown(dialog, { key: 'Tab', shiftKey: true });
    expect(secondaryAction).toHaveFocus();

    secondaryAction.focus();
    fireEvent.keyDown(dialog, { key: 'Tab' });
    expect(closeButton).toHaveFocus();

    expect(onClose).not.toHaveBeenCalled();
  });
});
