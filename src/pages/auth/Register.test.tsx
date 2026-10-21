import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import { Register } from './Register';
import { apiError, mockApi, type MockApi } from '../../test/mockApi';
import { makeUser } from '../../test/fixtures';

const renderRegister = () => render(<MemoryRouter><Register /></MemoryRouter>);

const fillForm = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.type(screen.getByLabelText('Prénom'), 'Nina');
  await user.type(screen.getByLabelText('Nom'), 'Nouvelle');
  await user.type(screen.getByLabelText('Email'), 'nina@test.be');
  await user.type(screen.getByLabelText(/Mot de passe/), 'DriverPass1');
  await user.type(screen.getByLabelText('Téléphone'), '+32 470 11 12 22');
  await user.selectOptions(screen.getByLabelText('Type de véhicule'), 'Vélo');
  await user.type(screen.getByLabelText('Plaque du véhicule'), '1-abc-123');
};

describe('Register (driver only)', () => {
  let apiMock: MockApi;

  beforeEach(() => {
    apiMock = mockApi();
  });

  it('offers no role choice and no restaurant fields', () => {
    renderRegister();
    expect(screen.queryByText(/Rôle du compte/)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Nom du restaurant/)).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Devenir chauffeur' })).toBeInTheDocument();
  });

  it('validates client side before calling the API', async () => {
    const user = userEvent.setup();
    renderRegister();
    await user.type(screen.getByLabelText(/Mot de passe/), 'short');
    await user.click(screen.getByRole('button', { name: /CRÉER MON COMPTE/ }));
    expect(screen.getByText('8 caractères minimum.')).toBeInTheDocument();
    expect(screen.getAllByText('Champ obligatoire.').length).toBeGreaterThan(0);
    expect(apiMock.calls).toHaveLength(0);
  });

  it('registers a DRIVER and shows the pending approval message', async () => {
    const user = userEvent.setup();
    apiMock.on('POST', '/api/auth/register', makeUser({ email: 'nina@test.be' }));
    renderRegister();
    await fillForm(user);
    await user.click(screen.getByRole('button', { name: /CRÉER MON COMPTE/ }));

    expect(await screen.findByText('Compte créé — en attente de validation par l’administrateur')).toBeInTheDocument();
    expect(apiMock.callsTo('POST', '/api/auth/register')[0].body).toEqual({
      email: 'nina@test.be',
      password: 'DriverPass1',
      firstName: 'Nina',
      lastName: 'Nouvelle',
      phoneNumber: '+32 470 11 12 22',
      vehicleType: 'BIKE',
      vehiclePlate: '1-ABC-123',
      role: 'DRIVER',
    });
  });

  it('shows server conflicts', async () => {
    const user = userEvent.setup();
    apiMock.on('POST', '/api/auth/register', () => {
      throw apiError(409, 'Vehicle plate already exists');
    });
    renderRegister();
    await fillForm(user);
    await user.click(screen.getByRole('button', { name: /CRÉER MON COMPTE/ }));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Cette plaque est déjà enregistrée.'));
  });
});
