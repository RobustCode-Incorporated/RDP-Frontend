import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DriverDashboard } from './DriverDashboard';
import { completeDelivery, failDelivery, fetchMyDeliveries, pickupDelivery, startDelivery } from '../../api/driverApi';

vi.mock('../../api/driverApi', () => ({
  completeDelivery: vi.fn(),
  failDelivery: vi.fn(),
  fetchMyDeliveries: vi.fn(),
  pickupDelivery: vi.fn(),
  startDelivery: vi.fn(),
}));

const mockedFetchMyDeliveries = vi.mocked(fetchMyDeliveries);
const mockedPickupDelivery = vi.mocked(pickupDelivery);
const mockedStartDelivery = vi.mocked(startDelivery);
const mockedCompleteDelivery = vi.mocked(completeDelivery);
const mockedFailDelivery = vi.mocked(failDelivery);

const renderDriverDashboard = () =>
  render(
    <MemoryRouter initialEntries={['/driver']}>
      <DriverDashboard />
    </MemoryRouter>
  );

describe('DriverDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loads driver deliveries and renders the assignment cards', async () => {
    mockedFetchMyDeliveries.mockResolvedValue([
      {
        id: 8101,
        pickupAddress: 'Restaurant Centre - Plateau',
        deliveryAddress: 'Cocody, Rue des Jardins',
        description: 'Menu midi',
        status: 'ASSIGNED',
        createdAt: '2026-07-15T08:05:00',
        updatedAt: null,
        restaurant: { id: 10, name: 'Au Bois d’Ébène - Centre', address: 'Plateau' },
        customer: { id: 401, firstName: 'Mariam', lastName: 'K.', email: 'mariam@example.com' },
        driver: { id: 11 },
      },
    ]);

    renderDriverDashboard();

    expect(screen.getByText('Chargement des livraisons assignées...')).toBeInTheDocument();
    expect(await screen.findByText('Livraison #8101')).toBeInTheDocument();
    expect(await screen.findAllByText('Affectée')).not.toHaveLength(0);
  });

  it('shows an error and empty state when loading fails', async () => {
    mockedFetchMyDeliveries.mockRejectedValue(new Error('network'));

    renderDriverDashboard();

    expect(
      await screen.findByText(/Impossible de charger les livraisons du chauffeur/i)
    ).toBeInTheDocument();
    expect(await screen.findByText(/Aucune livraison ne correspond aux critères sélectionnés/i)).toBeInTheDocument();
  });

  it('opens the drawer and marks an assigned delivery as picked up', async () => {
    const user = userEvent.setup();

    mockedFetchMyDeliveries.mockResolvedValue([
      {
        id: 8101,
        pickupAddress: 'Restaurant Centre - Plateau',
        deliveryAddress: 'Cocody, Rue des Jardins',
        description: 'Menu midi',
        status: 'ASSIGNED',
        createdAt: '2026-07-15T08:05:00',
        updatedAt: null,
        restaurant: { id: 10, name: 'Au Bois d’Ébène - Centre', address: 'Plateau' },
        customer: { id: 401, firstName: 'Mariam', lastName: 'K.', email: 'mariam@example.com' },
        driver: { id: 11 },
      },
    ]);
    mockedPickupDelivery.mockResolvedValue({
      id: 8101,
      pickupAddress: 'Restaurant Centre - Plateau',
      deliveryAddress: 'Cocody, Rue des Jardins',
      description: 'Menu midi',
      status: 'PICKED_UP',
      createdAt: '2026-07-15T08:05:00',
      updatedAt: '2026-07-15T08:20:00',
      restaurant: { id: 10, name: 'Au Bois d’Ébène - Centre', address: 'Plateau' },
      customer: { id: 401, firstName: 'Mariam', lastName: 'K.', email: 'mariam@example.com' },
      driver: { id: 11 },
    });

    renderDriverDashboard();

    await screen.findByText('Livraison #8101');
    await user.click(screen.getByRole('button', { name: /Livraison #8101/i }));

    expect(screen.getByRole('button', { name: 'Marquer comme récupérée' })).toBeEnabled();

    await user.click(screen.getByRole('button', { name: 'Marquer comme récupérée' }));

    await waitFor(() => {
      expect(mockedPickupDelivery).toHaveBeenCalledWith(8101);
    });

    expect(await screen.findByText('La livraison a été mise à jour avec succès.')).toBeInTheDocument();
  });

  it('surfaces the transit and completion actions for in-progress deliveries', async () => {
    const user = userEvent.setup();

    mockedFetchMyDeliveries.mockResolvedValue([
      {
        id: 8103,
        pickupAddress: 'Restaurant Centre - Plateau',
        deliveryAddress: 'Bingerville centre',
        description: 'Commande express',
        status: 'IN_TRANSIT',
        createdAt: '2026-07-15T07:10:00',
        updatedAt: '2026-07-15T07:55:00',
        restaurant: { id: 10, name: 'Au Bois d’Ébène - Centre', address: 'Plateau' },
        customer: { id: 403, firstName: 'Awa', lastName: 'S.', email: 'awa@example.com' },
        driver: { id: 11 },
      },
    ]);
    mockedCompleteDelivery.mockResolvedValue({
      id: 8103,
      pickupAddress: 'Restaurant Centre - Plateau',
      deliveryAddress: 'Bingerville centre',
      description: 'Commande express',
      status: 'DELIVERED',
      createdAt: '2026-07-15T07:10:00',
      updatedAt: '2026-07-15T08:10:00',
      restaurant: { id: 10, name: 'Au Bois d’Ébène - Centre', address: 'Plateau' },
      customer: { id: 403, firstName: 'Awa', lastName: 'S.', email: 'awa@example.com' },
      driver: { id: 11 },
    });

    renderDriverDashboard();

    await screen.findByText('Livraison #8103');
    await user.click(screen.getByRole('button', { name: /Livraison #8103/i }));

    expect(screen.getByText('Le colis est en transit vers le client.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Marquer livrée' })).toBeEnabled();
  });

  it('surfaces the start-transit action for picked-up deliveries', async () => {
    const user = userEvent.setup();

    mockedFetchMyDeliveries.mockResolvedValue([
      {
        id: 8102,
        pickupAddress: 'Restaurant Centre - Plateau',
        deliveryAddress: 'Marcory Zone 4',
        description: 'Commande soir',
        status: 'PICKED_UP',
        createdAt: '2026-07-15T07:45:00',
        updatedAt: '2026-07-15T08:00:00',
        restaurant: { id: 10, name: 'Au Bois d’Ébène - Centre', address: 'Plateau' },
        customer: { id: 402, firstName: 'Jean', lastName: 'L.', email: 'jean@example.com' },
        driver: { id: 11 },
      },
    ]);
    mockedStartDelivery.mockResolvedValue({
      id: 8102,
      pickupAddress: 'Restaurant Centre - Plateau',
      deliveryAddress: 'Marcory Zone 4',
      description: 'Commande soir',
      status: 'IN_TRANSIT',
      createdAt: '2026-07-15T07:45:00',
      updatedAt: '2026-07-15T08:05:00',
      restaurant: { id: 10, name: 'Au Bois d’Ébène - Centre', address: 'Plateau' },
      customer: { id: 402, firstName: 'Jean', lastName: 'L.', email: 'jean@example.com' },
      driver: { id: 11 },
    });

    renderDriverDashboard();

    await screen.findByText('Livraison #8102');
    await user.click(screen.getByRole('button', { name: /Livraison #8102/i }));

    expect(screen.getByRole('button', { name: 'Démarrer la livraison' })).toBeEnabled();
  });

  it('allows drivers to report a failed delivery with reason details', async () => {
    const user = userEvent.setup();

    mockedFetchMyDeliveries.mockResolvedValue([
      {
        id: 8110,
        pickupAddress: 'Restaurant Centre - Plateau',
        deliveryAddress: 'Yopougon Andokoi',
        description: 'Commande urgente',
        status: 'IN_TRANSIT',
        createdAt: '2026-07-15T07:40:00',
        updatedAt: '2026-07-15T08:05:00',
        restaurant: { id: 10, name: 'Au Bois d’Ébène - Centre', address: 'Plateau' },
        customer: { id: 450, firstName: 'Nadia', lastName: 'B.', email: 'nadia@example.com' },
        driver: { id: 11 },
      },
    ]);
    mockedFailDelivery.mockResolvedValue({
      id: 8110,
      pickupAddress: 'Restaurant Centre - Plateau',
      deliveryAddress: 'Yopougon Andokoi',
      description: 'Commande urgente | ECHEC: Adresse introuvable - Quartier inaccessible',
      status: 'CANCELLED',
      createdAt: '2026-07-15T07:40:00',
      updatedAt: '2026-07-15T08:20:00',
      restaurant: { id: 10, name: 'Au Bois d’Ébène - Centre', address: 'Plateau' },
      customer: { id: 450, firstName: 'Nadia', lastName: 'B.', email: 'nadia@example.com' },
      driver: { id: 11 },
    });

    renderDriverDashboard();

    await screen.findByText('Livraison #8110');
    await user.click(screen.getByRole('button', { name: /Livraison #8110/i }));

    await user.click(screen.getByRole('button', { name: 'Signaler un échec' }));
    await user.selectOptions(screen.getByLabelText('Motif principal'), 'Adresse introuvable');
    await user.type(screen.getByLabelText('Détails (optionnel)'), 'Quartier inaccessible');
    await user.click(screen.getByRole('button', { name: 'Confirmer l’échec' }));

    await waitFor(() => {
      expect(mockedFailDelivery).toHaveBeenCalledWith(8110, 'Adresse introuvable - Quartier inaccessible');
    });

    expect(await screen.findByText('La livraison a été marquée en échec et retirée du flux actif.')).toBeInTheDocument();
  });
});
