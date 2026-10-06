import { ConflictException } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';
import { UserRole } from '../src/common/enums/user-role.enum';
import { User } from '../src/users/entities/user.schema';
import { UsersService } from '../src/users/users.service';
import { createFakeUserModel, FakeUserModel } from './helpers/fake-user-model';

describe('UsersService', () => {
  let service: UsersService;
  let fakeModel: FakeUserModel;

  beforeEach(async () => {
    fakeModel = createFakeUserModel();

    const moduleRef = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: getModelToken(User.name), useValue: fakeModel },
      ],
    }).compile();

    service = moduleRef.get(UsersService);
  });

  const input = {
    email: 'jane@example.com',
    passwordHash: 'hash-simule',
    firstName: 'Jane',
    lastName: 'Doe',
    role: UserRole.EMPLOYEE,
  };

  it('crée un utilisateur', async () => {
    const user = await service.create(input);

    expect(String(user._id)).toHaveLength(24);
    expect(user.email).toBe(input.email);
    expect(user.role).toBe(UserRole.EMPLOYEE);
    expect(user.isActive).toBe(true);
    expect(user.createdAt).toBeInstanceOf(Date);
  });

  it('récupère un utilisateur par email (insensible à la casse)', async () => {
    const created = await service.create(input);

    const found = await service.findByEmail('  JANE@EXAMPLE.COM ');

    expect(found).not.toBeNull();
    expect(String(found?._id)).toBe(String(created._id));
  });

  it('récupère un utilisateur par id', async () => {
    const created = await service.create(input);

    const found = await service.findById(String(created._id));

    expect(found?.email).toBe(input.email);
  });

  it('retourne null pour un id invalide sans lever d\'erreur', async () => {
    await expect(service.findById('pas-un-id')).resolves.toBeNull();
  });

  it('retourne null si l\'email n\'existe pas', async () => {
    await expect(service.findByEmail('absent@example.com')).resolves.toBeNull();
  });

  it('refuse un email déjà utilisé (ConflictException)', async () => {
    await service.create(input);

    await expect(service.create({ ...input, firstName: 'Autre' })).rejects.toThrow(
      ConflictException,
    );
  });

  it('liste les utilisateurs du plus récent au plus ancien', async () => {
    const first = await service.create(input);
    const second = await service.create({ ...input, email: 'john@example.com' });

    fakeModel.store.find((user) => user._id === String(first._id))!.createdAt =
      new Date('2026-01-01T00:00:00.000Z');
    fakeModel.store.find((user) => user._id === String(second._id))!.createdAt =
      new Date('2026-02-01T00:00:00.000Z');

    const users = await service.findAll();

    expect(users.map((user) => user.email)).toEqual(['john@example.com', 'jane@example.com']);
  });
});
