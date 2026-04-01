// lib/dem.ts

import { BBox } from '@/types/terrain'
import { fromArrayBuffer } from 'geotiff'

export type ElevationGrid = {
    grid: number[][]
    width: number
    height: number
    elevMin: number
    elevMax: number
}

export async function fetchElevationGrid(
    bbox: BBox,
    resolution: number
): Promise<ElevationGrid> {

    const params = new URLSearchParams({
        demtype: 'SRTMGL1',
        south: bbox.south.toString(),
        north: bbox.north.toString(),
        west: bbox.west.toString(),
        east: bbox.east.toString(),
        outputFormat: 'GTiff',
        API_Key: process.env.OPENTOPOGROPHY_API_KEY
    })

    const url = `https://portal.opentopography.org/API/globaldem?${params}`
    const response = await fetch(url)

    if (!response.ok) {
        throw new Error(`OpenTopography request failed: ${response.status}`)
    }

    const arrayBuffer = await response.arrayBuffer()
    const tiff = await fromArrayBuffer(arrayBuffer)
    const image = await tiff.getImage()
    const data = await image.readRasters()

    const raw = data[0] as Float32Array
    const tiffWidth = image.getWidth()
    const tiffHeight = image.getHeight()

    const cols = Math.min(resolution, tiffWidth)
    const rows = Math.min(resolution, tiffHeight)

    let elevMin = Infinity
    let elevMax = -Infinity

    const grid: number[][] = []

    for (let row = 0; row < rows; row++) {
        const gridRow: number[] = []
        for (let col = 0; col < cols; col++) {
            const srcCol = Math.floor((col / cols) * tiffWidth)
            const srcRow = Math.floor((row / rows) * tiffHeight)
            const elevation = raw[srcRow * tiffWidth + srcCol]

            gridRow.push(elevation)
            if (elevation < elevMin) elevMin = elevation
            if (elevation > elevMax) elevMax = elevation
        }
        grid.push(gridRow)
    }

    return { grid, width: cols, height: rows, elevMin, elevMax }
}
