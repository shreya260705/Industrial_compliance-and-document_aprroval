import assert from 'node:assert/strict';
import test from 'node:test';
import { loadBusinessLocations } from './facilityLocations.js';

test('loads locations from the API data arrays and associates each business', async () => {
  const businesses = [
    { id: 'business-1', legal_name: 'Horizon AutoTech Private Limited' },
    { id: 'business-2', trade_name: 'Northstar Components' },
  ];
  const locationsByBusiness = {
    'business-1': [{ id: 'location-1', location_name: 'Hosur Stamping Unit' }],
    'business-2': [{ id: 'location-2', location_name: 'Assembly Plant' }],
  };

  const locations = await loadBusinessLocations(
    businesses,
    async (businessId) => ({ data: { data: locationsByBusiness[businessId] } })
  );

  assert.deepEqual(locations, [
    {
      id: 'location-1',
      location_name: 'Hosur Stamping Unit',
      business_id: 'business-1',
      business_name: 'Horizon AutoTech Private Limited',
      businessName: 'Horizon AutoTech Private Limited',
    },
    {
      id: 'location-2',
      location_name: 'Assembly Plant',
      business_id: 'business-2',
      business_name: 'Northstar Components',
      businessName: 'Northstar Components',
    },
  ]);
});

test('rejects malformed business and location responses instead of silently returning no locations', async () => {
  await assert.rejects(
    loadBusinessLocations({ id: 'business-1' }, async () => ({ data: { data: [] } })),
    /invalid business list/
  );

  await assert.rejects(
    loadBusinessLocations([{ id: 'business-1' }], async () => ({ data: { data: { locations: [] } } })),
    /invalid location list/
  );
});
