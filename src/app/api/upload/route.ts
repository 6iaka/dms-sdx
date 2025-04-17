import { NextResponse } from 'next/server';
import { getAuth } from '@clerk/nextjs/server';
import { uploadFile } from '../../../server/actions/file_action';
import type { NextRequest } from 'next/server';

export const config = {
  api: {
    bodyParser: false,
  },
};

export async function POST(req: NextRequest) {
  try {
    const { userId } = getAuth(req);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await req.formData();
    
    // Validate required fields
    const file = formData.get('file');
    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Ensure tagNames is an array
    const tagNames = formData.get('tagNames');
    if (tagNames && typeof tagNames === 'string') {
      try {
        JSON.parse(tagNames);
      } catch {
        formData.set('tagNames', '[]');
      }
    } else {
      formData.set('tagNames', '[]');
    }

    const result = await uploadFile(formData);
    
    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'Failed to upload file' },
      { status: 500 }
    );
  }
} 