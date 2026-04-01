'use client'

import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { BBox, TerrainParams } from '@/types/terrain'

type PreviewCanvasProps = {
    bbox: BBox | null
    params: TerrainParams
}

function generateFakeGrid(width: number, height: number): number[][] {
    const grid: number[][] = []
    for (let y = 0; y < height; y++) {
        const row: number[] = []
        for (let x = 0; x < width; x++) {
            const nx = x / width
            const ny = y / height
            const h =
                0.5 * Math.sin(nx * Math.PI * 2) * Math.cos(ny * Math.PI * 2) +
                0.25 * Math.sin(nx * Math.PI * 5) * Math.sin(ny * Math.PI * 3) +
                0.15 * Math.cos(nx * Math.PI * 8 + ny * Math.PI * 4)
            row.push((h + 1) / 2)
        }
        grid.push(row)
    }
    return grid
}

function buildGeometry(
    grid: number[][],
    zScale: number,
    baseThickness: number
): THREE.BufferGeometry {
    const rows = grid.length
    const cols = grid[0].length

    let elevMin = Infinity
    let elevMax = -Infinity
    for (const row of grid) {
        for (const val of row) {
            if (val < elevMin) elevMin = val
            if (val > elevMax) elevMax = val
        }
    }
    const elevRange = elevMax - elevMin || 1

    const vertices: number[] = []
    const indices: number[] = []

    function addVertex(x: number, y: number, z: number): number {
        vertices.push(x, y, z)
        return (vertices.length / 3) - 1
    }

    function addTriangle(a: number, b: number, c: number) {
        indices.push(a, b, c)
    }

    // ── 1. Top surface ──
    const topIndices: number[][] = []
    for (let row = 0; row < rows; row++) {
        const rowIndices: number[] = []
        for (let col = 0; col < cols; col++) {
            const x = (col / (cols - 1)) - 0.5
            const z = (row / (rows - 1)) - 0.5
            const normalised = (grid[row][col] - elevMin) / elevRange
            const y = baseThickness * 0.01 + normalised * zScale * 0.3

            rowIndices.push(addVertex(x, y, z))
        }
        topIndices.push(rowIndices)
    }

    for (let row = 0; row < rows - 1; row++) {
        for (let col = 0; col < cols - 1; col++) {
            const tl = topIndices[row][col]
            const tr = topIndices[row][col + 1]
            const bl = topIndices[row + 1][col]
            const br = topIndices[row + 1][col + 1]

            addTriangle(tl, bl, tr)
            addTriangle(tr, bl, br)
        }
    }

    // ── 2. Bottom face ──
    const bottomIndices: number[][] = []
    for (let row = 0; row < rows; row++) {
        const rowIndices: number[] = []
        for (let col = 0; col < cols; col++) {
            const x = (col / (cols - 1)) - 0.5
            const z = (row / (rows - 1)) - 0.5
            rowIndices.push(addVertex(x, 0, z))
        }
        bottomIndices.push(rowIndices)
    }

    for (let row = 0; row < rows - 1; row++) {
        for (let col = 0; col < cols - 1; col++) {
            const tl = bottomIndices[row][col]
            const tr = bottomIndices[row][col + 1]
            const bl = bottomIndices[row + 1][col]
            const br = bottomIndices[row + 1][col + 1]

            addTriangle(tl, tr, bl)
            addTriangle(tr, br, bl)
        }
    }

    // ── 3. Front wall (row 0) ──
    for (let col = 0; col < cols - 1; col++) {
        const t0 = topIndices[0][col]
        const t1 = topIndices[0][col + 1]
        const b0 = bottomIndices[0][col]
        const b1 = bottomIndices[0][col + 1]

        addTriangle(t0, t1, b0)
        addTriangle(t1, b1, b0)
    }

    // ── 4. Back wall (last row) ──
    for (let col = 0; col < cols - 1; col++) {
        const t0 = topIndices[rows - 1][col]
        const t1 = topIndices[rows - 1][col + 1]
        const b0 = bottomIndices[rows - 1][col]
        const b1 = bottomIndices[rows - 1][col + 1]

        addTriangle(t0, b0, t1)
        addTriangle(t1, b0, b1)
    }

    // ── 5. Left wall (col 0) ──
    for (let row = 0; row < rows - 1; row++) {
        const t0 = topIndices[row][0]
        const t1 = topIndices[row + 1][0]
        const b0 = bottomIndices[row][0]
        const b1 = bottomIndices[row + 1][0]

        addTriangle(t0, b0, t1)
        addTriangle(t1, b0, b1)
    }

    // ── 6. Right wall (last col) ──
    for (let row = 0; row < rows - 1; row++) {
        const t0 = topIndices[row][cols - 1]
        const t1 = topIndices[row + 1][cols - 1]
        const b0 = bottomIndices[row][cols - 1]
        const b1 = bottomIndices[row + 1][cols - 1]

        addTriangle(t0, t1, b0)
        addTriangle(t1, b1, b0)
    }

    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3))
    geometry.setIndex(indices)
    geometry.computeVertexNormals()

    return geometry
}

