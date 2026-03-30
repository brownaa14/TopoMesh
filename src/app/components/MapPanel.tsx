'use client'

import { useEffect, useRef } from 'react'
import maplibreGL, { featureFilter } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { BBox } from '@/types/terrain'
import { PolarGridHelper } from 'three'
import { truncateSync } from 'fs'
import { start } from 'repl'
import { Geom } from 'next/font/google'


type MapPanelProps = {
    onBboxChange: (bbox: BBox) => void
}

export default function MapPanel({ onBboxChange }: MapPanelProps) {
    const mapContainer = useRef<HTMLDivElement>(null)
    const map = useRef<maplibregl.Map | null>(null)

    const isDrawing = useRef(false)
    const startPoint = useRef<[number, number] | null>(null)

    useEffect(() => {
        if (!mapContainer.current || map.current) return

        map.current = new maplibreGL.Map({
            container: mapContainer.current,
            style: 'https://tiles.openfreemap.org/styles/bright',
            center: [0, 20],
            zoom: 2,
        })

        map.current.on('load', () => {
            map.current!.addSource('bbox', {
                type: 'geojson',
                data: { type: 'Feature', geometry: { type: 'Polygon', coordinates: [[]] }, properties: {} }
            })

            map.current!.addLayer({
                id: 'bbox-fill',
                type: 'fill',
                source: 'bbox',
                paint: {
                    'fill-color': 'red',
                    'fill-opacity': 0.08
                }
            })

            map.current!.addLayer({
                id: 'bbox-outline',
                type: 'line',
                source: 'bbox',
                paint: {
                    'line-color': 'red',
                    'line-width': 1.5
                }
            })

            map.current!.on('mousedown', (e) => {
                isDrawing.current = true
                startPoint.current = [e.lngLat.lng, e.lngLat.lat]
                map.current!.dragPan.disable()
            })

            map.current!.on('mousemove', (e) => {
                if (!isDrawing.current || !startPoint.current) return

                const [startLng, startLat] = startPoint.current
                const endLng = e.lngLat.lng
                const endLat = e.lngLat.lat

                const coords = [
                    [startLng, startLat],
                    [endLng, startLat],
                    [endLng, endLat],
                    [startLng, endLat],
                    [startLng, startLat],
                ]

                const source = map.current!.getSource('bbox') as maplibregl.GeoJSONSource
                source.setData({
                    type: 'Feature',
                    geometry: { type: 'Polygon', coordinates: [coords] },
                    properties: {}
                })

                map.current!.on('mouseup', (e) => {
                    if (!isDrawing.current || !startPoint.current) return

                    isDrawing.current = false
                    map.current!.dragPan.enable()

                    const [startLng, startLat] = startPoint.current

                    onBboxChange({
                        west: Math.min(startLng, e.lngLat.lng),
                        east: Math.max(startLng, e.lngLat.lng),
                        south: Math.min(startLat, e.lngLat.lat),
                        north: Math.max(startLat, e.lngLat.lat)
                    })
                })

            })

            startPoint.current = null
        })
        return () => {
            map.current?.remove()
            map.current = null
        }
    }, [])

    return (
        <div className='w-full h-full'>
            <div ref={mapContainer} className='w-full h-full' />
        </div>
    )
}