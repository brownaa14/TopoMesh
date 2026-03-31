'use client'

import { useState } from 'react'
import { BBox, TerrainParams, RegionInfo } from '@/types/terrain'
import MapPanel from './components/MapPanel'
import ConfigPanel from './components/ConfigPanel'
import PreviewCanvas from './components/PreviewCanvas'

const DEFAULT_PARAMS: TerrainParams = {
  zScale: 2.0,
  baseThickness: 3,
  resolution: 200,
  printWidth: 150,
  printDepth: 112,
  aspectRatioLocked: true,
}
export default function TerrainPage() {
  const [bbox, setBbox] = useState<BBox | null>(null)
  const [regionInfo, setRegionInfo] = useState<RegionInfo | null>(null)
  const [params, setParams] = useState<TerrainParams>(DEFAULT_PARAMS)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isDrawing, setIsDrawing] = useState(false)

  function handleParamsChange(updated: Partial<TerrainParams>) {
    setParams(prev => ({ ...prev, ...updated }))
  }

  //placeholder STL generation
  function handleGenerate() {
    setIsGenerating(true)
    console.log('Generating STL with:', { bbox, params })
  }
  return (
    <div className='flex flex-col h-screen overflow-hidden bg-white'>
      <header className='h-12 flex items-center px-4 gap-3 border-b border-gray-400 shrink-0'>
        <button className='flex items-center gap-2 text-sm px-3 py-1.5 border border-gray-200 rounded-md hover:bg-gray-50'>
          {/* rectangle icon */}
          <svg width='12' height='12' viewBox="0 0 12 12" fill='none'>
            <rect x='1' y='1' width='10' rx='1' stroke='currentColor' strokeWidth='1.2' />
          </svg>
          Draw region
        </button>

        <span className='text-sm font-medium'>Terrain Tool</span>

        <span className='ml-auto text-xs text-gray-400'>
          {bbox ? "adjust your region or configure below" : "Draw a region on the map to begin"}
        </span>
      </header>

      <div className='flex flex-1 overflow-hidden'>
        <main className='flex-1 relative'>
          <MapPanel
            onBboxChange={setBbox}
            bbox={bbox}
          />
        </main>

        <aside className='w-80 flex flex-col border-1 border-gray-400 overflow-hidden'>
          <PreviewCanvas bbox={bbox} params={params} />
          <ConfigPanel
            params={params}
            onParamsChange={handleParamsChange}
            onGenerate={handleGenerate}
            isGenerating={isGenerating}
            onBboxChange={setBbox}
          />
        </aside>
      </div>
    </div>
  )
}
