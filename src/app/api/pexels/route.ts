import { NextRequest, NextResponse } from "next/server";

const PEXELS_API_BASE_URL = "https://api.pexels.com/v1";

/**
 * GET /api/pexels — Stock photo search
 * Works with PEXELS_API_KEY env var (optional, free at pexels.com).
 * Returns empty results if no key is set.
 */
export async function GET(request: NextRequest) {
  const apiKey = process.env.PEXELS_API_KEY;
  if (!apiKey) {
    return NextResponse.json({
      photos: [],
      total_results: 0,
      message: "Set PEXELS_API_KEY for stock photos (free at pexels.com/api)",
    });
  }

  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get("query") || "";
  const page = searchParams.get("page") || "1";
  const perPage = searchParams.get("per_page") || "15";

  try {
    const url = query
      ? `${PEXELS_API_BASE_URL}/search?query=${encodeURIComponent(query)}&page=${page}&per_page=${perPage}`
      : `${PEXELS_API_BASE_URL}/curated?page=${page}&per_page=${perPage}`;

    const res = await fetch(url, { headers: { Authorization: apiKey } });
    const data = await res.json();
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message, photos: [] }, { status: 500 });
  }
}
