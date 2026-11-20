export const loadBusinessLocations = async (businesses, listLocations) => {
  if (!Array.isArray(businesses)) {
    throw new Error('The server returned an invalid business list.');
  }

  const locationLists = await Promise.all(
    businesses.map(async (business) => {
      const businessId = business.id || business._id;
      if (!businessId) {
        throw new Error('A business record is missing its ID.');
      }

      const locationResponse = await listLocations(businessId);
      const locations = locationResponse.data?.data;
      if (!Array.isArray(locations)) {
        throw new Error('The server returned an invalid location list.');
      }

      const businessName = business.legal_name || business.trade_name || 'Business';
      return locations.map((location) => ({
        ...location,
        business_id: location.business_id || businessId,
        business_name: businessName,
        businessName,
      }));
    })
  );

  return locationLists.flat();
};
