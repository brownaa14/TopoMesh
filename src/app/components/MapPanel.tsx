'use client'

import { BBox } from '@/types/terrain'

type MapPanelProps = {
    onBboxChange: (bbox: BBox) => void
}

export default function MapPanel({ onBboxChange }: MapPanelProps) {
    return (
        <div className="w-full h-full bg-green-100 flex items-center justify-center">
            <p className="text-sm text-gray-400">Map goes here</p>
        </div>
    )
}