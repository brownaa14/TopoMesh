// lib/mesh.ts

export type Mesh = {
    vertices: Float32Array
    indices: Uint32Array
    normals: Float32Array
}

export function buildMesh(
    grid: number[][],
    zScale: number,
    baseThickness: number,
    printWidth: number,
    printDepth: number
): Mesh {
    const rows = grid.length
    const cols = grid[0].length

    // Find elevation range for normalisation
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

    // ── Helper: add a triangle by vertex indices ──
    function addTriangle(a: number, b: number, c: number) {
        indices.push(a, b, c)
    }

    // ── Helper: add a vertex and return its index ──
    function addVertex(x: number, y: number, z: number): number {
        vertices.push(x, y, z)
        return (vertices.length / 3) - 1
    }

    // ── 1. Terrain surface (top) ──
    // Build a vertex for every grid point
    const topIndices: number[][] = []
    for (let row = 0; row < rows; row++) {
        const rowIndices: number[] = []
        for (let col = 0; col < cols; col++) {
            const x = (col / (cols - 1)) * printWidth
            const y = (row / (rows - 1)) * printDepth
            const normalised = (grid[row][col] - elevMin) / elevRange
            const z = baseThickness + normalised * zScale * 10

            rowIndices.push(addVertex(x, y, z))
        }
        topIndices.push(rowIndices)
    }

    // Connect top vertices into triangles
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
    // Flat grid at z = 0, winding order reversed so normals point down
    const bottomIndices: number[][] = []
    for (let row = 0; row < rows; row++) {
        const rowIndices: number[] = []
        for (let col = 0; col < cols; col++) {
            const x = (col / (cols - 1)) * printWidth
            const y = (row / (rows - 1)) * printDepth
            rowIndices.push(addVertex(x, y, 0))
        }
        bottomIndices.push(rowIndices)
    }

    // Connect bottom vertices — reversed winding so normals face outward (down)
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

    // ── 3. Side walls ──
    // Each wall connects one edge of the top surface to the same edge of the bottom

    // Front wall (row 0)
    for (let col = 0; col < cols - 1; col++) {
        const t0 = topIndices[0][col]
        const t1 = topIndices[0][col + 1]
        const b0 = bottomIndices[0][col]
        const b1 = bottomIndices[0][col + 1]

        addTriangle(t0, t1, b0)
        addTriangle(t1, b1, b0)
    }

    // Back wall (last row)
    for (let col = 0; col < cols - 1; col++) {
        const t0 = topIndices[rows - 1][col]
        const t1 = topIndices[rows - 1][col + 1]
        const b0 = bottomIndices[rows - 1][col]
        const b1 = bottomIndices[rows - 1][col + 1]

        addTriangle(t0, b0, t1)
        addTriangle(t1, b0, b1)
    }

    // Left wall (col 0)
    for (let row = 0; row < rows - 1; row++) {
        const t0 = topIndices[row][0]
        const t1 = topIndices[row + 1][0]
        const b0 = bottomIndices[row][0]
        const b1 = bottomIndices[row + 1][0]

        addTriangle(t0, b0, t1)
        addTriangle(t1, b0, b1)
    }

    // Right wall (last col)
    for (let row = 0; row < rows - 1; row++) {
        const t0 = topIndices[row][cols - 1]
        const t1 = topIndices[row + 1][cols - 1]
        const b0 = bottomIndices[row][cols - 1]
        const b1 = bottomIndices[row + 1][cols - 1]

        addTriangle(t0, t1, b0)
        addTriangle(t1, b1, b0)
    }

    return {
        vertices: new Float32Array(vertices),
        indices: new Uint32Array(indices),
        normals: new Float32Array(vertices.length),
    }
}