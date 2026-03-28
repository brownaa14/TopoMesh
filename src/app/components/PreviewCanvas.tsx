import { BBox, TerrainParams } from '@/types/terrain'

type PreviewCanvasProps = {
    bbox: BBox | null
    params: TerrainParams
}

export default function PreviewCanvas({ bbox, params }: PreviewCanvasProps) {
    return (
        <div className="w-full h-48 bg-gray-100 flex items-center justify-center border-b">
            <p className="text-sm text-gray-400">3D preview goes here</p>
        </div>
    )
}