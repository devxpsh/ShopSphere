import { prisma } from '../../config/prisma';
import { AppError } from '../../utils/AppError';
import { CreateAddressInput, UpdateAddressInput } from './address.validation';

export class AddressService {
  async listUserAddresses(userId: string) {
    return prisma.address.findMany({
      where: { userId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async getAddressById(userId: string, addressId: string) {
    const address = await prisma.address.findUnique({
      where: { id: addressId },
    });

    if (!address) {
      throw new AppError('Shipping address not found.', 404, 'ADDRESS_NOT_FOUND');
    }

    if (address.userId !== userId) {
      throw new AppError(
        'You do not have permission to access this shipping address.',
        403,
        'FORBIDDEN_RESOURCE'
      );
    }

    return address;
  }

  async createAddress(userId: string, input: CreateAddressInput) {
    return prisma.$transaction(async (tx) => {
      const existingCount = await tx.address.count({ where: { userId } });
      const shouldBeDefault = input.isDefault || existingCount === 0;

      if (shouldBeDefault) {
        await tx.address.updateMany({
          where: { userId, isDefault: true },
          data: { isDefault: false },
        });
      }

      return tx.address.create({
        data: {
          userId,
          label: input.label ?? 'Home',
          recipientName: input.recipientName,
          phone: input.phone,
          line1: input.line1,
          line2: input.line2 ?? null,
          landmark: input.landmark ?? null,
          city: input.city,
          state: input.state,
          postalCode: input.postalCode,
          country: input.country ?? 'IN',
          isDefault: shouldBeDefault,
        },
      });
    });
  }

  async updateAddress(
    userId: string,
    addressId: string,
    input: UpdateAddressInput
  ) {
    const existing = await this.getAddressById(userId, addressId);

    return prisma.$transaction(async (tx) => {
      if (input.isDefault === true && !existing.isDefault) {
        await tx.address.updateMany({
          where: { userId, isDefault: true },
          data: { isDefault: false },
        });
      }

      return tx.address.update({
        where: { id: addressId },
        data: {
          label: input.label,
          recipientName: input.recipientName,
          phone: input.phone,
          line1: input.line1,
          line2: input.line2,
          landmark: input.landmark,
          city: input.city,
          state: input.state,
          postalCode: input.postalCode,
          country: input.country,
          isDefault: input.isDefault,
        },
      });
    });
  }

  async deleteAddress(userId: string, addressId: string) {
    const existing = await this.getAddressById(userId, addressId);

    await prisma.$transaction(async (tx) => {
      await tx.address.delete({ where: { id: addressId } });

      if (existing.isDefault) {
        const nextAddress = await tx.address.findFirst({
          where: { userId },
          orderBy: { createdAt: 'desc' },
        });

        if (nextAddress) {
          await tx.address.update({
            where: { id: nextAddress.id },
            data: { isDefault: true },
          });
        }
      }
    });
  }
}

export const addressService = new AddressService();
