import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { RestaurantDashboard } from '../restaurant/RestaurantDashboard';
import { DriverDashboard } from '../driver/DriverDashboard';
import { AdminDashboard } from '../admin/AdminDashboard';
import { mockApi } from '../../test/mockApi';
import { ASSIGNED_DRIVER, makeDelivery, makeDriver, makeRestaurant } from '../../test/fixtures';
import type { Delivery } from '../../api/types';
import { useAuthStore } from '../../store/useAuthStore';
import { makeTestJwt } from '../../test/jwt';

/**
 * End-to-end flow against an in-memory "server": restaurant creates -> marks ready,
 * admin assigns a driver, driver picks up / starts / delivers, restaurant sees DELIVERED.
 */
describe('Restaurant -> Admin -> Driver lifecycle', () => {
  it('covers creation, ready, assignment and the driver transitions', async () => {
    const user = userEvent.setup();
    let delivery: Delivery | null = null;
    const bump = (patch: Partial<Delivery>) => {
      delivery = { ...(delivery as Delivery), ...patch, version: (delivery as Delivery).version + 1 };
      return delivery;
    };

    const apiMock = mockApi()
      .on('GET', '/api/restaurants/me', makeRestaurant())
      .on('GET', '/api/restaurants', [makeRestaurant()])
      .on('GET', /^\/api\/admin\/users/, [])
      .on('GET', '/api/drivers', [makeDriver()])
      .on('GET', '/api/drivers/available', [makeDriver()])
      .on('GET', /^\/api\/deliveries\/\d+\/history$/, [])
      .on('GET', /^\/api\/deliveries(\?|$)/, ({ url }) =>
        delivery && url.includes(`status=${delivery.status}`) ? [delivery] : [])
      .on('GET', '/api/deliveries/me', () => (delivery ? [delivery] : []))
      .on('POST', '/api/deliveries', ({ body }) => {
        delivery = makeDelivery({ id: 9201, status: 'CREATED', version: 0, ...(body as Partial<Delivery>) });
        return delivery;
      })
      .on('PATCH', '/api/deliveries/9201/ready', () => bump({ readyAt: new Date().toISOString() }))
      .on('PUT', '/api/deliveries/9201/assign', () => bump({ status: 'ASSIGNED', driver: ASSIGNED_DRIVER }))
      .on('PUT', '/api/deliveries/9201/pickup', () => bump({ status: 'PICKED_UP' }))
      .on('PUT', '/api/deliveries/9201/start', () => bump({ status: 'IN_TRANSIT' }))
      .on('PUT', '/api/deliveries/9201/complete', () => bump({ status: 'DELIVERED' }));

    // 1. Restaurant creates a prepaid delivery and marks it ready.
    const restaurantView = render(<MemoryRouter><RestaurantDashboard /></MemoryRouter>);
    const form = await screen.findByRole('form', { name: 'Nouvelle livraison' });
    await user.type(within(form).getByLabelText(/Nom du client/), 'Mariam K.');
    await user.type(within(form).getByLabelText(/Téléphone du client/), '0470 11 22 33');
    await user.type(within(form).getByRole('combobox', { name: /Adresse de livraison/ }), 'Rue Haute 5, Bruxelles');
    await user.click(within(form).getByLabelText('Prépayée'));
    await user.click(within(form).getByRole('button', { name: 'Créer la livraison' }));
    const card = await screen.findByRole('listitem', { name: 'Livraison #9201' });
    await user.click(within(card).getByRole('button', { name: 'Commande prête' }));
    expect(await within(card).findByText('Prête au retrait')).toBeInTheDocument();
    restaurantView.unmount();

    // 2. Admin assigns the available driver from the dispatch queue.
    useAuthStore.getState().setAuth({ id: 1, email: 'admin@test.be', role: 'ADMIN' }, makeTestJwt(3600));
    const adminView = render(<MemoryRouter><AdminDashboard /></MemoryRouter>);
    const queueItem = await screen.findByRole('listitem', { name: /Livraison #9201/ });
    await user.click(within(queueItem).getByRole('button', { name: 'Assigner' }));
    const dialog = await screen.findByRole('dialog');
    await user.click(await within(dialog).findByRole('button', { name: /Assigner Dan Driver/ }));
    await waitFor(() => expect(apiMock.callsTo('PUT', '/api/deliveries/9201/assign')[0]?.body).toEqual({ driverId: 4 }));
    adminView.unmount();
    useAuthStore.getState().logout();

    // 3. Driver picks up, starts and completes.
    const driverView = render(<MemoryRouter><DriverDashboard /></MemoryRouter>);
    await user.click(await screen.findByRole('button', { name: /Livraison #9201/ }));
    const driverDialog = screen.getByRole('dialog');
    await user.click(within(driverDialog).getByRole('button', { name: 'Marquer comme récupérée' }));
    await user.click(await within(driverDialog).findByRole('button', { name: 'Démarrer la livraison' }));
    await user.click(await within(driverDialog).findByRole('button', { name: 'Marquer livrée' }));
    await waitFor(() => expect(delivery?.status).toBe('DELIVERED'));
    driverView.unmount();

    // 4. Restaurant sees it in "Terminées".
    render(<MemoryRouter><RestaurantDashboard /></MemoryRouter>);
    await user.click(await screen.findByRole('tab', { name: 'Terminées' }));
    const done = await screen.findByRole('listitem', { name: 'Livraison #9201' });
    expect(within(done).getByText('Livrée')).toBeInTheDocument();
  });
});
