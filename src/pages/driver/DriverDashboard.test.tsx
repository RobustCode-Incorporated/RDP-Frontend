import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import { DriverDashboard } from './DriverDashboard';
import { ToastProvider } from '../../components/feedback/ToastProvider';
import { apiError, mockApi, type MockApi } from '../../test/mockApi';
import { ASSIGNED_DRIVER, makeDelivery } from '../../test/fixtures';

const renderDriverDashboard = () =>
  render(
    <ToastProvider>
      <MemoryRouter initialEntries={['/driver']}>
        <DriverDashboard />
      </MemoryRouter>
    </ToastProvider>
  );

describe('DriverDashboard', () => {
  let apiMock: MockApi;

  beforeEach(() => {
    apiMock = mockApi();
  });

  it('loads my deliveries and shows customer, status and cash to collect', async () => {
    apiMock.on('GET', '/api/deliveries/me', [
      makeDelivery({ id: 8101, status: 'ASSIGNED', driver: ASSIGNED_DRIVER, cashToCollect: 34 }),
      makeDelivery({ id: 8100, status: 'DELIVERED', driver: ASSIGNED_DRIVER }),
    ]);

    renderDriverDashboard();

    expect(screen.getByText('Chargement des livraisons assignées...')).toBeInTheDocument();
    const card = await screen.findByRole('button', { name: /Livraison #8101/ });
    expect(within(card).getByText('Assignée')).toBeInTheDocument();
    expect(within(card).getByText(/Claire Client/)).toBeInTheDocument();
    expect(within(card).getByText(/Cash à encaisser : 34,00/)).toBeInTheDocument();
    // Delivered ones live in the history tab.
    expect(screen.queryByRole('button', { name: /Livraison #8100/ })).not.toBeInTheDocument();
  });

  it('shows an error when loading fails', async () => {
    apiMock.on('GET', '/api/deliveries/me', () => {
      throw apiError(400, 'No driver profile assigned to user');
    });

    renderDriverDashboard();

    expect(await screen.findByText('Aucun profil chauffeur n’est lié à votre compte.')).toBeInTheDocument();
  });

  it('walks pickup -> start -> complete and requires cash confirmation before "Marquer livrée"', async () => {
    const user = userEvent.setup();
    const base = { id: 8101, driver: ASSIGNED_DRIVER, paymentMode: 'CASH_ON_DELIVERY' as const, cashToCollect: 34 };
    apiMock
      .on('GET', '/api/deliveries/me', [makeDelivery({ ...base, status: 'ASSIGNED' })])
      .on('PUT', '/api/deliveries/8101/pickup', makeDelivery({ ...base, status: 'PICKED_UP', version: 2 }))
      .on('PUT', '/api/deliveries/8101/start', makeDelivery({ ...base, status: 'IN_TRANSIT', version: 3 }))
      .on('PUT', '/api/deliveries/8101/complete', makeDelivery({ ...base, status: 'DELIVERED', version: 4 }));

    renderDriverDashboard();
    await user.click(await screen.findByRole('button', { name: /Livraison #8101/ }));
    const dialog = screen.getByRole('dialog');

    await user.click(within(dialog).getByRole('button', { name: 'Marquer comme récupérée' }));
    await user.click(await within(dialog).findByRole('button', { name: 'Démarrer la livraison' }));

    const deliver = await within(dialog).findByRole('button', { name: 'Marquer livrée' });
    expect(deliver).toBeDisabled();
    await user.click(within(dialog).getByLabelText(/J’ai encaissé 34,00/));
    await user.click(deliver);

    await waitFor(() => expect(apiMock.callsTo('PUT', '/api/deliveries/8101/complete')).toHaveLength(1));
    expect(await within(dialog).findByText('Aucune action disponible pour ce statut.')).toBeInTheDocument();
    expect(apiMock.calls.filter((call) => call.method === 'PUT').map((call) => call.url)).toEqual([
      '/api/deliveries/8101/pickup',
      '/api/deliveries/8101/start',
      '/api/deliveries/8101/complete',
    ]);
  });

  it('reports a failure with a reason (FAILED, not CANCELLED)', async () => {
    const user = userEvent.setup();
    apiMock
      .on('GET', '/api/deliveries/me', [makeDelivery({ id: 8110, status: 'IN_TRANSIT', driver: ASSIGNED_DRIVER })])
      .on('PUT', '/api/deliveries/8110/fail', ({ body }) =>
        makeDelivery({ id: 8110, status: 'FAILED', failureReason: (body as { reason: string }).reason }));

    renderDriverDashboard();
    await user.click(await screen.findByRole('button', { name: /Livraison #8110/ }));
    const dialog = screen.getByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: 'Signaler un échec' }));
    await user.selectOptions(within(dialog).getByLabelText('Motif principal'), 'Adresse introuvable');
    await user.type(within(dialog).getByLabelText('Détails (optionnel)'), 'Pas de numéro 12');
    await user.click(within(dialog).getByRole('button', { name: 'Confirmer l’échec' }));

    await waitFor(() =>
      expect(apiMock.callsTo('PUT', '/api/deliveries/8110/fail')[0]?.body).toEqual({ reason: 'Adresse introuvable - Pas de numéro 12' })
    );
    expect(await within(dialog).findByText('Échec')).toBeInTheDocument();
    expect(within(dialog).getByText('Adresse introuvable - Pas de numéro 12')).toBeInTheDocument();
  });

  it('reloads when the server answers 409 on an action', async () => {
    const user = userEvent.setup();
    apiMock
      .on('GET', '/api/deliveries/me', [makeDelivery({ id: 8120, status: 'ASSIGNED', driver: ASSIGNED_DRIVER })])
      .on('PUT', '/api/deliveries/8120/pickup', () => {
        throw apiError(409, 'Cannot change delivery status from CANCELLED to PICKED_UP');
      });

    renderDriverDashboard();
    await user.click(await screen.findByRole('button', { name: /Livraison #8120/ }));
    apiMock.on('GET', '/api/deliveries/me', [makeDelivery({ id: 8120, status: 'CANCELLED', driver: ASSIGNED_DRIVER })]);
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Marquer comme récupérée' }));

    expect(await screen.findByText(/Transition impossible \(CANCELLED → PICKED_UP\)/)).toBeInTheDocument();
    await waitFor(() => expect(apiMock.callsTo('GET', '/api/deliveries/me').length).toBeGreaterThanOrEqual(2));
  });
});
