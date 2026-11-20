import React, { createContext, useContext, useState, useEffect } from 'react';
import { businessAPI } from '../services/api';
import { useAuth } from './AuthContext';

const FacilityContext = createContext(null);

export const FacilityProvider = ({ children }) => {
  const { isAuthenticated, isBusinessOwner } = useAuth();
  const [businesses, setBusinesses] = useState([]);
  const [currentBusiness, setCurrentBusiness] = useState(null);
  const [locations, setLocations] = useState([]);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [isLoadingFacilities, setIsLoadingFacilities] = useState(false);
  const [facilityError, setFacilityError] = useState(null);

  useEffect(() => {
    if (isAuthenticated && isBusinessOwner) {
      loadBusinesses();
    } else {
      setBusinesses([]);
      setCurrentBusiness(null);
      setLocations([]);
      setCurrentLocation(null);
    }
  }, [isAuthenticated, isBusinessOwner]);

  const loadBusinesses = async () => {
    setIsLoadingFacilities(true);
    setFacilityError(null);
    try {
      const res = await businessAPI.list();
      const list = res.data?.data;
      if (!Array.isArray(list)) {
        throw new Error('The server returned an invalid business list.');
      }
      setBusinesses(list);
      if (list.length > 0) {
        const activeBiz = list[0];
        setCurrentBusiness(activeBiz);
        await loadLocations(activeBiz.id);
      } else {
        setCurrentBusiness(null);
        setLocations([]);
        setCurrentLocation(null);
      }
    } catch (err) {
      setBusinesses([]);
      setCurrentBusiness(null);
      setLocations([]);
      setCurrentLocation(null);
      setFacilityError(err.response?.data?.error?.message || err.message || 'Failed to load businesses.');
    } finally {
      setIsLoadingFacilities(false);
    }
  };

  const loadLocations = async (businessId) => {
    setFacilityError(null);
    try {
      const res = await businessAPI.listLocations(businessId);
      const locList = res.data?.data;
      if (!Array.isArray(locList)) {
        throw new Error('The server returned an invalid business location list.');
      }
      setLocations(locList);
      if (locList.length > 0) {
        setCurrentLocation(locList[0]);
      } else {
        setCurrentLocation(null);
      }
      return locList;
    } catch (err) {
      setLocations([]);
      setCurrentLocation(null);
      setFacilityError(err.response?.data?.error?.message || err.message || 'Failed to load business locations.');
      return [];
    }
  };

  const selectBusiness = async (biz) => {
    setFacilityError(null);
    setCurrentBusiness(biz);
    if (biz?.id) {
      setIsLoadingFacilities(true);
      try {
        await loadLocations(biz.id);
      } finally {
        setIsLoadingFacilities(false);
      }
    }
  };

  const createBusiness = async (data) => {
    const res = await businessAPI.create(data);
    const newBiz = res.data?.data;
    await loadBusinesses();
    if (newBiz) {
      setCurrentBusiness(newBiz);
      await loadLocations(newBiz.id);
    }
    return newBiz;
  };

  const updateBusiness = async (id, data) => {
    const res = await businessAPI.update(id, data);
    const updated = res.data?.data;
    setBusinesses((prev) => prev.map((b) => (b.id === id ? updated : b)));
    if (currentBusiness?.id === id) {
      setCurrentBusiness(updated);
    }
    return updated;
  };

  const deleteBusiness = async (id) => {
    await businessAPI.delete(id);
    await loadBusinesses();
  };

  const createLocation = async (businessId, data) => {
    const res = await businessAPI.createLocation(businessId, data);
    const newLoc = res.data?.data;
    await loadLocations(businessId);
    return newLoc;
  };

  return (
    <FacilityContext.Provider
      value={{
        businesses,
        currentBusiness,
        selectBusiness,
        locations,
        currentLocation,
        setCurrentLocation,
        isLoadingFacilities,
        facilityError,
        refreshFacilities: loadBusinesses,
        refreshLocations: () => currentBusiness && loadLocations(currentBusiness.id),
        createBusiness,
        updateBusiness,
        deleteBusiness,
        createLocation,
      }}
    >
      {children}
    </FacilityContext.Provider>
  );
};

export const useFacility = () => {
  const context = useContext(FacilityContext);
  if (!context) {
    throw new Error('useFacility must be used within a FacilityProvider');
  }
  return context;
};
