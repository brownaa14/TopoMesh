import { TerrainParams } from '@/types/terrain'

type ConfigPanelProps = {
    params: TerrainParams
    onParamsChange: (updated: Partial<TerrainParams>) => void
    onGenerate: () => void
    isGenerating: boolean
}

export default function ConfigPanel({
    params,
    onParamsChange,
    onGenerate,
    isGenerating
}: ConfigPanelProps) {
    return (
        <div className="flex-1 p-4">
            <p className="text-sm text-gray-400">Config panel goes here</p>
        </div>
    )
}