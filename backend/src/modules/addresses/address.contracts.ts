import { z } from "zod";

const addressPayloadShape = z.object({
  title: z.string().min(2).max(60).optional(),
  address: z.string().min(4).max(240).optional(),
  lat: z.coerce.number().optional(),
  lng: z.coerce.number().optional(),
  isDefault: z.boolean().optional(),
  label: z.string().min(2).max(60).optional(),
  cityId: z.string().min(2).max(80).optional(),
  district: z.string().max(80).optional(),
  addressText: z.string().min(4).max(240).optional()
});

export const createAddressSchema = addressPayloadShape
  .refine((payload) => payload.title || payload.label, {
    message: "Address title is required",
    path: ["title"]
  })
  .refine((payload) => payload.address || payload.addressText, {
    message: "Address text is required",
    path: ["address"]
  })
  .transform((payload) => ({
    title: payload.title || payload.label!,
    address: payload.address || payload.addressText!,
    lat: payload.lat,
    lng: payload.lng,
    isDefault: payload.isDefault || false,
    cityId: payload.cityId || "tashkent",
    district: payload.district
  }));

export const updateAddressSchema = addressPayloadShape.transform((payload) => ({
  ...(payload.title || payload.label ? { title: payload.title || payload.label } : {}),
  ...(payload.address || payload.addressText ? { address: payload.address || payload.addressText } : {}),
  ...(payload.lat !== undefined ? { lat: payload.lat } : {}),
  ...(payload.lng !== undefined ? { lng: payload.lng } : {}),
  ...(payload.isDefault !== undefined ? { isDefault: payload.isDefault } : {}),
  ...(payload.cityId !== undefined ? { cityId: payload.cityId } : {}),
  ...(payload.district !== undefined ? { district: payload.district } : {})
}));
