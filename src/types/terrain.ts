export type BBox = {
    north: number
    east: number
    south: number
    west: number
}

export type RegionInfo = {
    areaKm2: number
    elevMin: number
    elevMax: number
}

export type TerrainParams = {
    zScale: number
    baseThickness: number
    resolution: number
    printWidth: number
    printDepth: number
    aspectRatioLocked: boolean
}