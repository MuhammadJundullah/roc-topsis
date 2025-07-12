// app/api/projects/[id]/route.ts
import { NextResponse, NextRequest } from "next/server";
import { PrismaClient } from "@/lib/generated/prisma/client";

const prisma = new PrismaClient();

// API untuk mendapatkan detail proyek berdasarkan ID
export async function GET(
  request: NextRequest, { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const project = await prisma.project.findUnique({
      where: { id },
    });

    if (!project) {
      return NextResponse.json(
        { message: "Project not found." },
        { status: 404 }
      );
    }
    return NextResponse.json(project, { status: 200 });
  } catch (error: unknown) {
    console.error(`Failed to fetch project`, error);
    let errorMessage = "Failed to fetch project.";
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    return NextResponse.json({ message: errorMessage }, { status: 500 });
  }
}

// API untuk memperbarui proyek
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, projectData } = body;

    if (!projectData) {
      return NextResponse.json(
        { message: "Project data is required." },
        { status: 400 }
      );
    }

    const updatedProject = await prisma.project.update({
      where: { id },
      data: {
        name: name?.trim(), // Perbarui nama jika disertakan
        data: projectData,
      },
    });
    return NextResponse.json(updatedProject, { status: 200 });
  } catch (error: unknown) {
    console.error(`Failed to update project`, error);
    let errorMessage = "Failed to update project.";
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    return NextResponse.json({ message: errorMessage }, { status: 500 });
  }
}