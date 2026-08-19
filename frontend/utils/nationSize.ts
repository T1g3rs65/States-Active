// Nation size classification based on population
export function getNationSizeClass(population: number): string {
  // Population in thousands
  if (population < 1) return 'Small Tribe';
  if (population < 5) return 'Village-State';
  if (population < 10) return 'Microstate';
  if (population < 50) return 'Tiny Nation';
  if (population < 100) return 'Small State';
  if (population < 500) return 'Small Country';
  if (population < 1000) return 'Small-Medium Country';
  if (population < 5000) return 'Medium Country';
  if (population < 10000) return 'Mid-Large Country';
  if (population < 25000) return 'Significant Country';
  if (population < 50000) return 'Regional Power';
  if (population < 100000) return 'Large Power';
  if (population < 250000) return 'Major Power';
  return 'Superpower';
}

// Calculate capacity (hexes) from population with realistic scaling
export function calculateCapacityFromPopulation(population: number): number {
  // Population in thousands
  // Formula: min(5000, 2.5 × pop^0.45) with lookup table for consistency
  
  if (population < 1) return 3;
  if (population < 5) return 10;
  if (population < 10) return 20;
  if (population < 50) return 40;
  if (population < 100) return 70;
  if (population < 500) return 150;
  if (population < 1000) return 250;
  if (population < 5000) return 500;
  if (population < 10000) return 800;
  if (population < 25000) return 1200;
  if (population < 50000) return 1800;
  if (population < 100000) return 2500;
  if (population < 200000) return 3500;
  if (population < 300000) return 4000;
  
  // HARD CAP at 5,000 hexes (12.5% of world max)
  return 5000;
}
