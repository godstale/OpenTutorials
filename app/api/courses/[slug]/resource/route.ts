import { connection } from 'next/server';
import { NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { dummyCourses } from '@/lib/dummy-data';
import { TocNode } from '@/lib/types';

function findTocNodeByFilename(nodes: TocNode[], filename: string): TocNode | null {
  for (const node of nodes) {
    if (node.filename === filename) {
      return node;
    }
    if (node.children && Array.isArray(node.children)) {
      const found = findTocNodeByFilename(node.children, filename);
      if (found) return found;
    }
  }
  return null;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  await connection();
  try {
    const { slug: rawSlug } = await params;
    const slug = decodeURIComponent(rawSlug);

    const supabase = createAdminClient();

    // 1. Fetch course metadata
    let course = null;
    let isDummy = false;

    const { data: dbCourse, error: dbError } = await supabase
      .from('course_packages')
      .select('*')
      .eq('slug', slug)
      .single();

    if (dbError || !dbCourse) {
      // Fallback to dummy
      const dummy = dummyCourses.find((c) => c.slug === slug);
      if (!dummy) {
        return new Response('Course not found', { status: 404 });
      }
      course = dummy;
      isDummy = true;
    } else {
      course = dbCourse;
    }

    // If disabled, block access
    if (course.disabled) {
      return new Response('Course is disabled', { status: 403 });
    }

    let markdown = '';
    markdown += `# Course: ${course.title}\n\n`;
    markdown += `## Description\n${course.description || 'No description available.'}\n\n`;

    if (isDummy) {
      // Mock cards for dummy course
      markdown += `## Table of Contents\n`;
      markdown += `1. ${course.title}\n\n`;
      markdown += `## Course Contents\n\n`;
      markdown += `### Card 1: ${course.title}\n`;
      markdown += `${course.description || ''}\n`;
    } else {
      let configJson: { cards?: string[]; toc?: TocNode[] } | null = null;
      try {
        const { data: fileData } = await supabase.storage
          .from('courses')
          .download(`${slug}/config.json`);

        if (fileData) {
          const text = await fileData.text();
          configJson = JSON.parse(text);
        }
      } catch (err) {
        console.error('[ResourceAPI] Error downloading config.json:', err);
      }

      const cardFiles: string[] = configJson?.cards || [];
      
      markdown += `## Table of Contents\n`;
      cardFiles.forEach((filename, idx) => {
        let title = filename.replace('.mdx', '').replace('.md', '');
        if (configJson && Array.isArray(configJson.toc)) {
          const tocItem = findTocNodeByFilename(configJson.toc, filename);
          if (tocItem && tocItem.title) {
            title = tocItem.title;
          }
        }
        markdown += `${idx + 1}. ${title}\n`;
      });
      markdown += `\n## Course Contents\n\n`;

      for (let i = 0; i < cardFiles.length; i++) {
        const filename = cardFiles[i];
        let title = filename.replace('.mdx', '').replace('.md', '');
        if (configJson && Array.isArray(configJson.toc)) {
          const tocItem = findTocNodeByFilename(configJson.toc, filename);
          if (tocItem && tocItem.title) {
            title = tocItem.title;
          }
        }
        try {
          const storagePath = filename.startsWith('cards/') ? `${slug}/${filename}` : `${slug}/cards/${filename}`;
          const { data: cardData } = await supabase.storage
            .from('courses')
            .download(storagePath);

          if (cardData) {
            const cardText = await cardData.text();
            markdown += `### Card ${i + 1}: ${title}\n`;
            markdown += `${cardText}\n\n`;
            markdown += `---\n\n`;
          }
        } catch (err) {
          console.error(`[ResourceAPI] Failed to download card ${filename}:`, err);
          markdown += `### Card ${i + 1}: ${title}\n`;
          markdown += `*Content unavailable.*\n\n---\n\n`;
        }
      }
    }

    // Parse query parameter to check if JSON response is requested
    const { searchParams } = new URL(request.url);
    const asJson = searchParams.get('json') === 'true';

    let resourceUrl = '';

    if (!isDummy) {
      try {
        // Upload the compiled markdown to Supabase Storage
        const { error: uploadError } = await supabase.storage
          .from('courses')
          .upload(`${slug}/resource.md`, Buffer.from(markdown), {
            contentType: 'text/markdown; charset=utf-8',
            upsert: true,
          });

        if (uploadError) {
          console.error('[ResourceAPI] Error uploading resource.md:', uploadError);
        } else {
          // Generate a Signed URL (valid for 7 days = 604800 seconds)
          const { data: signedData, error: signedError } = await supabase.storage
            .from('courses')
            .createSignedUrl(`${slug}/resource.md`, 7 * 24 * 60 * 60);

          if (signedError || !signedData?.signedUrl) {
            console.error('[ResourceAPI] Error generating signed URL, trying public URL fallback:', signedError);
            const { data: publicData } = supabase.storage
              .from('courses')
              .getPublicUrl(`${slug}/resource.md`);
            if (publicData?.publicUrl) {
              resourceUrl = publicData.publicUrl;
            }
          } else {
            resourceUrl = signedData.signedUrl;
          }
        }
      } catch (storageErr) {
        console.error('[ResourceAPI] Storage operations failed:', storageErr);
      }
    }

    if (asJson) {
      return new Response(JSON.stringify({ url: resourceUrl }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store',
        },
      });
    }

    return new Response(markdown, {
      status: 200,
      headers: {
        'Content-Type': 'text/markdown; charset=utf-8',
        'Cache-Control': 'public, max-age=60',
      },
    });
  } catch (error: unknown) {
    console.error('Resource API GET error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal Server Error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
