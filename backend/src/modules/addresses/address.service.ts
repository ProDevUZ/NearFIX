import { prisma } from "../../db/prisma.js";

type AddressInput = {
  title: string;
  cityId: string;
  district?: string;
  address: string;
  lat?: number;
  lng?: number;
  isDefault?: boolean;
};

type AddressPatch = Partial<AddressInput>;

function mapAddressPatch(patch: AddressPatch) {
  return {
    ...(patch.title !== undefined ? { label: patch.title } : {}),
    ...(patch.cityId !== undefined ? { cityId: patch.cityId } : {}),
    ...(patch.district !== undefined ? { district: patch.district } : {}),
    ...(patch.address !== undefined ? { addressText: patch.address } : {}),
    ...(patch.lat !== undefined ? { lat: patch.lat } : {}),
    ...(patch.lng !== undefined ? { lng: patch.lng } : {})
  };
}

export async function listAddresses(userId: string) {
  return prisma.address.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" }
  });
}

export async function createAddress(userId: string, input: AddressInput) {
  return prisma.address.create({
    data: {
      userId,
      label: input.title,
      cityId: input.cityId,
      district: input.district,
      addressText: input.address,
      lat: input.lat,
      lng: input.lng
    }
  });
}

export async function updateAddress(userId: string, addressId: string, patch: AddressPatch) {
  const address = await prisma.address.findFirst({
    where: { id: addressId, userId }
  });

  if (!address) {
    throw Object.assign(new Error("Address not found"), {
      status: 404,
      code: "ADDRESS_NOT_FOUND"
    });
  }

  return prisma.address.update({
    where: { id: addressId },
    data: mapAddressPatch(patch)
  });
}

export async function deleteAddress(userId: string, addressId: string) {
  const address = await prisma.address.findFirst({
    where: { id: addressId, userId }
  });

  if (!address) {
    throw Object.assign(new Error("Address not found"), {
      status: 404,
      code: "ADDRESS_NOT_FOUND"
    });
  }

  await prisma.address.delete({
    where: { id: addressId }
  });
}
