import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET files by project ID
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');

    if (!projectId) {
      return NextResponse.json({ error: 'Project ID required' }, { status: 400 });
    }

    const files = await db.file.findMany({
      where: { projectId },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json(files);
  } catch (error) {
    console.error('Error fetching files:', error);
    return NextResponse.json({ error: 'Failed to fetch files' }, { status: 500 });
  }
}

// POST create new file
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, content, type, projectId } = body;

    const file = await db.file.create({
      data: {
        name,
        content: content || '',
        type: type || 'verilog',
        projectId,
      },
    });

    return NextResponse.json(file);
  } catch (error) {
    console.error('Error creating file:', error);
    return NextResponse.json({ error: 'Failed to create file' }, { status: 500 });
  }
}

// PUT update file
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, name, content, type } = body;

    const file = await db.file.update({
      where: { id },
      data: {
        name,
        content,
        type,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json(file);
  } catch (error) {
    console.error('Error updating file:', error);
    return NextResponse.json({ error: 'Failed to update file' }, { status: 500 });
  }
}

// DELETE file
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'File ID required' }, { status: 400 });
    }

    await db.file.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting file:', error);
    return NextResponse.json({ error: 'Failed to delete file' }, { status: 500 });
  }
}
