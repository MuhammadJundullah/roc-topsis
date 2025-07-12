// app/api/projects/route.ts
import { NextResponse } from 'next/server';
import { PrismaClient } from '@/lib/generated/prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  try {
    const projects = await prisma.project.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        createdAt: true,
        updatedAt: true,
      }, // Hanya ambil metadata, bukan data proyek lengkap
    });
    return NextResponse.json(projects, { status: 200 });
  } catch (error: unknown) {
    console.error('Failed to fetch projects:', error);
    let errorMessage = 'Failed to fetch projects.';
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    return NextResponse.json({ message: errorMessage }, { status: 500 });
  }
}

// API untuk menyimpan proyek baru
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, projectData } = body; // projectData akan berisi semua state dari frontend

    if (!name || typeof name !== 'string' || name.trim() === '') {
      return NextResponse.json({ message: 'Project name is required.' }, { status: 400 });
    }
    if (!projectData) {
      return NextResponse.json({ message: 'Project data is required.' }, { status: 400 });
    }

    const newProject = await prisma.project.create({
      data: {
        name: name.trim(),
        data: projectData, // Simpan seluruh objek state sebagai JSON
      },
    });
    return NextResponse.json(newProject, { status: 201 });
  } catch (error: unknown) {
    console.error('Failed to create project:', error);
    let errorMessage = 'Failed to create project.';
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    return NextResponse.json({ message: errorMessage }, { status: 500 });
  }
}