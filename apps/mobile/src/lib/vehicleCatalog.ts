import catalog from '../data/mobile_vehicle_catalog.json';
import type { VehicleCatalogItem } from '../types/vehicleCatalog';
import { resolvePublicAssetUrl } from './apiClient';

export const vehicleCatalog = (catalog as VehicleCatalogItem[]).map((item) => ({
  ...item,
  imageUrl: resolvePublicAssetUrl(item.imageUrl),
  brandImageUrl: resolvePublicAssetUrl(item.brandImageUrl),
}));

export function getBrands(items: VehicleCatalogItem[] = vehicleCatalog) {
  return Array.from(new Set(items.map((item) => item.brand))).sort((a, b) =>
    a.localeCompare(b)
  );
}

export function getModelsForBrand(brand: string | null, items: VehicleCatalogItem[] = vehicleCatalog) {
  if (!brand) {
    return [];
  }

  return Array.from(
    new Set(
      items
        .filter((item) => item.brand === brand)
        .map((item) => item.model)
    )
  ).sort((a, b) => a.localeCompare(b));
}

export function getVariantsForModel(
  brand: string | null,
  model: string | null,
  items: VehicleCatalogItem[] = vehicleCatalog
) {
  if (!brand || !model) {
    return [];
  }

  return items
    .filter((item) => item.brand === brand && item.model === model)
    .sort((a, b) => a.variant.localeCompare(b.variant));
}

export function getBrandImageUrl(
  brand: string | null,
  items: VehicleCatalogItem[] = vehicleCatalog
) {
  if (!brand) {
    return null;
  }

  return items.find((item) => item.brand === brand && item.brandImageUrl)?.brandImageUrl ?? null;
}

export function getModelImageUrl(
  brand: string | null,
  model: string | null,
  items: VehicleCatalogItem[] = vehicleCatalog
) {
  if (!brand || !model) {
    return getBrandImageUrl(brand, items);
  }

  return (
    items.find((item) => item.brand === brand && item.model === model && item.imageUrl)?.imageUrl ??
    getBrandImageUrl(brand, items)
  );
}
