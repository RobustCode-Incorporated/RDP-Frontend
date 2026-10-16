import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AdminDashboard } from './AdminDashboard';
import { ToastProvider } from '../../components/feedback/ToastProvider';
import { apiError, mockApi, type MockApi } from '../../test/mockApi';
import { ASSIGNED_DRIVER, makeDelivery, makeDriver, makeRestaurant, makeUser } from '../../test/fixtures';
import { useAuthStore } from '../../store/useAuthStore';
import { makeTestJwt } from '../../test/jwt';

const renderAdminDashboard = () =>
  render(
    <ToastProvider>
      <MemoryRouter initialEntries={['/admin']}>
        <AdminDashboard />
      </MemoryRouter>
    </ToastProvider>
  );

const minutesAgo = (minutes: number) => new Date(Date.now() - minutes * 60000).toISOString();

describe('AdminDashboard', () => {
  let apiMock: MockApi;

  beforeEach(() => {
    useAuthStore.getState().setAuth({ id: 1, email: 'admin@test.be', role: 'ADMIN' }, makeTestJwt(3600));
    apiMock = mockApi()
      .on('GET', '/api/restaurants', [makeRestaurant()])
      .on('GET', '/api/drivers', [makeDriver(), makeDriver({ id: 5, userId: 13, firstName: 'Bob', availabilityStatus: 'BUSY' })])
      .on('GET', '/api/drivers/available', [makeDriver()])
      .on('GET', /^\/api\/deliveries\?/, [])
      .on('GET', /^\/api\/deliveries\/\d+\/history$/, [])
      .on('GET', /^\/api\/admin\/users/, []);
  });

  afterEach(() => {
    useAuthStore.getState().logout();
  });

  it('shows the CREATED queue oldest first, highlights ready ones and feeds the live map', async () => {
    apiMock.on('GET', /^\/api\/deliveries\?status=CREATED/, [
      makeDelivery({ id: 3, status: 'CREATED', createdAt: minutesAgo(2) }),
      makeDelivery({ id: 2, status: 'CREATED', createdAt: minutesAgo(10), readyAt: minutesAgo(1) }),
      makeDelivery({ id: 1, status: 'IN_TRANSIT', createdAt: minutesAgo(30), driver: ASSIGNED_DRIVER }),
    ]);

    renderAdminDashboard();

    expect(screen.getByText('Chargement des données admin...')).toBeInTheDocument();
    await screen.findByRole('listitem', { name: 'Livraison #2' });
    const queue = screen.getAllByRole('listitem', { name: /^Livraison #\d+$/ });
    expect(queue.map((item) => item.getAttribute('aria-label'))).toEqual(['Livraison #2', 'Livraison #3']);
    expect(within(queue[0]).getByText('Prête au retrait')).toBeInTheDocument();
    expect(screen.getByRole('listitem', { name: 'Livraison en cours #1' })).toHaveTextContent('En route');

    const map = screen.getByTestId('live-map');
    expect(map).toHaveTextContent('restaurant:Chez Mama Africa');
    expect(map).toHaveTextContent('driver:Dan Driver');
    expect(map).toHaveTextContent('destination:#2 Claire Client');
    expect(screen.getByText('1 en livraison · 2 au total')).toBeInTheDocument();
  });

  it('assigns an available driver (with distance) and refreshes the list after a 409', async () => {
    const user = userEvent.setup();
    apiMock
      .on('GET', /^\/api\/deliveries\?status=CREATED/, [makeDelivery({ id: 501, status: 'CREATED' })])
      .on('GET', '/api/drivers/available', [
        makeDriver(),
        makeDriver({ id: 6, userId: 14, firstName: 'Far', lastName: 'Away', currentLatitude: 51.2, currentLongitude: 4.4 }),
      ]);
    let attempts = 0;
    apiMock.on('PUT', '/api/deliveries/501/assign', ({ body }) => {
      attempts += 1;
      if (attempts === 1) throw apiError(409, 'Driver is not available. Current availability: BUSY');
      return makeDelivery({ id: 501, status: 'ASSIGNED', version: 1, driver: { ...ASSIGNED_DRIVER!, id: (body as { driverId: number }).driverId } });
    });

    renderAdminDashboard();
    const item = await screen.findByRole('listitem', { name: 'Livraison #501' });
    await user.click(within(item).getByRole('button', { name: 'Assigner' }));

    const dialog = await screen.findByRole('dialog');
    const options = await within(dialog).findAllByRole('button', { name: /^Assigner / });
    // Sorted by distance from the restaurant.
    expect(options.map((button) => button.getAttribute('aria-label'))).toEqual(['Assigner Dan Driver', 'Assigner Far Away']);
    expect(within(dialog).getByText(/à 1,\d km du restaurant/)).toBeInTheDocument();

    await user.click(options[0]);
    expect(await screen.findByText(/Le chauffeur n’est plus disponible \(BUSY\)/)).toBeInTheDocument();
    await waitFor(() => expect(apiMock.callsTo('GET', '/api/drivers/available')).toHaveLength(2));

    await user.click(await within(dialog).findByRole('button', { name: 'Assigner Far Away' }));
    await waitFor(() => expect(apiMock.callsTo('PUT', '/api/deliveries/501/assign')[1].body).toEqual({ driverId: 6 }));
    expect(await within(dialog).findByText('Assignée')).toBeInTheDocument();
    expect(await screen.findByRole('listitem', { name: 'Livraison en cours #501' })).toBeInTheDocument();
  });

  it('lists drivers pending approval and enables them', async () => {
    const user = userEvent.setup();
    apiMock
      .on('GET', '/api/admin/users?role=DRIVER&enabled=false', [makeUser({ id: 21, email: 'nina@test.be' })])
      .on('PATCH', '/api/admin/users/21/enable', makeUser({ id: 21, email: 'nina@test.be', enabled: true }));

    renderAdminDashboard();
    await user.click(screen.getByRole('button', { name: 'Chauffeurs' }));

    const row = await screen.findByRole('listitem', { name: 'Compte nina@test.be' });
    await user.click(within(row).getByRole('button', { name: 'Valider le compte' }));

    await waitFor(() => expect(screen.queryByRole('listitem', { name: 'Compte nina@test.be' })).not.toBeInTheDocument());
    expect(apiMock.callsTo('PATCH', '/api/admin/users/21/enable')).toHaveLength(1);
    expect(screen.getByText('Aucun compte chauffeur en attente.')).toBeInTheDocument();
    expect(await screen.findByText('Nina Nouvelle peut maintenant se connecter.')).toBeInTheDocument();
  });

  it('disables an active driver', async () => {
    const user = userEvent.setup();
    apiMock.on('PATCH', '/api/admin/users/12/disable', makeUser({ id: 12, email: 'drv@test.be', firstName: 'Dan', lastName: 'Driver' }));

    renderAdminDashboard();
    await user.click(screen.getByRole('button', { name: 'Chauffeurs' }));
    const disableButtons = await screen.findAllByRole('button', { name: 'Désactiver' });
    await user.click(disableButtons[0]);

    await waitFor(() => expect(apiMock.callsTo('PATCH', '/api/admin/users/12/disable')).toHaveLength(1));
    expect(await screen.findByRole('listitem', { name: 'Compte drv@test.be' })).toBeInTheDocument();
  });

  it('creates a restaurant with its manager account and saves the geocoded coordinates', async () => {
    const user = userEvent.setup();
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      json: async () => [{ display_name: 'Rue Haute 10, 1000 Bruxelles, Belgique', lat: '50.8400', lon: '4.3490' }],
    })));
    apiMock
      .on('POST', '/api/auth/register-restaurant', makeUser({ id: 30, role: 'RESTAURANT', enabled: true, email: 'gerant@test.be' }))
      .on('GET', '/api/restaurants', [makeRestaurant(), makeRestaurant({ id: 9, name: 'Saveurs du Congo', email: 'congo@test.be', latitude: null, longitude: null })])
      .on('PATCH', '/api/restaurants/9', ({ body }) => makeRestaurant({ id: 9, ...(body as object) }));

    renderAdminDashboard();
    await user.click(screen.getByRole('button', { name: 'Restaurants' }));
    await user.click(await screen.findByRole('button', { name: 'Ajouter un restaurant' }));
    const form = screen.getByRole('form', { name: 'Nouveau restaurant' });
    await user.type(within(form).getByLabelText(/Nom du restaurant/), 'Saveurs du Congo');
    await user.type(within(form).getByLabelText(/Téléphone/), '+32 2 555 00 00');
    await user.type(within(form).getByLabelText(/Email du restaurant/), 'congo@test.be');
    await user.type(within(form).getByRole('combobox', { name: /Adresse/ }), 'Rue Haute 10');
    await user.click(await screen.findByRole('option', { name: /Rue Haute 10, 1000 Bruxelles/ }, { timeout: 3000 }));
    await user.type(within(form).getByLabelText(/Prénom/), 'Grace');
    await user.type(within(form).getByLabelText(/^Nom \*/), 'Mbuyi');
    await user.type(within(form).getByLabelText(/Email de connexion/), 'gerant@test.be');
    await user.type(within(form).getByLabelText(/Mot de passe initial/), 'Secret123');
    await user.click(within(form).getByRole('button', { name: 'Créer le restaurant' }));

    await waitFor(() => expect(apiMock.callsTo('PATCH', '/api/restaurants/9')).toHaveLength(1));
    expect(apiMock.callsTo('POST', '/api/auth/register-restaurant')[0].body).toMatchObject({
      restaurantName: 'Saveurs du Congo',
      restaurantEmail: 'congo@test.be',
      address: 'Rue Haute 10, 1000 Bruxelles, Belgique',
      adminEmail: 'gerant@test.be',
      adminPassword: 'Secret123',
      adminFirstName: 'Grace',
      adminLastName: 'Mbuyi',
    });
    expect(apiMock.callsTo('PATCH', '/api/restaurants/9')[0].body).toEqual({ latitude: 50.84, longitude: 4.349 });
  });

  it('filters the all-deliveries table by status, restaurant and date', async () => {
    const user = userEvent.setup();
    apiMock.on('GET', /^\/api\/deliveries\?from=/, [
      makeDelivery({ id: 40, status: 'DELIVERED' }),
      makeDelivery({ id: 41, status: 'DELIVERED', restaurant: { ...makeDelivery().restaurant, id: 8, name: 'Le Baobab' } }),
    ]);
    apiMock.on('GET', /^\/api\/deliveries\?status=FAILED&from=2026-10-01&to=2026-10-01$/, [makeDelivery({ id: 42, status: 'FAILED' })]);

    renderAdminDashboard();
    await user.click(screen.getByRole('button', { name: 'Livraisons' }));
    expect(await screen.findByRole('button', { name: 'Voir la livraison #41' })).toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText('Restaurant'), 'Le Baobab');
    expect(screen.queryByRole('button', { name: 'Voir la livraison #40' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Voir la livraison #41' })).toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText('Restaurant'), 'Tous');
    await user.selectOptions(screen.getByLabelText('Statut'), 'Échec');
    const dateInput = screen.getByLabelText('Date');
    await user.clear(dateInput);
    await user.type(dateInput, '2026-10-01');
    expect(await screen.findByRole('button', { name: 'Voir la livraison #42' })).toBeInTheDocument();
  });

  it('shows an error banner when deliveries cannot be loaded', async () => {
    apiMock.on('GET', /^\/api\/deliveries\?/, () => {
      throw apiError(500, 'An unexpected error occurred');
    });

    renderAdminDashboard();

    expect(await screen.findByText('Erreur serveur inattendue, réessayez plus tard.')).toBeInTheDocument();
  });
});
