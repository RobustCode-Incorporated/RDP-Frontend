import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RestaurantDashboard } from './RestaurantDashboard';
import { apiError, mockApi, type MockApi } from '../../test/mockApi';
import { ASSIGNED_DRIVER, makeDelivery, makeRestaurant } from '../../test/fixtures';

const renderDashboard = () =>
  render(
    <MemoryRouter initialEntries={['/restaurant']}>
      <RestaurantDashboard />
    </MemoryRouter>
  );

describe('RestaurantDashboard', () => {
  let apiMock: MockApi;

  beforeEach(() => {
    apiMock = mockApi()
      .on('GET', '/api/restaurants/me', makeRestaurant())
      .on('GET', /^\/api\/deliveries\?/, [])
      .on('GET', /^\/api\/deliveries\/\d+\/history$/, []);
  });

  it('loads active deliveries with French status badges and polls the contract query', async () => {
    apiMock.on('GET', /^\/api\/deliveries\?status=CREATED/, [
      makeDelivery({ id: 1, status: 'CREATED', readyAt: new Date().toISOString() }),
      makeDelivery({ id: 2, status: 'IN_TRANSIT', driver: ASSIGNED_DRIVER }),
    ]);

    renderDashboard();

    const first = await screen.findByRole('listitem', { name: 'Livraison #1' });
    expect(within(first).getByText('Créée')).toBeInTheDocument();
    expect(within(first).getByText('Prête au retrait')).toBeInTheDocument();
    const second = screen.getByRole('listitem', { name: 'Livraison #2' });
    expect(within(second).getByText('En route')).toBeInTheDocument();
    expect(within(second).getByText('Dan Driver')).toBeInTheDocument();
    // In transit: no cancel / ready actions for the restaurant.
    expect(within(second).queryByRole('button', { name: 'Annuler' })).not.toBeInTheDocument();
    expect(await screen.findByText('Chez Mama Africa')).toBeInTheDocument();

    expect(apiMock.callsTo('GET', /^\/api\/deliveries\?/)[0].url).toBe(
      '/api/deliveries?status=CREATED&status=ASSIGNED&status=PICKED_UP&status=IN_TRANSIT'
    );
  });

  it('requires a cash amount for cash on delivery before calling the API', async () => {
    const user = userEvent.setup();
    renderDashboard();

    const form = await screen.findByRole('form', { name: 'Nouvelle livraison' });
    await user.type(within(form).getByLabelText(/Nom du client/), 'Awa Diallo');
    await user.type(within(form).getByLabelText(/Téléphone du client/), '0470 12 34 56');
    await user.type(within(form).getByRole('combobox', { name: /Adresse de livraison/ }), 'Chaussée de Wavre 10, Ixelles');
    await user.click(within(form).getByLabelText(/Paiement à la livraison/));
    await user.click(within(form).getByRole('button', { name: 'Créer la livraison' }));

    expect(await within(form).findByText(/Montant à encaisser obligatoire/)).toBeInTheDocument();
    expect(apiMock.callsTo('POST', '/api/deliveries')).toHaveLength(0);
  });

  it('validates required fields and phone format client side', async () => {
    const user = userEvent.setup();
    renderDashboard();

    const form = await screen.findByRole('form', { name: 'Nouvelle livraison' });
    await user.type(within(form).getByLabelText(/Téléphone du client/), '12');
    await user.click(within(form).getByRole('button', { name: 'Créer la livraison' }));

    expect(within(form).getByText('Le nom du client est obligatoire.')).toBeInTheDocument();
    expect(within(form).getByText(/Numéro invalide/)).toBeInTheDocument();
    expect(within(form).getByText('L’adresse de livraison est obligatoire.')).toBeInTheDocument();
    expect(within(form).getByText('Choisissez un mode de paiement.')).toBeInTheDocument();
    expect(apiMock.callsTo('POST', '/api/deliveries')).toHaveLength(0);
  });

  it('creates a cash delivery with the contract payload and coordinates from Nominatim', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => [{ display_name: 'Avenue Louise 100, 1050 Ixelles, Belgique', lat: '50.8270', lon: '4.3640' }],
    }));
    vi.stubGlobal('fetch', fetchMock);
    apiMock.on('POST', '/api/deliveries', ({ body }) => makeDelivery({ id: 77, ...(body as object) }));

    renderDashboard();
    const form = await screen.findByRole('form', { name: 'Nouvelle livraison' });
    await user.type(within(form).getByLabelText(/Nom du client/), 'Awa Diallo');
    await user.type(within(form).getByLabelText(/Téléphone du client/), '+32 470 12 34 56');
    await user.type(within(form).getByRole('combobox', { name: /Adresse de livraison/ }), 'Avenue Louise 100');
    await user.click(await screen.findByRole('option', { name: /Avenue Louise 100, 1050 Ixelles/ }, { timeout: 3000 }));
    await user.type(within(form).getByLabelText(/Montant de la commande/), '31,50');
    await user.click(within(form).getByLabelText(/Paiement à la livraison/));
    const cash = within(form).getByLabelText(/Montant à encaisser/);
    expect(cash).toHaveValue('31,50');
    await user.clear(cash);
    await user.type(cash, '34');
    await user.click(within(form).getByRole('button', { name: 'Créer la livraison' }));

    await waitFor(() => expect(apiMock.callsTo('POST', '/api/deliveries')).toHaveLength(1));
    expect(apiMock.callsTo('POST', '/api/deliveries')[0].body).toEqual({
      customerName: 'Awa Diallo',
      customerPhone: '+32 470 12 34 56',
      deliveryAddress: 'Avenue Louise 100, 1050 Ixelles, Belgique',
      deliveryLatitude: 50.827,
      deliveryLongitude: 4.364,
      notes: null,
      orderReference: null,
      orderAmount: 31.5,
      paymentMode: 'CASH_ON_DELIVERY',
      cashToCollect: 34,
    });
    const url = String((fetchMock.mock.calls[0] as unknown[])[0]);
    expect(url).toContain('countrycodes=be');
    expect(url).toContain('q=Avenue+Louise+100');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(await screen.findByRole('listitem', { name: 'Livraison #77' })).toBeInTheDocument();
  });

  it('shows server fieldErrors under the matching inputs', async () => {
    const user = userEvent.setup();
    apiMock.on('POST', '/api/deliveries', () => {
      throw apiError(400, 'Validation failed', {
        customerPhone: 'Customer phone must be a valid phone number (8-15 digits, e.g. +32 470 12 34 56 or 0470 12 34 56)',
        deliveryLatitude: 'deliveryLatitude and deliveryLongitude must be provided together',
      });
    });

    renderDashboard();
    const form = await screen.findByRole('form', { name: 'Nouvelle livraison' });
    await user.type(within(form).getByLabelText(/Nom du client/), 'Awa');
    await user.type(within(form).getByLabelText(/Téléphone du client/), '0470123456');
    await user.type(within(form).getByRole('combobox', { name: /Adresse de livraison/ }), 'Rue X 1');
    await user.click(within(form).getByLabelText('Prépayée'));
    await user.click(within(form).getByRole('button', { name: 'Créer la livraison' }));

    expect(await within(form).findByText('Certains champs sont invalides.')).toBeInTheDocument();
    expect(within(form).getByText(/Numéro invalide/)).toBeInTheDocument();
    expect(within(form).getByText('Latitude et longitude doivent être fournies ensemble.')).toBeInTheDocument();
  });

  it('marks an order ready and cancels another with a reason', async () => {
    const user = userEvent.setup();
    apiMock
      .on('GET', /^\/api\/deliveries\?status=CREATED/, [
        makeDelivery({ id: 1, status: 'CREATED' }),
        makeDelivery({ id: 2, status: 'ASSIGNED', driver: ASSIGNED_DRIVER }),
      ])
      .on('PATCH', '/api/deliveries/1/ready', makeDelivery({ id: 1, status: 'CREATED', version: 1, readyAt: new Date().toISOString() }))
      .on('PATCH', '/api/deliveries/2/cancel', makeDelivery({ id: 2, status: 'CANCELLED', version: 2, cancellationReason: 'Client a annulé' }));

    renderDashboard();
    const first = await screen.findByRole('listitem', { name: 'Livraison #1' });
    await user.click(within(first).getByRole('button', { name: 'Commande prête' }));
    expect(await within(first).findByText('Prête au retrait')).toBeInTheDocument();
    expect(within(first).queryByRole('button', { name: 'Commande prête' })).not.toBeInTheDocument();

    const second = screen.getByRole('listitem', { name: 'Livraison #2' });
    await user.click(within(second).getByRole('button', { name: 'Annuler' }));
    await user.type(within(second).getByLabelText('Motif (optionnel)'), 'Client a annulé');
    await user.click(within(second).getByRole('button', { name: 'Confirmer l’annulation' }));

    await waitFor(() => expect(screen.queryByRole('listitem', { name: 'Livraison #2' })).not.toBeInTheDocument());
    expect(apiMock.callsTo('PATCH', '/api/deliveries/2/cancel')[0].body).toEqual({ reason: 'Client a annulé' });
  });

  it('opens the detail drawer with history timeline, driver contact and map', async () => {
    const user = userEvent.setup();
    apiMock
      .on('GET', /^\/api\/deliveries\?status=CREATED/, [makeDelivery({ id: 5, status: 'PICKED_UP', driver: ASSIGNED_DRIVER })])
      .on('GET', '/api/deliveries/5/history', [
        { id: 1, event: 'CREATED', oldStatus: null, newStatus: 'CREATED', changedBy: 'resto@test.be', note: null, createdAt: new Date().toISOString() },
        { id: 2, event: 'ASSIGNED', oldStatus: 'CREATED', newStatus: 'ASSIGNED', changedBy: 'admin@test.be', note: 'Assigned to driver #4', createdAt: new Date().toISOString() },
      ]);

    renderDashboard();
    const card = await screen.findByRole('listitem', { name: 'Livraison #5' });
    await user.click(within(card).getByRole('button', { name: 'Détails' }));

    const dialog = await screen.findByRole('dialog');
    expect(await within(dialog).findByText('Chauffeur assigné')).toBeInTheDocument();
    expect(within(dialog).getByText('Livraison créée')).toBeInTheDocument();
    expect(within(dialog).getByRole('link', { name: '+32470111222' })).toHaveAttribute('href', 'tel:+32470111222');
    expect(within(dialog).getByTestId('live-map')).toHaveTextContent('driver:Dan Driver');
    expect(within(dialog).getByText(/seul le chauffeur peut la clôturer/)).toBeInTheDocument();
  });

  it('loads finished deliveries for today on the "Terminées" tab', async () => {
    const user = userEvent.setup();
    apiMock.on('GET', /^\/api\/deliveries\?status=DELIVERED/, [
      makeDelivery({ id: 9, status: 'FAILED', failureReason: 'Client absent' }),
    ]);

    renderDashboard();
    await user.click(await screen.findByRole('tab', { name: 'Terminées' }));

    const card = await screen.findByRole('listitem', { name: 'Livraison #9' });
    expect(within(card).getByText('Échec')).toBeInTheDocument();
    expect(within(card).getByText(/Client absent/)).toBeInTheDocument();
    const doneCall = apiMock.callsTo('GET', /status=DELIVERED/)[0].url;
    expect(doneCall).toMatch(/status=DELIVERED&status=FAILED&status=CANCELLED&from=\d{4}-\d{2}-\d{2}&to=\d{4}-\d{2}-\d{2}$/);
  });
});
