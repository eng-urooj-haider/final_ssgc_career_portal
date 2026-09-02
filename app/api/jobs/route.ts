import { NextRequest, NextResponse } from "next/server";

export const POST = async (req: NextRequest) => {
  const data = await req.formData();

  const job_code = data.get("job_code") as string;
  const title = data.get("title") as string;
  const citiesRaw = data.get("cities") as string;
  const cities: string[] = citiesRaw ? JSON.parse(citiesRaw) : [];

  const attachment1 = data.get("attachment_1_doc") as File | null;
  const attachment2 = data.get("attachment_2_doc") as File | null;

  return NextResponse.json({
    message: "Received job submission.",
    received: {
      job_code,
      title,
      cities,
      attachment_1_name: attachment1?.name ?? null,
      attachment_1_size: attachment1?.size ?? null,
      attachment_2_name: attachment2?.name ?? null,
      attachment_2_size: attachment2?.size ?? null,
    },
  });
};