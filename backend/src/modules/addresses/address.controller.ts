import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { addressService } from './address.service';
import { CreateAddressInput, UpdateAddressInput } from './address.validation';

export class AddressController {
  list = asyncHandler(async (req: Request, res: Response) => {
    const addresses = await addressService.listUserAddresses(req.user!.id);
    res.status(200).json({
      success: true,
      data: { addresses },
    });
  });

  getById = asyncHandler(async (req: Request, res: Response) => {
    const address = await addressService.getAddressById(
      req.user!.id,
      req.params.id as string
    );
    res.status(200).json({
      success: true,
      data: { address },
    });
  });

  create = asyncHandler(async (req: Request, res: Response) => {
    const body = req.body as CreateAddressInput;
    const address = await addressService.createAddress(req.user!.id, body);
    res.status(201).json({
      success: true,
      message: 'Shipping address added.',
      data: { address },
    });
  });

  update = asyncHandler(async (req: Request, res: Response) => {
    const body = req.body as UpdateAddressInput;
    const address = await addressService.updateAddress(
      req.user!.id,
      req.params.id as string,
      body
    );
    res.status(200).json({
      success: true,
      message: 'Shipping address updated.',
      data: { address },
    });
  });

  remove = asyncHandler(async (req: Request, res: Response) => {
    await addressService.deleteAddress(req.user!.id, req.params.id as string);
    res.status(200).json({
      success: true,
      message: 'Shipping address removed.',
      data: null,
    });
  });
}

export const addressController = new AddressController();
