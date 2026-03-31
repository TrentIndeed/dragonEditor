import { NextRequest, NextResponse } from "next/server";

const PEXELS_API_BASE_URL = "https://api.pexels.com/videos";

export async function GET(request: NextRequest) {
  const apiKey = process.env.PEXELS_API_KEY;
  if (!apiKey) {
    return NextResponse.json({
      videos: [],
      total_results: 0,
      message: "Set PEXELS_API_KEY for stock videos (free at pexels.com/api)",
    });
  }

  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get("query") || "";
  const page = searchParams.get("page") || "1";
  const perPage = searchParams.get("per_page") || "15";

  try {
    const url = query
      ? `${PEXELS_API_BASE_URL}/search?query=${encodeURIComponent(query)}&page=${page}&per_page=${perPage}`
      : `${PEXELS_API_BASE_URL}/popular?page=${page}&per_page=${perPage}`;

    const res = await fetch(url, { headers: { Authorization: apiKey } });
    const data = await res.json();
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message, videos: [] }, { status: 500 });
  }
}
