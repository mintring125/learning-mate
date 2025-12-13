import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

export async function GET() {
    try {
        const emblemDir = path.join(process.cwd(), 'public', 'img_bonus')

        // Check if directory exists
        if (!fs.existsSync(emblemDir)) {
            return NextResponse.json({ emblems: [] })
        }

        // Read all files from the directory
        const files = fs.readdirSync(emblemDir)

        // Get file stats and filter only images
        const emblems = files
            .filter(file => /\.(jpg|jpeg|png|gif|webp)$/i.test(file))
            .map(file => {
                const filePath = path.join(emblemDir, file)
                const stats = fs.statSync(filePath)
                return {
                    filename: file,
                    path: `/img_bonus/${file}`,
                    createdAt: stats.birthtime.toISOString(),
                    modifiedAt: stats.mtime.toISOString()
                }
            })
            // Sort by creation time (oldest first)
            .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())

        return NextResponse.json({ emblems })
    } catch (error: any) {
        console.error('Error listing emblems:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