export default function PreviewCanvas({ bbox, params }: PreviewCanvasProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
    const sceneRef = useRef<THREE.Scene | null>(null)
    const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
    const meshRef = useRef<THREE.Mesh | null>(null)
    const controlsRef = useRef<OrbitControls | null>(null)
    const animFrameRef = useRef<number>(0)

    // Initialise the Three.js scene once on mount
    useEffect(() => {
        if (!canvasRef.current) return

        const scene = new THREE.Scene()
        scene.background = new THREE.Color(0xf5f5f4)
        sceneRef.current = scene

        const camera = new THREE.PerspectiveCamera(
            45,
            canvasRef.current.clientWidth / canvasRef.current.clientHeight,
            0.01,
            100
        )
        camera.position.set(0, 0.8, 1.2)
        camera.lookAt(0, 0, 0)
        cameraRef.current = camera

        const renderer = new THREE.WebGLRenderer({
            canvas: canvasRef.current,
            antialias: true
        })
        renderer.setSize(canvasRef.current.clientWidth, canvasRef.current.clientHeight)
        renderer.setPixelRatio(window.devicePixelRatio)
        rendererRef.current = renderer

        const ambient = new THREE.AmbientLight(0xffffff, 0.6)
        scene.add(ambient)

        const directional = new THREE.DirectionalLight(0xffffff, 1.2)
        directional.position.set(1, 2, 1)
        scene.add(directional)

        const controls = new OrbitControls(camera, renderer.domElement)
        controls.enableDamping = true
        controls.dampingFactor = 0.05
        controlsRef.current = controls

        // Start with fake data until a bbox is drawn
        const grid = generateFakeGrid(40, 40)
        const geometry = buildGeometry(grid, params.zScale, params.baseThickness)
        const material = new THREE.MeshPhongMaterial({
            color: 0x4a7c59,
            shininess: 20,
            side: THREE.DoubleSide
        })
        const mesh = new THREE.Mesh(geometry, material)
        scene.add(mesh)
        meshRef.current = mesh

        function animate() {
            animFrameRef.current = requestAnimationFrame(animate)
            controls.update()
            renderer.render(scene, camera)
        }
        animate()

        return () => {
            cancelAnimationFrame(animFrameRef.current)
            controls.dispose()
            renderer.dispose()
            geometry.dispose()
            material.dispose()
        }
    }, [])

    // Re-build the mesh when z-scale or base thickness sliders change
    useEffect(() => {
        if (!meshRef.current) return

        const grid = generateFakeGrid(40, 40)
        const newGeometry = buildGeometry(grid, params.zScale, params.baseThickness)
        meshRef.current.geometry.dispose()
        meshRef.current.geometry = newGeometry
    }, [params.zScale, params.baseThickness])

    // Fetch real elevation data whenever the bbox changes
    useEffect(() => {
        if (!bbox || !meshRef.current) return

        const fetchAndUpdate = async () => {
            const params_url = new URLSearchParams({
                west: bbox.west.toString(),
                south: bbox.south.toString(),
                east: bbox.east.toString(),
                north: bbox.north.toString(),
                resolution: '40',
            })

            try {
                const res = await fetch(`/api/dem?${params_url}`)
                const data = await res.json()

                const newGeometry = buildGeometry(data.grid, params.zScale, params.baseThickness)
                meshRef.current!.geometry.dispose()
                meshRef.current!.geometry = newGeometry
            } catch (err) {
                console.error('Preview fetch failed:', err)
            }
        }

        fetchAndUpdate()
    }, [bbox])

    return (
        <div className="w-full h-48 border-b border-gray-100 relative bg-stone-100">
            <canvas
                ref={canvasRef}
                className="w-full h-full"
            />
            {!bbox && (
                <div className="absolute inset-0 flex items-center justify-center bg-stone-100">
                    <p className="text-xs text-gray-400">Draw a region to preview terrain</p>
                </div>
            )}
            {bbox && (
                <div className="absolute bottom-2 left-3 flex flex-col gap-1">
                    <div className="w-12 h-0.5 bg-gray-400" />
                    <span className="text-xs text-gray-400">{params.printWidth} mm</span>
                </div>
            )}
        </div>
    )
}