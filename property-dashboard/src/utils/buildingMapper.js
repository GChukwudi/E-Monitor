export const getBuildingDisplayName = (buildingId) => {
  const buildingNames = {
    'building_001': 'Main Building',
    'building_002': 'North Wing',
    'building_003': 'South Wing',
  };

  return buildingNames[buildingId] || buildingId.replace('building_', 'Building ');
};

// Alternative: Extract number and format nicely
export const formatBuildingName = (buildingId) => {
  const match = buildingId.match(/building_(\d+)/);
  if (match) {
    return `Building ${match[1]}`;
  }
  return buildingId;
};